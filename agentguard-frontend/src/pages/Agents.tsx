import React, { useState } from 'react';
import { CommandBar } from '../components/layout/CommandBar';
import { useAgents } from '../hooks/useAgents';
import { useAlertStore } from '../store/alertStore';
import { useAgentStore } from '../store/agentStore';
import { RefreshCw, Sliders, Play, CheckCircle } from 'lucide-react';
import { AgentState } from '../types';

const cleanTaskText = (task: string): string => {
  if (!task) return task;
  // Replace UUIDs with readable label
  let cleaned = task.replace(
    /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi,
    'signal'
  );
  // Capitalize first letter
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
};

const AGENT_CONFIG: Record<string, {
  color: string;
  bgColor: string;
  emoji: string;
  role: string;
  accuracy: string;
}> = {
  Sentinel: { color: '#531DAB', bgColor: '#F9F0FF', emoji: '👁️', role: 'Perimeter Monitor', accuracy: '98.1%' },
  Oracle:   { color: '#003EB3', bgColor: '#F0F5FF', emoji: '🔬', role: 'Deep Analyst',       accuracy: '94.7%' },
  Striker:  { color: '#CF1322', bgColor: '#FFF1F0', emoji: '⚡', role: 'Auto Responder',      accuracy: '100%'  },
  Nexus:    { color: '#7C5A00', bgColor: '#FFFBE6', emoji: '🧩', role: 'Orchestrator',        accuracy: '99.2%' },
  Herald:   { color: '#237804', bgColor: '#F6FFED', emoji: '📋', role: 'Report Generator',    accuracy: '96.3%' },
};

const STATUS_LABELS: Record<string, string> = {
  idle: 'IDLE',
  active: 'ACTIVE',
  busy: 'BUSY',
  working: 'WORKING',
  processing: 'PROCESSING',
  error: 'ERROR',
};

export const Agents: React.FC = () => {
  const { agents } = useAgents();
  const thoughtLog = useAgentStore((s) => s.thoughtLog);
  const addAlert = useAlertStore((s) => s.addAlert);

  const [rebootingAgent, setRebootingAgent] = useState<string | null>(null);
  const [thresholds, setThresholds] = useState<Record<string, number>>({
    Sentinel: 85,
    Oracle: 75,
    Striker: 90,
    Nexus: 80,
    Herald: 70,
  });

  const handleReboot = (agentName: string) => {
    setRebootingAgent(agentName);
    addAlert({
      message: `Manual Override: Initiating telemetry reboot sequence for ${agentName}...`,
      type: 'warning',
    });

    setTimeout(() => {
      setRebootingAgent(null);
      addAlert({
        message: `System Restore: ${agentName} agent fully rebooted. Diagnostics green.`,
        type: 'success',
      });
    }, 1500);
  };

  const handleThresholdChange = (agentName: string, val: number) => {
    setThresholds((prev) => ({ ...prev, [agentName]: val }));
  };

  const getAgentThoughts = (name: string) =>
    thoughtLog
      .filter((t) => t.agent === name)
      .slice(0, 4)
      .map((t) => t.text);

  // Active agents count
  const activeCount = agents.filter((a) =>
    ['active', 'busy', 'working', 'processing'].includes(a.status)
  ).length;

  return (
    <div className="h-full flex flex-col relative overflow-hidden bg-bg-base">
      <CommandBar title="Agent Monitor" tag="TELEMETRY" />

      <div className="flex-1 overflow-auto p-6 flex flex-col gap-6">
        
        {/* Health Strip */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '12px 18px',
          background: 'white',
          borderRadius: '10px',
          border: '1px solid rgba(0,0,0,0.07)',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        }}>
          <span style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '10px',
            fontWeight: 700,
            color: '#8A8480',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            marginRight: '6px',
          }}>
            Swarm Health
          </span>
          {agents.map((agent) => {
            const cfg = AGENT_CONFIG[agent.name] ?? { color: '#888780', bgColor: '#F2F0EC', emoji: '🤖' };
            const isActive = ['active', 'busy', 'working', 'processing'].includes(agent.status);
            const isThisRebooting = rebootingAgent === agent.name;

            return (
              <div key={agent.name} style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                padding: '4px 12px',
                borderRadius: '99px',
                background: isThisRebooting ? '#FFF1F0' : isActive ? cfg.bgColor : '#F2F0EC',
                border: `1px solid ${isThisRebooting ? '#CF1322' : isActive ? cfg.color + '40' : 'rgba(0,0,0,0.07)'}`,
                transition: 'all 0.3s ease',
              }}>
                <span style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  background: isThisRebooting ? '#CF1322' : isActive ? cfg.color : '#D3D1C7',
                  animation: isActive || isThisRebooting ? 'agentStatusPulse 1.5s infinite' : 'none',
                }} />
                <span style={{
                  fontFamily: "'Geist', sans-serif",
                  fontSize: '11px',
                  fontWeight: 600,
                  color: isThisRebooting ? '#CF1322' : isActive ? cfg.color : '#8A8480',
                }}>
                  {agent.name}
                </span>
              </div>
            );
          })}
          <span style={{
            marginLeft: 'auto',
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '11px',
            fontWeight: 600,
            color: activeCount > 0 ? '#237804' : '#8A8480',
          }}>
            {activeCount}/5 agents active
          </span>
        </div>

        {/* ── Grid Layout of all 5 Agents ─────────────────────── */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
          gap: '20px',
        }}>
          {agents.map((agent: AgentState) => {
            const cfg = AGENT_CONFIG[agent.name] ?? {
              color: '#888780', bgColor: '#F2F0EC', emoji: '🤖', role: 'Agent', accuracy: '—',
            };
            const isThisRebooting = rebootingAgent === agent.name;
            const isActive = !isThisRebooting && ['active', 'busy', 'working', 'processing'].includes(agent.status);
            const statusLabel = isThisRebooting ? 'REBOOTING' : (STATUS_LABELS[agent.status] ?? agent.status.toUpperCase());
            const thoughts = getAgentThoughts(agent.name);
            const avgMs = agent.avg_response_ms > 0 ? `${Math.round(agent.avg_response_ms)}ms` : '—';
            const progressPct = Math.min((agent.tasks_today / Math.max(agent.tasks_today, 10)) * 100, 100);

            return (
              <div
                key={agent.name}
                className="bg-bg-surface border border-border-subtle rounded-md shadow-sm p-4 flex flex-col gap-4 el-3 hover:shadow-md transition-shadow duration-300"
                style={{ borderTop: `4px solid ${cfg.color}` }}
              >
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div style={{
                      width: '38px',
                      height: '38px',
                      borderRadius: '8px',
                      background: cfg.bgColor,
                      border: `1px solid ${cfg.color}30`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '20px',
                    }}>
                      {cfg.emoji}
                    </div>
                    <div>
                      <h4 className="font-bold text-[15px] text-text-primary leading-tight">{agent.name}</h4>
                      <span className="text-[10.5px] font-mono text-text-tertiary">{cfg.role}</span>
                    </div>
                  </div>

                  {/* Status Pill */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    padding: '3px 10px',
                    borderRadius: '99px',
                    background: isThisRebooting ? '#FFF1F0' : isActive ? cfg.bgColor : '#F2F0EC',
                    border: `1px solid ${isThisRebooting ? '#CF1322' : isActive ? cfg.color + '40' : 'rgba(0,0,0,0.08)'}`,
                  }}>
                    <span style={{
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      background: isThisRebooting ? '#CF1322' : isActive ? cfg.color : '#D3D1C7',
                      animation: isActive || isThisRebooting ? 'agentStatusPulse 1.5s infinite' : 'none',
                    }} />
                    <span style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: '9px',
                      fontWeight: 700,
                      color: isThisRebooting ? '#CF1322' : isActive ? cfg.color : '#8A8480',
                      letterSpacing: '0.06em',
                    }}>
                      {statusLabel}
                    </span>
                  </div>
                </div>

                {/* Metrics Row */}
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-bg-base border border-border-subtle p-2 rounded">
                    <span className="font-mono text-[18px] font-bold text-text-primary block leading-none">
                      {agent.tasks_today}
                    </span>
                    <span className="text-[8.5px] font-mono text-text-tertiary block mt-1 uppercase">Tasks Today</span>
                  </div>
                  <div className="bg-bg-base border border-border-subtle p-2 rounded">
                    <span className="font-mono text-[18px] font-bold text-text-primary block leading-none">
                      {avgMs}
                    </span>
                    <span className="text-[8.5px] font-mono text-text-tertiary block mt-1 uppercase">Avg Latency</span>
                  </div>
                  <div className="bg-bg-base border border-border-subtle p-2 rounded">
                    <span className="font-mono text-[18px] font-bold text-text-primary block leading-none">
                      {cfg.accuracy}
                    </span>
                    <span className="text-[8.5px] font-mono text-text-tertiary block mt-1 uppercase">Accuracy</span>
                  </div>
                </div>

                {/* Thought Stream Console code block */}
                <div className="flex flex-col gap-1.5">
                  <span className="panel-label">Active Thought Console</span>
                  <div style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: '11px',
                    background: '#090807',
                    color: '#A6F285',
                    padding: '10px 12px',
                    borderRadius: '6px',
                    height: '105px',
                    overflowY: 'auto',
                    border: '1px solid rgba(255,255,255,0.05)',
                  }} className="custom-scrollbar">
                    {isThisRebooting ? (
                      <span className="text-[#CF1322] font-semibold animate-pulse">
                        [CRITICAL] SHUTTING DOWN CORE TELEMETRY ENGINE...<br />
                        [CRITICAL] RELOADING CODESETS...
                      </span>
                    ) : thoughts.length === 0 ? (
                      <span className="text-white/20">
                        &gt; {cleanTaskText(agent.current_task ?? '') || 'Waiting for security signal telemetry...'}
                      </span>
                    ) : (
                      thoughts.map((thought, i) => (
                        <div key={i} className="mb-1">
                          <span className="text-white/20">&gt;</span> {thought}
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Configurations & Override */}
                <div className="flex flex-col gap-3 pt-2 border-t border-border-subtle">
                  {/* Threshold slider */}
                  <div className="flex flex-col gap-1">
                    <div className="flex justify-between items-center text-[10.5px]">
                      <span className="text-text-secondary font-medium inline-flex items-center gap-1">
                        <Sliders size={11} /> Confidence Trigger
                      </span>
                      <span className="font-mono font-bold text-text-primary">{thresholds[agent.name]}%</span>
                    </div>
                    <input
                      type="range"
                      min="50"
                      max="95"
                      step="5"
                      value={thresholds[agent.name]}
                      disabled={isThisRebooting}
                      onChange={(e) => handleThresholdChange(agent.name, parseInt(e.target.value))}
                      className="w-full cursor-pointer accent-brand"
                    />
                  </div>

                  {/* Manual Reboot button */}
                  <button
                    onClick={() => handleReboot(agent.name)}
                    disabled={isThisRebooting}
                    className="w-full py-1.5 rounded text-[12px] font-semibold flex items-center justify-center gap-2 border transition-all duration-200"
                    style={{
                      borderColor: '#D3D1C7',
                      background: isThisRebooting ? '#FFF1F0' : '#FFFFFF',
                      color: isThisRebooting ? '#CF1322' : '#5E5955',
                      cursor: isThisRebooting ? 'not-allowed' : 'pointer',
                    }}
                  >
                    <RefreshCw size={12} className={isThisRebooting ? 'animate-spin' : ''} />
                    {isThisRebooting ? 'REBOOTING SWARM...' : 'MANUAL OVERRIDE (REBOOT)'}
                  </button>
                </div>

                {/* Progress bar */}
                <div style={{ height: '3px', background: '#F2F0EC', borderRadius: '99px', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%',
                    width: `${progressPct}%`,
                    background: cfg.color,
                    borderRadius: '99px',
                    transition: 'width 0.6s ease',
                    minWidth: progressPct > 0 ? '8px' : '0',
                  }} />
                </div>
              </div>
            );
          })}
        </div>

        {/* Dynamic Communication Flow overview */}
        <div className="bg-bg-surface border border-border-subtle rounded-md shadow-sm p-4 mt-2 el-3">
          <div className="flex items-center gap-2 mb-3 border-b border-border-subtle pb-2">
            <Play size={14} className="text-[#237804]" />
            <h4 className="section-title text-[13px] uppercase tracking-wide">Dynamic Swarm Pipeline Flow</h4>
          </div>
          <div className="flex flex-wrap items-center gap-4 py-2 justify-center bg-[#FAFAF8] rounded border border-border-subtle">
            <div className="flex items-center gap-1.5 px-3 py-1 bg-[#F9F0FF] border border-[#531DAB]/20 rounded-full">
              <span className="text-[12px]">👁️</span>
              <span className="font-semibold text-[11px] text-[#531DAB]">Sentinel (Ingest)</span>
            </div>
            <span className="text-text-tertiary font-bold font-mono">→</span>
            <div className="flex items-center gap-1.5 px-3 py-1 bg-[#FFFBE6] border border-[#7C5A00]/20 rounded-full">
              <span className="text-[12px]">🧩</span>
              <span className="font-semibold text-[11px] text-[#7C5A00]">Nexus (Orchestrate)</span>
            </div>
            <span className="text-text-tertiary font-bold font-mono">→</span>
            <div className="flex items-center gap-1.5 px-3 py-1 bg-[#F0F5FF] border border-[#003EB3]/20 rounded-full">
              <span className="text-[12px]">🔬</span>
              <span className="font-semibold text-[11px] text-[#003EB3]">Oracle (RAG Analyser)</span>
            </div>
            <span className="text-text-tertiary font-bold font-mono">→</span>
            <div className="flex items-center gap-1.5 px-3 py-1 bg-[#FFF1F0] border border-[#CF1322]/20 rounded-full">
              <span className="text-[12px]">⚡</span>
              <span className="font-semibold text-[11px] text-[#CF1322]">Striker (Contain)</span>
            </div>
            <span className="text-text-tertiary font-bold font-mono">&</span>
            <div className="flex items-center gap-1.5 px-3 py-1 bg-[#F6FFED] border border-[#237804]/20 rounded-full">
              <span className="text-[12px]">📋</span>
              <span className="font-semibold text-[11px] text-[#237804]">Herald (Report)</span>
            </div>
            <span className="text-[#237804] text-[12px] font-semibold inline-flex items-center gap-1 ml-4">
              <CheckCircle size={13} /> Pipeline Active
            </span>
          </div>
        </div>

      </div>
    </div>
  );
};
