import React from 'react';
import { Play } from 'lucide-react';
import { Button } from '../common/Button';
import { apiClient } from '../../api/client';

export const SimulationOverlay: React.FC = () => {
  const triggerSimulation = async (scenario: string) => {
    try {
      console.log('API URL:', import.meta.env.VITE_API_URL);
      console.log('WS URL:', import.meta.env.VITE_WS_URL);
      const payload = { scenario, speed: 1.0, dry_run: false };
      const response = await apiClient.post('/simulation/run', payload);
      console.log('Simulation started:', response.data);
    } catch (e: any) {
      console.error('Simulation failed:', e);
      // Show visible error to user
      alert(`Simulation failed: ${e?.response?.status} ${e?.message}. Check console.`);
    }
  };

  return (
    <div className="bg-bg-surface border border-border-subtle shadow-sm rounded-md p-4 w-full flex flex-col el-4">
      <div className="flex items-center gap-2 mb-2 shrink-0">
        <Play size={16} className="text-brand" />
        <h4 className="section-title text-[14px]">Scenario Playback</h4>
      </div>
      <p className="text-[12px] text-text-tertiary mb-3 leading-relaxed shrink-0">
        Replay pre-timed drill scenarios through the live agent detection pipeline.
      </p>
      <div className="flex flex-col gap-1.5 flex-1 justify-center">
        <Button variant="secondary" size="sm" className="w-full justify-start border-border-strong hover:border-brand/50 hover:text-brand text-[12px] py-1" onClick={() => triggerSimulation('sql_injection')}>
          1. SQL Injection Attack
        </Button>
        <Button variant="secondary" size="sm" className="w-full justify-start border-border-strong hover:border-brand/50 hover:text-brand text-[12px] py-1" onClick={() => triggerSimulation('brute_force')}>
          2. Credential Stuffing
        </Button>
        <Button variant="secondary" size="sm" className="w-full justify-start border-border-strong hover:border-brand/50 hover:text-brand text-[12px] py-1" onClick={() => triggerSimulation('insider_threat')}>
          3. Insider Threat
        </Button>
      </div>
    </div>
  );
};
