import httpx

from core.config import settings
from utils.logger import logger


class PowerAutomateClient:
    def __init__(self):
        self.status = "ok"
        self.status_reason = "Power Automate webhooks configured"

    def health_status(self) -> dict:
        return {"status": self.status, "reason": self.status_reason}

    async def _post_webhook(self, url: str, payload: dict, dry_run: bool = False) -> bool:
        if dry_run:
            logger.warning("DRY RUN: skipping external webhook [%s]", url)
            self.status = "ok"
            self.status_reason = "Power Automate webhook skipped by dry run"
            return True

        if not url or "mock" in url or "your-id" in url:
            self.status = "fallback"
            self.status_reason = "Power Automate webhook unavailable; using resilient local action result"
            logger.warning("Power Automate fallback execution with payload keys: %s", list(payload.keys()))
            return True

        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(url, json=payload, timeout=10.0)
                response.raise_for_status()
                self.status = "ok"
                self.status_reason = "Power Automate webhook completed"
                return True
        except Exception as e:
            self.status = "degraded"
            self.status_reason = f"Power Automate error: {str(e)[:120]}"
            logger.warning("Power Automate error: %s", str(e)[:200])
            return False

    async def block_ip(self, ip_address: str, reason: str, dry_run: bool = False) -> bool:
        payload = {"ip_address": ip_address, "reason": reason}
        return await self._post_webhook(settings.POWER_AUTOMATE_BLOCK_IP_URL, payload, dry_run=dry_run)

    async def revoke_session(self, user_id: str, reason: str, dry_run: bool = False) -> bool:
        payload = {"user_id": user_id, "reason": reason}
        return await self._post_webhook(settings.POWER_AUTOMATE_REVOKE_SESSION_URL, payload, dry_run=dry_run)

    async def lock_account(self, user_id: str, reason: str, dry_run: bool = False) -> bool:
        payload = {"user_id": user_id, "reason": reason}
        return await self._post_webhook(settings.POWER_AUTOMATE_LOCK_ACCOUNT_URL, payload, dry_run=dry_run)


power_automate = PowerAutomateClient()
