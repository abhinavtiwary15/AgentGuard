# Contributing to AgentGuard

Thank you for your interest in contributing to AgentGuard! We welcome contributions from the open-source security and developer communities.

---

## 🚀 Quickstart: Local Development Without Azure

AgentGuard is designed to be 100% runnable locally with **zero paid Azure services** required. The system includes built-in fallback modes for local development and offline testing:
- **Database**: In-memory incident, report, and user store (no Cosmos DB needed).
- **Search**: Built-in mock RAG threat intel and MITRE responses.
- **AI Models**: Deterministic heuristic scoring & response rules if Azure OpenAI is offline.
- **Webhooks**: Clear non-configured telemetry if Power Automate/Teams are offline.

### Prerequisites

- **Python 3.11+**
- **Node.js 18+** & **npm**

---

### 1. Backend Setup

```bash
cd agentguard-backend

# Create and activate virtual environment
python -m venv venv
# On Windows:
.\venv\Scripts\Activate.ps1
# On Linux/macOS:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Copy example environment configuration
cp .env.example .env

# Run FastAPI backend
uvicorn main:app --reload --port 8000
```

The backend will start at `http://localhost:8000`. You will see startup diagnostics indicating active fallback stores and auto-bootstrapping of the default administrator (`admin` / `AdminGuard2026!`).

### 2. Frontend Setup

```bash
cd agentguard-frontend

# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Run Vite dev server
npm run dev
```

The frontend will start at `http://localhost:3000` (or `http://localhost:5173`).

---

## 🧪 Running the Test Suites

### Backend Tests

From `agentguard-backend/`:
```bash
# Run the end-to-end authentication and metrics test suite
python tests/test_auth_flow.py

# Verify smoke and regression harness
python tests/task_verification.py
```

### Frontend Build & Lint Checks

From `agentguard-frontend/`:
```bash
# Verify TypeScript compilation and production bundle
npm run build
```

---

## 🎯 Top Contribution Opportunities

We are actively seeking contributions in the following focus areas:

1. **Live Azure Resource Verification (Event Hub, Service Bus & AI Search Vector Index)**:
   - *Status*: Event Hub log streaming, Service Bus queueing, and the Azure AI Search HNSW vector index setup are implemented and pass local/offline checks, but **have not yet been verified against a live Azure resource**. Testing this against a real deployment is a good first contribution.
2. **Enterprise Identity (Microsoft Entra ID / Azure AD SSO)**:
   - Integrate `@azure/msal-react` in `agentguard-frontend` and validate Entra ID access tokens in `agentguard-backend/api/dependencies.py`.
3. **Multi-Agent Simulation Depth**:
   - Extend the Scenario Playback engine to feed continuous, multi-stage log streams through the agent swarm concurrently.
4. **Custom Response Playbooks (Striker)**:
   - Add pluggable containment adapters (e.g. AWS Security Groups, Cloudflare WAF, Kubernetes NetworkPolicies).

---

## 📋 Pull Request Guidelines

1. **Branch Naming**: Use descriptive prefixes: `feat/`, `fix/`, `docs/`, or `refactor/`.
2. **Keep Zero-Cloud Dev Intact**: Ensure that all changes continue to function cleanly in offline/fallback mode without requiring Azure credentials.
3. **Security First**: Never commit real API keys, connection strings, or production passwords to git history.
4. **Verification**: Run `python tests/test_auth_flow.py` and `npm run build` before opening a PR.
