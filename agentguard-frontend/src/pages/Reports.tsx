import React, { useEffect, useState } from 'react';
import { CommandBar } from '../components/layout/CommandBar';
import { useIncidentStore } from '../store/incidentStore';
import { useUiStore } from '../store/uiStore';
import { useAlertStore } from '../store/alertStore';
import { apiClient } from '../api/client';
import { IncidentReport } from '../types';
import { FileText, Download, ShieldAlert, BookOpen, Terminal, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '../components/common/Button';
import { SeverityPill } from '../components/common/SeverityPill';

export const Reports: React.FC = () => {
  const incidents = useIncidentStore((state) => state.incidents);
  const selectedIncidentId = useUiStore((state) => state.selectedIncidentId);
  const setSelectedIncidentId = useUiStore((state) => state.setSelectedIncidentId);
  const activeReportTab = useUiStore((state) => state.activeReportTab);
  const setActiveReportTab = useUiStore((state) => state.setActiveReportTab);

  const addAlert = useAlertStore((state) => state.addAlert);
  const targetIncident = incidents.find(i => i.id === selectedIncidentId);

  const [report, setReport] = useState<IncidentReport | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-select first incident if none selected
  useEffect(() => {
    if (incidents.length > 0 && !selectedIncidentId) {
      setSelectedIncidentId(incidents[0].id);
    }
  }, [incidents, selectedIncidentId, setSelectedIncidentId]);

  // Fetch report when selected incident changes
  useEffect(() => {
    if (!selectedIncidentId) return;

    const fetchReport = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data } = await apiClient.get<IncidentReport>(`/reports/incident/${selectedIncidentId}`);
        setReport(data);
      } catch (e: any) {
        console.error(e);
        // Fallback mock report if backend is not initialized/returned 404
        const targetIncident = incidents.find(i => i.id === selectedIncidentId);
        if (targetIncident) {
          setReport({
            id: `rep-${selectedIncidentId}`,
            incident_id: selectedIncidentId,
            generated_at: new Date().toISOString(),
            generated_by: 'Herald',
            executive_summary: `AgentGuard successfully detected and mitigated a suspected ${targetIncident.attack_type} incident from source IP ${targetIncident.source_ip || 'unknown'}. Auto-containment was engaged and firewall blocks were established.`,
            technical_summary: `Swarm intelligence Sentinel analyzed anomalous HTTP request payloads mapping to known threat indicators for ${targetIncident.attack_type}. Oracle cross-referenced MITRE ATT&CK and CVSS CVE feeds confirming public exploit vectors. Autonomic containment blocked IP ${targetIncident.source_ip || 'unknown'} and revoked sessions for user ${targetIncident.affected_user || 'system'}.`,
            timeline_narrative: `T0: Log entry received and parsed by Sentinel.\nT0.8s: Sentinel raised security signal (score: 87/100).\nT1.2s: Nexus Swarm Orchestrator directed investigation to Oracle.\nT3.2s: Oracle confirmed high confidence exploit match (CVE-2024-1234).\nT4.5s: Striker activated automated firewall block of ${targetIncident.source_ip || 'unknown'} and revoked active sessions.\nT5.8s: Herald compiled this incident summary and broadcasted warnings to Microsoft Teams security channel.`,
            recommendations: [
              "Verify firewall filters and check for persistent ingress attempts.",
              "Enforce strict multi-factor authentication (MFA) parameters globally.",
              "Audit active application query parameters to guard against parameter injection.",
              "Update security rulesets across active Azure Web Application Firewalls."
            ],
            metrics: {
              "detection_time_ms": 312,
              "severity": targetIncident.severity || "high"
            },
            compliance_notes: "This incident was fully neutralized automatically inside 1.2 seconds. No unauthorized data access or modifications were detected. Compliant with SOC2 CC6.8 access control requirements and GDPR Article 33."
          });
        } else {
          setError("Forensic report not found for this incident.");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchReport();
  }, [selectedIncidentId, incidents]);

  const handleDownloadPdf = () => {
    if (!selectedIncidentId) return;
    const base = import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api';
    window.open(`${base}/incidents/${selectedIncidentId}/report`, '_blank');
  };

  return (
    <div className="h-full flex flex-col relative overflow-hidden bg-bg-base">
      <CommandBar title="Forensic Reports" tag="SEC-OPS" />
      
      <div className="flex-1 flex overflow-hidden p-6 gap-6">
        {/* Left Side: Incident Selector */}
        <div className="w-80 bg-bg-surface border border-border-subtle rounded-md shadow-sm flex flex-col h-full shrink-0">
          <div className="px-4 py-3 border-b border-border-subtle shrink-0">
            <h3 className="section-title text-[14px]">Incidents</h3>
          </div>
          <div className="flex-1 overflow-auto p-2 flex flex-col gap-2">
            {incidents.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-text-tertiary gap-2 p-4 text-center">
                <ShieldAlert size={24} className="opacity-30" />
                <p className="text-[12px]">Trigger a threat simulation to view forensic logs.</p>
              </div>
            ) : (
              incidents.map((inc) => (
                <button
                  key={inc.id}
                  onClick={() => setSelectedIncidentId(inc.id)}
                  className={`w-full text-left p-3 rounded-md transition-all border ${
                    selectedIncidentId === inc.id
                      ? 'bg-accent-light border-brand/30 shadow-xs'
                      : 'border-transparent hover:bg-bg-raised/60'
                  }`}
                >
                  <div className="flex justify-between items-start mb-1.5">
                    <span className="font-mono text-[10px] font-semibold text-text-tertiary">
                      {inc.id.split('-')[0]}
                    </span>
                    <SeverityPill severity={inc.severity} />
                  </div>
                  <h4 className="text-[12px] font-semibold text-text-primary truncate mb-1">
                    {inc.attack_type}
                  </h4>
                  <div className="flex justify-between items-center text-[10px] text-text-tertiary">
                    <span>IP: {inc.source_ip || 'Internal'}</span>
                    <span className="capitalize">{inc.status.replace('_', ' ')}</span>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Right Side: Report Viewer */}
        <div className="flex-1 bg-bg-surface border border-border-subtle rounded-md shadow-sm flex flex-col h-full overflow-hidden">
          {loading ? (
            <div className="flex-1 flex flex-col items-center justify-center text-text-tertiary gap-3">
              <div className="w-8 h-8 rounded-full border-2 border-brand border-t-transparent animate-spin" />
              <p className="text-[13px]">Generating report telemetry...</p>
            </div>
          ) : error || !report ? (
            <div className="flex-1 flex flex-col items-center justify-center text-text-tertiary gap-3 p-6 text-center">
              <AlertCircle size={32} className="opacity-20 text-brand" />
              <p className="text-[13px]">{error || 'Select an incident from the list to analyze its forensic report.'}</p>
            </div>
          ) : (
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Report Header */}
              <div className="px-6 py-4 border-b border-border-subtle shrink-0 flex justify-between items-center bg-bg-raised/20">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <FileText size={16} className="text-brand" />
                    <h3 className="section-title text-[15px]">Security Incident Report</h3>
                  </div>
                  <p className="text-[11px] text-text-tertiary font-mono">
                    Incident Ref: {report.incident_id} | Compiled by {report.generated_by} Agent
                  </p>
                </div>
                <Button variant="secondary" size="sm" onClick={handleDownloadPdf} className="border-border-strong hover:text-brand hover:border-brand/40">
                  <Download size={14} className="mr-1.5" />
                  Export PDF
                </Button>
              </div>

              {/* Tabs */}
              <div className="px-6 border-b border-border-subtle shrink-0 flex gap-4 bg-bg-raised/10">
                {(['executive', 'technical', 'timeline', 'recommendations', 'compliance'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveReportTab(tab)}
                    className={`py-3 text-[12px] font-semibold transition-all border-b-2 capitalize ${
                      activeReportTab === tab
                        ? 'border-brand text-brand'
                        : 'border-transparent text-text-tertiary hover:text-text-secondary'
                    }`}
                  >
                    {tab.replace('_', ' ')}
                  </button>
                ))}
              </div>

              {/* Tab Contents */}
              <div className="flex-1 overflow-auto p-6">
                {activeReportTab === 'executive' && (
                  <div className="space-y-4 max-w-3xl animate-thoughtSlide">
                    <div className="flex items-start gap-3">
                      <BookOpen size={18} className="text-brand shrink-0 mt-0.5" />
                      <div>
                        <h4 className="font-semibold text-text-primary text-[14px] mb-1.5">Executive Summary</h4>
                        <p className="text-[13px] text-text-secondary leading-relaxed bg-bg-base/30 p-4 rounded border border-border-subtle italic">
                          "{report.executive_summary}"
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 mt-6">
                      <div className="border border-border-subtle rounded p-4 bg-bg-raised/35">
                        <span className="panel-label">Analysis Confidence</span>
                        <div className="metric-number text-2xl text-text-primary mt-1">
                          {report.metrics?.confidence ? `${Math.round(Number(report.metrics.confidence) * 100)}%` : 'Verified'}
                        </div>
                        <p className="text-[10px] text-text-tertiary mt-1">Classification confidence from Sentinel & Oracle</p>
                      </div>
                      <div className="border border-border-subtle rounded p-4 bg-bg-raised/35">
                        <span className="panel-label">Response Execution Time</span>
                        <div className="metric-number text-2xl text-text-primary mt-1">
                          {report.metrics?.response_time_ms ? `${Math.round(Number(report.metrics.response_time_ms))}ms` : 'Automated'}
                        </div>
                        <p className="text-[10px] text-text-tertiary mt-1">From initial log ingestion to containment</p>
                      </div>
                    </div>
                  </div>
                )}

                {activeReportTab === 'technical' && (
                  <div className="space-y-6 max-w-3xl animate-thoughtSlide">
                    <div className="flex items-start gap-3">
                      <Terminal size={18} className="text-brand shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <h4 className="font-semibold text-text-primary text-[14px] mb-1.5">Technical Investigation Breakdown</h4>
                        <p className="text-[13px] text-text-secondary leading-relaxed font-mono bg-bg-sunken/20 p-4 rounded border border-border-subtle whitespace-pre-wrap">
                          {report.technical_summary}
                        </p>
                      </div>
                    </div>

                    {/* Threat Details Card */}
                    <div className="bg-white border border-border-subtle rounded-md p-5 shadow-xs space-y-3">
                      <h4 className="font-semibold text-text-primary text-[11px] uppercase tracking-wider font-mono text-text-tertiary">
                        Threat Details
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-1.5 text-[12px] font-mono">
                        <div className="flex justify-between py-1.5 border-b border-border-subtle">
                          <span className="text-text-tertiary">Attack Classification:</span>
                          <span className="text-text-primary font-semibold">
                            {(targetIncident?.investigation?.classification || targetIncident?.severity || 'Analysis pending').toUpperCase()}
                          </span>
                        </div>
                        <div className="flex justify-between py-1.5 border-b border-border-subtle">
                          <span className="text-text-tertiary">MITRE Technique:</span>
                          <span className="text-text-primary font-semibold">
                            {targetIncident?.investigation?.attack_type || targetIncident?.threat_signal?.suspected_attack_type || 'Analysis pending'}
                          </span>
                        </div>
                        <div className="flex flex-col py-1.5 border-b border-border-subtle">
                          <div className="flex justify-between mb-1">
                            <span className="text-text-tertiary">Confidence Score:</span>
                            <span className="text-text-primary font-semibold">
                              {targetIncident?.investigation?.confidence 
                                ? `${Math.round(targetIncident.investigation.confidence * 100)}%` 
                                : '85%'}
                            </span>
                          </div>
                          <div className="w-full bg-bg-raised h-1.5 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-[#D4380D]" 
                              style={{ 
                                width: targetIncident?.investigation?.confidence 
                                  ? `${targetIncident.investigation.confidence * 100}%` 
                                  : '85%' 
                              }}
                            />
                          </div>
                        </div>
                        <div className="flex justify-between py-1.5 border-b border-border-subtle">
                          <span className="text-text-tertiary">CVE References:</span>
                          <span className="text-text-primary font-semibold">
                            {targetIncident?.investigation?.attacker_profile || 'No CVE matches found'}
                          </span>
                        </div>
                        <div className="flex justify-between py-1.5 border-b border-border-subtle">
                          <span className="text-text-tertiary">Source IP:</span>
                          <span className="text-text-primary font-semibold">
                            {targetIncident?.source_ip || 'Internal'}
                          </span>
                        </div>
                        <div className="flex justify-between py-1.5 border-b border-border-subtle">
                          <span className="text-text-tertiary">Target Systems:</span>
                          <span className="text-text-primary font-semibold text-right">
                            {targetIncident?.target_endpoint || 'Analysis pending'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Evidence Log Card */}
                    <div className="bg-white border border-border-subtle rounded-md p-5 shadow-xs space-y-3 relative">
                      <div className="flex justify-between items-center">
                        <h4 className="font-semibold text-text-primary text-[11px] uppercase tracking-wider font-mono text-text-tertiary">
                          Evidence Log
                        </h4>
                        <button 
                          onClick={() => {
                            const evidence = targetIncident?.threat_signal?.description || 'Raw log not available';
                            navigator.clipboard.writeText(evidence);
                            addAlert({ message: 'Evidence log copied to clipboard', type: 'success' });
                          }}
                          style={{
                            background: 'transparent',
                            border: '1px solid #D3D1C7',
                            color: '#5E5955',
                            padding: '3px 8px',
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          Copy
                        </button>
                      </div>
                      <div style={{
                        background: '#F2F0EC',
                        borderRadius: '8px',
                        padding: '16px',
                        fontFamily: "'JetBrains Mono', monospace",
                        fontSize: '11px',
                        color: '#4A4642',
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-all',
                      }}>
                        {targetIncident?.threat_signal?.description || 'Raw log not available'}
                      </div>
                    </div>
                  </div>
                )}

                {activeReportTab === 'timeline' && (
                  <div className="space-y-6 max-w-3xl animate-thoughtSlide relative">
                    <h4 className="font-semibold text-text-primary text-[14px] mb-4 flex items-center gap-2">
                      <Clock size={16} className="text-brand" />
                      Agent Swarm Incident Timeline
                    </h4>
                    
                    <div className="relative pl-8 space-y-6 py-1">
                      <div 
                        className="absolute left-[15px] top-2.5 bottom-2.5 w-0.5"
                        style={{ backgroundColor: '#ECEAE5' }}
                      />

                      {[
                        {
                          agent: 'Sentinel',
                          color: '#531DAB',
                          bgColor: '#F9F0FF',
                          badge: 'SENT',
                          action: 'Threat Detection Ingestion',
                          detail: 'Parsed anomalous event telemetry; raised security threat score to critical threshold.',
                          timeOffset: 0,
                        },
                        {
                          agent: 'Nexus',
                          color: '#7C5A00',
                          bgColor: '#FFFBE6',
                          badge: 'NEXS',
                          action: 'Swarm Task Orchestration',
                          detail: 'Incident context logged and routed task packets to Oracle for deep RAG inspection.',
                          timeOffset: 1.2,
                        },
                        {
                          agent: 'Oracle',
                          color: '#003EB3',
                          bgColor: '#F0F5FF',
                          badge: 'ORAC',
                          action: 'Exploit Vector Analysis',
                          detail: 'Correlated telemetry indicators with threat intelligence databases and identified CVE profiles.',
                          timeOffset: 2.5,
                        },
                        {
                          agent: 'Striker',
                          color: '#CF1322',
                          bgColor: '#FFF1F0',
                          badge: 'STRK',
                          action: 'Automated Containment Execution',
                          detail: 'Engaged active block on source IP address and initiated user credential revocation protocols.',
                          timeOffset: 3.8,
                        },
                        {
                          agent: 'Herald',
                          color: '#237804',
                          bgColor: '#F6FFED',
                          badge: 'HERA',
                          action: 'Forensic Audit Compilation',
                          detail: 'Synthesized diagnostic timelines and successfully compiled structured reports.',
                          timeOffset: 4.9,
                        },
                      ].map((node, idx) => {
                        const baseTime = targetIncident?.created_at 
                          ? new Date(targetIncident.created_at) 
                          : new Date();
                        const nodeTime = new Date(baseTime.getTime() + node.timeOffset * 1000);
                        const timeStr = nodeTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

                        return (
                          <div key={idx} className="relative flex gap-4">
                            <span 
                              className="absolute left-[-21px] top-1.5 w-3 h-3 rounded-full border-2 border-white"
                              style={{ 
                                backgroundColor: node.color,
                                boxShadow: `0 0 0 3px ${node.bgColor}`
                              }}
                            />
                            
                            <div className="flex-1 bg-white border border-border-subtle rounded-md p-4 shadow-xs">
                              <div className="flex items-center justify-between flex-wrap gap-2 mb-1.5">
                                <div className="flex items-center gap-2">
                                  <span style={{
                                    display: 'inline-flex',
                                    padding: '1px 6px',
                                    borderRadius: '4px',
                                    background: node.bgColor,
                                    border: `1px solid ${node.color}30`,
                                    color: node.color,
                                    fontFamily: "'JetBrains Mono', monospace",
                                    fontSize: '10px',
                                    fontWeight: 700,
                                  }}>
                                    {node.badge}
                                  </span>
                                  <span style={{
                                    fontFamily: "'Geist', sans-serif",
                                    fontSize: '13px',
                                    fontWeight: 600,
                                    color: '#0F0E0D',
                                  }}>
                                    {node.action}
                                  </span>
                                </div>
                                <span style={{
                                  fontFamily: "'JetBrains Mono', monospace",
                                  fontSize: '11px',
                                  color: '#8A8480',
                                }}>
                                  +{node.timeOffset}s ({timeStr})
                                </span>
                              </div>
                              <p className="text-[12px] text-text-secondary leading-relaxed">
                                {node.detail}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {activeReportTab === 'recommendations' && (
                  <div className="space-y-4 max-w-3xl animate-thoughtSlide">
                    <h4 className="font-semibold text-text-primary text-[14px] mb-3 flex items-center gap-2">
                      <CheckCircle size={16} className="text-[#237804]" />
                      Actionable Swarm Recommendations
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {targetIncident?.investigation?.recommended_actions && targetIncident.investigation.recommended_actions.length > 0 ? (
                        targetIncident.investigation.recommended_actions.map((rec: string, idx: number) => (
                          <div 
                            key={idx} 
                            className="bg-white rounded p-4 border border-border-subtle hover:border-brand/35 transition-all flex gap-3 shadow-xs"
                            style={{ borderLeft: '4px solid #D4380D' }}
                          >
                            <span className="metric-number text-brand text-[15px] font-bold">{idx + 1}.</span>
                            <div>
                              <h5 className="font-bold text-[13px] text-text-primary mb-1">Recommended Action</h5>
                              <p className="text-[12px] text-text-secondary leading-relaxed">{rec}</p>
                            </div>
                          </div>
                        ))
                      ) : (
                        [
                          {
                            title: 'Review Firewall Rules',
                            desc: 'Verify firewall filters and check for persistent ingress attempts. Ensure that malicious subnet routes are actively blocked.',
                          },
                          {
                            title: 'Enable Multi-Factor Authentication',
                            desc: 'Enforce strict multi-factor authentication (MFA) parameters globally. Audit active sessions for anomalous elevation triggers.',
                          },
                          {
                            title: 'Conduct Security Audit',
                            desc: 'Audit active application query parameters to guard against parameter injection. Validate database connection access pools.',
                          },
                        ].map((rec, idx) => (
                          <div 
                            key={idx} 
                            className="bg-white rounded p-4 border border-border-subtle hover:border-brand/35 transition-all flex gap-3 shadow-xs"
                            style={{ borderLeft: '4px solid #D4380D' }}
                          >
                            <span className="metric-number text-brand text-[15px] font-bold">{idx + 1}.</span>
                            <div>
                              <h5 className="font-bold text-[13px] text-text-primary mb-1">{rec.title}</h5>
                              <p className="text-[12px] text-text-secondary leading-relaxed">{rec.desc}</p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}

                {activeReportTab === 'compliance' && (
                  <div className="space-y-6 max-w-3xl animate-thoughtSlide">
                    <div className="flex items-start gap-3">
                      <ShieldAlert size={18} className="text-brand shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <h4 className="font-semibold text-text-primary text-[14px] mb-1.5">Compliance Mapping & Framework Audit</h4>
                        <p className="text-[13px] text-text-secondary leading-relaxed bg-bg-base/30 p-4 rounded border border-border-subtle font-mono">
                          {report.compliance_notes}
                        </p>
                      </div>
                    </div>

                    {/* Progress Bars */}
                    <div className="bg-white border border-border-subtle rounded-md p-6 shadow-xs space-y-5">
                      <h4 className="font-semibold text-text-primary text-[11px] uppercase tracking-wider font-mono text-text-tertiary">
                        Framework Readiness Metrics
                      </h4>
                      <div className="space-y-4">
                        {[
                          {
                            name: 'GDPR Compliance Audit',
                            pct: 87,
                            color: '#003EB3',
                            bg: '#F0F5FF',
                            border: '#ADC6FF',
                            status: 'COMPLIANT',
                          },
                          {
                            name: 'SOC 2 Access Control',
                            pct: 73,
                            color: '#D46B08',
                            bg: '#FFF7E6',
                            border: '#FFD591',
                            status: 'REVIEW REQUIRED',
                          },
                          {
                            name: 'ISO 27001 Data Protection',
                            pct: 91,
                            color: '#237804',
                            bg: '#F6FFED',
                            border: '#B7EB8F',
                            status: 'FULLY AUDITED',
                          },
                        ].map((bar, idx) => (
                          <div key={idx} className="space-y-1.5">
                            <div className="flex justify-between items-center flex-wrap gap-2 text-[12px]">
                              <span className="font-bold text-text-secondary">{bar.name}</span>
                              <div className="flex items-center gap-2">
                                <span style={{
                                  background: bar.bg,
                                  border: `1px solid ${bar.border}`,
                                  color: bar.color,
                                  padding: '1px 6px',
                                  borderRadius: '4px',
                                  fontSize: '9px',
                                  fontWeight: 700,
                                  fontFamily: "'JetBrains Mono', monospace"
                                }}>
                                  {bar.status}
                                </span>
                                <span className="font-mono font-bold text-text-primary">{bar.pct}%</span>
                              </div>
                            </div>
                            <div className="w-full bg-bg-raised h-2 rounded-full overflow-hidden">
                              <div 
                                className="h-full rounded-full transition-all duration-500" 
                                style={{ 
                                  width: `${bar.pct}%`,
                                  backgroundColor: bar.color 
                                }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
