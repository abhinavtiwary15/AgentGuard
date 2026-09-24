import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../api/client';

export interface IncidentStats {
  total: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  resolved: number;
  active: number;
  avgResponseMs: number;
  autoResolvedPct: number | null;
  uptimeSeconds: number | null;
  accuracy: number | null;
  uptime: number | null;
}

const DEFAULT_STATS: IncidentStats = {
  total: 0,
  critical: 0,
  high: 0,
  medium: 0,
  low: 0,
  resolved: 0,
  active: 0,
  avgResponseMs: 0,
  autoResolvedPct: null,
  uptimeSeconds: null,
  accuracy: null,
  uptime: null,
};

const CACHE_KEY = 'agentguard_incident_stats';

const getCachedStats = (): IncidentStats => {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      return {
        ...DEFAULT_STATS,
        ...parsed
      };
    }
  } catch (e) {
    console.error('Failed to parse cached stats', e);
  }
  return DEFAULT_STATS;
};

interface BackendStats {
  total: number;
  active: number;
  by_status: Record<string, number>;
  by_severity: Record<string, number>;
  by_attack_type: Record<string, number>;
  avg_response_ms?: number;
  auto_resolved_pct?: number | null;
  uptime_seconds?: number | null;
}

function mapBackendStats(data: BackendStats): IncidentStats {
  const autoResolved = data.auto_resolved_pct ?? null;
  return {
    total: data.total ?? 0,
    active: data.active ?? 0,
    critical: data.by_severity?.critical ?? 0,
    high: data.by_severity?.high ?? 0,
    medium: data.by_severity?.medium ?? 0,
    low: data.by_severity?.low ?? 0,
    resolved: data.by_status?.resolved ?? 0,
    avgResponseMs: data.avg_response_ms ?? 0,
    autoResolvedPct: autoResolved,
    uptimeSeconds: data.uptime_seconds ?? null,
    accuracy: autoResolved,
    uptime: null,
  };
}

export function useIncidentStats(refreshInterval = 30000) {
  const [stats, setStats] = useState<IncidentStats>(getCachedStats);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      const response = await apiClient.get<BackendStats>('/incidents/stats');
      const mapped = mapBackendStats(response.data);
      setStats(mapped);
      setError(null);
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify(mapped));
      } catch (e) {
        // Ignore quota/private browsing errors
      }
    } catch (err) {
      setError('Failed to fetch stats');
      // Keep current state if populated, else load from cache
      setStats((prev) => (prev.total > 0 ? prev : getCachedStats()));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, refreshInterval);
    return () => clearInterval(interval);
  }, [fetchStats, refreshInterval]);

  return { stats, loading, error, refetch: fetchStats };
}
