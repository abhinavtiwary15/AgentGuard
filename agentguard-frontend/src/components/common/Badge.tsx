import React from 'react';

interface BadgeProps {
  label: string;
  variant?: 'critical' | 'high' | 'medium' | 'low' | 'info' | 'default';
  dot?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({ label, variant = 'default', dot = false }) => {
  let bgClass = 'bg-bg-raised text-text-secondary';
  let dotClass = 'bg-text-tertiary';

  switch (variant) {
    case 'critical': bgClass = 'bg-severity-critical-bg text-severity-critical border border-severity-critical-border'; dotClass = 'bg-severity-critical animate-critPulse'; break;
    case 'high': bgClass = 'bg-severity-high-bg text-severity-high border border-severity-high-border'; dotClass = 'bg-severity-high'; break;
    case 'medium': bgClass = 'bg-severity-medium-bg text-severity-medium border border-severity-medium-border'; dotClass = 'bg-severity-medium'; break;
    case 'low': bgClass = 'bg-severity-low-bg text-severity-low border border-severity-low-border'; dotClass = 'bg-severity-low'; break;
    case 'info': bgClass = 'bg-severity-info-bg text-severity-info border border-severity-info-border'; dotClass = 'bg-severity-info'; break;
  }

  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-sm severity-badge-text ${bgClass}`}>
      {dot && <span className={`w-1.5 h-1.5 rounded-full ${dotClass}`}></span>}
      {label}
    </span>
  );
};
