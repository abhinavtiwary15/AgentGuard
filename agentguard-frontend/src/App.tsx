import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom';
import { Shell } from './components/layout/Shell';
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import { Dashboard } from './pages/Dashboard';
import { Incidents } from './pages/Incidents';
import { Agents } from './pages/Agents';
import { Reports } from './pages/Reports';
import { Simulation } from './pages/Simulation';
import { Account } from './pages/Account';
import { Login } from './pages/Login';
import { useWebSocket } from './hooks/useWebSocket';
import { authApi } from './api/auth';
import { AlertTriangle } from 'lucide-react';

function AuthenticatedApp() {
  useWebSocket(); // Initialize global websocket connection for authenticated session
  const [showDefaultPwdWarning, setShowDefaultPwdWarning] = useState(false);

  useEffect(() => {
    authApi.getProfile().then((profile) => {
      if (profile.is_default_password) {
        setShowDefaultPwdWarning(true);
      }
    }).catch(() => {});
  }, []);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden">
      {showDefaultPwdWarning && (
        <div className="bg-[#FFF1F0] border-b border-[#FFA39E] px-4 py-2 flex items-center justify-between text-[12px] text-[#CF1322] shrink-0 z-50">
          <div className="flex items-center gap-2">
            <AlertTriangle size={15} className="shrink-0 text-[#CF1322]" />
            <span>
              <strong>Security Warning:</strong> You are signed in with the default administrator credentials (<code>admin / AdminGuard2026!</code>). Please change your password to secure this SOC instance.
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/account" className="font-semibold underline hover:text-[#A6101B]">
              Change Password &rarr;
            </Link>
          </div>
        </div>
      )}
      <div className="flex-1 overflow-hidden">
        <Shell>
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/incidents" element={<Incidents />} />
            <Route path="/agents" element={<Agents />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/simulation" element={<Simulation />} />
            <Route path="/account" element={<Account />} />
            <Route path="/settings" element={<Navigate to="/account" replace />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </Shell>
      </div>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <AuthenticatedApp />
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
