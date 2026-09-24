import React from 'react';
import { MetricCard } from './MetricCard';
import { useIncidentStats } from '../../hooks/useIncidentStats';

const SkeletonValue: React.FC = () => (
  <div
    className="skeleton"
    style={{ height: 40, width: 80 }}
    aria-label="Loading..."
  />
);

export const MetricsStrip: React.FC = () => {
  const { stats, loading } = useIncidentStats(30000);

  const criticalCount = stats.critical;
  const avgResponse = stats.avgResponseMs > 0
    ? `${Math.round(stats.avgResponseMs)}ms`
    : '—';

  const autoResolutionDisplay = stats.autoResolvedPct !== null
    ? `${stats.autoResolvedPct}%`
    : '—';

  const formatUptime = (seconds: number | null): string => {
    if (seconds === null) return 'Live';
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${Math.max(1, mins)}m`;
  };

  return (
    <div className="grid grid-cols-6 gap-4 p-6 shrink-0">
      <MetricCard
        label="Critical Threats"
        value={loading ? <SkeletonValue /> : String(criticalCount)}
        severity={criticalCount > 0 ? 'critical' : 'low'}
        delta="Live"
        delayClass="el-1"
      />
      <MetricCard
        label="Total Incidents"
        value={loading ? <SkeletonValue /> : String(stats.total)}
        severity="info"
        delta="All time"
        delayClass="el-1"
      />
      <MetricCard
        label="Resolved"
        value={loading ? <SkeletonValue /> : String(stats.resolved)}
        severity="low"
        delta="Handled"
        delayClass="el-2"
      />
      <MetricCard
        label="Avg Response"
        value={loading ? <SkeletonValue /> : avgResponse}
        severity="low"
        delta="Per incident"
        delayClass="el-2"
      />
      <MetricCard
        label="Auto-Resolution"
        value={loading ? <SkeletonValue /> : autoResolutionDisplay}
        severity={stats.autoResolvedPct !== null && stats.autoResolvedPct >= 80 ? 'low' : 'medium'}
        delta={stats.autoResolvedPct !== null ? 'Autonomous' : 'No closed data'}
        delayClass="el-3"
      />
      <MetricCard
        label="Engine Uptime"
        value={loading ? <SkeletonValue /> : formatUptime(stats.uptimeSeconds)}
        severity="low"
        delta="Process runtime"
        delayClass="el-4"
      />
    </div>
  );
};
