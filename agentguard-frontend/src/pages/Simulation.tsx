import React, { useState, useEffect, useRef } from 'react';
import { CommandBar } from '../components/layout/CommandBar';
import { apiClient } from '../api/client';
import { useAgentStore } from '../store/agentStore';
import { useIncidentStore } from '../store/incidentStore';
import { ShieldAlert, Play, Square, Settings, Sliders, Target, Activity } from 'lucide-react';

type SimStatus = 'idle' | 'running' | 'complete';
type ScenarioKey = 'sql_injection' | 'brute_force' | 'insider_threat';

interface TerminalLine {
  id: string;
  text: string;
  type: 'info' | 'warning' | 'error' | 'success';
}

interface SimResults {
  responseTimeMs: number;
  detectionMs: number;
  classificationMs: number;
  responseMs: number;
  alertsSent: number;
  blocked: boolean;
}

const SCENARIOS = {
  sql_injection: {
    key: 'sql_injection' as ScenarioKey,
    title: 'Scenario Playback: SQL Injection Drill',
    description: 'Narrated SQL injection attack replaying against live Sentinel perimeter detector.',
    severity: 'CRITICAL',
    color: '#CF1322',
  },
  brute_force: {
    key: 'brute_force' as ScenarioKey,
    title: 'Scenario Playback: Credential Stuffing',
    description: 'Narrated auth volume attack triggering live heuristic detection & lockout.',
    severity: 'HIGH',
    color: '#D46B08',
  },
  insider_threat: {
    key: 'insider_threat' as ScenarioKey,
    title: 'Scenario Playback: Insider Threat',
    description: 'Narrated abnormal egress patterns analyzed by live Sentinel & Oracle agents.',
    severity: 'HIGH',
    color: '#7C5A00',
  },
};

const STEPS = [
  { label: 'Ingesting Telemetry', agent: 'Sentinel' },
  { label: 'Threat Isolation', agent: 'Sentinel' },
  { label: 'Nexus Dispatch', agent: 'Nexus' },
  { label: 'Oracle Assessment', agent: 'Oracle' },
  { label: 'Striker Remediation', agent: 'Striker' },
  { label: 'Herald Forensic log', agent: 'Herald' },
];

const FAKE_LOGS: Record<ScenarioKey, string[]> = {
  sql_injection: [
    'SYS-INIT: Perimeter scan active.',
    'API-GATEWAY: 10.230.12.82 - POST /api/v1/auth/login HTTP/1.1',
    'DB-CLIENT: Connection opened for pool 14',
    'API-GATEWAY: 10.230.12.82 - POST /api/v1/query - PAYLOAD: "id=1\' OR 1=1--"',
    'SENTINEL: Analyzing database payload string match...',
    'SENTINEL: Injection signature detected in query parameters!',
    'SENTINEL: Flagging high-severity security event (score: 98/100)',
    'NEXUS: Routing telemetry signals to Oracle intelligence...',
    'ORACLE: RAG Analysis: querying MITRE ATT&CK SQL Injection matrix...',
    'ORACLE: Matched CVE-2024-2182 (OWASP A03:2021-Injection)',
    'ORACLE: Threat verified with 97% confidence',
    'STRIKER: Auto-remediation triggered: blocking IP 10.230.12.82',
    'STRIKER: updating Azure WAF rule #4802',
    'HERALD: Broadcasted SOC report to Slack Channel #sec-ops',
    'HERALD: Forensic report generated: rep-sqli-drill-1',
  ],
  brute_force: [
    'SYS-INIT: Authentication endpoints monitor active.',
    'AUTH-SRV: login attempt failed for user admin (IP: 198.51.100.12)',
    'AUTH-SRV: login attempt failed for user guest (IP: 198.51.100.12)',
    'AUTH-SRV: login attempt failed for user root (IP: 198.51.100.12)',
    'AUTH-SRV: login attempt failed for user support (IP: 198.51.100.12)',
    'SENTINEL: Analyzing rate pattern: 48 failed logins in 800ms',
    'SENTINEL: Rate threshold exceeded for IP 198.51.100.12',
    'SENTINEL: Flagging high-severity brute force event',
    'NEXUS: Dispatching account protection protocols...',
    'ORACLE: Threat Intel check: IP mapped to active Botnet lists',
    'ORACLE: Recommending immediate network block and session revokes',
    'STRIKER: Enforced global lock on accounts (admin, guest)',
    'STRIKER: Blocking route access for 198.51.100.12 via Edge Firewall',
    'HERALD: Alerts broadcasted to Microsoft Teams',
    'HERALD: Forensic report generated: rep-brute-drill-1',
  ],
  insider_threat: [
    'SYS-INIT: Data loss prevention modules active.',
    'DLP-SRV: User account john_doe accessed /departments/finance/salaries.csv',
    'DLP-SRV: User account john_doe accessed /departments/r-and-d/source_code.zip',
    'DLP-SRV: User account john_doe downloaded 820MB inside 2.1s',
    'SENTINEL: Volume anomalies detected for account john_doe',
    'SENTINEL: DLP score exceeded standard threshold (score: 78/100)',
    'SENTINEL: Flagging medium-high behavioral incident',
    'NEXUS: Routing to Oracle for heuristic context classification...',
    'ORACLE: Profile scan: user download limit is 50MB/hour. Alert valid.',
    'ORACLE: Recommendation: require secondary MFA verification',
    'STRIKER: Suspending credential active tokens for john_doe',
    'STRIKER: Enforcing step-up authentication challenge',
    'HERALD: SOC email digest dispatched to Chief Security Officer',
    'HERALD: Forensic report generated: rep-insider-drill-1',
  ],
};

export const Simulation: React.FC = () => {
  const [simStatus, setSimStatus] = useState<SimStatus>('idle');
  const [activeScenario, setActiveScenario] = useState<ScenarioKey>('sql_injection');
  const [speedMultiplier, setSpeedMultiplier] = useState<number>(1.0);
  const [targets, setTargets] = useState({ web: true, db: true, api: true });
  const [currentStep, setCurrentStep] = useState<number>(-1);
  const [terminalLogs, setTerminalLogs] = useState<TerminalLine[]>([]);
  const [results, setResults] = useState<SimResults | null>(null);

  const terminalEndRef = useRef<HTMLDivElement>(null);
  const simStartRef = useRef<number>(0);
  const simStatusRef = useRef<SimStatus>('idle');

  const thoughtLog = useAgentStore((s) => s.thoughtLog);
  const incidents = useIncidentStore((s) => s.incidents);

  // Sync ref to avoid closure issues in callbacks
  useEffect(() => {
    simStatusRef.current = simStatus;
  }, [simStatus]);

  // Terminal autoscroll
  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [terminalLogs]);

  // Handle fake log generator during simulation
  useEffect(() => {
    if (simStatus !== 'running') return;

    const selectedLogs = FAKE_LOGS[activeScenario];
    let logIndex = 0;
    setTerminalLogs([
      { id: 'start', text: `[SYSTEM] Initializing cinematic drill: ${SCENARIOS[activeScenario].title}`, type: 'info' },
    ]);

    const intervalTime = 1200 / speedMultiplier;
    const logTimer = setInterval(() => {
      if (logIndex < selectedLogs.length) {
        const text = selectedLogs[logIndex];
        let type: TerminalLine['type'] = 'info';

        if (text.includes('SENTINEL') || text.includes('detected') || text.includes('failed')) {
          type = 'warning';
        } else if (text.includes('ALERT') || text.includes('Injection') || text.includes('block')) {
          type = 'error';
        } else if (text.includes('report') || text.includes('success')) {
          type = 'success';
        }

        setTerminalLogs((prev) => [...prev, { id: String(Date.now() + logIndex), text: `[LOG] ${text}`, type }]);
        logIndex++;
      } else {
        clearInterval(logTimer);
      }
    }, intervalTime);

    return () => clearInterval(logTimer);
  }, [simStatus, activeScenario, speedMultiplier]);

  // Listen to agent thoughts during simulation and move steps forward
  const prevThoughtLengthRef = useRef(thoughtLog.length);
  useEffect(() => {
    if (simStatus !== 'running') {
      prevThoughtLengthRef.current = thoughtLog.length;
      return;
    }

    if (thoughtLog.length > prevThoughtLengthRef.current) {
      const newEntries = thoughtLog.slice(0, thoughtLog.length - prevThoughtLengthRef.current);
      newEntries.forEach((entry) => {
        // Map agents to step index
        setCurrentStep((prev) => {
          const agentStepMap: Record<string, number> = {
            Sentinel: 1,
            Nexus: 2,
            Oracle: 3,
            Striker: 4,
            Herald: 5,
          };
          const agentStep = agentStepMap[entry.agent];
          return agentStep !== undefined && agentStep > prev ? agentStep : prev;
        });
      });
    }
    prevThoughtLengthRef.current = thoughtLog.length;
  }, [thoughtLog, simStatus]);

  // Listen to database incidents count to advance steps
  const prevIncidentCountRef = useRef(incidents.length);
  useEffect(() => {
    if (simStatus === 'running' && incidents.length > prevIncidentCountRef.current) {
      setCurrentStep((prev) => Math.max(prev, 1));
    }
    prevIncidentCountRef.current = incidents.length;
  }, [incidents, simStatus]);

  const handleLaunch = async () => {
    if (simStatus === 'running') return;

    setSimStatus('running');
    setCurrentStep(0);
    setTerminalLogs([]);
    setResults(null);
    simStartRef.current = Date.now();
    prevThoughtLengthRef.current = thoughtLog.length;
    prevIncidentCountRef.current = incidents.length;

    try {
      console.log('Launching:', activeScenario, 'to:', import.meta.env.VITE_API_URL);
      const response = await apiClient.post('/simulation/run', {
        scenario: activeScenario,
        speed: speedMultiplier,
        dry_run: false,
      });
      console.log('Response:', response.data);
    } catch (err: any) {
      setSimStatus('idle');
      console.error('Full error:', err);
      console.error('Response:', err?.response?.data);
      console.error('Status:', err?.response?.status);
      alert(`Launch failed: ${err?.response?.status} - ${JSON.stringify(err?.response?.data)}`);
      return;
    }

    // Auto-complete after 18s / speed multiplier
    const totalDuration = 18000 / speedMultiplier;
    const timeout = setTimeout(() => {
      if (simStatusRef.current === 'running') {
        const elapsed = Date.now() - simStartRef.current;
        setCurrentStep(5);
        setResults({
          responseTimeMs: Math.round(elapsed / speedMultiplier),
          detectionMs: Math.round(180 / speedMultiplier),
          classificationMs: Math.round(1200 / speedMultiplier),
          responseMs: Math.round(620 / speedMultiplier),
          alertsSent: activeScenario === 'insider_threat' ? 1 : 2,
          blocked: activeScenario !== 'insider_threat',
        });
        setSimStatus('complete');
        setTerminalLogs((prev) => [
          ...prev,
          { id: 'done', text: '[SYSTEM] Simulation completed. Containment verified.', type: 'success' },
        ]);
      }
    }, totalDuration);

    return () => clearTimeout(timeout);
  };

  const handleReset = () => {
    setSimStatus('idle');
    setCurrentStep(-1);
    setTerminalLogs([]);
    setResults(null);
  };

  return (
    <div className="min-h-full flex flex-col relative bg-bg-base">
      <CommandBar title="Scenario Playback Lab" tag="DUAL-RUN SANDBOX" />

      {/* Architecture Transparency Banner */}
      <div className="px-6 pt-4 pb-0">
        <div className="bg-bg-surface border border-border-subtle rounded-md px-4 py-2.5 flex items-center justify-between text-[11px] text-text-secondary">
          <div className="flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-brand animate-pulse"></span>
            <span><strong>Dual-Run Architecture:</strong> This lab plays back a narrated scenario timeline while concurrently ingesting synthetic telemetry into the live Sentinel → Nexus → Oracle → Striker pipeline.</span>
          </div>
          <span className="font-mono text-text-tertiary">Real Telemetry Ingestion</span>
        </div>
      </div>

      {/* Main split dashboard area */}
      <div className="flex-1 flex gap-6 p-6 overflow-auto" style={{ minHeight: '600px' }}>
        
        {/* LEFT COLUMN: Configuration */}
        <div className="w-[320px] bg-bg-surface border border-border-subtle rounded-md shadow-sm p-4 flex flex-col justify-between shrink-0 h-full overflow-y-auto">
          <div className="flex flex-col gap-5">
            <div className="flex items-center gap-2 border-b border-border-subtle pb-2">
              <Settings size={16} className="text-text-secondary" />
              <h4 className="section-title text-[13px] uppercase tracking-wide">Drill Config</h4>
            </div>

            {/* Scenario selector */}
            <div className="flex flex-col gap-2">
              <span className="panel-label">Select Drill Threat Vector</span>
              {Object.values(SCENARIOS).map((scenario) => (
                <button
                  key={scenario.key}
                  onClick={() => {
                    if (simStatus !== 'running') {
                      setActiveScenario(scenario.key);
                    }
                  }}
                  disabled={simStatus === 'running'}
                  style={{
                    border: activeScenario === scenario.key ? `1.5px solid ${scenario.color}` : '1px solid #D3D1C7',
                    background: activeScenario === scenario.key ? `${scenario.color}08` : '#FFFFFF',
                    textAlign: 'left',
                    padding: '10px',
                    borderRadius: '6px',
                    cursor: simStatus === 'running' ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-semibold text-[13px] text-text-primary">{scenario.title}</span>
                    <span style={{
                      fontSize: '9px',
                      background: activeScenario === scenario.key ? scenario.color : '#F2F0EC',
                      color: activeScenario === scenario.key ? '#FFFFFF' : '#8A8480',
                      padding: '1px 5px',
                      borderRadius: '3px',
                      fontWeight: 700,
                    }}>{scenario.severity}</span>
                  </div>
                  <p className="text-[11px] text-text-tertiary leading-relaxed">{scenario.description}</p>
                </button>
              ))}
            </div>

            {/* Target endpoints */}
            <div className="flex flex-col gap-2">
              <span className="panel-label inline-flex items-center gap-1">
                <Target size={11} /> Targets
              </span>
              <div className="flex gap-4">
                {Object.keys(targets).map((key) => (
                  <label key={key} className="flex items-center gap-1.5 cursor-pointer text-[12px]">
                    <input
                      type="checkbox"
                      checked={targets[key as keyof typeof targets]}
                      disabled={simStatus === 'running'}
                      onChange={(e) => {
                        if (simStatus !== 'running') {
                          setTargets((prev) => ({ ...prev, [key]: e.target.checked }));
                        }
                      }}
                      className="rounded text-brand border-border-strong cursor-pointer"
                    />
                    <span className="capitalize">{key}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Speed slider */}
            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-center">
                <span className="panel-label inline-flex items-center gap-1">
                  <Sliders size={11} /> Simulation Speed
                </span>
                <span className="font-mono text-[11px] text-text-secondary">{speedMultiplier.toFixed(1)}x</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="3.0"
                step="0.5"
                value={speedMultiplier}
                disabled={simStatus === 'running'}
                onChange={(e) => setSpeedMultiplier(parseFloat(e.target.value))}
                className="w-full cursor-pointer accent-brand"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-border-subtle flex flex-col gap-2">
            {simStatus === 'running' ? (
              <button
                onClick={handleReset}
                className="w-full py-2 bg-[#CF1322] hover:bg-[#A6101B] text-white font-semibold text-[13px] rounded-md transition-colors flex items-center justify-center gap-2"
              >
                <Square size={13} fill="white" />
                ABORT DRILL
              </button>
            ) : (
              <button
                onClick={handleLaunch}
                className="w-full py-2 bg-brand text-white font-semibold text-[13px] rounded-md hover:bg-brand-hover transition-colors flex items-center justify-center gap-2"
              >
                <Play size={13} fill="white" />
                LAUNCH DRILL
              </button>
            )}
            {simStatus === 'complete' && (
              <button
                onClick={handleReset}
                className="w-full py-1.5 bg-[#F2F0EC] hover:bg-[#E9E8E5] text-text-secondary border border-border-strong font-semibold text-[12px] rounded-md transition-colors"
              >
                Reset Drill Console
              </button>
            )}
          </div>
        </div>

        {/* CENTER COLUMN: ASCII Terminal */}
        <div className="flex-1 bg-[#090807] border border-brand/20 rounded-md p-4 flex flex-col min-h-0 shadow-lg relative">
          {/* Scanline CRT overlay */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[size:100%_4px,3px_100%] pointer-events-none rounded-md" />

          {/* Terminal header */}
          <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-3 z-10 shrink-0">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-[#CF1322]" />
              <span className="w-3 h-3 rounded-full bg-[#D46B08]" />
              <span className="w-3 h-3 rounded-full bg-[#237804]" />
              <span className="font-mono text-[10px] text-white/40 ml-2">sandbox@agentguard-soc:~</span>
            </div>
            {simStatus === 'running' && (
              <span className="text-[10px] font-mono text-[#D46B08] animate-pulse flex items-center gap-1.5">
                <Activity size={10} /> INJECTING Telemetry...
              </span>
            )}
          </div>

          {/* Terminal log rows */}
          <div className="flex-1 overflow-y-auto font-mono text-[11.5px] leading-relaxed z-10 pr-2 custom-scrollbar">
            {terminalLogs.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-white/30 gap-2 select-none">
                <span className="text-center font-mono">
                  =======================================================<br />
                  AGENTGUARD SANDBOX DRILL v1.4.0<br />
                  =======================================================<br />
                  Awaiting configuration. Select drill vector on the left.
                </span>
              </div>
            ) : (
              terminalLogs.map((log) => (
                <div
                  key={log.id}
                  style={{
                    color: log.type === 'error' ? '#F5222D'
                         : log.type === 'warning' ? '#FAAD14'
                         : log.type === 'success' ? '#52C41A'
                         : '#A6F285',
                  }}
                  className="mb-1"
                >
                  {log.text}
                </div>
              ))
            )}
            <div ref={terminalEndRef} />
          </div>
        </div>

        {/* RIGHT COLUMN: Swarm Reactions & Results */}
        <div className="w-[360px] bg-bg-surface border border-border-subtle rounded-md shadow-sm p-4 flex flex-col justify-between shrink-0 h-full overflow-y-auto">
          
          <div className="flex flex-col gap-4 min-h-0">
            <div className="flex items-center gap-2 border-b border-border-subtle pb-2">
              <ShieldAlert size={16} className="text-brand" />
              <h4 className="section-title text-[13px] uppercase tracking-wide">Swarm Reaction</h4>
            </div>

            {/* Steps Progress */}
            <div className="flex flex-col gap-3.5">
              {STEPS.map((step, idx) => {
                const isDone = currentStep > idx || simStatus === 'complete';
                const isActive = simStatus === 'running' && currentStep === idx;
                const statusColor = isDone ? '#237804' : isActive ? '#D46B08' : '#D3D1C7';

                return (
                  <div key={idx} className="flex gap-3 items-center">
                    <div
                      style={{
                        width: '22px',
                        height: '22px',
                        borderRadius: '50%',
                        background: isDone ? '#237804' : isActive ? '#D46B08' : '#FFFFFF',
                        border: `2px solid ${statusColor}`,
                        color: isDone || isActive ? '#FFFFFF' : '#8A8480',
                      }}
                      className={`flex items-center justify-center font-mono text-[10px] font-bold shrink-0 ${
                        isActive ? 'animate-pulse' : ''
                      }`}
                    >
                      {idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center">
                        <span className={`text-[12px] font-semibold ${
                          isDone ? 'text-text-primary line-through opacity-60' : isActive ? 'text-text-primary' : 'text-text-tertiary'
                        }`}>{step.label}</span>
                        <span style={{
                          fontFamily: "'JetBrains Mono', monospace",
                          fontSize: '9px',
                          color: isDone ? '#237804' : isActive ? '#D46B08' : '#8A8480',
                          fontWeight: 600,
                        }}>{step.agent}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Results display */}
          <div className="mt-4 pt-4 border-t border-border-subtle shrink-0">
            {results && simStatus === 'complete' ? (
              <div className="flex flex-col gap-3">
                <span className="panel-label inline-flex items-center gap-1 text-[#237804]">
                  ✔ Response Analytics
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-bg-base border border-border-subtle p-2 rounded text-center">
                    <span className="text-[10px] text-text-tertiary block font-mono">Response Time</span>
                    <span className="text-[16px] font-bold text-text-primary font-mono">
                      {(results.responseTimeMs / 1000).toFixed(1)}s
                    </span>
                  </div>
                  <div className="bg-bg-base border border-border-subtle p-2 rounded text-center">
                    <span className="text-[10px] text-text-tertiary block font-mono">Auto-Containment</span>
                    <span className="text-[13px] font-bold text-[#237804] block mt-0.5">
                      {results.blocked ? 'ENGAGED' : 'ESCALATED'}
                    </span>
                  </div>
                  <div className="bg-bg-base border border-border-subtle p-2 rounded text-center">
                    <span className="text-[10px] text-text-tertiary block font-mono">Telemetry Scan</span>
                    <span className="text-[14px] font-semibold text-text-secondary font-mono">
                      {results.detectionMs}ms
                    </span>
                  </div>
                  <div className="bg-bg-base border border-border-subtle p-2 rounded text-center">
                    <span className="text-[10px] text-text-tertiary block font-mono">Intel Check</span>
                    <span className="text-[14px] font-semibold text-text-secondary font-mono">
                      {results.classificationMs}ms
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-bg-base border border-dashed border-border-strong p-4 rounded text-center text-text-tertiary text-[11px] leading-relaxed">
                Start the sandbox drill to capture response times, auto-containment actions, and Swarm forensics.
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
};
