from fastapi import APIRouter, Depends, HTTPException, Request
from models.models import IncidentReport, DashboardMetrics
from core.cosmos_db import cosmos_db
from core.config import settings
from api.dependencies import get_current_user, limiter

router = APIRouter(prefix="/api/reports", tags=["reports"], dependencies=[Depends(get_current_user)])

@router.get("/dashboard", response_model=DashboardMetrics)
@limiter.limit("100/minute")
async def get_dashboard(request: Request):
    items = await cosmos_db.list_items(settings.COSMOS_CONTAINER_INCIDENTS)
    blocked_statuses = {"blocked", "resolved"}
    critical_active_statuses = {"detecting", "investigating", "responding", "escalated"}
    attack_distribution = {}
    response_times = []

    for item in items:
        attack_type = item.get("attack_type") or "Unknown"
        attack_distribution[attack_type] = attack_distribution.get(attack_type, 0) + 1
        response = item.get("response") or {}
        response_time = response.get("total_response_time_ms")
        if isinstance(response_time, (int, float)):
            response_times.append(response_time)

    avg_response = sum(response_times) / len(response_times) if response_times else 0

    return DashboardMetrics(
        threats_today=len(items),
        threats_blocked=sum(1 for item in items if item.get("status") in blocked_statuses),
        critical_active=sum(
            1 for item in items
            if item.get("severity") == "critical" and item.get("status") in critical_active_statuses
        ),
        investigating=sum(1 for item in items if item.get("status") == "investigating"),
        avg_response_ms=avg_response,
        agents_online=5,
        hourly_trend=[0] * 12,
        attack_distribution=attack_distribution,
        response_trend=response_times[-12:],
    )

@router.get("/incident/{id}", response_model=IncidentReport)
@limiter.limit("100/minute")
async def get_incident_report(request: Request, id: str):
    items = await cosmos_db.list_items(settings.COSMOS_CONTAINER_REPORTS, incident_id=id, limit=1)
    if not items:
        raise HTTPException(status_code=404, detail="Report not found")
    return IncidentReport(**items[0])

@router.get("/weekly")
@limiter.limit("100/minute")
async def get_weekly_summary(request: Request):
    items = await cosmos_db.list_items(settings.COSMOS_CONTAINER_INCIDENTS)
    return {
        "status": "ok",
        "incidents_reviewed": len(items),
        "executive_summary": "AgentGuard weekly security posture is available from the current incident store.",
    }
