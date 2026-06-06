from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Request
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from api.dependencies import limiter
from api.routes import incidents, agents, reports, simulation
from api.routes.websocket import ws_manager, agent_broadcast_callback
from core.config import settings
from contextlib import asynccontextmanager
from core.health import auth_mode, config_summary, count_ready_agents, overall_status, print_startup_config_table, sanitize_payload
from core.azure_openai import health_status as openai_health_status
from core.azure_search import search_manager
from core.cosmos_db import cosmos_db
from core.event_hub import event_hub
from core.service_bus import service_bus
from core.power_automate import power_automate
from utils.logger import logger

from agents import sentinel, oracle, striker, nexus, herald

@asynccontextmanager
async def lifespan(app: FastAPI):
    print_startup_config_table()
    if settings.ENVIRONMENT == "development":
        logger.warning(
            "⚠️  DEV AUTH ACTIVE — only 'dummy-token-for-hackathon' "
            "bypasses JWT. Set ENVIRONMENT=production to disable."
        )
    # Set broadcast callbacks for all agents
    sentinel.set_broadcast_callback(agent_broadcast_callback)
    oracle.set_broadcast_callback(agent_broadcast_callback)
    striker.set_broadcast_callback(agent_broadcast_callback)
    nexus.set_broadcast_callback(agent_broadcast_callback)
    herald.set_broadcast_callback(agent_broadcast_callback)
    yield
    # Cleanup

app = FastAPI(title=settings.APP_NAME, docs_url="/api/docs", lifespan=lifespan)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(incidents.router)
app.include_router(agents.router)
app.include_router(reports.router)
app.include_router(simulation.router)

@app.get("/")
async def root():
    return {"service": settings.APP_NAME, "version": "1.0.0"}

@app.get("/api/health")
async def health_check():
    return {"status": "ok"}

@app.get("/api/health/detailed")
async def detailed_health_check():
    services = {
        "azure_openai": openai_health_status(),
        "cosmos_db": cosmos_db.health_status(),
        "azure_search": search_manager.health_status(),
        "event_hub": event_hub.health_status(),
        "service_bus": service_bus.health_status(),
        "power_automate": power_automate.health_status(),
    }
    agents = [sentinel, oracle, striker, nexus, herald]
    return sanitize_payload({
        "status": overall_status(services),
        "environment": settings.ENVIRONMENT,
        "auth_mode": auth_mode(),
        "services": services,
        "agents": count_ready_agents(agents),
        "config": config_summary(),
    })

@app.websocket("/ws/live")
async def websocket_endpoint(websocket: WebSocket):
    await ws_manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_json()
            if data.get("type") == "ping":
                await websocket.send_json({"type": "heartbeat"})
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)
