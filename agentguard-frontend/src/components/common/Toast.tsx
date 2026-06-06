import React from 'react';
import { useAlertStore } from '../../store/alertStore';
import { AlertCircle, CheckCircle, Info, XCircle } from 'lucide-react';

export const Toast: React.FC = () => {
  const alerts = useAlertStore((state) => state.alerts);
  const removeAlert = useAlertStore((state) => state.removeAlert);

  if (alerts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 flex flex-col gap-2 z-50 pointer-events-none">
      {alerts.slice(0, 3).map((alert) => {
        let Icon = Info;
        let iconColor = 'text-severity-info';
        let bgColor = 'bg-bg-surface';
        
        if (alert.type === 'error') { Icon = XCircle; iconColor = 'text-severity-critical'; bgColor = 'bg-severity-critical-bg'; }
        if (alert.type === 'warning') { Icon = AlertCircle; iconColor = 'text-severity-high'; bgColor = 'bg-severity-high-bg'; }
        if (alert.type === 'success') { Icon = CheckCircle; iconColor = 'text-severity-low'; bgColor = 'bg-severity-low-bg'; }

        return (
          <div 
            key={alert.id}
            className={`pointer-events-auto flex items-start gap-3 p-4 rounded-md shadow-lg border border-border-subtle animate-toastIn w-80 ${bgColor}`}
            onClick={() => removeAlert(alert.id)}
          >
            <Icon size={18} className={`shrink-0 mt-0.5 ${iconColor}`} />
            <div className="flex-1">
              <p className="text-[13px] font-body text-text-primary">{alert.message}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
};
