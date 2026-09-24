from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Request
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from api.dependencies import limiter
from api.routes import incidents, agents, reports, simulation, auth
from api.routes.websocket import ws_manager, agent_broadcast_callback
from core.config import settings
from contextlib import asynccontextmanager
from core.health import auth_mode, config_summary, count_ready_agents, overall_status, print_startup_config_table, sanitize_payload
from core.azure_openai import health_status as openai_health_status
from core.azure_search import search_manager
from core.cosmos_db import cosmos_db
from core.event_hub import event_hub
from core.service_bus import service_bus
from core.power_automate import power_automate
from utils.logger import logger

import asyncio
import json
from models.models import LogEntry
from agents import sentinel, oracle, striker, nexus, herald

@asynccontextmanager
async def lifespan(app: FastAPI):
    print_startup_config_table()
    if settings.ENVIRONMENT == "development":
        logger.warning(
            "⚠️  DEV HARNESS ACTIVE — 'dummy-token-for-hackathon' "
            "bypasses JWT only in development. Set ENVIRONMENT=production for strict auth."
        )
    # Automatically seed default administrator if no users exist
    try:
        await auth.seed_default_admin_if_empty()
    except Exception as e:
        logger.warning("Could not seed default admin user: %s", e)

    # Set broadcast callbacks for all agents
    sentinel.set_broadcast_callback(agent_broadcast_callback)
    oracle.set_broadcast_callback(agent_broadcast_callback)
    striker.set_broadcast_callback(agent_broadcast_callback)
    nexus.set_broadcast_callback(agent_broadcast_callback)
    herald.set_broadcast_callback(agent_broadcast_callback)

    # Wire Event Hub streaming consumer if real connection string is configured
    eh_task = None
    if not event_hub.use_mock:
        async def on_eh_batch(partition_context, events):
            for event in events:
                try:
                    payload = json.loads(event.body_as_str())
                    log_entry = LogEntry(**payload)
                    sig = await sentinel.analyze_log(log_entry)
                    if sig:
                        await nexus.handle_threat(sig)
                except Exception as ex:
                    logger.warning("Event Hub event parsing error: %s", ex)
            await partition_context.update_checkpoint()

        async def on_eh_error(partition_context, err):
            logger.warning("Event Hub receiver error: %s", err)

        eh_task = asyncio.create_task(event_hub.start_receiving(on_eh_batch, on_eh_error))
        logger.info("Event Hub streaming listener active on '%s'", settings.EVENT_HUB_NAME)

    yield

    # Cleanup
    if eh_task:
        eh_task.cancel()

app = FastAPI(title=settings.APP_NAME, docs_url="/api/docs", lifespan=lifespan)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(incidents.router)
app.include_router(agents.router)
app.include_router(reports.router)
app.include_router(simulation.router)

@app.get("/")
async def root():
    return {"service": settings.APP_NAME, "version": "1.0.0"}

@app.get("/api/health")
async def health_check():
    return {"status": "ok"}

@app.get("/api/health/detailed")
async def detailed_health_check():
    services = {
        "azure_openai": openai_health_status(),
        "cosmos_db": cosmos_db.health_status(),
        "azure_search": search_manager.health_status(),
        "event_hub": event_hub.health_status(),
        "service_bus": service_bus.health_status(),
        "power_automate": power_automate.health_status(),
    }
    agents = [sentinel, oracle, striker, nexus, herald]
    return sanitize_payload({
        "status": overall_status(services),
        "environment": settings.ENVIRONMENT,
        "auth_mode": auth_mode(),
        "services": services,
        "agents": count_ready_agents(agents),
        "config": config_summary(),
    })

@app.websocket("/ws/live")
async def websocket_endpoint(websocket: WebSocket):
    await ws_manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_json()
            if data.get("type") == "ping":
                await websocket.send_json({"type": "heartbeat"})
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)
