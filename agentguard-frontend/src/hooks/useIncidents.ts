import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../api/client';
import { Incident } from '../types';
import { useIncidentStore } from '../store/incidentStore';

export function useIncidents() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const incidents = useIncidentStore((state) => state.incidents);
  const setIncidents = useIncidentStore((state) => state.setIncidents);
  const updateIncidentStore = useIncidentStore((state) => state.updateIncident);

  const fetchIncidents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await apiClient.get<Incident[]>('/incidents/?limit=10');
      setIncidents(data);
    } catch (e: any) {
      setError(e.message || 'Failed to fetch incidents');
    } finally {
      setLoading(false);
    }
  }, [setIncidents]);

  const resolveIncident = useCallback(async (id: string, notes = 'Resolved via dashboard') => {
    try {
      const { data } = await apiClient.patch<Incident>(`/incidents/${id}/resolve`, { notes });
      updateIncidentStore(data);
      return data;
    } catch (e: any) {
      console.error('Failed to resolve incident:', e);
      throw e;
    }
  }, [updateIncidentStore]);

  useEffect(() => {
    fetchIncidents();
  }, [fetchIncidents]);

  return {
    incidents,
    loading,
    error,
    refetch: fetchIncidents,
    resolveIncident,
  };
}
