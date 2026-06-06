import { useEffect, useState, useCallback } from 'react';
import { useAgentStore } from '../store/agentStore';
import { apiClient } from '../api/client';
import { AgentState } from '../types';

export function useAgents() {
  const agents = useAgentStore((state) => state.agents);
  const updateAgent = useAgentStore((state) => state.updateAgent);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAgents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.get<AgentState[]>('/agents/status');
      if (Array.isArray(response.data)) {
        response.data.forEach((agent) => updateAgent(agent));
      }
    } catch (err) {
      console.error('Could not fetch agent status:', err);
      setError('Failed to fetch agent status');
    } finally {
      setLoading(false);
    }
  }, [updateAgent]);

  useEffect(() => {
    fetchAgents();
  }, [fetchAgents]);

  return { agents, loading, error, refetch: fetchAgents };
}
