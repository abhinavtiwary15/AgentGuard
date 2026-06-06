import { create } from 'zustand';
import { AgentState } from '../types';

export interface ThoughtLogEntry {
  id: string;
  agent: string;
  text: string;
  timestamp: string;
  isNew?: boolean;
}

interface AgentStoreState {
  agents: AgentState[];
  thoughtLog: ThoughtLogEntry[];
  setAgents: (agents: AgentState[]) => void;
  updateAgent: (agent: Partial<AgentState> & { name: string }) => void;
  addThought: (agentName: string, thought: string) => void;
  addThoughtLog: (agent: string, text: string) => void;
  seedDemoData: () => void;
}

export const useAgentStore = create<AgentStoreState>((set) => ({
  agents: [
    {
      name: 'Sentinel',
      status: 'idle',
      current_task: 'Monitoring perimeter...',
      tasks_completed: 0,
      tasks_today: 0,
      avg_response_ms: 0,
      last_active: new Date().toISOString(),
      thoughts: []
    },
    {
      name: 'Oracle',
      status: 'idle',
      current_task: 'Awaiting analysis tasks...',
      tasks_completed: 0,
      tasks_today: 0,
      avg_response_ms: 0,
      last_active: new Date().toISOString(),
      thoughts: []
    },
    {
      name: 'Striker',
      status: 'idle',
      current_task: 'Standing by for response...',
      tasks_completed: 0,
      tasks_today: 0,
      avg_response_ms: 0,
      last_active: new Date().toISOString(),
      thoughts: []
    },
    {
      name: 'Nexus',
      status: 'idle',
      current_task: 'Coordinating agents...',
      tasks_completed: 0,
      tasks_today: 0,
      avg_response_ms: 0,
      last_active: new Date().toISOString(),
      thoughts: []
    },
    {
      name: 'Herald',
      status: 'idle',
      current_task: 'Ready to generate reports...',
      tasks_completed: 0,
      tasks_today: 0,
      avg_response_ms: 0,
      last_active: new Date().toISOString(),
      thoughts: []
    }
  ] as AgentState[],

  thoughtLog: [] as ThoughtLogEntry[],

  setAgents: (agents) => set({ agents }),

  updateAgent: (updated) => {
    set((state) => {
      const exists = state.agents.some(
        (a) => a.name.toLowerCase() === updated.name?.toLowerCase()
      );
      if (exists) {
        return {
          agents: state.agents.map((a) =>
            a.name.toLowerCase() === updated.name?.toLowerCase()
              ? { ...a, ...updated, name: a.name }
              : a
          ),
        };
      } else {
        return {
          agents: [...state.agents, updated as AgentState],
        };
      }
    });
  },

  addThought: (agentName, thought) => set((state) => {
    const thoughtText = thought ?? '';
    if (!thoughtText) return state;

    const exists = state.agents.some(
      (a) => a.name.toLowerCase() === agentName?.toLowerCase()
    );

    if (!exists) {
      const newAgent = {
        name: agentName,
        status: 'active' as const,
        current_task: thoughtText,
        tasks_completed: 0,
        tasks_today: 0,
        avg_response_ms: 0,
        last_active: new Date().toISOString(),
        thoughts: [thoughtText],
      };
      return {
        agents: [...state.agents, newAgent as AgentState],
      };
    }

    return {
      agents: state.agents.map((a) =>
        a.name.toLowerCase() === agentName?.toLowerCase()
          ? {
              ...a,
              thoughts: [thoughtText, ...(a.thoughts ?? [])].slice(0, 50),
            }
          : a
      ),
    };
  }),

  addThoughtLog: (agent: string, text: string) => set((state) => ({
    thoughtLog: [
      {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        agent,
        text,
        timestamp: new Date().toLocaleTimeString('en-US', {
          hour12: false,
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        }),
        isNew: true,
      },
      ...state.thoughtLog,
    ].slice(0, 100),
  })),

  seedDemoData: () => set((state) => ({
    thoughtLog: state.thoughtLog.length > 0 ? state.thoughtLog : [
      {
        id: 'seed-1',
        agent: 'Sentinel',
        text: 'System initialized. Beginning perimeter sweep.',
        timestamp: '13:00:00',
      },
      {
        id: 'seed-2',
        agent: 'Nexus',
        text: 'All agents online. Swarm coordination active.',
        timestamp: '13:00:01',
      },
      {
        id: 'seed-3',
        agent: 'Oracle',
        text: 'Threat intelligence database loaded. 2,847 CVEs indexed.',
        timestamp: '13:00:02',
      },
    ],
  })),
}));
