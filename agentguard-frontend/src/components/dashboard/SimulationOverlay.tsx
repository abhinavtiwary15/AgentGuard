import React from 'react';
import { Play } from 'lucide-react';
import { Button } from '../common/Button';
import { apiClient } from '../../api/client';

export const SimulationOverlay: React.FC = () => {
  const triggerSimulation = async (scenario: string) => {
    try {
      const payload = { scenario, speed: 1.0 };
      console.log("SIMULATION CLICKED", payload);
      await apiClient.post('/simulation/run', payload);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="bg-bg-surface border border-border-subtle shadow-sm rounded-md p-4 w-full flex flex-col el-4">
      <div className="flex items-center gap-2 mb-2 shrink-0">
        <Play size={16} className="text-brand" />
        <h4 className="section-title text-[14px]">Live Simulation</h4>
      </div>
      <p className="text-[12px] text-text-tertiary mb-3 leading-relaxed shrink-0">
        Trigger a simulation to see AgentGuard respond in real-time.
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
