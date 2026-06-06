import asyncio
from api.routes.websocket import ws_manager

async def run_insider_threat(speed: float = 1.0):
    events = [
        (0.0, "System", "User john.doe@company.com accessed 8.4GB in 20min at 02:37 IST (Baseline: 700MB/day. Deviation: 1100%)"),
        (1.2, "Sentinel", "Behavioral anomaly detected · Score 61 (borderline) · After-hours"),
        (1.7, "Sentinel", "ThreatSignal → Nexus · Type: Insider Threat"),
        (2.2, "Nexus", "Score 61 · Borderline · Oracle deep analysis required"),
        (3.5, "Oracle", "T1078 (Valid Accounts) + T1030 (Data Transfer Size Limits)"),
        (5.0, "Oracle", "Confidence 64% · Below 70% threshold → requires_human: TRUE (Reason: Could be legitimate backup task)"),
        (5.5, "Nexus", "Human escalation triggered · Partial containment activated"),
        (6.0, "Striker", "Session monitoring intensified · Network traffic captured"),
        (6.4, "Striker", "Data egress throttled: john.doe → 100MB/hr limit"),
        (7.0, "Herald", "CISO executive alert drafted · Legal hold initiated"),
        (7.5, "Herald", "Alert dispatched via email + Teams · Forensic evidence preserved"),
        (8.0, "Nexus", "Incident escalated · Awaiting human analyst · Containment: ACTIVE"),
    ]

    prev_t = 0.0
    for t, agent, msg in events:
        delta = (t - prev_t) / speed
        if delta > 0:
            await asyncio.sleep(delta)
        prev_t = t
        await ws_manager.broadcast("sim_log", {"timestamp": t, "agent": agent, "message": msg})
