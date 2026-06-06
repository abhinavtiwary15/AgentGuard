import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, AlertCircle, Cpu, FileText, Play, User, HelpCircle } from 'lucide-react';

const NAV_ITEMS = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/incidents', label: 'Incidents', icon: AlertCircle },
  { path: '/agents', label: 'Agents', icon: Cpu },
  { path: '/reports', label: 'Reports', icon: FileText },
  { path: '/simulation', label: 'Simulation', icon: Play },
];

export const Sidebar: React.FC = () => {
  return (
    <nav 
      className="w-[52px] flex flex-col items-center py-4 gap-4 shrink-0 z-10 shadow-none"
      style={{
        background: '#FDFCFA',
        borderRight: '1px solid rgba(0,0,0,0.08)',
      }}
    >
      <div className="flex flex-col items-center gap-4 w-full">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            style={({ isActive }) => ({
              width: 40,
              height: 40,
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: isActive ? '#D4380D' : '#8A8480',
              background: isActive ? '#FFF1ED' : 'transparent',
              borderLeft: isActive ? '3px solid #D4380D' : 'none',
              transition: 'background 0.15s ease',
            })}
            className={({ isActive }) => `transition-all ${isActive ? 'active' : 'hover:bg-[#F5F4F1] hover:text-[#0F0E0D]'}`}
            title={item.label}
          >
            <item.icon size={20} strokeWidth={2} />
          </NavLink>
        ))}
      </div>

      <div className="flex-1" />

      <div className="flex flex-col items-center gap-4 w-full">
        <NavLink
          to="/account"
          style={({ isActive }) => ({
            width: 40,
            height: 40,
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: isActive ? '#D4380D' : '#8A8480',
            background: isActive ? '#FFF1ED' : 'transparent',
            borderLeft: isActive ? '3px solid #D4380D' : 'none',
            transition: 'background 0.15s ease',
          })}
          className={({ isActive }) => `transition-all ${isActive ? 'active' : 'hover:bg-[#F5F4F1] hover:text-[#0F0E0D]'}`}
          title="Account"
        >
          <User size={20} strokeWidth={2} />
        </NavLink>

        <button
          title="Help (coming soon)"
          style={{
            width: 40,
            height: 40,
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#C0BAB5',
            background: 'transparent',
            border: 'none',
            cursor: 'default',
          }}
        >
          <HelpCircle size={20} strokeWidth={2} />
        </button>
      </div>
    </nav>
  );
};
