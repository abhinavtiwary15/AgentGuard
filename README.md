# 🛡️ AgentGuard — Autonomous AI Security Operations Center

> **Open-Source Multi-Agent Security Operations Center**  
> *Autonomous threat triage, investigation, and containment powered by multi-agent reasoning.*

[![Azure OpenAI](https://img.shields.io/badge/Azure-OpenAI%20GPT--4o-0078D4?logo=microsoft-azure&logoColor=white)](https://azure.microsoft.com/en-us/products/ai-services/openai-service)
[![Azure AI Foundry](https://img.shields.io/badge/Azure-AI%20Foundry-0078D4?logo=microsoft-azure&logoColor=white)](https://ai.azure.com)
[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/Frontend-React%2018-61DAFB?logo=react&logoColor=black)](https://react.dev)
[![Docker](https://img.shields.io/badge/Deploy-Docker-2496ED?logo=docker&logoColor=white)](https://www.docker.com)

---

## 🎯 The Problem

Enterprise security teams are overwhelmed. The average time to detect a breach is **197 days**. The average time to contain it is **69 days**. Human analysts are drowning in 10,000+ daily alerts — 60% of which are false positives. Attackers move in seconds; defenders move in weeks.

**This is the defender's dilemma.**

## 💡 The Solution: AgentGuard

AgentGuard is a **multi-agent AI system** built on Azure that acts as a fully autonomous Security Operations Center (SOC). Five specialized AI agents — powered by GPT-4o — continuously monitor, investigate, and respond to threats in **under 2 seconds**, autonomously, around the clock.

```
Attack Detected → Sentinel Scores → Oracle Investigates → Striker Responds → Herald Reports
        ↑                                                                              ↓
   (1.2 seconds total end-to-end autonomous response)                         Incident Closed
```

---

## 🤖 The Five Agents

| Agent | Role | Azure Service |
|-------|------|---------------|
| **Sentinel** | Continuous log ingestion & threat scoring | GPT-4o-mini + Azure Monitor |
| **Oracle** | RAG-powered investigation (MITRE ATT&CK + CVE) | GPT-4o + Azure AI Search |
| **Striker** | Automated countermeasures execution | Power Automate + Azure Firewall |
| **Nexus** | Master orchestrator — decision routing & state | Cosmos DB + Service Bus |
| **Herald** | Executive reporting & alert dispatch | GPT-4o + Azure Communication Services |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    AGENTGUARD PLATFORM                       │
│                                                             │
│  React 18 Frontend (Light Theme, WebSocket live stream)     │
│         ↕ WebSocket + REST API                              │
│  FastAPI Backend (Python 3.11, async throughout)            │
│         ↕ Azure SDKs                                        │
│  ┌─────────┐ ┌────────┐ ┌─────────┐ ┌─────────┐ ┌───────┐ │
│  │Sentinel │ │Oracle  │ │Striker  │ │ Nexus   │ │Herald │ │
│  │GPT-4o-m │ │GPT-4o  │ │Power    │ │Orchestr.│ │GPT-4o │ │
│  │Log Anal.│ │RAG+MITE│ │Automate │ │CosmosDB │ │Report │ │
│  └─────────┘ └────────┘ └─────────┘ └─────────┘ └───────┘ │
│                                                             │
│  Azure Services: OpenAI · AI Search · Cosmos DB ·          │
│                  Event Hub · Service Bus · Power Automate   │
└─────────────────────────────────────────────────────────────┘
```

---

## ✨ Key Features

- **⚡ Sub-2-second response** — Full detect-investigate-block cycle, fully autonomous
- **🧠 RAG-powered intelligence** — Azure AI Search over MITRE ATT&CK + live CVE database
- **🎯 Smart escalation** — Low-confidence threats automatically go to human analysts
- **🌐 Real-time dashboard** — WebSocket-powered command center with live agent reasoning stream
- **🎬 Cinematic simulations** — 3 realistic attack scenarios with live agent commentary
- **📊 Forensic reports** — GPT-4o generated executive summaries and CISO-ready reports
- **🔒 Enterprise-grade** — JWT auth, rate limiting, full audit trail in Cosmos DB
- **🐳 Production-ready** — Dockerized, environment-configurable, CI/CD ready

---

## 🎬 Simulation Scenarios

Three built-in threat scenarios to demonstrate AgentGuard's capabilities:

### 1. SQL Injection Attack
```
t=0.0s  HTTP POST /api/auth?user=admin'OR+1=1-- from 185.220.101.47 (TOR exit node)
t=0.8s  Sentinel: Threat score 87/100 · CRITICAL
t=3.2s  Oracle: T1190 (94.2% match) · CVE-2024-1234 (CVSS 9.8)
t=4.5s  Striker: IP blocked · Sessions revoked · Rate limit enforced
t=6.5s  Herald: Report generated · Incident RESOLVED
                         ↳ Total time: 1.2 seconds
```

### 2. Credential Stuffing Campaign
```
500 failed logins from 47 rotating IPs → Auto-blocked, CAPTCHA enforced
```

### 3. Insider Data Exfiltration
```
8.4GB in 20min (1100% baseline deviation) → Low confidence → ESCALATED to human
```

---

## 🚀 Quick Start

### Prerequisites
- Python 3.12+
- Node.js 18+
- Docker & Docker Compose (for containerized deployment)
- Azure subscription with the required services provisioned

### 1. Clone & Configure
```bash
git clone https://github.com/abhinavtiwary15/agentguard.git
cd agentguard

# Configure environment
cp agentguard-backend/.env.example agentguard-backend/.env
# Edit agentguard-backend/.env with your Azure credentials
```

### 2. Run with Docker (Recommended)
```bash
# From the root directory
docker compose up --build

# Frontend: http://localhost
# Backend API: http://localhost:8000
# API Docs: http://localhost:8000/api/docs
```

### 3. Run Locally (Development)

**Backend:**
```bash
cd agentguard-backend
python -m pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

**Frontend:**
```bash
cd agentguard-frontend
npm install
npm run dev
# Runs at http://localhost:3000
```

---

## 🔐 Authentication & Access Control

AgentGuard features a self-contained, cryptographically secure JWT authentication system with role-based access control (RBAC).

### Initial Admin Credentials
Upon first launch, if no users exist in the system, AgentGuard automatically bootstraps a default administrator account:
- **Username**: `admin`
- **Email**: `admin@agentguard.ai`
- **Password**: `AdminGuard2026!`

> [!WARNING]
> **Production Security Notice**: These default bootstrap credentials are provided strictly for initial setup and demonstration. In any non-local or staging environment, change this password immediately via the security controls or register dedicated analyst credentials.
>
> **In-Memory Fallback Persistence Note**: When running locally without Azure Cosmos DB (`COSMOS_DB_CONNECTION` not configured), AgentGuard stores users in-memory and will re-seed the default administrator (`admin` / `AdminGuard2026!`) on **every server restart**. To persist updated passwords and custom users across restarts, configure an Azure Cosmos DB instance.
>
> **Default Password Security Warning Banner**: When logged in with the default password, AgentGuard renders an active warning banner across the application prompting an immediate password change. You can change your password directly in the **Account & Security Settings** tab.

### Authentication Features
1. **Interactive Login & Registration**: The frontend `/login` view allows analysts to sign in with their credentials or register a new analyst profile.
2. **Signed Bearer JWTs**: The backend issues signed HS256 tokens (with 24-hour validity) validated against `JWT_SECRET`. Passwords are encrypted with bcrypt (12 rounds) — plaintext passwords are never stored.
3. **Route Guards & Interceptors**: Unauthenticated sessions are automatically caught and redirected to `/login`, and expired sessions cleanly trigger re-authentication.
4. **Programmatic API Keys**: From the **Account & Security Settings** page, analysts can generate a dedicated 90-day signed API token for automation, CLI utilities, and external SIEM forwarding.
5. **Self-Service Password Management**: Authenticated users can update their passwords directly via `POST /api/auth/change-password` or the Account interface.

### 🏢 Enterprise Production Upgrade Path: Microsoft Entra ID (Azure AD)
For full enterprise deployment, this self-issued JWT flow is architected to be upgraded to **Microsoft Entra ID (Azure AD)** using MSAL:
- **Why Entra ID**: Enterprise SOC environments require centralized identity management, Single Sign-On (SSO), hardware-backed Multi-Factor Authentication (MFA), Conditional Access policies (e.g., location/device health restrictions), and automated token revocation when personnel leave.
- **Implementation**: The frontend integrates `@azure/msal-react` for seamless corporate login, while FastAPI's `dependencies.py` validates Microsoft Entra ID bearer tokens against the Microsoft identity platform's public JWKS endpoints using tenant ID and client ID.

---

## ⚙️ Environment Variables & Fallback Behaviors

All variables are documented in [`agentguard-backend/.env.example`](./agentguard-backend/.env.example). AgentGuard is architected to boot out of the box in development using resilient local fallbacks, while strictly enforcing security in production.

### Required vs. Optional Variables

| Category | Variable | Status | Fallback Behavior When Missing |
|----------|----------|--------|--------------------------------|
| **Core** | `ENVIRONMENT` | Optional (default: `development`) | When set to `production`, strict JWT verification is enforced and insecure dev tokens are prohibited. |
| **Auth** | `JWT_SECRET` | **Required in Prod** (Dev default provided) | In development, defaults to a test key. In `production`, startup crashes with a `ValidationError` if not explicitly set to a secure string. |
| **Auth** | `ALLOWED_ORIGINS` | Optional (defaults provided) | Defaults to `localhost:3000`, `localhost`, and official Azure Container App origins. |
| **Azure OpenAI** | `AZURE_OPENAI_ENDPOINT` | Optional | If missing or invalid, Sentinel/Oracle/Striker/Herald switch to deterministic local mock reasoning (`_fallback_json`). |
| **Azure OpenAI** | `AZURE_OPENAI_KEY` | Optional | If missing, empty, or containing `"mock"`, triggers mock fallback without crashing. |
| **Azure AI Search**| `AZURE_SEARCH_ENDPOINT` | Optional | If missing, Oracle RAG search degrades gracefully and returns empty context without crashing. |
| **Azure AI Search**| `AZURE_SEARCH_KEY` | Optional | If missing, Azure Search client initializes in mock mode. |
| **Cosmos DB** | `COSMOS_DB_CONNECTION` | Optional | If missing or set to mock, Cosmos DB activates in-memory dictionary storage (`_write_memory`). Incidents persist for session lifetime. |
| **Event Hub** | `EVENT_HUB_CONNECTION` | Optional | If missing, log ingestion stream defaults to HTTP API bypass mode. |
| **Service Bus** | `SERVICE_BUS_CONNECTION` | Optional | If missing, pub/sub messaging operates in local in-process bypass mode. |
| **Power Automate**| `POWER_AUTOMATE_*_URL` | Optional | If missing, empty, or placeholder, containment actions report honest "not configured" status rather than pretending success. |
| **Alerting** | `TEAMS_WEBHOOK_URL` | Optional | If missing, Herald alert dispatch broadcasts over WebSocket to the dashboard and honestly marks external Teams dispatch as skipped. |
| **Identity** | `AZURE_AD_*` | Optional | Used for enterprise session revocation workflows via Azure AD Graph. |

> [!NOTE]
> **Implementation vs. Live Azure Verification Status**:
> - **Verified Live End-to-End**: The FastAPI-issued JWT authentication flow, role-based access control, password update flow, honest operational metrics computation, WebSocket telemetry streaming, and the dual-run scenario playback lab have been verified live end-to-end.
> - **Implemented (Offline / Fallback Verified Only)**:
>   - *Azure Event Hub & Service Bus*: Event Hub and Service Bus integration is implemented and passes local checks, but has not yet been verified against a live Azure resource. Testing this against a real deployment is a good first contribution.
>   - *Azure AI Search Vector Index*: The vector schema and index setup script (`setup_search_indexes.py`) are implemented with HNSW vector profile configurations and pass local checks, but have not yet been verified against a live Azure AI Search resource. Testing this against a live Azure Search instance is a welcome contribution.

---

## 📁 Project Structure

```
agentguard/
├── agentguard-backend/
│   ├── agents/
│   │   ├── base_agent.py         # Base class: state, broadcasting, lifecycle
│   │   ├── sentinel_agent.py     # Log analysis & threat scoring
│   │   ├── oracle_agent.py       # RAG investigation (MITRE + CVE)
│   │   ├── striker_agent.py      # Automated response execution
│   │   ├── nexus_orchestrator.py # Master pipeline & decision routing
│   │   └── herald_agent.py       # Reporting & alert dispatch
│   ├── api/
│   │   ├── routes/
│   │   │   ├── incidents.py      # CRUD + export endpoints
│   │   │   ├── agents.py         # Agent status & telemetry
│   │   │   ├── reports.py        # Forensic reports
│   │   │   ├── simulation.py     # Scenario triggers
│   │   │   └── websocket.py      # Real-time connection manager
│   │   └── dependencies.py       # JWT auth & rate limiting
│   ├── core/
│   │   ├── config.py             # Pydantic settings & env validation
│   │   ├── azure_openai.py       # GPT-4o/mini + system prompts
│   │   ├── azure_search.py       # RAG: hybrid vector + semantic search
│   │   ├── cosmos_db.py          # Async Cosmos DB CRUD
│   │   ├── event_hub.py          # Azure Event Hub consumer
│   │   ├── service_bus.py        # Azure Service Bus pub/sub
│   │   └── power_automate.py     # HTTP client for PA webhooks
│   ├── models/
│   │   └── models.py             # All Pydantic data models
│   ├── simulation/
│   │   ├── engine.py             # Scenario router
│   │   └── scenarios/
│   │       ├── sql_injection.py  # Scenario 1
│   │       ├── brute_force.py    # Scenario 2
│   │       └── insider_threat.py # Scenario 3
│   ├── main.py                   # FastAPI app + WebSocket endpoint
│   ├── requirements.txt
│   ├── Dockerfile
│   └── .env.example
├── agentguard-frontend/
│   ├── src/
│   │   ├── api/client.ts         # Axios API client
│   │   ├── components/
│   │   │   ├── common/           # Badge, Button, Toast
│   │   │   ├── dashboard/        # MetricCard, GlobePanel, AgentSwarm, ThoughtStream, IncidentTable
│   │   │   └── layout/           # Shell, Topbar, Sidebar, CommandBar
│   │   ├── hooks/useWebSocket.ts # Global WebSocket hook
│   │   ├── pages/                # Dashboard, Incidents, Agents, Reports, Simulation
│   │   ├── store/                # Zustand stores: incident, agent, alert
│   │   ├── styles/               # globals.css (design tokens), animations.css
│   │   └── types/index.ts        # TypeScript interfaces
│   ├── Dockerfile
│   ├── nginx.conf
│   └── vite.config.ts
└── docker-compose.yml
```

---

## 🛠️ Tech Stack

**Backend**
- Python 3.11 / FastAPI (async ASGI)
- Azure OpenAI (GPT-4o, GPT-4o-mini, text-embedding-3-small)
- Azure AI Search (hybrid vector + semantic RAG)
- Azure Cosmos DB (incident & report persistence)
- Azure Event Hub / Service Bus (message streaming)
- Microsoft Power Automate (response automation workflows)
- `python-jose` (JWT), `slowapi` (rate limiting), `pydantic-settings`

**Frontend**
- React 18 + TypeScript + Vite
- Zustand (global state management)
- Tailwind CSS v3 + custom CSS design system
- Literata (display) + Geist (body) + Geist Mono (data) fonts
- WebSocket for real-time agent streaming
- Recharts (analytics charts), Lucide React (icons)

**DevOps**
- Docker + Docker Compose
- Nginx (frontend serving, production SPA routing)

---

## 🔌 API Reference

Interactive API docs available at `http://localhost:8000/api/docs` (Swagger UI).

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/incidents/ingest` | Ingest a raw log entry for analysis |
| `GET` | `/api/incidents/` | List incidents with optional filters |
| `GET` | `/api/incidents/{id}` | Get single incident detail |
| `PATCH` | `/api/incidents/{id}/resolve` | Mark incident as resolved |
| `PATCH` | `/api/incidents/{id}/false-positive` | Mark as false positive |
| `GET` | `/api/incidents/export/csv` | Export all incidents as CSV |
| `GET` | `/api/agents/status` | Get all 5 agent states |
| `GET` | `/api/agents/{name}/thoughts` | Get agent's inner reasoning stream |
| `GET` | `/api/agents/metrics` | Aggregated agent performance metrics |
| `POST` | `/api/simulation/run` | Trigger a simulation scenario |
| `GET` | `/api/simulation/scenarios` | List available scenarios |
| `GET` | `/api/reports/dashboard` | Dashboard KPI metrics |
| `GET` | `/api/reports/incident/{id}` | Forensic report for an incident |
| `WS` | `/ws/live` | Real-time agent event stream |

---

## 🏆 Project History & Hackathon Archive

AgentGuard was originally conceptualized and built for the **Microsoft Build AI Hackathon 2026** (Enterprise Security Track). See [HACKATHON.md](./HACKATHON.md) for the original hackathon pitch, demo script, and submission disclosures.

---

## 🤝 Contributing

We welcome contributions! Please review [CONTRIBUTING.md](./CONTRIBUTING.md) for local zero-cloud development instructions, running test suites, and open priority initiatives.

---

## 🔒 Security

For vulnerability disclosure policies, see [SECURITY.md](./SECURITY.md).

---

## 📄 License

MIT License — see [LICENSE](./LICENSE) for details.
