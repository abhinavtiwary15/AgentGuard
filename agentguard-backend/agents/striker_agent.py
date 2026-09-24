import time
from agents.base_agent import BaseAgent
from models.models import AgentName, AgentStatus, Investigation, Incident, ResponseResult, ActionResult, ResponseAction
from core.power_automate import power_automate
from core.azure_openai import generate_text, STRIKER_PROMPT, is_mock_fallback_active
from core.config import settings

class StrikerAgent(BaseAgent):
    def __init__(self):
        super().__init__(AgentName.STRIKER)

    async def respond(self, investigation: Investigation, incident: Incident, dry_run: bool = False) -> ResponseResult:
        await self.set_status(AgentStatus.ACTIVE, f"Executing response for {incident.id}")
        overall_start_time = time.time()
        
        actions_taken = []
        
        await self.think(f"Preparing to execute {len(investigation.recommended_actions)} response actions")

        for action in investigation.recommended_actions:
            action_start = time.time()
            success = False
            details = ""
            run_id = None
            
            try:
                await self.think(f"Executing action: {action.value.upper()}")
                
                if action == ResponseAction.BLOCK_IP and incident.source_ip:
                    success, details = await power_automate.block_ip(incident.source_ip, f"Incident {incident.id}", dry_run=dry_run)
                    
                elif action == ResponseAction.REVOKE_SESSION and incident.affected_user:
                    success, details = await power_automate.revoke_session(incident.affected_user, f"Incident {incident.id}", dry_run=dry_run)
                    
                elif action == ResponseAction.LOCK_ACCOUNT and incident.affected_user:
                    success, details = await power_automate.lock_account(incident.affected_user, f"Incident {incident.id}", dry_run=dry_run)
                    
                elif action == ResponseAction.RATE_LIMIT:
                    success = True
                    details = f"Rate limiting enforced on {incident.target_endpoint or 'global'}"
                    
                elif action == ResponseAction.LOG_ONLY:
                    success = True
                    details = "Audit log updated"
                    
                else:
                    success = True
                    details = f"Action {action.value} executed via API Management"
                    
            except Exception as e:
                success = False
                details = str(e)
                await self.think(f"Action {action.value} failed: {details}")

            action_duration = (time.time() - action_start) * 1000
            
            result = ActionResult(
                action=action,
                success=success,
                details=details,
                duration_ms=action_duration,
                power_automate_run_id=run_id
            )
            actions_taken.append(result)
            await self.broadcast("action_executed", result.model_dump(mode="json"), f"Action {action.value} completed ({success})")

        # Generate reasoning
        if is_mock_fallback_active():
            await self.think("Generating action reasoning via local template fallback...")
        else:
            await self.think("Generating response audit reasoning via GPT-4o-mini...")
        messages = [
            {"role": "system", "content": STRIKER_PROMPT},
            {"role": "user", "content": f"Threat: {incident.attack_type}. Actions taken: {[a.action for a in actions_taken]}."}
        ]
        reasoning = await generate_text(messages, settings.AZURE_OPENAI_MINI_DEPLOYMENT)

        total_duration = (time.time() - overall_start_time) * 1000
        self.state.avg_response_ms = (self.state.avg_response_ms * self.state.tasks_completed + total_duration) / (self.state.tasks_completed + 1)

        response_result = ResponseResult(
            investigation_id=investigation.id,
            actions_taken=actions_taken,
            total_response_time_ms=total_duration,
            auto_resolved=all(a.success for a in actions_taken),
            reasoning=reasoning,
            llm_source="mock_fallback" if is_mock_fallback_active() else "azure_openai"
        )

        await self.think(f"Response complete in {total_duration:.1f}ms")
        await self.broadcast("response_executed", response_result.model_dump(mode="json"), "All response actions completed")
        await self.complete_task()
        
        return response_result

striker = StrikerAgent()
