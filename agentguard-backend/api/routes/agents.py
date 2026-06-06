from fastapi import APIRouter, Depends, Request
from typing import List
from models.models import AgentState
from api.dependencies import get_current_user, limiter
from agents import sentinel, oracle, striker, nexus, herald

router = APIRouter(prefix="/api/agents", tags=["agents"], dependencies=[Depends(get_current_user)])

@router.get("/status", response_model=List[AgentState])
@limiter.limit("100/minute")
async def get_agents_status(request: Request):
    return [
        sentinel.state,
        oracle.state,
        striker.state,
        nexus.state,
        herald.state
    ]

@router.get("/{name}/thoughts")
@limiter.limit("100/minute")
async def get_agent_thoughts(request: Request, name: str, limit: int = 50):
    agent_map = {
        "sentinel": sentinel,
        "oracle": oracle,
        "striker": striker,
        "nexus": nexus,
        "herald": herald
    }
    agent = agent_map.get(name.lower())
    if not agent:
        return []
    return agent.state.thoughts[-limit:]

@router.get("/metrics")
@limiter.limit("100/minute")
async def get_agent_metrics(request: Request):
    agents = [sentinel, oracle, striker, nexus, herald]
    return {
        "total_tasks_completed": sum(a.state.tasks_completed for a in agents),
        "total_tasks_today": sum(a.state.tasks_today for a in agents),
        "avg_response_time": sum(a.state.avg_response_ms for a in agents) / 5 if agents else 0,
        "online_agents": sum(1 for a in agents if a.state.status != "error")
    }
