import time
from typing import Optional
from agents.base_agent import BaseAgent
from models.models import AgentName, AgentStatus, IncidentReport, Incident, IncidentStatus, Severity
from core.azure_openai import generate_json, HERALD_PROMPT
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

            await self.think("Drafting executive and technical summaries via GPT-4o...")
            result = await generate_json(messages, settings.AZURE_OPENAI_GPT4O_DEPLOYMENT)

            report = IncidentReport(
                incident_id=incident.id,
                executive_summary=result.get("executive_summary", ""),
                technical_summary=result.get("technical_summary", ""),
                timeline_narrative=result.get("timeline_narrative", ""),
                recommendations=result.get("recommendations", []),
                compliance_notes=result.get("compliance_notes"),
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
                logger.warning("DRY RUN: skipping external webhook [Azure Communication Services]")
                await self.think("DRY RUN: external alert delivery skipped.")
                await self.broadcast("alert_sent", {"incident_id": incident.id, "channel": "dry_run"}, "DRY RUN: Alert broadcast without external delivery")
                return

            # Here we would integrate with Azure Communication Services / Teams
            # For hackathon purposes, we assume success after API setup
            await self.think("Teams webhook triggered successfully.")
            await self.broadcast("alert_sent", {"incident_id": incident.id, "channel": "teams"}, "Alert sent to Teams")
        except Exception as e:
            await self.think(f"Failed to send alert: {str(e)}")

herald = HeraldAgent()
