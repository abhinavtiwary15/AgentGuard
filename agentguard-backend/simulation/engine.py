import asyncio
from api.routes.websocket import ws_manager
from simulation.scenarios.sql_injection import run_sql_injection
from simulation.scenarios.brute_force import run_brute_force
from simulation.scenarios.insider_threat import run_insider_threat
from agents.sentinel_agent import sentinel
from agents.nexus_orchestrator import nexus
from models.models import LogEntry

class SimulationEngine:
    def __init__(self):
        self.is_running = False

    async def run_scenario(self, scenario_id: str, speed: float = 1.0, dry_run: bool = False):
        if self.is_running:
            await ws_manager.broadcast("simulation_error", {"error": "A simulation is already running"})
            return

        self.is_running = True
        await ws_manager.broadcast("simulation_started", {"scenario": scenario_id, "dry_run": dry_run})
        
        try:
            pipeline_task = asyncio.create_task(self._run_agent_pipeline(scenario_id, dry_run=dry_run))
            if scenario_id == "sql_injection":
                await run_sql_injection(speed)
            elif scenario_id == "brute_force":
                await run_brute_force(speed)
            elif scenario_id == "insider_threat":
                await run_insider_threat(speed)
            else:
                await ws_manager.broadcast("simulation_error", {"error": f"Unknown scenario: {scenario_id}"})
                return

            await pipeline_task
            await ws_manager.broadcast("simulation_complete", {"scenario": scenario_id, "dry_run": dry_run})
        except Exception as e:
            await ws_manager.broadcast("simulation_error", {"error": str(e)})
        finally:
            self.is_running = False

    async def _run_agent_pipeline(self, scenario_id: str, dry_run: bool = False):
        log_entry = self._scenario_log(scenario_id)
        if not log_entry:
            return

        await ws_manager.broadcast("pipeline_status", {
            "mode": "live_backend_processing",
            "scenario": scenario_id,
            "status": "ingested",
            "message": f"Live Detection Engine: Ingesting synthetic telemetry stream for {scenario_id} into Sentinel agent...",
        })
        
        signal = await sentinel.analyze_log(log_entry)
        if signal:
            await ws_manager.broadcast("pipeline_status", {
                "mode": "live_backend_processing",
                "scenario": scenario_id,
                "status": "threat_detected",
                "score": signal.threat_score,
                "message": f"Live Detection Engine: Sentinel emitted ThreatSignal (score: {signal.threat_score}) -> Dispatched to Nexus",
            })
            incident = await nexus.handle_threat(signal, dry_run=dry_run)
            incident_id = incident.id if incident else "N/A"
            await ws_manager.broadcast("pipeline_status", {
                "mode": "live_backend_processing",
                "scenario": scenario_id,
                "status": "pipeline_complete",
                "incident_id": incident_id,
                "message": f"Live Detection Engine: Full agent swarm cycle completed. Incident recorded as {incident_id}",
            })

    def _scenario_log(self, scenario_id: str):
        if scenario_id == "sql_injection":
            return LogEntry(
                source_ip="185.220.101.47",
                endpoint="/api/auth",
                method="POST",
                status_code=200,
                payload="user=admin' OR 1=1--",
                user_agent="curl/8.4",
            )
        if scenario_id == "brute_force":
            return LogEntry(
                source_ip="203.0.113.44",
                endpoint="/api/login",
                method="POST",
                status_code=401,
                payload="500 failed login attempts across rotating IP addresses",
                user_agent="credential-checker/2.1",
            )
        if scenario_id == "insider_threat":
            return LogEntry(
                source_ip="10.14.8.22",
                user_id="john.doe@company.com",
                endpoint="/files/export",
                method="GET",
                status_code=200,
                bytes_transferred=8400000000,
                payload="8.4GB transferred in 20min outside normal working hours",
            )
        return None

engine = SimulationEngine()
