from typing import List
from fastapi import WebSocket

from core.config import settings
from core.cosmos_db import cosmos_db

class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        await self.send_personal_message({"type": "connected", "data": "Successfully connected to AgentGuard WebSocket"}, websocket)
        await self.send_personal_message({"type": "state_snapshot", "data": await self.state_snapshot()}, websocket)

    async def state_snapshot(self):
        from agents import sentinel, oracle, striker, nexus, herald

        active_statuses = {"detecting", "investigating", "responding", "escalated"}
        incidents = await cosmos_db.list_items(settings.COSMOS_CONTAINER_INCIDENTS)
        active_incidents = [item for item in incidents if item.get("status") in active_statuses]
        agents = [
            sentinel.state.model_dump(mode="json"),
            oracle.state.model_dump(mode="json"),
            striker.state.model_dump(mode="json"),
            nexus.state.model_dump(mode="json"),
            herald.state.model_dump(mode="json"),
        ]
        return {"agents": agents or [], "active_incidents": active_incidents or []}

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def send_personal_message(self, message: dict, websocket: WebSocket):
        try:
            await websocket.send_json(message)
        except Exception:
            self.disconnect(websocket)

    async def broadcast(self, event_type: str, data: dict, message: str = "", agent: str = ""):
        payload = {
            "type": event_type,
            "agent": agent,
            "message": message,
            "data": data
        }
        dead_connections = []
        for connection in self.active_connections:
            try:
                await connection.send_json(payload)
            except Exception:
                dead_connections.append(connection)
                
        for dead in dead_connections:
            self.disconnect(dead)

ws_manager = ConnectionManager()

# Callback for agents
async def agent_broadcast_callback(agent: str, event_type: str, data: dict, message: str):
    await ws_manager.broadcast(event_type=event_type, data=data, message=message, agent=agent)
