export type Severity = "low" | "medium" | "high" | "critical";
export type IncidentStatus = "detecting" | "investigating" | "responding" | "blocked" | "escalated" | "resolved" | "false_positive";
export type AgentName = "Sentinel" | "Oracle" | "Striker" | "Nexus" | "Herald";
export type AgentStatusType = "idle" | "active" | "busy" | "error";

export interface LogEntry {
  id: string;
  timestamp: string;
  source_ip?: string;
  destination_ip?: string;
  user_id?: string;
  endpoint?: string;
  method?: string;
  status_code?: number;
  payload?: string;
  user_agent?: string;
  bytes_transferred?: number;
  session_id?: string;
}

export interface ThreatSignal {
  id: string;
  timestamp: string;
  threat_score: number;
  suspected_attack_type: string;
  indicators: string[];
  description: string;
  source_agent: AgentName;
}

export interface Investigation {
  id: string;
  classification: Severity;
  attack_type: string;
  confidence: number;
  affected_systems: string[];
  blast_radius: string;
  attacker_profile?: string;
  recommended_actions: string[];
  reasoning: string;
  requires_human: boolean;
  escalation_reason?: string;
}

export interface ResponseResult {
  id: string;
  total_response_time_ms: number;
  auto_resolved: boolean;
  reasoning: string;
  actions_taken: any[];
}

export interface TimelineEntry {
  agent?: string;
  action?: string;
  timestamp?: string;
  details?: string;
}

export interface Incident {
  id: string;
  created_at: string;
  updated_at: string;
  status: IncidentStatus;
  severity?: Severity;
  attack_type: string;
  source_ip?: string;
  target_endpoint?: string;
  affected_user?: string;
  threat_signal?: ThreatSignal;
  investigation?: Investigation;
  response?: ResponseResult;
  ai_summary?: string;
  resolution_notes?: string;
  assigned_agent?: string;
  timeline?: TimelineEntry[];
  false_positive: boolean;
}

export interface AgentState {
  name: AgentName;
  status: AgentStatusType;
  current_task?: string;
  tasks_completed: number;
  tasks_today: number;
  avg_response_ms: number;
  last_active: string;
  thoughts: string[];
}

export interface DashboardMetrics {
  threats_today: number;
  threats_blocked: number;
  critical_active: number;
  investigating: number;
  avg_response_ms: number;
  accuracy_pct: number;
  uptime_pct: number;
  agents_online: number;
  hourly_trend: number[];
  attack_distribution: Record<string, number>;
  response_trend: number[];
  timestamp: string;
}

export interface IncidentReport {
  id?: string;
  incident_id: string;
  generated_at?: string;
  generated_by?: string;
  executive_summary: string;
  technical_summary: string;
  timeline_narrative: string;
  recommendations: string[];
  compliance_notes?: string;
  metrics: {
    detection_time_ms: number;
    severity: string;
  };
}
