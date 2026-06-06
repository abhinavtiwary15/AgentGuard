import asyncio
from api.routes.websocket import ws_manager

async def emit(t: float, agent: str, msg: str, speed: float):
    # Simulate time passing relative to previous event if we were doing a real timeline runner,
    # but for this simple simulation we just sleep the delta (simplified by just waiting the expected time).
    # In a real implementation we'd calculate deltas. Here we just sleep.
    # We will assume emit is called sequentially and we just use asyncio.sleep for the deltas.
    # But since t is absolute time from start, we could also use a base time.
    pass # Managed by the runner

async def run_sql_injection(speed: float = 1.0):
    events = [
        (0.0, "System", "HTTP request logged: POST /api/auth?user=admin'OR+1=1-- from 185.220.101.47"),
        (0.8, "Sentinel", "Threat score 87/100 · SQL injection pattern detected · TOR exit node"),
        (1.0, "Sentinel", "ThreatSignal emitted → Nexus"),
        (1.3, "Nexus", "Score 87 > threshold 70 · Auto-response authorized · Routing to Oracle"),
        (2.0, "Oracle", "RAG search initiated · MITRE ATT&CK + CVE database"),
        (3.2, "Oracle", "T1190 match 94.2% · CVE-2024-1234 (CVSS 9.8) · Classification: CRITICAL"),
        (3.7, "Oracle", "Investigation complete · Blast radius: auth endpoint only · requires_human: false"),
        (4.2, "Striker", "Executing BLOCK_IP 185.220.101.47 → Azure Firewall"),
        (4.5, "Striker", "✅ IP blocked (312ms) · Power Automate: BLOCK_AND_NOTIFY flow executed"),
        (4.8, "Striker", "✅ Sessions revoked via Azure AD (189ms)"),
        (5.0, "Striker", "✅ Rate limit enforced: /api/auth → 10 req/min (94ms)"),
        (5.5, "Herald", "Generating incident report INC-SIM-001"),
        (6.3, "Herald", "✅ Report generated · Teams alert → #security-ops"),
        (6.5, "Nexus", "✅ INC-SIM-001 RESOLVED · Total response: 1.2s · No data loss"),
    ]

    prev_t = 0.0
    for t, agent, msg in events:
        delta = (t - prev_t) / speed
        if delta > 0:
            await asyncio.sleep(delta)
        prev_t = t
        await ws_manager.broadcast("sim_log", {"timestamp": t, "agent": agent, "message": msg})
