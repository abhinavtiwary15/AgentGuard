from datetime import datetime
from models.models import AgentState, AgentName, AgentStatus

class BaseAgent:
    def __init__(self, name: AgentName):
        self.state = AgentState(name=name)
        self.broadcast_callback = None

    def set_broadcast_callback(self, callback):
        self.broadcast_callback = callback

    async def broadcast(self, event_type: str, data: dict, message: str):
        if self.broadcast_callback:
            await self.broadcast_callback(
                agent=self.state.name,
                event_type=event_type,
                data=data,
                message=message
            )

    async def think(self, thought: str):
        self.state.thoughts.append(thought)
        if len(self.state.thoughts) > 50:
            self.state.thoughts.pop(0)
        await self.broadcast("agent_thought", {"thought": thought}, thought)

    async def set_status(self, status: AgentStatus, task: str = None):
        self.state.status = status
        if task is not None:
            self.state.current_task = task
        self.state.last_active = datetime.utcnow()
        await self.broadcast("agent_status", self.state.model_dump(mode="json"), f"Status changed to {status}")

    async def complete_task(self):
        self.state.tasks_completed += 1
        self.state.tasks_today += 1
        await self.set_status(AgentStatus.IDLE, None)
