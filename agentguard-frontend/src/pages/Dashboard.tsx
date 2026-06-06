import React from 'react';
import { CommandBar } from '../components/layout/CommandBar';
import { MetricsStrip } from '../components/dashboard/MetricsStrip';
import { GlobePanel } from '../components/dashboard/GlobePanel';
import { AgentSwarm } from '../components/dashboard/AgentSwarm';
import { ThoughtStream } from '../components/dashboard/ThoughtStream';
import { SimulationOverlay } from '../components/dashboard/SimulationOverlay';
import { IncidentTable } from '../components/dashboard/IncidentTable';
import { AlertFeed } from '../components/dashboard/AlertFeed';

export const Dashboard: React.FC = () => {
  return (
    <div className="h-full flex flex-col relative overflow-hidden bg-bg-base">
      <CommandBar title="Command Center" tag="LIVE" />

      {/* Main dashboard content container */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {/* Metrics Strip at the top */}
        <MetricsStrip />

        {/* ── Main 3-Column Layout ─────────────────────────────── */}
        <div 
          className="flex-1 px-6 pb-6 min-h-0 overflow-hidden"
          style={{
            display: 'grid',
            gridTemplateColumns: '350px 1fr 380px',
            gap: '24px',
          }}
        >
          
          {/* LEFT COLUMN: Agent Swarm Status + Simulation Overlay */}
          <div 
            className="min-h-0 overflow-hidden"
            style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}
          >
            <div className="flex-[2] min-h-0">
              <AgentSwarm />
            </div>
            <div className="flex-[1] min-h-0 shrink-0">
              <SimulationOverlay />
            </div>
          </div>

          {/* CENTER COLUMN: Active Incidents Table + Thought Stream */}
          <div 
            className="min-h-0 overflow-hidden"
            style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}
          >
            <div className="flex-[1.3] min-h-0">
              <IncidentTable />
            </div>
            <div className="flex-[1] min-h-0">
              <ThoughtStream />
            </div>
          </div>

          {/* RIGHT COLUMN: Threat Origins (Globe/Map) + Swarm Alerts */}
          <div 
            className="min-h-0 overflow-hidden"
            style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}
          >
            <div className="flex-[1.3] min-h-0">
              <GlobePanel />
            </div>
            <div className="flex-[1] min-h-0">
              <AlertFeed />
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
