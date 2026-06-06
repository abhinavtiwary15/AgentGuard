from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Response
from typing import List, Optional
from models.models import Incident, LogEntry, IncidentStatus
from core.cosmos_db import cosmos_db
from core.config import settings
from api.dependencies import get_current_user, limiter
from fastapi import Request
from agents.sentinel_agent import sentinel
from agents.nexus_orchestrator import nexus
from pydantic import BaseModel
import csv
import html
from io import StringIO

router = APIRouter(prefix="/api/incidents", tags=["incidents"], dependencies=[Depends(get_current_user)])

class ResolveRequest(BaseModel):
    notes: str

@router.get("/", response_model=List[Incident])
@limiter.limit("100/minute")
async def list_incidents(request: Request, status: Optional[str] = None, severity: Optional[str] = None, limit: int = 100):
    items = await cosmos_db.list_items(
        settings.COSMOS_CONTAINER_INCIDENTS,
        status=status,
        severity=severity,
        limit=min(max(limit, 1), 500),
    )
    return [Incident(**item) for item in items]

@router.get("/export/csv")
@limiter.limit("10/minute")
async def export_incidents_csv(request: Request):
    items = await cosmos_db.list_items(settings.COSMOS_CONTAINER_INCIDENTS)
    
    f = StringIO()
    writer = csv.writer(f)
    writer.writerow(["ID", "Created At", "Status", "Severity", "Attack Type", "Source IP", "Target Endpoint", "Resolved"])
    for item in items:
        writer.writerow([
            item.get("id", ""),
            item.get("created_at", ""),
            item.get("status", ""),
            item.get("severity", ""),
            item.get("attack_type", ""),
            item.get("source_ip", ""),
            item.get("target_endpoint", ""),
            item.get("status") == "resolved"
        ])
    
    response = Response(content=f.getvalue(), media_type="text/csv")
    response.headers["Content-Disposition"] = "attachment; filename=incidents_export.csv"
    return response

@router.get("/stats")
@limiter.limit("100/minute")
async def incident_stats(request: Request):
    items = await cosmos_db.list_items(settings.COSMOS_CONTAINER_INCIDENTS)
    by_status = {}
    by_severity = {}
    by_attack_type = {}
    active_statuses = {"detecting", "investigating", "responding", "escalated"}
    active_count = 0

    for item in items:
        status = item.get("status") or "unknown"
        severity = item.get("severity") or "unknown"
        attack_type = item.get("attack_type") or "Unknown"
        by_status[status] = by_status.get(status, 0) + 1
        by_severity[severity] = by_severity.get(severity, 0) + 1
        by_attack_type[attack_type] = by_attack_type.get(attack_type, 0) + 1
        if status in active_statuses:
            active_count += 1

    return {
        "total": len(items),
        "active": active_count,
        "by_status": by_status,
        "by_severity": by_severity,
        "by_attack_type": by_attack_type,
    }

@router.get("/{id}/report")
@limiter.limit("30/minute")
async def incident_report_html(request: Request, id: str):
    item = await cosmos_db.read_item(settings.COSMOS_CONTAINER_INCIDENTS, id, id)
    if not item:
        raise HTTPException(status_code=404, detail="Incident not found")

    report_items = await cosmos_db.list_items(settings.COSMOS_CONTAINER_REPORTS, incident_id=id, limit=1)
    incident = Incident(**item)
    report = report_items[0] if report_items else {}

    title = html.escape(f"AgentGuard Incident Report {incident.id}")
    executive_summary = html.escape(report.get("executive_summary") or incident.ai_summary or "AgentGuard completed incident handling and preserved the available forensic timeline.")
    technical_summary = html.escape(report.get("technical_summary") or "Security telemetry was analyzed across agent stages and persisted for review.")
    status = html.escape(incident.status.value)
    severity = html.escape(incident.severity.value if incident.severity else "unknown")
    attack_type = html.escape(incident.attack_type.value)
    source_ip = html.escape(incident.source_ip or "unknown")
    target_endpoint = html.escape(incident.target_endpoint or "unknown")

    content = f"""<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>{title}</title>
  <style>
    body {{ font-family: Georgia, 'Times New Roman', serif; color: #1f2933; margin: 40px; line-height: 1.5; }}
    h1, h2 {{ font-family: Arial, sans-serif; }}
    .meta {{ display: grid; grid-template-columns: 180px 1fr; gap: 8px 16px; margin: 24px 0; }}
    .label {{ font-weight: 700; color: #4b5563; }}
    @media print {{ body {{ margin: 24px; }} }}
  </style>
</head>
<body>
  <h1>{title}</h1>
  <div class="meta">
    <div class="label">Status</div><div>{status}</div>
    <div class="label">Severity</div><div>{severity}</div>
    <div class="label">Attack Type</div><div>{attack_type}</div>
    <div class="label">Source IP</div><div>{source_ip}</div>
    <div class="label">Target Endpoint</div><div>{target_endpoint}</div>
  </div>
  <h2>Executive Summary</h2>
  <p>{executive_summary}</p>
  <h2>Technical Summary</h2>
  <p>{technical_summary}</p>
</body>
</html>"""

    response = Response(content=content, media_type="text/html")
    response.headers["Content-Disposition"] = f"attachment; filename=incident_{id}_report.html"
    return response

@router.get("/{id}", response_model=Incident)
@limiter.limit("100/minute")
async def get_incident(request: Request, id: str):
    item = await cosmos_db.read_item(settings.COSMOS_CONTAINER_INCIDENTS, id, id)
    if not item:
        raise HTTPException(status_code=404, detail="Incident not found")
    return Incident(**item)

@router.post("/ingest")
@limiter.limit("100/minute")
async def ingest_log(request: Request, log_entry: LogEntry, background_tasks: BackgroundTasks):
    async def process_log(log: LogEntry):
        signal = await sentinel.analyze_log(log)
        if signal:
            await nexus.handle_threat(signal)

    background_tasks.add_task(process_log, log_entry)
    return {"message": "Log ingested successfully"}

@router.patch("/{id}/resolve")
@limiter.limit("100/minute")
async def resolve_incident(request: Request, id: str, payload: ResolveRequest):
    item = await cosmos_db.read_item(settings.COSMOS_CONTAINER_INCIDENTS, id, id)
    if not item:
        raise HTTPException(status_code=404, detail="Incident not found")

    incident = Incident(**item)
    incident.status = IncidentStatus.RESOLVED
    incident.resolution_notes = payload.notes

    await cosmos_db.upsert_item(settings.COSMOS_CONTAINER_INCIDENTS, incident.model_dump(mode='json'))
    return incident

@router.patch("/{id}/false-positive")
@limiter.limit("100/minute")
async def mark_false_positive(request: Request, id: str):
    item = await cosmos_db.read_item(settings.COSMOS_CONTAINER_INCIDENTS, id, id)
    if not item:
        raise HTTPException(status_code=404, detail="Incident not found")

    incident = Incident(**item)
    incident.status = IncidentStatus.FALSE_POSITIVE
    incident.false_positive = True

    await cosmos_db.upsert_item(settings.COSMOS_CONTAINER_INCIDENTS, incident.model_dump(mode='json'))
    return incident
