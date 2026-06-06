import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Shell } from './components/layout/Shell';
import { Dashboard } from './pages/Dashboard';
import { Incidents } from './pages/Incidents';
import { Agents } from './pages/Agents';
import { Reports } from './pages/Reports';
import { Simulation } from './pages/Simulation';
import { Account } from './pages/Account';
import { useWebSocket } from './hooks/useWebSocket';

function App() {
  useWebSocket(); // Initialize global websocket connection

  return (
    <BrowserRouter>
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
        </Routes>
      </Shell>
    </BrowserRouter>
  );
}

export default App;
