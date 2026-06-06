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
        delta="Today"
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
        label="AI Accuracy"
        value={loading ? <SkeletonValue /> : `${stats.accuracy}%`}
        severity="medium"
        delta="+0.2%"
        delayClass="el-3"
      />
      <MetricCard
        label="System Uptime"
        value={loading ? <SkeletonValue /> : `${stats.uptime}%`}
        severity="low"
        delta="30 days"
        delayClass="el-4"
      />
    </div>
  );
};
