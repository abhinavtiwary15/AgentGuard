import { create } from 'zustand';
import { Incident } from '../types';

interface IncidentState {
  incidents: Incident[];
  setIncidents: (incidents: Incident[] | ((prev: Incident[]) => Incident[])) => void;
  updateIncident: (incident: Incident) => void;
  addIncident: (incident: Incident) => void;
}

export const useIncidentStore = create<IncidentState>((set) => ({
  incidents: [],
  setIncidents: (incidents) => set((state) => ({
    incidents: typeof incidents === 'function' ? incidents(state.incidents) : incidents
  })),
  updateIncident: (updated) => set((state) => ({
    incidents: state.incidents.map((i) => i.id === updated.id ? updated : i)
  })),
  addIncident: (incident) => set((state) => {
    if (!state.incidents.find(i => i.id === incident.id)) {
      return { incidents: [incident, ...state.incidents] };
    }
    return state;
  }),
}));
