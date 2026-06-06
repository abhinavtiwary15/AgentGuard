import React, { useState, useEffect, useRef } from 'react';
import { useAgents } from '../../hooks/useAgents';
import { Eye, Microscope, Zap, Network, MessageSquare } from 'lucide-react';

const cleanTaskText = (task: string | undefined): string => {
  if (!task) return '';
  // Replace UUIDs with readable label
  let cleaned = task.replace(
    /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi,
    'signal'
  );
  // Capitalize first letter
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
};

const agentIcons = {
  Sentinel: Eye,
  Oracle: Microscope,
  Striker: Zap,
  Nexus: Network,
  Herald: MessageSquare
};

const AGENT_COLORS: Record<string, string> = {
  Sentinel: '#531DAB',
  Oracle:   '#003EB3',
  Striker:  '#CF1322',
  Nexus:    '#7C5A00',
  Herald:   '#237804',
};

export const AgentSwarm: React.FC = () => {
  const { agents } = useAgents();
  const [flashingAgents, setFlashingAgents] = useState<Set<string>>(new Set());
  const prevAgentsRef = useRef<string>('');

  // Detect changes and flash rows
  useEffect(() => {
    const currentSnapshot = JSON.stringify(
      agents.map((a) => ({ name: a.name, status: a.status, task: a.current_task, tasks: a.tasks_today }))
    );
    if (prevAgentsRef.current && prevAgentsRef.current !== currentSnapshot) {
      // Find which agents changed
      const prev = JSON.parse(prevAgentsRef.current) as Array<{ name: string }>;
      const curr = agents.map((a) => ({
        name: a.name,
        status: a.status,
        task: a.current_task,
        tasks: a.tasks_today,
      }));

      const changed = new Set<string>();
      curr.forEach((c, i) => {
        const p = prev[i];
        if (p && (JSON.stringify(c) !== JSON.stringify(p))) {
          changed.add(c.name);
        }
      });

      if (changed.size > 0) {
        setFlashingAgents((prev) => {
          const next = new Set(prev);
          changed.forEach((n) => next.add(n));
          return next;
        });

        setTimeout(() => {
          setFlashingAgents((prev) => {
            const next = new Set(prev);
            changed.forEach((n) => next.delete(n));
            return next;
          });
        }, 600);
      }
    }
    prevAgentsRef.current = currentSnapshot;
  }, [agents]);

  const getDotStyle = (status: string, agentName: string): React.CSSProperties => {
    const color = AGENT_COLORS[agentName] ?? '#888780';
    if (status === 'active') {
      return {
        width: '8px',
        height: '8px',
        borderRadius: '50%',
        backgroundColor: color,
        boxShadow: `0 0 0 3px ${color}20`,
        animation: 'agentPulse 2s infinite',
        flexShrink: 0,
      };
    }
    if (status === 'busy' || status === 'working' || status === 'processing') {
      return {
        width: '8px',
        height: '8px',
        borderRadius: '50%',
        backgroundColor: '#D46B08',
        boxShadow: '0 0 0 3px #FFF7E6',
        animation: 'agentPulseFast 1s infinite',
        flexShrink: 0,
      };
    }
    return {
      width: '8px',
      height: '8px',
      borderRadius: '50%',
      backgroundColor: '#D3D1C7',
      flexShrink: 0,
    };
  };

  const getMetric = (agent: typeof agents[0]) => {
    if (agent.avg_response_ms > 0) {
      return {
        text: `${Math.round(agent.avg_response_ms)}ms`,
        color: '#237804',
      };
    }
    if (agent.tasks_today > 0) {
      return {
        text: `${agent.tasks_today} tasks`,
        color: '#003EB3',
      };
    }
    return {
      text: '—',
      color: '#8A8480',
    };
  };

  const activeCount = agents.filter(
    (a) => a.status !== 'idle'
  ).length;

  return (
    <div className="bg-bg-surface border border-border-subtle rounded-md shadow-sm h-full flex flex-col el-3">
      <style>{`
        @keyframes agentPulse {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 1; }
        }
        @keyframes agentPulseFast {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 1; }
        }
      `}</style>
      <div className="px-4 py-3 border-b border-border-subtle shrink-0 flex items-center justify-between">
        <h3 className="section-title">Agent Swarm Status</h3>
        <span style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: '10px',
          fontWeight: 600,
          color: activeCount > 0 ? '#237804' : '#8A8480',
          background: activeCount > 0 ? '#F6FFED' : '#F2F0EC',
          border: `1px solid ${activeCount > 0 ? '#B7EB8F' : '#D3D1C7'}`,
          padding: '2px 8px',
          borderRadius: '99px',
          transition: 'all 0.3s ease',
        }}>
          {activeCount}/5 Active
        </span>
      </div>
      <div className="flex-1 overflow-auto p-4 flex flex-col gap-3">
        {agents.map((agent) => {
          const Icon = agentIcons[agent.name as keyof typeof agentIcons] || MessageSquare;
          const isFlashing = flashingAgents.has(agent.name);
          const metric = getMetric(agent);

          return (
            <div
              key={agent.name}
              className="flex items-center gap-3 cursor-default"
              style={{
                border: '1px solid rgba(0,0,0,0.07)',
                borderLeft: `3px solid ${AGENT_COLORS[agent.name] ?? '#888780'}`,
                borderRadius: '8px',
                padding: '10px 12px',
                background: 'white',
                animation: isFlashing ? 'rowHighlight 0.6s ease-out forwards' : 'none',
                transition: 'background 0.3s ease',
              }}
            >
              <div className="w-8 h-8 rounded-full bg-bg-surface flex items-center justify-center border border-border-medium shrink-0">
                <Icon
                  size={16}
                  color={AGENT_COLORS[agent.name] ?? '#888780'}
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-center mb-0.5">
                  <div className="flex items-center gap-2">
                    <span style={{
                      fontFamily: "'Geist', sans-serif",
                      fontSize: '13px',
                      fontWeight: 600,
                      color: '#0F0E0D',
                      lineHeight: 1.2,
                    }}>{agent.name}</span>
                    <span style={getDotStyle(agent.status, agent.name)}></span>
                  </div>
                  <span style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: '11px',
                    fontWeight: 400,
                    color: metric.color,
                    flexShrink: 0,
                  }}>{metric.text}</span>
                </div>
                <div style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: '10.5px',
                  fontWeight: 400,
                  color: '#8A8480',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  maxWidth: '180px',
                  lineHeight: 1.4,
                }}>
                  {cleanTaskText(agent.current_task) || 'Idle'}
                </div>
              </div>
            </div>
          );
        })}
        {agents.length === 0 && (
          <div className="flex items-center justify-center h-full text-text-tertiary text-[13px]">
            Waiting for agent telemetry...
          </div>
        )}
      </div>
    </div>
  );
};
