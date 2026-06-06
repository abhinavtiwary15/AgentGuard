import React, { useEffect, useRef, useCallback } from 'react';
import { useAgentStore } from '../../store/agentStore';

const AGENT_BADGE_STYLES: Record<string, {
  bg: string; border: string; color: string; label: string;
}> = {
  Sentinel: { bg: '#531DAB18', border: '#531DAB30',
               color: '#531DAB', label: 'SENT' },
  Oracle:   { bg: '#003EB318', border: '#003EB330',
               color: '#003EB3', label: 'ORAC' },
  Striker:  { bg: '#CF132218', border: '#CF132230',
               color: '#CF1322', label: 'STRK' },
  Nexus:    { bg: '#7C5A0018', border: '#7C5A0030',
               color: '#7C5A00', label: 'NEXS' },
  Herald:   { bg: '#23780418', border: '#23780430',
               color: '#237804', label: 'HERA' },
};

const DANGER_WORDS = /\b(CRITICAL|HIGH|attack|injection|anomaly|threat|blocked|malicious|unauthorized)\b/gi;
const SUCCESS_WORDS = /\b(blocked successfully|resolved|complete|mitigated|success)\b/gi;

function highlightText(text: string): React.ReactNode[] {
  // Combine both patterns
  const combined = new RegExp(
    `(${SUCCESS_WORDS.source})|(${DANGER_WORDS.source})`,
    'gi'
  );

  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = combined.exec(text)) !== null) {
    // Add text before match
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    const word = match[0];
    // Check if it's a success word or danger word
    const isSuccess = SUCCESS_WORDS.test(word);
    // Reset lastIndex of the regex after test
    SUCCESS_WORDS.lastIndex = 0;
    DANGER_WORDS.lastIndex = 0;

    parts.push(
      <span
        key={`hl-${match.index}`}
        style={{
          color: isSuccess ? '#237804' : '#CF1322',
          fontWeight: 700,
        }}
      >
        {word}
      </span>
    );
    lastIndex = match.index + word.length;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length > 0 ? parts : [text];
}

export const ThoughtStream: React.FC = () => {
  const thoughtLog = useAgentStore((state) => state.thoughtLog);
  const scrollRef = useRef<HTMLDivElement>(null);
  const prevLengthRef = useRef(0);

  // Mark entries as no longer "new" after 800ms
  const clearNewFlag = useCallback((id: string) => {
    const el = document.getElementById(`thought-${id}`);
    if (el) {
      el.style.background = 'transparent';
      el.style.transition = 'background 0.4s ease';
    }
  }, []);

  useEffect(() => {
    // Flash new entries
    if (thoughtLog.length > prevLengthRef.current) {
      const newEntries = thoughtLog.slice(0, thoughtLog.length - prevLengthRef.current);
      newEntries.forEach((entry) => {
        setTimeout(() => clearNewFlag(entry.id), 800);
      });
    }
    prevLengthRef.current = thoughtLog.length;
  }, [thoughtLog, clearNewFlag]);

  return (
    <div className="bg-bg-surface border border-border-subtle rounded-md shadow-sm h-full flex flex-col el-4 relative">
      <style>{`
        @keyframes thoughtSlideIn {
          from { opacity: 0; transform: translateY(-6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 1; }
        }
      `}</style>
      <div className="px-4 py-3 border-b border-border-subtle shrink-0 flex items-center justify-between">
        <h3 className="section-title">Live Reasoning Stream</h3>
        <span style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: '10px',
          color: '#8A8480',
        }}>
          {thoughtLog.length} entries
        </span>
      </div>
      <div ref={scrollRef} className="flex-1 overflow-auto p-4 flex flex-col gap-2 pb-12">
        {thoughtLog.length === 0 ? (
          <div style={{
            padding: '16px',
            color: '#8A8480',
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '11px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}>
            <div style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background: '#D3D1C7',
              animation: 'pulse 2s infinite',
            }} />
            Waiting for agent activity...
          </div>
        ) : (
          thoughtLog.map((entry) => {
            const style = AGENT_BADGE_STYLES[entry.agent] || {
              bg: '#88878018',
              border: '#88878030',
              color: '#888780',
              label: entry.agent.substring(0, 4).toUpperCase()
            };

            return (
              <div
                key={entry.id}
                id={`thought-${entry.id}`}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '8px',
                  fontSize: '10.5px',
                  animation: 'slideInLeft 0.3s ease-out forwards',
                  background: entry.isNew ? '#FFFBE6' : 'transparent',
                  padding: '4px 6px',
                  borderRadius: '4px',
                  transition: 'background 0.4s ease',
                }}
              >
                <span style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: '10px',
                  color: '#8A8480',
                  flexShrink: 0,
                  minWidth: '52px',
                  paddingTop: '1px',
                }}>
                  {entry.timestamp}
                </span>
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  padding: '1px 5px',
                  borderRadius: '4px',
                  background: style.bg,
                  border: `1px solid ${style.border}`,
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: '10px',
                  fontWeight: 600,
                  color: style.color,
                  flexShrink: 0,
                  letterSpacing: '0.03em',
                }}>
                  {style.label}
                </span>
                <span style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: '10.5px',
                  color: '#5E5955',
                  lineHeight: 1.5,
                  wordBreak: 'break-word',
                  paddingTop: '1px',
                }}>
                  {highlightText(entry.text)}
                </span>
              </div>
            );
          })
        )}
      </div>
      <div className="absolute bottom-0 left-0 w-full h-12 bg-gradient-to-t from-bg-surface to-transparent pointer-events-none"></div>
    </div>
  );
};
