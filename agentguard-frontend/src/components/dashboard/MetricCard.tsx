import React from 'react';

interface MetricCardProps {
  label: string;
  value: string | number | React.ReactNode;
  severity?: 'critical' | 'high' | 'medium' | 'low' | 'info';
  delta?: string;
  delayClass?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({ label, value, severity = 'info', delta, delayClass = '' }) => {
  let borderClass = 'border-border-subtle';
  let valueClass = 'text-text-primary';

  switch (severity) {
    case 'critical': borderClass = 'border-severity-critical'; valueClass = 'text-severity-critical'; break;
    case 'high': borderClass = 'border-severity-high'; valueClass = 'text-severity-high'; break;
    case 'medium': borderClass = 'border-severity-medium'; valueClass = 'text-severity-medium'; break;
    case 'low': borderClass = 'border-severity-low'; valueClass = 'text-severity-low'; break;
  }

  return (
    <div className={`metric-card relative overflow-hidden bg-bg-surface rounded-md shadow-sm border border-border-subtle border-t-[3px] p-4 flex flex-col justify-between h-[100px] ${borderClass} ${delayClass}`}>
      <div className="flex justify-between items-start">
        <span className="panel-label">{label}</span>
        {delta && (
          <span className="text-[10px] font-mono bg-bg-raised px-1.5 py-0.5 rounded-full leading-none text-text-secondary">
            {delta}
          </span>
        )}
      </div>
      <div className={`metric-number text-[52px] leading-none tracking-tight ${valueClass}`}>
        {value}
      </div>
    </div>
  );
};
