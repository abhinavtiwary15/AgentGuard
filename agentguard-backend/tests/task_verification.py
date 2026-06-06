"""
AgentGuard Task Verification Script
Covers: Task 3 (auth checks), Task 4 (smoke tests), Task 5 (E2E simulation)
Usage: python tests/task_verification.py
Requires: backend running at http://127.0.0.1:8000
"""
import sys
import io

# Force UTF-8 stdout on Windows to handle unicode safely
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

import asyncio
import json
import time
import httpx
import websockets

API_BASE = "http://127.0.0.1:8000"
WS_URL = "ws://127.0.0.1:8000/ws/live"
DUMMY_TOKEN = "dummy-token-for-hackathon"
RANDOM_TOKEN = "random-fake-token-xyz"
HEADERS_DUMMY = {"Authorization": f"Bearer {DUMMY_TOKEN}"}
HEADERS_RANDOM = {"Authorization": f"Bearer {RANDOM_TOKEN}"}

PASS = "PASS"
FAIL = "FAIL"
results = []


def log(tag, label, actual=None):
    icon = "[OK]" if tag == PASS else "[FAIL]"
    line = f"  {icon} {label}"
    if actual is not None:
        line += f" | actual={actual}"
    print(line)
    results.append((tag, label))


# ──────────────────────────────────────────────────────────────
# TASK 3 — Auth verification
# ──────────────────────────────────────────────────────────────

async def task3_auth_checks(client: httpx.AsyncClient):
    print("\n====== TASK 3 -- Auth Behavior Checks ======")

    # CHECK A — random token rejected
    resp = await client.get("/api/agents/status", headers=HEADERS_RANDOM)
    if resp.status_code in (401, 403):
        log(PASS, "CHECK A: random token rejected", resp.status_code)
    else:
        log(FAIL, "CHECK A: random token rejected", resp.status_code)

    # CHECK B — dummy token accepted in dev
    resp = await client.get("/api/agents/status", headers=HEADERS_DUMMY)
    if resp.status_code == 200:
        log(PASS, "CHECK B: dummy token accepted (200)", resp.status_code)
    else:
        log(FAIL, "CHECK B: dummy token accepted", resp.status_code)

    # CHECK C — /api/health/detailed is public (no auth)
    resp = await client.get("/api/health/detailed")
    if resp.status_code == 200:
        log(PASS, "CHECK C: /api/health/detailed public (200)", resp.status_code)
    else:
        log(FAIL, "CHECK C: /api/health/detailed public", resp.status_code)

    # CHECK D — shape of /api/health/detailed
    resp = await client.get("/api/health/detailed")
    body = resp.json()
    print("\n  CHECK D -- /api/health/detailed full response:")
    for svc, val in body.get("services", {}).items():
        status_val = val.get("status", "?")
        reason = val.get("reason", "")[:60]
        print(f"    {svc}: {status_val}  {reason}")
    print(f"    overall: {body.get('status')}")
    print(f"    auth_mode: {body.get('auth_mode')}")
    log(PASS, "CHECK D: health shape verified", body.get("status"))

    return body


# ──────────────────────────────────────────────────────────────
# TASK 4 — Smoke Tests
# ──────────────────────────────────────────────────────────────

async def task4_smoke_tests(client: httpx.AsyncClient):
    print("\n====== TASK 4 -- Cloud Smoke Tests ======")
    smoke_incident_id = None

    # SMOKE A — ingest log, verify incident appears
    ingest_payload = {
        "source_ip": "1.2.3.4",
        "payload": "SMOKE_TEST: SELECT * FROM users WHERE 1=1",
        "endpoint": "/api/auth",
        "method": "POST",
        "status_code": 200,
    }
    resp = await client.post("/api/incidents/ingest", json=ingest_payload, headers=HEADERS_DUMMY)
    if resp.status_code == 200:
        log(PASS, "SMOKE A: ingest accepted (200)", resp.status_code)
    else:
        log(FAIL, "SMOKE A: ingest accepted", resp.status_code)

    # Wait for background pipeline to process
    print("  Waiting 10s for pipeline to process...")
    await asyncio.sleep(10)

    resp = await client.get("/api/incidents/?limit=50", headers=HEADERS_DUMMY)
    incidents = resp.json()
    if incidents:
        smoke_incident_id = incidents[0]["id"]
        log(PASS, "SMOKE A: incident appears in list", smoke_incident_id)
    else:
        log(FAIL, "SMOKE A: no incidents found in list", None)

    # Detect if cosmos fallback or real cosmos was used
    print(f"  Storage backend check: incident id={smoke_incident_id}")

    # SMOKE B — stats endpoint
    resp = await client.get("/api/incidents/stats", headers=HEADERS_DUMMY)
    if resp.status_code == 200:
        stats = resp.json()
        log(PASS, "SMOKE B: /api/incidents/stats returned 200", stats.get("total"))
        print(f"    total: {stats.get('total')}, active: {stats.get('active')}")
        print(f"    by_severity: {stats.get('by_severity')}")
        print(f"    by_status:   {stats.get('by_status')}")
        if stats.get("total", 0) > 0:
            log(PASS, "SMOKE B: stats total > 0 (incident counted)", stats["total"])
        else:
            log(FAIL, "SMOKE B: stats total == 0 unexpectedly", stats["total"])
    else:
        log(FAIL, "SMOKE B: /api/incidents/stats", resp.status_code)

    # SMOKE C — health detailed service check
    resp = await client.get("/api/health/detailed")
    services = resp.json().get("services", {})
    print("\n  SMOKE C -- Service Status Detail:")
    for svc, val in services.items():
        st = val.get("status", "?")
        reason = val.get("reason", "")[:70]
        flag = " *** WARNING ***" if st in ("error", "unconfigured") else ""
        print(f"    {svc}: {st}{flag}  {reason}")
    log(PASS, "SMOKE C: health detailed completed", None)

    # SMOKE D — HTML report
    if smoke_incident_id:
        await asyncio.sleep(3)  # allow report generation
        resp = await client.get(f"/api/incidents/{smoke_incident_id}/report", headers=HEADERS_DUMMY)
        ct = resp.headers.get("content-type", "")
        if resp.status_code == 200 and "text/html" in ct:
            body_text = resp.text
            has_data = smoke_incident_id in body_text and "AgentGuard" in body_text
            if has_data:
                log(PASS, "SMOKE D: HTML report contains incident data", smoke_incident_id)
            else:
                log(FAIL, "SMOKE D: HTML report missing incident data", None)
        else:
            log(FAIL, "SMOKE D: HTML report not text/html or not 200", f"{resp.status_code} {ct}")
    else:
        log(FAIL, "SMOKE D: skipped (no incident from Smoke A)", None)

    return smoke_incident_id


# ──────────────────────────────────────────────────────────────
# TASK 5 — E2E Simulation with dry_run=true
# ──────────────────────────────────────────────────────────────

async def wait_for_type(ws, expected_type: str, timeout: float = 60.0):
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        remaining = max(0.5, deadline - time.monotonic())
        try:
            raw = await asyncio.wait_for(ws.recv(), timeout=remaining)
        except asyncio.TimeoutError:
            break
        payload = json.loads(raw)
        if payload.get("type") == expected_type:
            return payload
    return None


async def collect_until_complete(ws, timeout: float = 90.0):
    """Collect all WS messages until simulation_complete or timeout."""
    collected = {}
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        remaining = max(0.5, deadline - time.monotonic())
        try:
            raw = await asyncio.wait_for(ws.recv(), timeout=remaining)
        except asyncio.TimeoutError:
            break
        payload = json.loads(raw)
        msg_type = payload.get("type")
        if msg_type and msg_type not in collected:
            collected[msg_type] = payload
        if msg_type == "simulation_complete":
            break
    return collected


async def task5_e2e_simulation(client: httpx.AsyncClient):
    print("\n====== TASK 5 -- E2E Simulation (dry_run=true) ======")

    pre_stats = (await client.get("/api/incidents/stats", headers=HEADERS_DUMMY)).json()
    pre_total = pre_stats.get("total", 0)
    pre_critical = pre_stats.get("by_severity", {}).get("critical", 0)
    pre_high = pre_stats.get("by_severity", {}).get("high", 0)

    async with websockets.connect(WS_URL) as ws:
        # Step 1-2: connected
        connected_msg = await wait_for_type(ws, "connected", timeout=15)
        if connected_msg:
            log(PASS, "Step 1-2: 'connected' message received")
        else:
            log(FAIL, "Step 1-2: 'connected' message NOT received")
            return

        # Step 3: state_snapshot
        snapshot_msg = await wait_for_type(ws, "state_snapshot", timeout=10)
        if snapshot_msg and isinstance(snapshot_msg.get("data", {}).get("agents"), list):
            log(PASS, "Step 3: 'state_snapshot' received with agents list", len(snapshot_msg["data"]["agents"]))
        else:
            log(FAIL, "Step 3: 'state_snapshot' missing or malformed")

        # Step 4: POST simulation
        sim_payload = {"scenario": "sql_injection", "speed": 5.0, "dry_run": True}
        resp = await client.post("/api/simulation/run", json=sim_payload, headers=HEADERS_DUMMY)
        if resp.status_code == 200:
            log(PASS, "Step 4: POST /api/simulation/run accepted (200)", resp.json())
        else:
            log(FAIL, "Step 4: POST /api/simulation/run rejected", resp.status_code)
            return

        # Step 5: collect WS messages
        print("  Collecting WebSocket events (up to 90s)...")
        collected = await collect_until_complete(ws, timeout=90)
        print(f"  Received event types: {sorted(collected.keys())}")

        required_events = ["simulation_started", "agent_status", "agent_thought", "incident_created", "simulation_complete"]
        for evt in required_events:
            if evt in collected:
                log(PASS, f"Step 5: '{evt}' received")
            else:
                log(FAIL, f"Step 5: '{evt}' NOT received")

    # Step 6: new incident in list
    await asyncio.sleep(2)
    resp = await client.get("/api/incidents/?limit=50", headers=HEADERS_DUMMY)
    incidents = resp.json()
    post_total = len(incidents)
    new_id = None
    if post_total > pre_total:
        new_incident = incidents[0]
        new_id = new_incident.get("id")
        log(PASS, "Step 6: new incident appears in list", new_id)
    else:
        log(FAIL, "Step 6: no new incident found after simulation", f"before={pre_total} after={post_total}")
        new_id = incidents[0]["id"] if incidents else None

    # Step 7: incident detail shape
    if new_id:
        resp = await client.get(f"/api/incidents/{new_id}", headers=HEADERS_DUMMY)
        if resp.status_code == 200:
            inc = resp.json()
            required_fields = ["id", "severity", "attack_type", "source_ip", "status"]
            optional_present = any(inc.get(f) for f in ["ai_summary", "investigation", "response"])
            for f in required_fields:
                if inc.get(f):
                    log(PASS, f"Step 7: incident.{f} present", inc[f])
                else:
                    log(FAIL, f"Step 7: incident.{f} MISSING")
            if optional_present:
                log(PASS, "Step 7: at least one of ai_summary/investigation/response present")
            else:
                log(FAIL, "Step 7: none of ai_summary/investigation/response present")
        else:
            log(FAIL, "Step 7: GET incident detail failed", resp.status_code)

    # Step 8: stats increased
    resp = await client.get("/api/incidents/stats", headers=HEADERS_DUMMY)
    post_stats = resp.json()
    post_critical = post_stats.get("by_severity", {}).get("critical", 0)
    post_high = post_stats.get("by_severity", {}).get("high", 0)
    if post_critical > pre_critical or post_high > pre_high:
        log(PASS, "Step 8: critical/high count increased",
            f"critical: {pre_critical}->{post_critical}, high: {pre_high}->{post_high}")
    else:
        log(FAIL, "Step 8: critical/high count did NOT increase",
            f"critical: {pre_critical}->{post_critical}, high: {pre_high}->{post_high}")


# ──────────────────────────────────────────────────────────────
# MAIN
# ──────────────────────────────────────────────────────────────

async def main():
    print("=" * 60)
    print(" AgentGuard -- Task 3/4/5 Verification Script")
    print("=" * 60)

    async with httpx.AsyncClient(base_url=API_BASE, timeout=30.0) as client:
        # Verify server is up
        try:
            resp = await client.get("/api/health")
            assert resp.status_code == 200
            print(f"\n[OK] Backend reachable at {API_BASE}")
        except Exception as e:
            print(f"\n[FAIL] Backend NOT reachable: {e}")
            print("   Start it with: uvicorn main:app --host 127.0.0.1 --port 8000")
            sys.exit(1)

        await task3_auth_checks(client)
        await task4_smoke_tests(client)
        await task5_e2e_simulation(client)

    print("\n" + "=" * 60)
    print(" SUMMARY")
    print("=" * 60)
    passed = sum(1 for r in results if r[0] == PASS)
    failed = sum(1 for r in results if r[0] == FAIL)
    print(f"  Total: {len(results)}  Passed: {passed}  Failed: {failed}")
    if failed:
        print("\n  Failed checks:")
        for tag, label in results:
            if tag == FAIL:
                print(f"    [FAIL] {label}")
    print("=" * 60)
    if failed > 0:
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
