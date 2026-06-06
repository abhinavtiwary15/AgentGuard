from enum import Enum
from typing import Any, Dict, List, Optional
from datetime import datetime
from uuid import uuid4
from pydantic import BaseModel, Field

class Severity(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

class IncidentStatus(str, Enum):
    DETECTING = "detecting"
    INVESTIGATING = "investigating"
    RESPONDING = "responding"
    BLOCKED = "blocked"
    ESCALATED = "escalated"
    RESOLVED = "resolved"
    FALSE_POSITIVE = "false_positive"

class AttackType(str, Enum):
    SQL_INJECTION = "SQL Injection"
    XSS = "XSS"
    BRUTE_FORCE = "Brute Force"
    CREDENTIAL_STUFFING = "Credential Stuffing"
    PORT_SCAN = "Port Scan"
    DATA_EXFILTRATION = "Data Exfiltration"
    INSIDER_THREAT = "Insider Threat"
    DDOS = "DDoS"
    PROMPT_INJECTION = "Prompt Injection"
    RANSOMWARE = "Ransomware"
    PHISHING = "Phishing"
    UNKNOWN = "Unknown"

class AgentName(str, Enum):
    SENTINEL = "Sentinel"
    ORACLE = "Oracle"
    STRIKER = "Striker"
    NEXUS = "Nexus"
    HERALD = "Herald"

class AgentStatus(str, Enum):
    IDLE = "idle"
    ACTIVE = "active"
    BUSY = "busy"
    ERROR = "error"

class ResponseAction(str, Enum):
    BLOCK_IP = "block_ip"
    REVOKE_SESSION = "revoke_session"
    LOCK_ACCOUNT = "lock_account"
    RATE_LIMIT = "rate_limit"
    QUARANTINE_ENDPOINT = "quarantine_endpoint"
    NOTIFY_TEAM = "notify_team"
    ESCALATE_HUMAN = "escalate_human"
    LOG_ONLY = "log_only"

class LogEntry(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4()))
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    source_ip: Optional[str] = None
    destination_ip: Optional[str] = None
    user_id: Optional[str] = None
    endpoint: Optional[str] = None
    method: Optional[str] = None
    status_code: Optional[int] = None
    payload: Optional[str] = None
    user_agent: Optional[str] = None
    bytes_transferred: Optional[int] = None
    session_id: Optional[str] = None
    raw: Optional[Dict[str, Any]] = None

class ThreatSignal(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4()))
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    log_entry: LogEntry
    threat_score: float = Field(ge=0, le=100)
    suspected_attack_type: AttackType = AttackType.UNKNOWN
    indicators: List[str] = []
    description: str = ""
    source_agent: AgentName = AgentName.SENTINEL

class MitreMapping(BaseModel):
    technique_id: str
    technique_name: str
    tactic: str
    confidence: float

class CveMatch(BaseModel):
    cve_id: str
    description: str
    severity: str
    cvss_score: float

class Investigation(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4()))
    threat_signal_id: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    classification: Severity
    attack_type: AttackType
    confidence: float = Field(ge=0, le=1)
    affected_systems: List[str] = []
    blast_radius: str = ""
    attacker_profile: Optional[str] = None
    mitre_mappings: List[MitreMapping] = []
    cve_matches: List[CveMatch] = []
    recommended_actions: List[ResponseAction] = []
    reasoning: str = ""
    requires_human: bool = False
    escalation_reason: Optional[str] = None

class ActionResult(BaseModel):
    action: ResponseAction
    success: bool
    details: str
    executed_at: datetime = Field(default_factory=datetime.utcnow)
    duration_ms: float = 0
    power_automate_run_id: Optional[str] = None

class ResponseResult(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4()))
    investigation_id: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    actions_taken: List[ActionResult] = []
    total_response_time_ms: float = 0
    auto_resolved: bool = False
    reasoning: str = ""

class Incident(BaseModel):
    id: str = Field(default_factory=lambda: f"INC-{str(uuid4())[:8].upper()}")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    status: IncidentStatus = IncidentStatus.DETECTING
    severity: Optional[Severity] = None
    attack_type: AttackType = AttackType.UNKNOWN
    source_ip: Optional[str] = None
    target_endpoint: Optional[str] = None
    affected_user: Optional[str] = None
    threat_signal: Optional[ThreatSignal] = None
    investigation: Optional[Investigation] = None
    response: Optional[ResponseResult] = None
    ai_summary: Optional[str] = None
    resolution_notes: Optional[str] = None
    false_positive: bool = False
    assigned_agent: Optional[AgentName] = None
    timeline: List[Dict[str, Any]] = []

class AgentState(BaseModel):
    name: AgentName
    status: AgentStatus = AgentStatus.IDLE
    current_task: Optional[str] = None
    tasks_completed: int = 0
    tasks_today: int = 0
    avg_response_ms: float = 0
    last_active: datetime = Field(default_factory=datetime.utcnow)
    thoughts: List[str] = []

class IncidentReport(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4()))
    incident_id: str
    generated_at: datetime = Field(default_factory=datetime.utcnow)
    generated_by: AgentName = AgentName.HERALD
    executive_summary: str = ""
    technical_summary: str = ""
    timeline_narrative: str = ""
    recommendations: List[str] = []
    metrics: Dict[str, Any] = {}
    compliance_notes: Optional[str] = None

class DashboardMetrics(BaseModel):
    threats_today: int = 0
    threats_blocked: int = 0
    critical_active: int = 0
    investigating: int = 0
    avg_response_ms: float = 0
    accuracy_pct: float = 98.7
    uptime_pct: float = 99.9
    agents_online: int = 5
    hourly_trend: List[int] = []
    attack_distribution: Dict[str, int] = {}
    response_trend: List[float] = []
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class SimulationRequest(BaseModel):
    scenario: str
    speed: float = 1.0
    dry_run: bool = False

class SimulationEvent(BaseModel):
    timestamp: float
    agent: AgentName
    event_type: str
    data: Dict[str, Any]
    message: str
