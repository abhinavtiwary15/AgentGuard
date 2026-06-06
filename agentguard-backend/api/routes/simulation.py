from fastapi import APIRouter, Depends, Request, BackgroundTasks, HTTPException
from typing import List, Dict
from models.models import SimulationRequest
from api.dependencies import get_current_user, limiter
from simulation.engine import engine


def _truthy(value: str | None) -> bool:
    return value is not None and value.lower() in {"1", "true", "yes", "on"}

router = APIRouter(prefix="/api/simulation", tags=["simulation"], dependencies=[Depends(get_current_user)])

@router.get("/scenarios", response_model=List[Dict[str, str]])
@limiter.limit("100/minute")
async def list_scenarios(request: Request):
    return [
        {"id": "sql_injection", "name": "SQL Injection Attack"},
        {"id": "brute_force", "name": "Credential Stuffing Campaign"},
        {"id": "insider_threat", "name": "Insider Data Exfiltration Attempt"}
    ]

@router.post("/run")
@limiter.limit("10/minute")
async def run_simulation(request: Request, sim_req: SimulationRequest, background_tasks: BackgroundTasks):
    if engine.is_running:
        raise HTTPException(
            status_code=429,
            detail={
                "error": "simulation_rate_limited",
                "message": "A simulation is already running. Please wait for it to complete.",
                "retry_after_seconds": 15
            },
        )
    dry_run = sim_req.dry_run or _truthy(request.query_params.get("dry_run")) or _truthy(request.headers.get("x-dry-run"))
    background_tasks.add_task(engine.run_scenario, sim_req.scenario, sim_req.speed, dry_run)
    return {"message": f"Simulation {sim_req.scenario} started", "dry_run": dry_run}
