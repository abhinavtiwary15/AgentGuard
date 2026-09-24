import time
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Request
from models.models import IncidentReport, DashboardMetrics
from core.cosmos_db import cosmos_db
from core.config import settings, SERVER_START_TIME
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

    # 12 hourly buckets for the last 12 hours: [11h ago, 10h ago, ..., current hour]
    now = datetime.now(timezone.utc)
    hourly_trend = [0] * 12
    auto_resolved_count = 0
    escalated_count = 0
    resolved_count = 0

    for item in items:
        status = item.get("status") or "unknown"
        attack_type = item.get("attack_type") or "Unknown"
        attack_distribution[attack_type] = attack_distribution.get(attack_type, 0) + 1
        
        response = item.get("response") or {}
        investigation = item.get("investigation") or {}
        response_time = response.get("total_response_time_ms")
        if isinstance(response_time, (int, float)):
            response_times.append(response_time)

        # Parse creation timestamp for hourly trend
        created_val = item.get("created_at")
        if created_val:
            try:
                if isinstance(created_val, str):
                    dt = datetime.fromisoformat(created_val.replace("Z", "+00:00"))
                elif isinstance(created_val, datetime):
                    dt = created_val
                else:
                    dt = None

                if dt:
                    if dt.tzinfo is None:
                        dt = dt.replace(tzinfo=timezone.utc)
                    else:
                        dt = dt.astimezone(timezone.utc)
                    
                    diff_hours = int((now - dt).total_seconds() // 3600)
                    if 0 <= diff_hours < 12:
                        bucket_idx = 11 - diff_hours
                        hourly_trend[bucket_idx] += 1
            except Exception:
                pass

        # Compute auto-resolution vs escalation on closed/handled incidents
        is_auto_resolved = response.get("auto_resolved") is True or (status in {"resolved", "blocked"} and not investigation.get("requires_human"))
        is_escalated = status == "escalated" or investigation.get("requires_human") is True

        if status in {"resolved", "blocked", "escalated"} or response:
            resolved_count += 1
            if is_auto_resolved:
                auto_resolved_count += 1
            elif is_escalated:
                escalated_count += 1

    avg_response = sum(response_times) / len(response_times) if response_times else 0
    auto_resolved_pct = round((auto_resolved_count / resolved_count) * 100, 1) if resolved_count > 0 else None
    escalation_pct = round((escalated_count / resolved_count) * 100, 1) if resolved_count > 0 else None
    uptime_seconds = max(0.0, time.time() - SERVER_START_TIME)

    return DashboardMetrics(
        threats_today=len(items),
        threats_blocked=sum(1 for item in items if item.get("status") in blocked_statuses),
        critical_active=sum(
            1 for item in items
            if item.get("severity") == "critical" and item.get("status") in critical_active_statuses
        ),
        investigating=sum(1 for item in items if item.get("status") == "investigating"),
        avg_response_ms=avg_response,
        auto_resolved_pct=auto_resolved_pct,
        escalation_pct=escalation_pct,
        server_uptime_seconds=uptime_seconds,
        accuracy_pct=auto_resolved_pct,  # Maintain backwards-compat field with honest value
        uptime_pct=None,                 # Omitted: no SLA monitor attached
        agents_online=5,
        hourly_trend=hourly_trend,
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
