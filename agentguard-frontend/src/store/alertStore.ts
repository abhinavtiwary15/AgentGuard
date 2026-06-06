import { create } from 'zustand';

export interface Alert {
  id: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  timestamp: Date;
}

interface AlertState {
  alerts: Alert[];
  addAlert: (alert: Omit<Alert, 'id' | 'timestamp'>) => void;
  removeAlert: (id: string) => void;
}

export const useAlertStore = create<AlertState>((set) => ({
  alerts: [],
  addAlert: (alert) => set((state) => {
    const newAlert = { ...alert, id: Math.random().toString(), timestamp: new Date() };
    return { alerts: [newAlert, ...state.alerts].slice(0, 50) };
  }),
  removeAlert: (id) => set((state) => ({
    alerts: state.alerts.filter((a) => a.id !== id)
  })),
}));
