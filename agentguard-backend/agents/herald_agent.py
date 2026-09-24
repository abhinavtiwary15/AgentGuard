import time
import httpx
from typing import Optional
from agents.base_agent import BaseAgent
from models.models import AgentName, AgentStatus, IncidentReport, Incident, IncidentStatus, Severity
from core.azure_openai import generate_json, HERALD_PROMPT, is_mock_fallback_active
from core.config import settings
from utils.logger import logger

class HeraldAgent(BaseAgent):
    def __init__(self):
        super().__init__(AgentName.HERALD)

    async def generate_report(self, incident: Incident, dry_run: bool = False) -> IncidentReport:
        await self.set_status(AgentStatus.ACTIVE, f"Generating report for {incident.id}")
        start_time = time.time()

        try:
            await self.think("Gathering full incident context...")
            incident_data = incident.model_dump(mode="json", exclude_none=True)
            
            messages = [
                {"role": "system", "content": HERALD_PROMPT},
                {"role": "user", "content": str(incident_data)}
            ]

            if is_mock_fallback_active():
                await self.think("Drafting executive and technical summaries via local template fallback (Azure OpenAI unconfigured)...")
            else:
                await self.think("Drafting executive and technical summaries via GPT-4o...")
            result = await generate_json(messages, settings.AZURE_OPENAI_GPT4O_DEPLOYMENT)

            report = IncidentReport(
                incident_id=incident.id,
                executive_summary=result.get("executive_summary", ""),
                technical_summary=result.get("technical_summary", ""),
                timeline_narrative=result.get("timeline_narrative", ""),
                recommendations=result.get("recommendations", []),
                compliance_notes=result.get("compliance_notes"),
                llm_source=result.get("llm_source", "mock_fallback" if is_mock_fallback_active() else "azure_openai"),
                metrics={
                    "detection_time_ms": incident.response.total_response_time_ms if incident.response else 0,
                    "severity": incident.severity.value if incident.severity else "unknown"
                }
            )

            await self.think("Report generation complete.")
            await self.send_alert(incident, report, dry_run=dry_run)

            duration = (time.time() - start_time) * 1000
            self.state.avg_response_ms = (self.state.avg_response_ms * self.state.tasks_completed + duration) / (self.state.tasks_completed + 1)
            
            await self.broadcast("report_generated", report.model_dump(mode="json"), f"Report generated for {incident.id}")
            await self.complete_task()
            
            return report

        except Exception as e:
            await self.think(f"Failed to generate report: {str(e)}")
            await self.set_status(AgentStatus.ERROR)
            return IncidentReport(incident_id=incident.id, executive_summary=f"Error generating report: {str(e)}")

    async def send_alert(self, incident: Incident, report: IncidentReport, dry_run: bool = False):
        await self.think("Dispatching alerts to security channels...")
        try:
            if dry_run:
                logger.warning("DRY RUN: skipping external webhook [%s]", settings.TEAMS_WEBHOOK_URL)
                await self.think("DRY RUN: external alert delivery skipped.")
                await self.broadcast("alert_sent", {"incident_id": incident.id, "channel": "dry_run", "status": "dry_run"}, "DRY RUN: Alert broadcast without external delivery")
                return

            webhook_url = settings.TEAMS_WEBHOOK_URL
            if not webhook_url or "mock" in webhook_url or "your-webhook" in webhook_url or not webhook_url.startswith("http"):
                await self.think("Teams webhook not configured — external notification skipped.")
                await self.broadcast("alert_skipped", {
                    "incident_id": incident.id,
                    "channel": "teams",
                    "status": "not_configured",
                    "reason": "TEAMS_WEBHOOK_URL is not configured"
                }, "External alert delivery skipped (no Teams webhook configured)")
                return

            # Real Teams incoming webhook payload
            async with httpx.AsyncClient() as client:
                card_payload = {
                    "@type": "MessageCard",
                    "@context": "http://schema.org/extensions",
                    "themeColor": "CF1322" if incident.severity == Severity.CRITICAL else "D46B08",
                    "summary": f"AgentGuard Alert: {incident.attack_type.value if hasattr(incident.attack_type, 'value') else incident.attack_type} ({incident.id})",
                    "sections": [{
                        "activityTitle": f"🚨 AgentGuard Incident Alert: {incident.id}",
                        "activitySubtitle": f"Severity: {incident.severity.value if hasattr(incident.severity, 'value') else incident.severity} | Type: {incident.attack_type.value if hasattr(incident.attack_type, 'value') else incident.attack_type}",
                        "text": report.executive_summary or f"Threat detected from IP {incident.source_ip or 'unknown'}",
                        "markdown": True
                    }]
                }
                resp = await client.post(webhook_url, json=card_payload, timeout=10.0)
                resp.raise_for_status()
                await self.think("Teams webhook delivered successfully.")
                await self.broadcast("alert_sent", {"incident_id": incident.id, "channel": "teams", "status": "delivered"}, "Alert delivered to Teams #security-ops")
        except Exception as e:
            logger.warning("Failed to dispatch alert for %s: %s", incident.id, str(e))
            await self.think(f"Failed to dispatch external alert: {str(e)[:120]}")
            await self.broadcast("alert_failed", {"incident_id": incident.id, "channel": "teams", "status": "failed", "error": str(e)[:120]}, f"Alert delivery failed: {str(e)[:100]}")

herald = HeraldAgent()
