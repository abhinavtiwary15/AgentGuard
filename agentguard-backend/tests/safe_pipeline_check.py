import asyncio
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from agents import herald_agent, oracle_agent, sentinel_agent, striker_agent
from agents.herald_agent import herald
from agents.nexus_orchestrator import nexus
from agents.oracle_agent import oracle
from agents.sentinel_agent import sentinel
from agents.striker_agent import striker
from core import cosmos_db as cosmos_module
from models.models import LogEntry


class FakeCosmos:
    def __init__(self):
        self.items = []

    async def upsert_item(self, container_name, item):
        json.dumps(item)
        self.items.append((container_name, item))
        return item


async def fake_generate_json(messages, deployment):
    content = json.dumps(messages)
    if "incident response" in content.lower() or "executive" in content.lower():
        return {
            "executive_summary": "Automated investigation confirmed a contained SQL injection attempt.",
            "technical_summary": "The request included tautology-based SQL injection markers.",
            "timeline_narrative": "Detection, investigation, response, and reporting completed automatically.",
            "recommendations": ["Review authentication endpoint input validation."],
            "compliance_notes": "No regulated data exposure observed.",
        }
    if "mitre" in content.lower() or "rag" in content.lower():
        return {
            "classification": "high",
            "confidence": 0.92,
            "affected_systems": ["auth-api"],
            "blast_radius": "Single endpoint, no confirmed lateral movement.",
            "attacker_profile": "External opportunistic actor",
            "mitre_mappings": [
                {
                    "technique_id": "T1190",
                    "technique_name": "Exploit Public-Facing Application",
                    "tactic": "Initial Access",
                    "confidence": 0.91,
                }
            ],
            "cve_matches": [],
            "recommended_actions": ["rate_limit", "log_only"],
            "reasoning": "Payload pattern and endpoint context indicate SQL injection.",
            "requires_human": False,
        }
    return {
        "is_threat": True,
        "threat_score": 88,
        "suspected_attack_type": "SQL Injection",
        "indicators": ["tautology_payload", "comment_sequence"],
        "description": "SQL injection payload observed against authentication endpoint.",
    }


async def fake_generate_text(messages, deployment):
    return "Rate limiting and audit logging were applied according to the automated response policy."


async def fake_search(*args, **kwargs):
    return []


async def main():
    sentinel_agent.generate_json = fake_generate_json
    oracle_agent.generate_json = fake_generate_json
    striker_agent.generate_text = fake_generate_text
    herald_agent.generate_json = fake_generate_json

    oracle_agent.search_manager.search_threat_intel = fake_search
    oracle_agent.search_manager.search_mitre = fake_search

    striker_agent.power_automate.block_ip = fake_search
    striker_agent.power_automate.revoke_session = fake_search
    striker_agent.power_automate.lock_account = fake_search

    fake_cosmos = FakeCosmos()
    cosmos_module.cosmos_db = fake_cosmos
    import agents.nexus_orchestrator as nexus_module

    nexus_module.cosmos_db = fake_cosmos

    events = []

    async def capture_event(agent, event_type, data, message):
        json.dumps({"agent": agent, "type": event_type, "data": data, "message": message})
        events.append(event_type)

    for agent in [sentinel, oracle, striker, nexus, herald]:
        agent.set_broadcast_callback(capture_event)

    log_entry = LogEntry(
        source_ip="185.220.101.47",
        endpoint="/api/auth",
        method="POST",
        status_code=200,
        payload="user=admin' OR 1=1--",
        user_agent="curl/8.4",
    )

    signal = await sentinel.analyze_log(log_entry)
    assert signal is not None, "Expected sentinel to detect a threat"

    incident = await nexus.handle_threat(signal)
    assert incident.id.startswith("INC-")
    assert fake_cosmos.items, "Expected incident/report writes to fake Cosmos"

    required_events = {
        "agent_status",
        "agent_thought",
        "threat_detected",
        "incident_created",
        "investigation_complete",
        "action_executed",
        "response_executed",
        "report_generated",
    }
    missing = required_events.difference(events)
    assert not missing, f"Missing expected events: {sorted(missing)}"

    print("Safe pipeline check passed")


if __name__ == "__main__":
    asyncio.run(main())
