import httpx

from core.config import settings
from utils.logger import logger


class PowerAutomateClient:
    def __init__(self):
        self.status = "ok"
        self.status_reason = "Power Automate client initialized"

    def health_status(self) -> dict:
        return {"status": self.status, "reason": self.status_reason}

    async def _post_webhook(self, url: str, payload: dict, action_name: str, dry_run: bool = False) -> tuple[bool, str]:
        if dry_run:
            logger.warning("DRY RUN: skipping external webhook [%s]", url)
            self.status = "ok"
            self.status_reason = "Power Automate webhook skipped by dry run"
            return True, f"DRY RUN: {action_name} containment skipped"

        if not url or "mock" in url or "your-id" in url or not url.startswith("http"):
            self.status = "not_configured"
            self.status_reason = "Power Automate webhook not configured"
            logger.info("Power Automate webhook not configured for %s", action_name)
            return False, f"Containment action not executed — no Power Automate webhook configured for {action_name}"

        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(url, json=payload, timeout=10.0)
                response.raise_for_status()
                self.status = "ok"
                self.status_reason = "Power Automate webhook completed"
                return True, f"Containment {action_name} executed successfully via Power Automate (HTTP {response.status_code})"
        except Exception as e:
            self.status = "error"
            self.status_reason = f"Power Automate error: {str(e)[:120]}"
            logger.warning("Power Automate error: %s", str(e)[:200])
            return False, f"Power Automate webhook error: {str(e)[:120]}"

    async def block_ip(self, ip_address: str, reason: str, dry_run: bool = False) -> tuple[bool, str]:
        payload = {"ip_address": ip_address, "reason": reason}
        return await self._post_webhook(settings.POWER_AUTOMATE_BLOCK_IP_URL, payload, "BLOCK_IP", dry_run=dry_run)

    async def revoke_session(self, user_id: str, reason: str, dry_run: bool = False) -> tuple[bool, str]:
        payload = {"user_id": user_id, "reason": reason}
        return await self._post_webhook(settings.POWER_AUTOMATE_REVOKE_SESSION_URL, payload, "REVOKE_SESSION", dry_run=dry_run)

    async def lock_account(self, user_id: str, reason: str, dry_run: bool = False) -> tuple[bool, str]:
        payload = {"user_id": user_id, "reason": reason}
        return await self._post_webhook(settings.POWER_AUTOMATE_LOCK_ACCOUNT_URL, payload, "LOCK_ACCOUNT", dry_run=dry_run)


power_automate = PowerAutomateClient()
