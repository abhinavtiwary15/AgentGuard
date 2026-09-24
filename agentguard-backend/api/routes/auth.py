from datetime import datetime, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Request
from pydantic import BaseModel, EmailStr

from core.config import settings
from core.cosmos_db import cosmos_db
from core.security import hash_password, verify_password, create_access_token
from models.models import (
    User,
    UserRole,
    UserResponse,
    RegisterRequest,
    LoginRequest,
    TokenResponse,
    ApiKeyResponse,
)
from api.dependencies import limiter, get_current_user

router = APIRouter(prefix="/api/auth", tags=["auth"])

DEFAULT_ADMIN_USERNAME = "admin"
DEFAULT_ADMIN_EMAIL = "admin@agentguard.ai"
DEFAULT_ADMIN_PASSWORD = "AdminGuard2026!"

async def get_user_by_username(username: str) -> Optional[User]:
    users = await cosmos_db.list_items(settings.COSMOS_CONTAINER_USERS, username=username)
    if users:
        return User(**users[0])
    return None

async def get_user_by_email(email: str) -> Optional[User]:
    users = await cosmos_db.list_items(settings.COSMOS_CONTAINER_USERS, email=email)
    if users:
        return User(**users[0])
    return None

async def count_total_users() -> int:
    users = await cosmos_db.list_items(settings.COSMOS_CONTAINER_USERS)
    return len(users)

async def seed_default_admin_if_empty() -> Optional[User]:
    """Helper called on startup or bootstrap to guarantee an initial administrator exists."""
    total = await count_total_users()
    if total == 0:
        admin_user = User(
            username=DEFAULT_ADMIN_USERNAME,
            email=DEFAULT_ADMIN_EMAIL,
            hashed_password=hash_password(DEFAULT_ADMIN_PASSWORD),
            role=UserRole.ADMIN,
            is_active=True,
        )
        await cosmos_db.upsert_item(settings.COSMOS_CONTAINER_USERS, admin_user.model_dump(mode="json"))
        return admin_user
    return None

@router.post("/bootstrap")
@limiter.limit("5/minute")
async def bootstrap_admin(request: Request):
    """Seed the default administrator account if no users exist in the system."""
    seeded = await seed_default_admin_if_empty()
    if seeded:
        return {
            "message": "Default administrator created successfully.",
            "seeded": True,
            "username": seeded.username,
            "email": seeded.email,
            "note": "Default password is 'AdminGuard2026!'. Change it immediately in production.",
        }
    return {
        "message": "System already bootstrapped. Existing users found.",
        "seeded": False,
    }

@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit("10/minute")
async def register_user(request: Request, payload: RegisterRequest):
    """Register a new user with hashed credentials."""
    if len(payload.password) < 8:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 8 characters long."
        )

    # Check for duplicate username or email
    if await get_user_by_username(payload.username):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Username '{payload.username}' is already registered."
        )
    if await get_user_by_email(payload.email):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Email '{payload.email}' is already registered."
        )

    # If first user, make admin, otherwise use requested role
    role = UserRole.ADMIN if (await count_total_users()) == 0 else (payload.role or UserRole.ANALYST)

    new_user = User(
        username=payload.username.strip(),
        email=payload.email.strip().lower(),
        hashed_password=hash_password(payload.password),
        role=role,
        is_active=True,
    )

    await cosmos_db.upsert_item(settings.COSMOS_CONTAINER_USERS, new_user.model_dump(mode="json"))

    return UserResponse(
        id=new_user.id,
        username=new_user.username,
        email=new_user.email,
        role=new_user.role,
        is_active=new_user.is_active,
        created_at=new_user.created_at,
    )

@router.post("/login", response_model=TokenResponse)
@limiter.limit("30/minute")
async def login(request: Request, payload: LoginRequest):
    """Authenticate with username or email and receive a signed JWT."""
    identifier = payload.username.strip()
    
    # Check if user matches username or email
    user = await get_user_by_username(identifier)
    if not user and "@" in identifier:
        user = await get_user_by_email(identifier.lower())

    # If database has 0 users, auto-seed default admin so first login succeeds
    if not user and (await count_total_users()) == 0:
        await seed_default_admin_if_empty()
        if identifier in (DEFAULT_ADMIN_USERNAME, DEFAULT_ADMIN_EMAIL):
            user = await get_user_by_username(DEFAULT_ADMIN_USERNAME)

    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is deactivated."
        )

    # Configured token duration (default: 60 minutes)
    expires_minutes = settings.JWT_EXPIRE_MINUTES
    access_token = create_access_token(
        data={
            "sub": user.username,
            "uid": user.id,
            "role": user.role.value,
            "email": user.email,
        },
        expires_delta=timedelta(minutes=expires_minutes),
    )

    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        expires_in=expires_minutes * 60,
        user=UserResponse(
            id=user.id,
            username=user.username,
            email=user.email,
            role=user.role,
            is_active=user.is_active,
            created_at=user.created_at,
        ),
    )

@router.get("/me", response_model=UserResponse)
@limiter.limit("60/minute")
async def get_current_user_profile(request: Request, current_user: str = Depends(get_current_user)):
    """Return the profile of the currently authenticated user."""
    user = await get_user_by_username(current_user)
    if not user:
        # In development bypass mode, synthesize an admin user
        return UserResponse(
            id="dev-admin-id",
            username=current_user,
            email="admin@agentguard.ai",
            role=UserRole.ADMIN,
            is_active=True,
            created_at=datetime.utcnow(),
            is_default_password=True,
        )

    is_default = verify_password(DEFAULT_ADMIN_PASSWORD, user.hashed_password)
    return UserResponse(
        id=user.id,
        username=user.username,
        email=user.email,
        role=user.role,
        is_active=user.is_active,
        created_at=user.created_at,
        is_default_password=is_default,
    )

class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str

@router.post("/change-password")
@limiter.limit("10/minute")
async def change_password(
    request: Request,
    payload: ChangePasswordRequest,
    current_user: str = Depends(get_current_user)
):
    """Change the password of the currently authenticated user."""
    user = await get_user_by_username(current_user)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    if not verify_password(payload.current_password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Current password is incorrect")

    if len(payload.new_password) < 8:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="New password must be at least 8 characters long")

    if payload.new_password == DEFAULT_ADMIN_PASSWORD:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot reuse default bootstrap password")

    user.hashed_password = hash_password(payload.new_password)
    await cosmos_db.upsert_item(settings.COSMOS_CONTAINER_USERS, user.model_dump(mode="json"))

    return {"message": "Password updated successfully", "username": user.username}

@router.post("/generate-key", response_model=ApiKeyResponse)
@limiter.limit("10/minute")
async def generate_programmatic_api_key(
    request: Request,
    current_user: str = Depends(get_current_user)
):
    """Generate a long-lived programmatic API key / token (90 days) for the authenticated analyst."""
    user = await get_user_by_username(current_user)
    role_val = user.role.value if user else "admin"

    token = create_access_token(
        data={
            "sub": current_user,
            "role": role_val,
            "token_type": "api_key",
        },
        expires_delta=timedelta(days=90),
    )

    return ApiKeyResponse(
        api_key=token,
        created_at=datetime.utcnow(),
        role=role_val,
        description="90-day programmatic API key for AgentGuard CLI & automation.",
    )
