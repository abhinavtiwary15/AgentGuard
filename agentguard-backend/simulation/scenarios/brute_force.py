import asyncio
from api.routes.websocket import ws_manager

async def run_brute_force(speed: float = 1.0):
    events = [
        (0.0, "System", "500 failed login attempts in 30s from 47 rotating IPs"),
        (1.0, "Sentinel", "Velocity anomaly · 16.7 req/s · Rotating IP pattern · Score 76/100"),
        (1.5, "Sentinel", "ThreatSignal → Nexus: Credential Stuffing · Score 76"),
        (2.0, "Nexus", "HIGH severity · Oracle assigned · Striker on standby"),
        (3.0, "Oracle", "T1110.004 match · Known botnet signature 89% · No successful logins"),
        (4.0, "Striker", "Rate limiting enforced: /api/login → 10 req/min"),
        (4.4, "Striker", "CAPTCHA challenge injected for all login attempts"),
        (4.8, "Striker", "47 source IPs blocked in Azure Firewall"),
        (5.2, "Striker", "12 potentially affected users notified via Azure Comms"),
        (6.0, "Herald", "Report generated · Teams alert sent"),
        (6.5, "Nexus", "Campaign neutralized · 47 IPs blocked · 0 successful breaches"),
    ]

    prev_t = 0.0
    for t, agent, msg in events:
        delta = (t - prev_t) / speed
        if delta > 0:
            await asyncio.sleep(delta)
        prev_t = t
        await ws_manager.broadcast("sim_log", {"timestamp": t, "agent": agent, "message": msg})
