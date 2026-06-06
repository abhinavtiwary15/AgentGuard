import React from 'react';
import { useAlertStore } from '../../store/alertStore';
import { Info, AlertTriangle, ShieldAlert, CheckCircle, Clock } from 'lucide-react';

const alertIcons = {
  info: Info,
  success: CheckCircle,
  warning: AlertTriangle,
  error: ShieldAlert,
};

const alertColors = {
  info: { text: '#003EB3', bg: '#E6F7FF', border: '#91D5FF', iconColor: '#1890FF' },
  success: { text: '#237804', bg: '#F6FFED', border: '#B7EB8F', iconColor: '#52C41A' },
  warning: { text: '#D46B08', bg: '#FFF7E6', border: '#FFD591', iconColor: '#FAAD14' },
  error: { text: '#CF1322', bg: '#FFF1F0', border: '#FFCCC7', iconColor: '#F5222D' },
};

export const AlertFeed: React.FC = () => {
  const alerts = useAlertStore((state) => state.alerts);
  const removeAlert = useAlertStore((state) => state.removeAlert);

  const formatTime = (date: Date) => {
    try {
      const d = new Date(date);
      return d.toLocaleTimeString('en-US', {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    } catch {
      return '';
    }
  };

  return (
    <div className="bg-bg-surface border border-border-subtle rounded-md shadow-sm h-full flex flex-col el-4">
      <div className="px-4 py-3 border-b border-border-subtle shrink-0 flex items-center justify-between">
        <h3 className="section-title">Swarm Alerts</h3>
        {alerts.length > 0 && (
          <span style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '9px',
            color: '#8A8480',
          }}>
            {alerts.length} active
          </span>
        )}
      </div>

      <div className="flex-1 overflow-auto p-3 flex flex-col gap-2">
        {alerts.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-text-tertiary gap-1 p-4">
            <CheckCircle size={20} className="text-[#237804] opacity-50" />
            <span className="text-[12px]">All systems clear</span>
          </div>
        ) : (
          alerts.map((alert) => {
            const Icon = alertIcons[alert.type] || Info;
            const colors = alertColors[alert.type] || alertColors.info;

            return (
              <div
                key={alert.id}
                style={{
                  background: colors.bg,
                  border: `1px solid ${colors.border}`,
                  borderRadius: '6px',
                  padding: '8px 10px',
                  display: 'flex',
                  alignItems: 'start',
                  gap: '8px',
                  position: 'relative',
                }}
                className="group hover:shadow-xs transition-shadow duration-200"
              >
                <Icon
                  size={14}
                  style={{ color: colors.iconColor, marginTop: '2px', flexShrink: 0 }}
                />
                <div className="flex-1 min-w-0 pr-4">
                  <p
                    style={{
                      fontFamily: "'Geist', sans-serif",
                      fontSize: '12px',
                      color: '#0F0E0D',
                      lineHeight: 1.3,
                      wordBreak: 'break-word',
                    }}
                  >
                    {alert.message}
                  </p>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      marginTop: '4px',
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: '9px',
                      color: '#8A8480',
                    }}
                  >
                    <Clock size={10} />
                    <span>{formatTime(alert.timestamp)}</span>
                  </div>
                </div>
                <button
                  onClick={() => removeAlert(alert.id)}
                  style={{
                    position: 'absolute',
                    top: '6px',
                    right: '6px',
                    background: 'none',
                    border: 'none',
                    color: '#8A8480',
                    fontSize: '11px',
                    cursor: 'pointer',
                    opacity: 0.6,
                  }}
                  className="hover:opacity-100 font-bold px-1"
                  title="Dismiss alert"
                >
                  &times;
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
