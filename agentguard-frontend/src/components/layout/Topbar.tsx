import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, Bell } from 'lucide-react';
import { useConnectionState } from '../../hooks/useWebSocket';

export const Topbar: React.FC = () => {
  const [time, setTime] = useState(new Date());
  const { retryAttempt, status } = useConnectionState();
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const statusConfig = status === 'connected'
    ? {
        dotColor: '#237804',
        bgColor: '#F6FFED',
        borderColor: '#B7EB8F',
        textColor: '#237804',
        label: 'SYSTEM ACTIVE',
        animate: false,
      }
    : status === 'connecting'
    ? {
        dotColor: '#D46B08',
        bgColor: '#FFF7E6',
        borderColor: '#FFD591',
        textColor: '#D46B08',
        label: 'CONNECTING...',
        animate: true,
      }
    : {
        dotColor: '#CF1322',
        bgColor: '#FFF1F0',
        borderColor: '#FFCCC7',
        textColor: '#CF1322',
        label: retryAttempt > 0 ? `DISCONNECTED (${retryAttempt})` : 'DISCONNECTED',
        animate: true,
      };

  return (
    <header 
      className="h-[56px] flex items-center justify-between px-6 z-10 shrink-0"
      style={{
        background: '#FFFFFF',
        borderBottom: '1px solid rgba(0,0,0,0.08)',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
      }}
    >
      <div className="flex items-center gap-2.5">
        <div
          className="w-7 h-7 rounded-[6px] flex items-center justify-center flex-shrink-0"
          style={{ 
            backgroundColor: '#CF1322',
            boxShadow: '0 1px 3px rgba(207,19,34,0.3)',
          }}
        >
          <span
            style={{
              fontFamily: "'Geist', sans-serif",
              fontSize: '11px',
              fontWeight: 700,
              color: '#ffffff',
              letterSpacing: '0.02em',
              lineHeight: 1,
            }}
          >
            AG
          </span>
        </div>
        <div className="flex flex-col justify-center gap-0">
          <span
            style={{
              fontFamily: "'Geist', sans-serif",
              fontSize: '14px',
              fontWeight: 700,
              color: '#0F0E0D',
              letterSpacing: '-0.02em',
              lineHeight: 1.1,
            }}
          >
            AgentGuard
          </span>
          <span
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: '9px',
              fontWeight: 400,
              color: '#8A8480',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              lineHeight: 1.2,
            }}
          >
            Autonomous SOC
          </span>
        </div>

        <div className="h-4 w-px bg-border-medium mx-2"></div>

        {/* Command Center | LIVE title badge */}
        <div className="flex items-center gap-2">
          <span
            style={{
              fontFamily: "'Geist', sans-serif",
              fontSize: '15px',
              fontWeight: 600,
              color: '#0F0E0D',
            }}
          >
            Command Center
          </span>
          <span style={{ color: 'rgba(0,0,0,0.2)' }}>|</span>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              background: '#FFF1F0',
              color: '#CF1322',
              border: '1px solid #FFCCC7',
              padding: '2px 8px',
              borderRadius: '4px',
              fontSize: '10px',
              fontWeight: 600,
            }}
          >
            <span
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                backgroundColor: '#CF1322',
                flexShrink: 0,
                animation: 'pulse 1s infinite',
              }}
            />
            LIVE
          </span>
        </div>
      </div>

      <div className="flex items-center gap-6">
        {/* Connection Status Pill */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 10px',
            borderRadius: '9999px',
            background: statusConfig.bgColor,
            border: `1px solid ${statusConfig.borderColor}`,
            transition: 'all 0.4s ease',
          }}
        >
          <span
            style={{
              width: '7px',
              height: '7px',
              borderRadius: '50%',
              backgroundColor: statusConfig.dotColor,
              flexShrink: 0,
              animation: statusConfig.animate ? 'statusPulse 1.2s ease-in-out infinite' : 'none',
            }}
          />
          <span
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: '10px',
              fontWeight: 600,
              letterSpacing: '0.06em',
              color: statusConfig.textColor,
              whiteSpace: 'nowrap',
            }}
          >
            {statusConfig.label}
          </span>
        </div>
        <style>{`
          @keyframes statusPulse {
            0%, 100% { opacity: 0.4; transform: scale(0.9); }
            50% { opacity: 1; transform: scale(1.1); }
          }
        `}</style>

        <div className="h-4 w-px bg-border-medium"></div>

        <div className="flex items-center gap-2 text-text-secondary">
          <Clock size={14} className="text-[#8A8480]" />
          <span
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: '12px',
              color: '#8A8480',
            }}
          >
            {time.toLocaleTimeString()}
          </span>
        </div>

        <div className="h-4 w-px bg-border-medium"></div>

        {/* Bell & Settings Icons */}
        <button 
          style={{ 
            background: 'none', 
            border: 'none', 
            cursor: 'pointer', 
            color: '#8A8480', 
            transition: 'color 0.15s',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '4px'
          }}
          onMouseOver={e => e.currentTarget.style.color = '#0F0E0D'}
          onMouseOut={e => e.currentTarget.style.color = '#8A8480'}
          aria-label="Notifications"
          title="Notifications"
        >
          <Bell size={20} className="w-5 h-5" />
        </button>

        <div className="h-4 w-px bg-border-medium"></div>

        <button
          onClick={() => navigate('/account')}
          style={{
            width: 32, height: 32,
            borderRadius: '50%',
            background: '#CF1322',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontFamily: "'Geist', sans-serif",
            fontSize: '12px',
            fontWeight: 700,
            transition: 'opacity 0.15s',
          }}
          onMouseOver={e => e.currentTarget.style.opacity = '0.85'}
          onMouseOut={e => e.currentTarget.style.opacity = '1'}
          aria-label="Account settings"
          title="Account settings"
        >
          SA
        </button>
      </div>
    </header>
  );
};

