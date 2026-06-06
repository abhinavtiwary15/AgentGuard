import React, { useState } from 'react';
import { useIncidents } from '../../hooks/useIncidents';
import { ShieldAlert, CheckCircle, Clock } from 'lucide-react';
import { SeverityPill } from '../common/SeverityPill';

function relativeTime(dateStr: string): string {
  try {
    const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  } catch {
    return dateStr;
  }
}

export const IncidentTable: React.FC = () => {
  const { incidents, loading, resolveIncident } = useIncidents();
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  const handleResolve = async (id: string) => {
    setResolvingId(id);
    try {
      await resolveIncident(id);
    } catch (e) {
      console.error(e);
    } finally {
      setResolvingId(null);
    }
  };

  // Filter incidents
  const filteredIncidents = incidents
    .filter((incident) => {
      const severityMatch =
        severityFilter === 'all' ||
        incident.severity?.toLowerCase() === severityFilter.toLowerCase();

      let statusMatch = true;
      if (statusFilter === 'active') {
        statusMatch =
          incident.status !== 'resolved' && incident.status !== 'false_positive';
      } else if (statusFilter === 'resolved') {
        statusMatch = incident.status === 'resolved';
      } else if (statusFilter === 'false-positive') {
        statusMatch = incident.status === 'false_positive';
      }

      return severityMatch && statusMatch;
    })
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return (
    <div className="bg-bg-surface border border-border-subtle rounded-md shadow-sm h-full flex flex-col el-4">
      {/* Header with Filters */}
      <div className="px-4 py-3 border-b border-border-subtle shrink-0 flex flex-wrap gap-3 items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="section-title">Incidents Feed</h3>
          <span style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '10px',
            color: '#8A8480',
            background: '#F2F0EC',
            padding: '1px 6px',
            borderRadius: '4px',
          }}>
            {filteredIncidents.length} match
          </span>
        </div>

        {/* Filter controls */}
        <div className="flex gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{
              fontFamily: "'Geist', sans-serif",
              fontSize: '11px',
              padding: '2px 8px',
              borderRadius: '4px',
              border: '1px solid #D3D1C7',
              background: '#FFFFFF',
              color: '#4A4642',
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            <option value="all">All Statuses</option>
            <option value="active">Active Only</option>
            <option value="resolved">Resolved Only</option>
            <option value="false-positive">False Positives</option>
          </select>

          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            style={{
              fontFamily: "'Geist', sans-serif",
              fontSize: '11px',
              padding: '2px 8px',
              borderRadius: '4px',
              border: '1px solid #D3D1C7',
              background: '#FFFFFF',
              color: '#4A4642',
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            <option value="all">All Severities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
      </div>

      {/* Table Content */}
      <div className="flex-1 overflow-auto">
        {loading && filteredIncidents.length === 0 ? (
          <div className="flex items-center justify-center p-8 text-text-tertiary text-[13px] gap-2">
            <div className="w-4 h-4 border-2 border-brand border-t-transparent rounded-full animate-spin"></div>
            Loading incidents...
          </div>
        ) : filteredIncidents.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-text-tertiary gap-2 p-8" style={{ minHeight: '180px' }}>
            <ShieldAlert size={28} className="opacity-20" />
            <p className="text-[12px]">No matching incidents found.</p>
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead className="bg-bg-raised sticky top-0 z-10">
              <tr>
                <th className="px-4 py-2 border-b border-border-subtle panel-label font-medium">Severity</th>
                <th className="px-4 py-2 border-b border-border-subtle panel-label font-medium">ID</th>
                <th className="px-4 py-2 border-b border-border-subtle panel-label font-medium">Attack Type</th>
                <th className="px-4 py-2 border-b border-border-subtle panel-label font-medium">Time</th>
                <th className="px-4 py-2 border-b border-border-subtle panel-label font-medium">Status</th>
                <th className="px-4 py-2 border-b border-border-subtle panel-label font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredIncidents.map((incident) => {
                const isActive = incident.status !== 'resolved' && incident.status !== 'false_positive';
                const shortId = (id: string) => 
                  id.length > 12 ? '...' + id.slice(-8) : id;
                const getStatusStyle = (status: string) => {
                  const s = status.toLowerCase();
                  if (s === 'resolved') {
                    return { bg: '#F2F0EC', border: '#D3D1C7', text: '#5E5955' };
                  }
                  if (s === 'blocked') {
                    return { bg: '#F6FFED', border: '#B7EB8F', text: '#237804' };
                  }
                  return { bg: '#FFF7E6', border: '#FFD591', text: '#D46B08' };
                };
                const statusStyles = getStatusStyle(incident.status);

                return (
                  <tr 
                    key={incident.id} 
                    className="border-b border-border-subtle hover:bg-bg-raised/30 transition-colors"
                    style={{ animation: 'fadeInUp 0.4s ease-out forwards' }}
                  >
                    {/* 1. Severity Pill */}
                    <td className="px-4 py-2.5">
                      <SeverityPill severity={incident.severity} />
                    </td>
                    {/* 2. INC ID */}
                    <td 
                      className="px-4 py-2.5 font-mono text-[11px] font-semibold"
                      style={{ color: '#D4380D' }}
                    >
                      {shortId(incident.id)}
                    </td>
                    {/* 3. Attack Type */}
                    <td 
                      className="px-4 py-2.5 text-[13px] text-text-primary font-medium"
                      style={{ fontFamily: "'Geist', sans-serif" }}
                    >
                      {incident.attack_type}
                    </td>
                    {/* 4. Time */}
                    <td className="px-4 py-2.5 text-[11px] text-text-tertiary font-mono">
                      <span className="inline-flex items-center gap-1">
                        <Clock size={11} />
                        {relativeTime(incident.created_at)}
                      </span>
                    </td>
                    {/* 5. Status Pill */}
                    <td className="px-4 py-2.5">
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        padding: '2px 8px',
                        borderRadius: 99,
                        background: statusStyles.bg,
                        border: `1px solid ${statusStyles.border}`,
                        color: statusStyles.text,
                        fontFamily: "'JetBrains Mono', monospace",
                        fontSize: '10px',
                        fontWeight: 600,
                        textTransform: 'capitalize'
                      }}>
                        {incident.status.replace('_', ' ')}
                      </span>
                    </td>
                    {/* 6. Action Button */}
                    <td className="px-4 py-2.5 text-right">
                      {isActive ? (
                        <button
                          onClick={() => handleResolve(incident.id)}
                          disabled={resolvingId === incident.id}
                          style={{
                            fontFamily: "'Geist', sans-serif",
                            fontSize: '11px',
                            fontWeight: 600,
                            color: '#237804',
                            background: '#F6FFED',
                            border: '1px solid #B7EB8F',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            cursor: resolvingId === incident.id ? 'not-allowed' : 'pointer',
                            transition: 'all 0.2s ease',
                          }}
                          className="hover:bg-[#237804] hover:text-white"
                        >
                          {resolvingId === incident.id ? 'Resolving...' : 'Resolve'}
                        </button>
                      ) : (
                        <span className="text-text-tertiary inline-flex items-center gap-1 text-[11px] font-medium">
                          <CheckCircle size={12} className="text-[#237804]" />
                          Closed
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
