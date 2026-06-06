import { create } from 'zustand';

interface UiState {
  selectedIncidentId: string | null;
  setSelectedIncidentId: (id: string | null) => void;
  activeReportTab: 'executive' | 'technical' | 'timeline' | 'recommendations' | 'compliance';
  setActiveReportTab: (tab: 'executive' | 'technical' | 'timeline' | 'recommendations' | 'compliance') => void;
}

export const useUiStore = create<UiState>((set) => ({
  selectedIncidentId: null,
  setSelectedIncidentId: (selectedIncidentId) => set({ selectedIncidentId }),
  activeReportTab: 'executive',
  setActiveReportTab: (activeReportTab) => set({ activeReportTab }),
}));
