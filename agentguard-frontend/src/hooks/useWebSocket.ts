import { useEffect, useRef, useState, useCallback } from 'react';
import { useIncidentStore } from '../store/incidentStore';
import { useAgentStore } from '../store/agentStore';
import { useAlertStore } from '../store/alertStore';

type ConnectionStatus = 'connecting' | 'connected' | 'disconnected';

// ── Global connection state shared across all hook instances ────────────────
let globalConnectionStatus: ConnectionStatus = 'connecting';
let globalIsConnected = false;
let globalRetryAttempt = 0;

const statusListeners = new Set<(status: ConnectionStatus) => void>();
const connectionListeners = new Set<(isConnected: boolean, retry: number) => void>();

function setGlobalStatus(status: ConnectionStatus) {
  globalConnectionStatus = status;
  statusListeners.forEach((fn) => fn(status));
}

function setGlobalConnection(isConnected: boolean, retryAttempt: number) {
  globalIsConnected = isConnected;
  globalRetryAttempt = retryAttempt;
  connectionListeners.forEach((fn) => fn(isConnected, retryAttempt));
}

// ── Read-only hook for components that only need connection state ──────────
export function useConnectionState() {
  const [isConnected, setIsConnected] = useState(globalIsConnected);
  const [retryAttempt, setRetryAttempt] = useState(globalRetryAttempt);
  const [status, setStatus] = useState<ConnectionStatus>(globalConnectionStatus);

  useEffect(() => {
    const connHandler = (connected: boolean, retry: number) => {
      setIsConnected(connected);
      setRetryAttempt(retry);
    };
    const statusHandler = (s: ConnectionStatus) => {
      setStatus(s);
    };
    connectionListeners.add(connHandler);
    statusListeners.add(statusHandler);
    return () => {
      connectionListeners.delete(connHandler);
      statusListeners.delete(statusHandler);
    };
  }, []);

  return { isConnected, retryAttempt, status };
}

// Legacy export kept for backward compatibility
export function useConnectionStatus(): ConnectionStatus {
  const [status, setStatus] = useState<ConnectionStatus>(globalConnectionStatus);
  useEffect(() => {
    const handler = (s: ConnectionStatus) => setStatus(s);
    statusListeners.add(handler);
    return () => { statusListeners.delete(handler); };
  }, []);
  return status;
}

// ── Singleton guard — only one WebSocket open at a time ───────────────────
let singletonWs: WebSocket | null = null;
let singletonRetryTimeout: ReturnType<typeof setTimeout> | null = null;
let singletonRetryCount = 0;
let isConnecting = false;

// ── Primary hook — call only once at App root ──────────────────────────────
export function useWebSocket() {
  const wsRef = useRef<WebSocket | null>(singletonWs);

  const addIncident = useIncidentStore((state) => state.addIncident);
  const updateIncident = useIncidentStore((state) => state.updateIncident);
  const updateAgent = useAgentStore((state) => state.updateAgent);
  const addThought = useAgentStore((state) => state.addThought);
  const addThoughtLog = useAgentStore((state) => state.addThoughtLog);
  const seedDemoData = useAgentStore((state) => state.seedDemoData);
  const addAlert = useAlertStore((state) => state.addAlert);

  const connect = useCallback(() => {
    // Prevent duplicate connections
    if (isConnecting || (singletonWs && singletonWs.readyState === WebSocket.CONNECTING)) return;
    if (singletonWs && singletonWs.readyState === WebSocket.OPEN) return;

    isConnecting = true;
    if (singletonWs) {
      singletonWs.onclose = null;
      singletonWs.close();
    }

    setGlobalStatus('connecting');
    setGlobalConnection(false, singletonRetryCount);
    console.log(`[AgentGuard WS] Connecting... (attempt ${singletonRetryCount + 1})`);
    const WS_URL = import.meta.env.VITE_WS_URL 
      ?? 'ws://localhost:8000/ws/live';
    const ws = new WebSocket(WS_URL);
    singletonWs = ws;
    wsRef.current = ws;

    ws.onopen = () => {
      isConnecting = false;
      console.log('[AgentGuard WS] Connected');
      singletonRetryCount = 0;
      setGlobalStatus('connected');
      setGlobalConnection(true, 0);
      ws.send(JSON.stringify({ type: 'ping' }));
      if (singletonRetryTimeout) {
        clearTimeout(singletonRetryTimeout);
        singletonRetryTimeout = null;
      }
    };

    ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        switch (payload.type) {
          case 'connected':
            seedDemoData();
            break;
          case 'incident_created':
            addIncident(payload.data);
            addAlert({ message: payload.message, type: 'warning' });
            break;
          case 'incident_updated':
            updateIncident(payload.data);
            break;
          case 'agent_status':
            updateAgent({
              ...payload.data,
              name: payload.agent ?? payload.data?.name,
            });
            break;
          case 'agent_thought': {
            const thoughtText = payload.data?.thought ?? payload.message ?? '';
            if (thoughtText && payload.agent) {
              addThought(payload.agent, thoughtText);
              addThoughtLog(payload.agent, thoughtText);
            }
            break;
          }
          case 'threat_detected':
          case 'report_generated':
          case 'alert_sent':
          case 'action_executed':
            addAlert({ message: payload.message, type: 'info' });
            break;
          case 'sim_log':
            addAlert({
              message: `[${payload.data.agent}] ${payload.data.message}`,
              type: 'info',
            });
            break;
        }
      } catch (err) {
        console.error('[AgentGuard WS] Parse error:', err);
      }
    };

    const scheduleReconnect = () => {
      isConnecting = false;
      setGlobalStatus('disconnected');
      const delay = Math.min(1000 * Math.pow(2, singletonRetryCount), 8000);
      console.log(`[AgentGuard WS] Closed. Reconnecting in ${delay}ms...`);
      singletonRetryCount += 1;
      setGlobalConnection(false, singletonRetryCount);
      singletonRetryTimeout = setTimeout(() => connect(), delay);
    };

    ws.onclose = scheduleReconnect;
    ws.onerror = (err) => {
      console.error('[AgentGuard WS] Error:', err);
      ws.close();
    };
  }, [addIncident, updateIncident, updateAgent, addThought, addThoughtLog, seedDemoData, addAlert]);

  useEffect(() => {
    connect();
    return () => {
      // Only clean up if this is the last consumer
      if (singletonRetryTimeout) {
        clearTimeout(singletonRetryTimeout);
        singletonRetryTimeout = null;
      }
      if (singletonWs) {
        singletonWs.onclose = null;
        singletonWs.close();
        singletonWs = null;
      }
      isConnecting = false;
    };
  }, [connect]);

  return { ws: wsRef.current };
}
