import time
import json
from agents.base_agent import BaseAgent
from models.models import AgentName, AgentStatus, ThreatSignal, Investigation, Severity, MitreMapping, CveMatch, ResponseAction
from core.azure_openai import generate_json, ORACLE_PROMPT, is_mock_fallback_active
from core.azure_search import search_manager
from core.config import settings

class OracleAgent(BaseAgent):
    def __init__(self):
        super().__init__(AgentName.ORACLE)

    async def investigate(self, signal: ThreatSignal) -> Investigation:
        await self.set_status(AgentStatus.ACTIVE, f"Investigating threat {signal.id}")
        start_time = time.time()

        try:
            await self.think(f"Initiating RAG search for attack type: {signal.suspected_attack_type}")
            
            # Semantic search against CVE and MITRE databases
            threat_context = await search_manager.search_threat_intel(signal.description)
            mitre_context = await search_manager.search_mitre(signal.suspected_attack_type)
            
            await self.think(f"Retrieved {len(threat_context)} threat intel records and {len(mitre_context)} MITRE mappings")

            context_data = {
                "signal": signal.model_dump(mode="json"),
                "rag_threat_intel": threat_context,
                "rag_mitre": mitre_context
            }

            messages = [
                {"role": "system", "content": ORACLE_PROMPT},
                {"role": "user", "content": json.dumps(context_data)}
            ]

            if is_mock_fallback_active():
                await self.think("Synthesizing context via local heuristic fallback (Azure OpenAI unconfigured)...")
            else:
                await self.think("Synthesizing context via GPT-4o...")
            result = await generate_json(messages, settings.AZURE_OPENAI_GPT4O_DEPLOYMENT)

            classification = Severity(result.get("classification", "medium"))
            confidence = result.get("confidence", 0.5)

            mitre_mappings = [MitreMapping(**m) for m in result.get("mitre_mappings", [])]
            cve_matches = [CveMatch(**c) for c in result.get("cve_matches", [])]
            recommended_actions = [ResponseAction(a) for a in result.get("recommended_actions", []) if a in [e.value for e in ResponseAction]]

            requires_human = result.get("requires_human", False)
            if confidence < settings.HUMAN_ESCALATION_CONFIDENCE:
                requires_human = True
                await self.think("Confidence below threshold. Flagging for human escalation.")

            investigation = Investigation(
                threat_signal_id=signal.id,
                classification=classification,
                attack_type=signal.suspected_attack_type,
                confidence=confidence,
                affected_systems=result.get("affected_systems", []),
                blast_radius=result.get("blast_radius", ""),
                attacker_profile=result.get("attacker_profile"),
                mitre_mappings=mitre_mappings,
                cve_matches=cve_matches,
                recommended_actions=recommended_actions,
                reasoning=result.get("reasoning", ""),
                requires_human=requires_human,
                escalation_reason=result.get("escalation_reason"),
                llm_source=result.get("llm_source", "mock_fallback" if is_mock_fallback_active() else "azure_openai")
            )

            await self.think(f"Investigation complete. Severity: {classification.upper()} | Confidence: {confidence*100}%")

            duration = (time.time() - start_time) * 1000
            self.state.avg_response_ms = (self.state.avg_response_ms * self.state.tasks_completed + duration) / (self.state.tasks_completed + 1)
            
            await self.broadcast("investigation_complete", investigation.model_dump(mode="json"), f"Completed investigation (Severity: {classification})")
            await self.complete_task()
            
            return investigation

        except Exception as e:
            await self.think(f"Error during investigation: {str(e)}")
            await self.set_status(AgentStatus.ERROR)
            # Return a fallback investigation
            return Investigation(
                threat_signal_id=signal.id,
                classification=Severity.MEDIUM,
                attack_type=signal.suspected_attack_type,
                confidence=0.5,
                reasoning=f"Investigation failed due to internal error: {str(e)}",
                requires_human=True,
                escalation_reason="Investigation failed"
            )

oracle = OracleAgent()
