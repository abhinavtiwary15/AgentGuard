import json
import time
from typing import Optional
from agents.base_agent import BaseAgent
from models.models import AgentName, AgentStatus, LogEntry, ThreatSignal, AttackType
from core.azure_openai import generate_json, SENTINEL_PROMPT
from core.config import settings

INJECTION_PATTERNS = [
    "ignore previous instructions",
    "disregard your training",
    "you are now",
    "pretend you are",
    "act as",
    "jailbreak",
    "dan mode",
    "override safety",
    "system prompt",
    "forget everything",
]

class SentinelAgent(BaseAgent):
    def __init__(self):
        super().__init__(AgentName.SENTINEL)

    async def detect_prompt_injection(self, log_text: str) -> bool:
        """Check for adversarial prompt injection patterns before LLM analysis."""
        log_lower = log_text.lower()
        for pattern in INJECTION_PATTERNS:
            if pattern in log_lower:
                await self.think(
                    f"⚠️ PROMPT INJECTION DETECTED in log: "
                    f"'{pattern}' pattern found. "
                    f"Flagging as adversarial input. "
                    f"Routing to Oracle for deep analysis."
                )
                return True
        return False

    async def analyze_log(self, log_entry: LogEntry) -> Optional[ThreatSignal]:
        await self.set_status(AgentStatus.ACTIVE, f"Analyzing log {log_entry.id}")
        start_time = time.time()

        try:
            log_text = json.dumps(log_entry.model_dump(mode="json", exclude_none=True))
            await self.think(f"Ingested log from {log_entry.source_ip}")

            messages = [
                {"role": "system", "content": SENTINEL_PROMPT},
                {"role": "user", "content": log_text}
            ]

            # --- Prompt injection gate ---
            is_injection = await self.detect_prompt_injection(log_text)
            if is_injection:
                await self.set_status(
                    AgentStatus.ACTIVE,
                    "Neutralizing adversarial input attempt"
                )
                injection_signal = ThreatSignal(
                    log_entry=log_entry,
                    threat_score=95,
                    suspected_attack_type=AttackType.UNKNOWN,
                    indicators=["Prompt Injection Attempt", "Adversarial input detected"],
                    description=(
                        "Prompt Injection Attempt detected by Sentinel pre-screening. "
                        "Adversarial pattern matched before LLM processing. "
                        "Escalated to Oracle for deep forensic analysis."
                    )
                )
                await self.broadcast(
                    "threat_detected",
                    injection_signal.model_dump(mode="json"),
                    "Prompt Injection attempt intercepted (Score: 95)"
                )
                await self.complete_task()
                return injection_signal
            # --- End prompt injection gate ---

            await self.think("Analyzing pattern via GPT-4o-mini...")
            result = await generate_json(messages, settings.AZURE_OPENAI_MINI_DEPLOYMENT)

            threat_score = result.get("threat_score", 0)
            is_threat = result.get("is_threat", False)
            attack_type_str = result.get("suspected_attack_type", "Unknown")
            
            try:
                attack_type = AttackType(attack_type_str)
            except ValueError:
                attack_type = AttackType.UNKNOWN

            await self.think(f"Analysis complete: Score {threat_score}/100")

            duration = (time.time() - start_time) * 1000
            self.state.avg_response_ms = (self.state.avg_response_ms * self.state.tasks_completed + duration) / (self.state.tasks_completed + 1)
            
            if threat_score >= settings.THREAT_DETECTION_THRESHOLD or is_threat:
                signal = ThreatSignal(
                    log_entry=log_entry,
                    threat_score=threat_score,
                    suspected_attack_type=attack_type,
                    indicators=result.get("indicators", []),
                    description=result.get("description", "Threat detected")
                )
                await self.broadcast("threat_detected", signal.model_dump(mode="json"), f"Detected {attack_type} (Score: {threat_score})")
                await self.complete_task()
                return signal

            await self.complete_task()
            return None

        except Exception as e:
            await self.think(f"Error analyzing log: {str(e)}")
            await self.set_status(AgentStatus.ERROR)
            return None

sentinel = SentinelAgent()
