import asyncio
import json
import sys
import time

import httpx
import websockets


API_BASE = "http://127.0.0.1:8000"
WS_URL = "ws://127.0.0.1:8000/ws/live"
TOKEN = "dummy-token-for-hackathon"


async def wait_for_type(ws, expected_type: str, timeout: float = 45.0):
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        payload = json.loads(await asyncio.wait_for(ws.recv(), timeout=max(1.0, deadline - time.monotonic())))
        if payload.get("type") == expected_type:
            return payload
    raise AssertionError(f"Timed out waiting for WebSocket event: {expected_type}")


async def main():
    headers = {"Authorization": f"Bearer {TOKEN}"}
    async with websockets.connect(WS_URL) as ws:
        connected = await wait_for_type(ws, "connected")
        assert connected["type"] == "connected"

        snapshot = await wait_for_type(ws, "state_snapshot")
        assert isinstance(snapshot["data"].get("agents"), list)
        assert isinstance(snapshot["data"].get("active_incidents"), list)

        async with httpx.AsyncClient(base_url=API_BASE, headers=headers, timeout=30.0) as client:
            response = await client.post("/api/simulation/run", json={"scenario": "sql_injection", "speed": 6.0})
            response.raise_for_status()

            for event_type in ["simulation_started", "agent_status", "agent_thought", "incident_created", "simulation_complete"]:
                await wait_for_type(ws, event_type)

            incidents = await client.get("/api/incidents/")
            incidents.raise_for_status()
            data = incidents.json()
            assert data, "Expected at least one incident after simulation"

            incident_id = data[0]["id"]
            incident = await client.get(f"/api/incidents/{incident_id}")
            incident.raise_for_status()
            assert incident.json()["id"] == incident_id

    print("E2E simulation check passed")


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except Exception as exc:
        print(f"E2E simulation check failed: {exc}")
        sys.exit(1)
