import React, { useState, useEffect } from 'react';
import { CommandBar } from '../components/layout/CommandBar';
import { useConnectionState } from '../hooks/useWebSocket';
import { useAgentStore } from '../store/agentStore';
import { useAlertStore } from '../store/alertStore';
import { apiClient } from '../api/client';
import { Clipboard } from 'lucide-react';

interface NotifPrefs {
  criticalAlerts: boolean;
  agentStatus: boolean;
  simulation: boolean;
  reportAlerts: boolean;
}

const DEFAULT_PREFS: NotifPrefs = {
  criticalAlerts: true,
  agentStatus: true,
  simulation: true,
  reportAlerts: false,
};

export const Account: React.FC = () => {
  const { status } = useConnectionState();
  const agents = useAgentStore((state) => state.agents);
  const addAlert = useAlertStore((state) => state.addAlert);

  const [apiVersion, setApiVersion] = useState<string>('Loading...');
  const [showModal, setShowModal] = useState(false);
  const [isHoveredClear, setIsHoveredClear] = useState(false);

  // Notification Preferences
  const [prefs, setPrefs] = useState<NotifPrefs>(() => {
    try {
      const stored = localStorage.getItem('ag_notif_prefs');
      if (stored) {
        return { ...DEFAULT_PREFS, ...JSON.parse(stored) };
      }
    } catch (e) {
      console.error('Failed to parse ag_notif_prefs:', e);
    }
    return DEFAULT_PREFS;
  });

  useEffect(() => {
    localStorage.setItem('ag_notif_prefs', JSON.stringify(prefs));
  }, [prefs]);

  // Fetch API Health on mount
  useEffect(() => {
    const fetchHealth = async () => {
      try {
        const { data } = await apiClient.get('/health');
        setApiVersion(data.version || 'unknown');
      } catch (err) {
        console.error('Failed to fetch API version:', err);
        setApiVersion('unknown');
      }
    };
    fetchHealth();
  }, []);

  const token = import.meta.env.VITE_AUTH_TOKEN 
    ?? localStorage.getItem('auth_token')
    ?? 'dummy-token-for-hackathon';

  const copyToken = () => {
    navigator.clipboard.writeText(token);
    addAlert({ message: 'Session token copied to clipboard', type: 'success' });
  };

  const confirmRegenerateToken = () => {
    setShowModal(false);
    addAlert({
      message: 'Token regenerated (demo mode — restart backend to apply)',
      type: 'info',
    });
  };

  const handleExportCSV = async () => {
    try {
      const authHeader = `Bearer ${token}`;
      const response = await fetch(`${import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api'}/incidents/export/csv`, {
        headers: {
          'Authorization': authHeader
        }
      });
      if (!response.ok) {
        throw new Error('Export API returned error status');
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'incidents_audit.csv';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      addAlert({ message: 'Audit log exported successfully', type: 'success' });
    } catch (err) {
      console.error('Failed to export incidents:', err);
      addAlert({ message: 'Failed to export security audit log', type: 'error' });
    }
  };

  const handleClearCache = () => {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (key && key.startsWith('ag_')) {
        localStorage.removeItem(key);
      }
    }
    addAlert({ message: 'Cache cleared successfully', type: 'success' });
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  };

  const togglePref = (key: keyof NotifPrefs) => {
    setPrefs((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const Toggle = ({ checked, onChange }: { checked: boolean; onChange: () => void }) => (
    <label style={{
      position: 'relative',
      display: 'inline-block',
      width: '36px',
      height: '20px',
      cursor: 'pointer',
      userSelect: 'none',
    }}>
      <input 
        type="checkbox" 
        checked={checked} 
        onChange={onChange} 
        style={{ opacity: 0, width: 0, height: 0 }} 
      />
      <span style={{
        position: 'absolute',
        inset: 0,
        backgroundColor: checked ? '#D4380D' : '#D3D1C7',
        borderRadius: '20px',
        transition: 'background-color 0.2s',
      }} />
      <span style={{
        position: 'absolute',
        height: '14px',
        width: '14px',
        left: checked ? '18px' : '4px',
        bottom: '3px',
        backgroundColor: 'white',
        borderRadius: '50%',
        transition: 'left 0.2s',
        boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
      }} />
    </label>
  );

  return (
    <div className="h-full flex flex-col relative overflow-hidden bg-bg-base">
      <CommandBar title="Account" tag="Profile & Security" />

      <div className="flex-1 overflow-auto p-6 max-w-4xl w-full mx-auto space-y-6">
        
        {/* SECTION 1: Profile Identity */}
        <div className="bg-white border border-border-subtle rounded-md p-6 shadow-sm flex items-center gap-5">
          <div style={{
            width: 48,
            height: 48,
            borderRadius: '50%',
            background: '#CF1322',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: "'Geist', sans-serif",
            fontSize: '18px',
            fontWeight: 700,
            flexShrink: 0,
          }}>
            SA
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <span style={{
                fontFamily: "'Geist', sans-serif",
                fontWeight: 700,
                fontSize: '18px',
                color: '#0F0E0D',
                lineHeight: 1.2,
              }}>
                SOC Administrator
              </span>
              <span style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: '10px',
                fontWeight: 600,
                background: '#FFF1ED',
                color: '#D4380D',
                border: '1px solid #FFD4C4',
                padding: '2px 8px',
                borderRadius: '99px',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}>
                SECURITY ANALYST
              </span>
            </div>
            <div className="flex items-center gap-4 mt-1.5 flex-wrap">
              <span style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: '12px',
                color: '#8A8480',
              }}>
                admin@agentguard.local
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <span style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  backgroundColor: '#237804',
                }} />
                <span style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: '11px',
                  color: '#237804',
                  fontWeight: 500,
                }}>
                  Session Active
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 2: Session & Auth */}
        <div className="bg-white border border-border-subtle rounded-md p-6 shadow-sm space-y-4">
          <h3 style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '11px',
            fontWeight: 700,
            letterSpacing: '0.1em',
            color: '#8A8480',
          }}>
            SESSION & AUTHENTICATION
          </h3>
          <div className="divide-y divide-border-subtle">
            <div className="py-3.5 flex justify-between items-center flex-wrap gap-2">
              <span className="text-[12px] text-text-tertiary">Authentication Mode</span>
              <span style={{
                background: '#FFF7E6',
                border: '1px solid #FFD591',
                color: '#D46B08',
                padding: '2px 8px',
                borderRadius: '99px',
                fontSize: '11px',
                fontWeight: 600,
                fontFamily: "'JetBrains Mono', monospace",
              }}>
                {import.meta.env.VITE_AUTH_TOKEN ? 'Development Bypass' : 'Development'}
              </span>
            </div>
            <div className="py-3.5 flex justify-between items-center flex-wrap gap-2">
              <span className="text-[12px] text-text-tertiary">Active Token</span>
              <div className="flex items-center gap-2">
                <span style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: '12px',
                  color: '#0F0E0D',
                  wordBreak: 'break-all',
                }}>
                  {token}
                </span>
                <button 
                  onClick={copyToken}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8A8480', display: 'flex' }}
                  title="Copy token"
                >
                  <Clipboard size={14} />
                </button>
              </div>
            </div>
            <div className="py-3.5 flex justify-between items-center flex-wrap gap-2">
              <span className="text-[12px] text-text-tertiary">Environment</span>
              <span style={{
                background: '#F2F0EC',
                border: '1px solid #D3D1C7',
                color: '#5E5955',
                padding: '2px 8px',
                borderRadius: '99px',
                fontSize: '11px',
                fontWeight: 600,
                fontFamily: "'JetBrains Mono', monospace",
                textTransform: 'capitalize',
              }}>
                {import.meta.env.MODE}
              </span>
            </div>
            <div className="py-3.5 flex justify-between items-center flex-wrap gap-2">
              <span className="text-[12px] text-text-tertiary">API Endpoint</span>
              <div className="flex items-center gap-2 flex-wrap">
                <span style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: '12px',
                  color: '#0F0E0D',
                }}>
                  {import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api'}
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <span style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    backgroundColor: status === 'connected' ? '#237804' : '#CF1322',
                  }} />
                  <span style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: '10px',
                    color: status === 'connected' ? '#237804' : '#CF1322',
                    fontWeight: 600,
                  }}>
                    {status === 'connected' ? 'SYSTEM ACTIVE' : 'DISCONNECTED'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 3: Notification Preferences */}
        <div className="bg-white border border-border-subtle rounded-md p-6 shadow-sm space-y-4">
          <h3 style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '11px',
            fontWeight: 700,
            letterSpacing: '0.1em',
            color: '#8A8480',
          }}>
            NOTIFICATION PREFERENCES
          </h3>
          <div className="divide-y divide-border-subtle">
            {[
              {
                key: 'criticalAlerts',
                title: 'Critical Threat Alerts',
                desc: 'Notify on critical and high severity alerts',
              },
              {
                key: 'agentStatus',
                title: 'Agent Status Updates',
                desc: 'Telemetry state changes across the active swarm',
              },
              {
                key: 'simulation',
                title: 'Simulation Notifications',
                desc: 'Live notification feed for active simulations',
              },
              {
                key: 'reportAlerts',
                title: 'Report Generation Alerts',
                desc: 'Trigger notifications when Herald compiles logs',
              },
            ].map((row) => (
              <div key={row.key} className="py-4 flex justify-between items-center gap-4">
                <div>
                  <h4 style={{
                    fontFamily: "'Geist', sans-serif",
                    fontSize: '14px',
                    fontWeight: 600,
                    color: '#0F0E0D',
                  }}>{row.title}</h4>
                  <p className="text-[11px] text-text-tertiary mt-0.5">{row.desc}</p>
                </div>
                <Toggle 
                  checked={prefs[row.key as keyof NotifPrefs]} 
                  onChange={() => togglePref(row.key as keyof NotifPrefs)} 
                />
              </div>
            ))}
          </div>
        </div>

        {/* SECTION 4: Security Controls */}
        <div className="bg-white border border-border-subtle rounded-md p-6 shadow-sm space-y-4">
          <h3 style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '11px',
            fontWeight: 700,
            letterSpacing: '0.1em',
            color: '#8A8480',
          }}>
            SECURITY CONTROLS
          </h3>
          <div className="divide-y divide-border-subtle">
            <div className="py-4 flex justify-between items-center gap-4">
              <div>
                <h4 style={{
                  fontFamily: "'Geist', sans-serif",
                  fontSize: '14px',
                  fontWeight: 600,
                  color: '#0F0E0D',
                }}>Regenerate API Token</h4>
                <p className="text-[11px] text-text-tertiary mt-0.5">Create a new session token</p>
              </div>
              <button 
                onClick={() => setShowModal(true)}
                style={{
                  background: 'transparent',
                  border: '1px solid #D4380D',
                  color: '#D4380D',
                  padding: '6px 14px',
                  borderRadius: '6px',
                  fontFamily: "'Geist', sans-serif",
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'opacity 0.15s',
                }}
                onMouseOver={(e) => e.currentTarget.style.opacity = '0.8'}
                onMouseOut={(e) => e.currentTarget.style.opacity = '1'}
              >
                Regenerate API Token
              </button>
            </div>
            <div className="py-4 flex justify-between items-center gap-4">
              <div>
                <h4 style={{
                  fontFamily: "'Geist', sans-serif",
                  fontSize: '14px',
                  fontWeight: 600,
                  color: '#0F0E0D',
                }}>Export Security Audit Log</h4>
                <p className="text-[11px] text-text-tertiary mt-0.5">Download all security events as CSV</p>
              </div>
              <button 
                onClick={handleExportCSV}
                style={{
                  background: 'transparent',
                  border: '1px solid #D3D1C7',
                  color: '#5E5955',
                  padding: '6px 14px',
                  borderRadius: '6px',
                  fontFamily: "'Geist', sans-serif",
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                Export Security Audit Log
              </button>
            </div>
            <div className="py-4 flex justify-between items-center gap-4">
              <div>
                <h4 style={{
                  fontFamily: "'Geist', sans-serif",
                  fontSize: '14px',
                  fontWeight: 600,
                  color: '#0F0E0D',
                }}>Clear Local Cache</h4>
                <p className="text-[11px] text-text-tertiary mt-0.5">Reset all cached metrics and preferences</p>
              </div>
              <button 
                onClick={handleClearCache}
                onMouseEnter={() => setIsHoveredClear(true)}
                onMouseLeave={() => setIsHoveredClear(false)}
                style={{
                  background: 'transparent',
                  border: `1px solid ${isHoveredClear ? '#CF1322' : '#D3D1C7'}`,
                  color: isHoveredClear ? '#CF1322' : '#5E5955',
                  padding: '6px 14px',
                  borderRadius: '6px',
                  fontFamily: "'Geist', sans-serif",
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                Clear Local Cache
              </button>
            </div>
          </div>
        </div>

        {/* SECTION 5: System Information */}
        <div className="bg-white border border-border-subtle rounded-md p-6 shadow-sm space-y-4">
          <h3 style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '11px',
            fontWeight: 700,
            letterSpacing: '0.1em',
            color: '#8A8480',
          }}>
            SYSTEM INFORMATION
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3" style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '12px' }}>
            <div className="flex justify-between py-1 border-b border-border-subtle">
              <span className="text-text-tertiary">Frontend Version:</span>
              <span className="text-text-primary font-semibold">1.0.0</span>
            </div>
            <div className="flex justify-between py-1 border-b border-border-subtle">
              <span className="text-text-tertiary">Build:</span>
              <span className="text-text-primary font-semibold">{import.meta.env.MODE}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-border-subtle">
              <span className="text-text-tertiary">API Version:</span>
              <span className="text-text-primary font-semibold">{apiVersion}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-border-subtle">
              <span className="text-text-tertiary">WebSocket:</span>
              <span className="text-text-primary font-semibold">ws/live ({status})</span>
            </div>
            <div className="flex justify-between py-1 border-b border-border-subtle">
              <span className="text-text-tertiary">Azure Region:</span>
              <span className="text-text-primary font-semibold">Central India</span>
            </div>
            <div className="flex justify-between py-1 border-b border-border-subtle">
              <span className="text-text-tertiary">Agents Online:</span>
              <span className="text-text-primary font-semibold">{agents.length}</span>
            </div>
          </div>
        </div>

      </div>

      {/* CONFIRMATION MODAL */}
      {showModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.15)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
        }}>
          <div style={{
            background: 'white',
            padding: '24px',
            borderRadius: '8px',
            border: '1px solid rgba(0,0,0,0.12)',
            boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
            maxWidth: '400px',
            width: '90%',
          }}>
            <h4 style={{ fontFamily: "'Geist', sans-serif", fontWeight: 700, fontSize: '15px', marginBottom: '8px' }}>
              Regenerate API Token
            </h4>
            <p style={{ fontFamily: "'Geist', sans-serif", fontSize: '13px', color: '#5E5955', marginBottom: '20px', lineHeight: 1.5 }}>
              This will invalidate your current session token. Continue?
            </p>
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setShowModal(false)}
                style={{
                  padding: '8px 16px',
                  background: '#F2F0EC',
                  color: '#5E5955',
                  border: '1px solid rgba(0,0,0,0.07)',
                  borderRadius: '6px',
                  fontFamily: "'Geist', sans-serif",
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button 
                onClick={confirmRegenerateToken}
                style={{
                  padding: '8px 16px',
                  background: '#D4380D',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontFamily: "'Geist', sans-serif",
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
