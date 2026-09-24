import time
import asyncio
from typing import Optional
from agents.base_agent import BaseAgent
from agents.oracle_agent import oracle
from agents.striker_agent import striker
from agents.herald_agent import herald
from models.models import AgentName, AgentStatus, ThreatSignal, Incident, IncidentStatus, Severity
from core.cosmos_db import cosmos_db
from core.service_bus import service_bus
from core.config import settings

class NexusOrchestrator(BaseAgent):
    def __init__(self):
        super().__init__(AgentName.NEXUS)

    async def handle_threat(self, signal: ThreatSignal, dry_run: bool = False) -> Incident:
        await self.set_status(AgentStatus.ACTIVE, "Orchestrating incident response")
        start_time = time.time()

        try:
            # 1. Create Incident record
            incident = Incident(
                status=IncidentStatus.DETECTING,
                attack_type=signal.suspected_attack_type,
                threat_signal=signal,
                source_ip=signal.log_entry.source_ip,
                target_endpoint=signal.log_entry.endpoint,
                affected_user=signal.log_entry.user_id,
            )
            await self.think(f"Created new incident: {incident.id}")
            
            # Save to Cosmos DB
            await cosmos_db.upsert_item(settings.COSMOS_CONTAINER_INCIDENTS, incident.model_dump(mode='json'))
            await self.broadcast("incident_created", incident.model_dump(mode='json'), f"Incident {incident.id} created")

            # 2. Assign to Oracle for investigation
            incident.status = IncidentStatus.INVESTIGATING
            await cosmos_db.upsert_item(settings.COSMOS_CONTAINER_INCIDENTS, incident.model_dump(mode='json'))
            await self.broadcast("incident_updated", incident.model_dump(mode='json'), "Status updated to INVESTIGATING")

            # Publish threat signal to Service Bus queue if configured
            if not service_bus.use_mock:
                await service_bus.send_message(settings.SERVICE_BUS_QUEUE_THREATS, signal.model_dump(mode='json'))
            
            investigation = await oracle.investigate(signal)
            incident.investigation = investigation
            incident.severity = investigation.classification

            # 3. Decision gate
            if investigation.requires_human or investigation.confidence < settings.HUMAN_ESCALATION_CONFIDENCE:
                incident.status = IncidentStatus.ESCALATED
                await self.think("Confidence below threshold or requires human flagged. Escalating.")
                await self.broadcast("incident_updated", incident.model_dump(mode='json'), "Incident ESCALATED to human analyst")
            else:
                # 4. Assign to Striker for response
                incident.status = IncidentStatus.RESPONDING
                await cosmos_db.upsert_item(settings.COSMOS_CONTAINER_INCIDENTS, incident.model_dump(mode='json'))
                await self.broadcast("incident_updated", incident.model_dump(mode='json'), "Status updated to RESPONDING")
                
                response = await striker.respond(investigation, incident, dry_run=dry_run)
                incident.response = response
                
                if not service_bus.use_mock:
                    await service_bus.send_message(settings.SERVICE_BUS_QUEUE_RESPONSES, response.model_dump(mode='json'))

                incident.status = IncidentStatus.RESOLVED if response.auto_resolved else IncidentStatus.ESCALATED
                await self.think(f"Response executed. Status: {incident.status.value}")

            # 5. Always call Herald for report
            report = await herald.generate_report(incident, dry_run=dry_run)
            
            # 6. Save final state
            await cosmos_db.upsert_item(settings.COSMOS_CONTAINER_INCIDENTS, incident.model_dump(mode='json'))
            await cosmos_db.upsert_item(settings.COSMOS_CONTAINER_REPORTS, report.model_dump(mode='json'))
            
            # 7. Broadcast final state
            await self.broadcast("incident_updated", incident.model_dump(mode='json'), f"Incident {incident.id} finalized")
            await self.complete_task()
            
            return incident

        except Exception as e:
            await self.think(f"Orchestration error: {str(e)}")
            await self.set_status(AgentStatus.ERROR)
            raise

nexus = NexusOrchestrator()
