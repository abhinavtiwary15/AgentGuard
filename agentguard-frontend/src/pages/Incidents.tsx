import React, { useState, useEffect, useMemo } from 'react';
import { useIncidentStore } from '../store/incidentStore';
import { apiClient } from '../api/client';
import { CommandBar } from '../components/layout/CommandBar';
import { ShieldAlert, X, AlertTriangle, Shield, CheckCircle, Activity } from 'lucide-react';
import { Incident, Severity } from '../types';
import { SeverityPill } from '../components/common/SeverityPill';

type FilterTab = 'all' | 'critical' | 'high' | 'medium' | 'resolved';

const SEVERITY_STYLES: Record<string, {
  bg: string; text: string; border: string; dot?: boolean;
}> = {
  critical: { bg: '#FFF1F0', text: '#CF1322', border: '#FFA39E', dot: true },
  high:     { bg: '#FFF7E6', text: '#D46B08', border: '#FFD591' },
  medium:   { bg: '#FFFBE6', text: '#7C5A00', border: '#FFE58F' },
  low:      { bg: '#F6FFED', text: '#237804', border: '#B7EB8F' },
};

const STATUS_LABELS: Record<string, string> = {
  detecting: 'Detecting',
  investigating: 'Investigating',
  responding: 'Responding',
  blocked: 'Blocked',
  escalated: 'Escalated',
  resolved: 'Resolved',
  false_positive: 'False Positive',
};

function relativeTime(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffS = Math.floor(diffMs / 1000);
    if (diffS < 60) return `${diffS}s ago`;
    const diffM = Math.floor(diffS / 60);
    if (diffM < 60) return `${diffM}m ago`;
    const diffH = Math.floor(diffM / 60);
    if (diffH < 24) return `${diffH}h ago`;
    const diffD = Math.floor(diffH / 24);
    return `${diffD}d ago`;
  } catch {
    return dateStr;
  }
}

const StatusPill: React.FC<{ status: string; severity?: Severity }> = ({ status, severity }) => {
  const sev = severity || 'low';
  const style = SEVERITY_STYLES[sev] || SEVERITY_STYLES.low;
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      padding: '2px 8px',
      borderRadius: '99px',
      background: status === 'resolved' ? '#F6FFED' : style.bg,
      border: `1px solid ${status === 'resolved' ? '#B7EB8F' : style.border}`,
      fontFamily: "'JetBrains Mono', monospace",
      fontSize: '10px',
      fontWeight: 500,
      color: status === 'resolved' ? '#237804' : style.text,
      textTransform: 'capitalize',
    }}>
      {STATUS_LABELS[status] || status}
    </span>
  );
};

export const Incidents: React.FC = () => {
  const incidents = useIncidentStore((state) => state.incidents);
  const setIncidents = useIncidentStore((state) => state.setIncidents);
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all');
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);

  useEffect(() => {
    const fetchIncidents = async () => {
      try {
        const { data } = await apiClient.get('/incidents/?limit=50');
        setIncidents(data);
      } catch (e) {
        console.error('Failed to fetch incidents:', e);
      }
    };
    fetchIncidents();
  }, [setIncidents]);

  const stats = useMemo(() => {
    const total = incidents.length;
    const critical = incidents.filter((i) => i.severity === 'critical').length;
    const active = incidents.filter((i) => i.status !== 'resolved' && i.status !== 'false_positive').length;
    const resolved = incidents.filter((i) => i.status === 'resolved').length;
    return { total, critical, active, resolved };
  }, [incidents]);

  const filteredIncidents = useMemo(() => {
    switch (activeFilter) {
      case 'critical': return incidents.filter((i) => i.severity === 'critical');
      case 'high': return incidents.filter((i) => i.severity === 'high');
      case 'medium': return incidents.filter((i) => i.severity === 'medium');
      case 'resolved': return incidents.filter((i) => i.status === 'resolved');
      default: return incidents;
    }
  }, [incidents, activeFilter]);

  const handleResolve = async (incidentId: string) => {
    try {
      await apiClient.patch(`/incidents/${incidentId}/resolve`, {
        notes: ''
      });
      setIncidents(prev => prev.map(inc => 
        inc.id === incidentId 
          ? { ...inc, status: 'resolved' as const, updated_at: new Date().toISOString() }
          : inc
      ));
      if (selectedIncident?.id === incidentId) {
        setSelectedIncident(prev => prev ? { ...prev, status: 'resolved' as const, updated_at: new Date().toISOString() } : null);
      }
    } catch (err) {
      console.error('Failed to resolve incident:', err);
    }
  };

  const FILTER_TABS: { key: FilterTab; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'critical', label: 'Critical' },
    { key: 'high', label: 'High' },
    { key: 'medium', label: 'Medium' },
    { key: 'resolved', label: 'Resolved' },
  ];

  return (
    <div className="h-full flex flex-col relative overflow-hidden">
      <style>{`
        @keyframes severityBlink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
      `}</style>
      <CommandBar title="Incident Response" />

      <div className="flex-1 overflow-auto p-6">
        {/* Stats Row */}
        <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
          {[
            { label: 'Total', value: stats.total, icon: Shield, color: '#5E5955', bg: '#F2F0EC' },
            { label: 'Critical', value: stats.critical, icon: AlertTriangle, color: '#CF1322', bg: '#FFF1F0' },
            { label: 'Active', value: stats.active, icon: Activity, color: '#D46B08', bg: '#FFF7E6' },
            { label: 'Resolved', value: stats.resolved, icon: CheckCircle, color: '#237804', bg: '#F6FFED' },
          ].map((stat) => (
            <div
              key={stat.label}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '10px 16px',
                borderRadius: '10px',
                background: stat.bg,
                border: '1px solid rgba(0,0,0,0.06)',
                minWidth: '140px',
              }}
            >
              <stat.icon size={16} color={stat.color} style={{ flexShrink: 0 }} />
              <div>
                <div style={{
                  fontFamily: "'Literata', serif",
                  fontSize: '20px',
                  fontWeight: 900,
                  color: stat.color,
                  lineHeight: 1,
                  letterSpacing: '-0.02em',
                }}>
                  {stat.value}
                </div>
                <div style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: '9px',
                  fontWeight: 600,
                  color: '#8A8480',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  marginTop: '2px',
                }}>
                  {stat.label}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Filter Tabs */}
        <div style={{
          display: 'flex',
          gap: '0',
          marginBottom: '16px',
          borderBottom: '1px solid rgba(0,0,0,0.07)',
        }}>
          {FILTER_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveFilter(tab.key)}
              style={{
                padding: '8px 16px',
                fontFamily: "'Geist', sans-serif",
                fontSize: '13px',
                fontWeight: activeFilter === tab.key ? 600 : 400,
                color: activeFilter === tab.key ? '#D4380D' : '#8A8480',
                background: 'transparent',
                border: 'none',
                borderBottom: activeFilter === tab.key ? '2px solid #D4380D' : '2px solid transparent',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                marginBottom: '-1px',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Table Card */}
        <div style={{
          background: 'white',
          borderRadius: '10px',
          border: '1px solid rgba(0,0,0,0.07)',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          overflow: 'hidden',
        }}>
          {filteredIncidents.length === 0 ? (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '60px 20px',
              gap: '12px',
            }}>
              <ShieldAlert size={36} style={{ color: '#D3D1C7' }} />
              <p style={{
                fontFamily: "'Geist', sans-serif",
                fontSize: '13px',
                color: '#8A8480',
              }}>
                No active incidents detected.
              </p>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#F2F0EC', position: 'sticky', top: 0, zIndex: 10 }}>
                  {['SEVERITY', 'ID', 'THREAT TYPE', 'SOURCE IP', 'STATUS', 'TIME'].map((h) => (
                    <th
                      key={h}
                      style={{
                        padding: '10px 16px',
                        fontFamily: "'JetBrains Mono', monospace",
                        fontSize: '9px',
                        fontWeight: 600,
                        color: '#8A8480',
                        letterSpacing: '0.1em',
                        textTransform: 'uppercase',
                        borderBottom: '1px solid rgba(0,0,0,0.07)',
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredIncidents.map((incident, idx) => {
                  const isFirst = idx === 0;
                  const severityColor = SEVERITY_STYLES[incident.severity || 'low']?.text || '#8A8480';
                  return (
                    <tr
                      key={incident.id}
                      onClick={() => setSelectedIncident(incident)}
                      style={{
                        borderBottom: '1px solid rgba(0,0,0,0.05)',
                        borderLeft: isFirst ? `3px solid ${severityColor}` : '3px solid transparent',
                        cursor: 'pointer',
                        transition: 'background 0.15s ease',
                      }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = '#F2F0EC'; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                    >
                      <td style={{ padding: '12px 16px' }}>
                        <SeverityPill severity={incident.severity} />
                      </td>
                      <td style={{
                        padding: '12px 16px',
                        fontFamily: "'JetBrains Mono', monospace",
                        fontSize: '12px',
                        fontWeight: 600,
                        color: '#D4380D',
                      }}>
                        {incident.id}
                      </td>
                      <td style={{
                        padding: '12px 16px',
                        fontFamily: "'Geist', sans-serif",
                        fontSize: '13px',
                        color: '#0F0E0D',
                        fontWeight: 500,
                      }}>
                        {incident.attack_type}
                      </td>
                      <td style={{
                        padding: '12px 16px',
                        fontFamily: "'JetBrains Mono', monospace",
                        fontSize: '12px',
                        color: '#5E5955',
                      }}>
                        {incident.source_ip || '—'}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <StatusPill status={incident.status} severity={incident.severity} />
                      </td>
                      <td style={{
                        padding: '12px 16px',
                        fontFamily: "'JetBrains Mono', monospace",
                        fontSize: '11px',
                        color: '#8A8480',
                      }}>
                        {relativeTime(incident.created_at)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Detail Panel Overlay */}
      {selectedIncident && (
        <>
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(0,0,0,0.15)',
              zIndex: 40,
            }}
            onClick={() => setSelectedIncident(null)}
          />
          <div
            style={{
              position: 'absolute',
              top: 0,
              right: 0,
              bottom: 0,
              width: '420px',
              background: 'white',
              boxShadow: '-4px 0 24px rgba(0,0,0,0.12)',
              zIndex: 50,
              display: 'flex',
              flexDirection: 'column',
              animation: 'slideInRight 0.25s ease-out',
            }}
          >
            {/* Panel Header */}
            <div style={{
              padding: '16px 20px',
              borderBottom: '1px solid rgba(0,0,0,0.07)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: '14px',
                  fontWeight: 700,
                  color: '#D4380D',
                }}>
                  {selectedIncident.id}
                </span>
                <SeverityPill severity={selectedIncident.severity} />
              </div>
              <button
                onClick={() => setSelectedIncident(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px',
                  color: '#8A8480',
                  borderRadius: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Panel Body */}
            <div style={{ flex: 1, overflow: 'auto', padding: '20px' }}>
              {/* AI Summary */}
              {selectedIncident.ai_summary && (
                <div style={{ marginBottom: '20px' }}>
                  <div style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: '9px',
                    fontWeight: 600,
                    color: '#8A8480',
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    marginBottom: '8px',
                  }}>
                    AI Summary
                  </div>
                  <div style={{
                    padding: '12px',
                    borderRadius: '8px',
                    background: '#F8F7F5',
                    border: '1px solid rgba(0,0,0,0.06)',
                    fontFamily: "'Geist', sans-serif",
                    fontSize: '13px',
                    color: '#3D3B39',
                    lineHeight: 1.6,
                  }}>
                    {selectedIncident.ai_summary}
                  </div>
                </div>
              )}

              {/* Threat Details Grid */}
              <div style={{ marginBottom: '20px' }}>
                <div style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: '9px',
                  fontWeight: 600,
                  color: '#8A8480',
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  marginBottom: '10px',
                }}>
                  Threat Details
                </div>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '1px',
                  background: 'rgba(0,0,0,0.06)',
                  borderRadius: '8px',
                  overflow: 'hidden',
                  border: '1px solid rgba(0,0,0,0.06)',
                }}>
                  {[
                    { label: 'Attack Type', value: selectedIncident.attack_type },
                    { label: 'Source IP', value: selectedIncident.source_ip || '—' },
                    { label: 'Target', value: selectedIncident.target_endpoint || '—' },
                    { label: 'Confidence', value: selectedIncident.investigation?.confidence
                      ? `${Math.round(selectedIncident.investigation.confidence * 100)}%`
                      : '—' },
                    { label: 'Status', value: STATUS_LABELS[selectedIncident.status] || selectedIncident.status },
                    { label: 'Affected User', value: selectedIncident.affected_user || '—' },
                  ].map(({ label, value }) => (
                    <div key={label} style={{ background: 'white', padding: '10px 12px' }}>
                      <div style={{
                        fontFamily: "'JetBrains Mono', monospace",
                        fontSize: '9px',
                        color: '#8A8480',
                        letterSpacing: '0.05em',
                        textTransform: 'uppercase',
                        marginBottom: '3px',
                      }}>
                        {label}
                      </div>
                      <div style={{
                        fontFamily: "'Geist', sans-serif",
                        fontSize: '13px',
                        fontWeight: 500,
                        color: '#0F0E0D',
                      }}>
                        {value}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Investigation Reasoning */}
              {selectedIncident.investigation?.reasoning && (
                <div style={{ marginBottom: '20px' }}>
                  <div style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: '9px',
                    fontWeight: 600,
                    color: '#8A8480',
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    marginBottom: '8px',
                  }}>
                    Investigation Analysis
                  </div>
                  <div style={{
                    padding: '12px',
                    borderRadius: '8px',
                    background: '#F8F7F5',
                    border: '1px solid rgba(0,0,0,0.06)',
                    fontFamily: "'Geist', sans-serif",
                    fontSize: '12px',
                    color: '#5E5955',
                    lineHeight: 1.6,
                  }}>
                    {selectedIncident.investigation.reasoning}
                  </div>
                </div>
              )}

              {/* Timeline */}
              {selectedIncident.timeline && selectedIncident.timeline.length > 0 && (
                <div style={{ marginBottom: '20px' }}>
                  <div style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: '9px',
                    fontWeight: 600,
                    color: '#8A8480',
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    marginBottom: '10px',
                  }}>
                    Agent Timeline
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
                    {selectedIncident.timeline.map((entry, i) => (
                      <div
                        key={i}
                        style={{
                          display: 'flex',
                          gap: '12px',
                          padding: '8px 0',
                          borderLeft: '2px solid #E9E8E5',
                          marginLeft: '6px',
                          paddingLeft: '14px',
                          position: 'relative',
                        }}
                      >
                        <div style={{
                          position: 'absolute',
                          left: '-4px',
                          top: '12px',
                          width: '6px',
                          height: '6px',
                          borderRadius: '50%',
                          background: '#D4380D',
                          border: '2px solid white',
                        }} />
                        <div>
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            marginBottom: '2px',
                          }}>
                            {entry.agent && (
                              <span style={{
                                fontFamily: "'JetBrains Mono', monospace",
                                fontSize: '10px',
                                fontWeight: 600,
                                color: '#531DAB',
                              }}>
                                {entry.agent}
                              </span>
                            )}
                            {entry.timestamp && (
                              <span style={{
                                fontFamily: "'JetBrains Mono', monospace",
                                fontSize: '10px',
                                color: '#8A8480',
                              }}>
                                {entry.timestamp}
                              </span>
                            )}
                          </div>
                          <div style={{
                            fontFamily: "'Geist', sans-serif",
                            fontSize: '12px',
                            color: '#5E5955',
                          }}>
                            {entry.action || entry.details || '—'}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Response Actions */}
              {selectedIncident.response && selectedIncident.response.actions_taken.length > 0 && (
                <div style={{ marginBottom: '20px' }}>
                  <div style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: '9px',
                    fontWeight: 600,
                    color: '#8A8480',
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    marginBottom: '8px',
                  }}>
                    Response Actions
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {selectedIncident.response.actions_taken.map((action: any, i: number) => (
                      <div
                        key={i}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '8px 12px',
                          borderRadius: '6px',
                          background: action.success ? '#F6FFED' : '#FFF1F0',
                          border: `1px solid ${action.success ? '#B7EB8F' : '#FFA39E'}`,
                        }}
                      >
                        <CheckCircle
                          size={14}
                          color={action.success ? '#237804' : '#CF1322'}
                        />
                        <span style={{
                          fontFamily: "'Geist', sans-serif",
                          fontSize: '12px',
                          color: action.success ? '#237804' : '#CF1322',
                          fontWeight: 500,
                        }}>
                          {action.action || action.details || `Action ${i + 1}`}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Panel Footer */}
            <div style={{
              padding: '16px 20px',
              borderTop: '1px solid rgba(0,0,0,0.07)',
              display: 'flex',
              gap: '10px',
            }}>
              {selectedIncident.status !== 'resolved' && (
                <button
                  onClick={() => handleResolve(selectedIncident.id)}
                  style={{
                    flex: 1,
                    padding: '10px',
                    borderRadius: '8px',
                    background: '#D4380D',
                    color: 'white',
                    border: 'none',
                    fontFamily: "'Geist', sans-serif",
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'opacity 0.15s',
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.opacity = '0.9'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.opacity = '1'; }}
                >
                  Mark Resolved
                </button>
              )}
              <button
                onClick={() => setSelectedIncident(null)}
                style={{
                  padding: '10px 20px',
                  borderRadius: '8px',
                  background: '#F2F0EC',
                  color: '#5E5955',
                  border: '1px solid rgba(0,0,0,0.07)',
                  fontFamily: "'Geist', sans-serif",
                  fontSize: '13px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = '#E9E8E5'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = '#F2F0EC'; }}
              >
                Close
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
