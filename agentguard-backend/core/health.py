import re
import time
from typing import Any, Dict, Iterable, Optional

from core.config import settings


REQUIRED_SETTINGS = [
    "AZURE_OPENAI_ENDPOINT",
    "AZURE_OPENAI_KEY",
    "AZURE_SEARCH_ENDPOINT",
    "AZURE_SEARCH_KEY",
    "COSMOS_DB_CONNECTION",
    "EVENT_HUB_CONNECTION",
    "SERVICE_BUS_CONNECTION",
    "AZURE_COMMS_CONNECTION",
    "TEAMS_WEBHOOK_URL",
    "POWER_AUTOMATE_BLOCK_IP_URL",
    "POWER_AUTOMATE_REVOKE_SESSION_URL",
    "POWER_AUTOMATE_LOCK_ACCOUNT_URL",
    "AZURE_AD_TENANT_ID",
    "AZURE_AD_CLIENT_ID",
    "AZURE_AD_CLIENT_SECRET",
    "JWT_SECRET",
]

OPTIONAL_SETTINGS = [
    "ALERT_EMAIL_TO",
    "ALERT_SMS_FROM",
    "ALERT_SMS_TO",
]


def setting_status(name: str) -> Dict[str, str]:
    value = getattr(settings, name, None)
    if value is None or str(value).strip() == "":
        return {"status": "missing"}
    return {"status": "present", "masked": mask_value(str(value))}


def mask_value(value: str) -> str:
    if not value:
        return "missing"
    if len(value) <= 8:
        return "present"
    return f"...{value[-4:]}"


def auth_mode() -> str:
    if settings.ENVIRONMENT == "production":
        return "jwt_required"
    return "development_bypass"


def overall_status(services: Dict[str, Dict[str, Any]]) -> str:
    statuses = {service.get("status") for service in services.values()}
    if "error" in statuses:
        return "degraded"
    if "degraded" in statuses or "fallback" in statuses:
        return "degraded"
    return "ok"


def sanitize_text(value: str) -> str:
    value = re.sub(r"https?://[^\s]+", "[redacted-url]", value)
    value = re.sub(r"(AccountKey|SharedAccessKey|accesskey|sig)=([^;\s]+)", r"\1=[redacted]", value, flags=re.IGNORECASE)
    return value


def sanitize_payload(payload: Any) -> Any:
    if isinstance(payload, dict):
        return {key: sanitize_payload(value) for key, value in payload.items()}
    if isinstance(payload, list):
        return [sanitize_payload(value) for value in payload]
    if isinstance(payload, str):
        return sanitize_text(payload)
    return payload


def service_summary(name: str, live: bool, reason: Optional[str] = None, latency_ms: Optional[float] = None) -> Dict[str, Any]:
    status = "ok" if live else "fallback"
    payload: Dict[str, Any] = {"status": status}
    if latency_ms is not None:
        payload["latency_ms"] = round(latency_ms, 2)
    if reason:
        payload["reason"] = reason
    return payload


def config_summary() -> Dict[str, Dict[str, Dict[str, str]]]:
    return {
        "required": {name: setting_status(name) for name in REQUIRED_SETTINGS},
        "optional": {name: setting_status(name) for name in OPTIONAL_SETTINGS},
    }


def print_startup_config_table() -> None:
    rows = []
    for name in REQUIRED_SETTINGS:
        status = setting_status(name)
        rows.append((name, f"{status['status']} {status.get('masked', '')}".strip()))
    for name in OPTIONAL_SETTINGS:
        status = setting_status(name)
        label = status["status"] if status["status"] == "present" else "missing optional"
        rows.append((name, f"{label} {status.get('masked', '')}".strip()))
    rows.append(("ENVIRONMENT", settings.ENVIRONMENT))
    rows.append(("AUTH_MODE", auth_mode()))

    width_name = max(len(name) for name, _ in rows)
    width_value = max(len(value) for _, value in rows)
    border = "+" + "-" * (width_name + 2) + "+" + "-" * (width_value + 2) + "+"
    print(border)
    print(f"| {'AgentGuard Startup Config'.ljust(width_name)} | {'Status'.ljust(width_value)} |")
    print(border)
    for name, value in rows:
        print(f"| {name.ljust(width_name)} | {value.ljust(width_value)} |")
    print(border)


async def timed(call):
    start = time.perf_counter()
    result = await call()
    return result, (time.perf_counter() - start) * 1000


def count_ready_agents(agents: Iterable[Any]) -> Dict[str, int]:
    agent_list = list(agents)
    ready = sum(1 for agent in agent_list if getattr(agent.state, "status", None) != "error")
    return {"initialized": len(agent_list), "ready": ready}
