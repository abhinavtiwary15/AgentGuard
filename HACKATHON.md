# 🏆 Microsoft Build AI Hackathon 2026 — Project Archive

This document preserves the original hackathon submission context, presentation framing, and disclosures for the **AgentGuard** project.

---

## 🎯 Submission Overview

- **Hackathon**: Microsoft Build AI Hackathon 2026
- **Track**: Enterprise Security & Autonomous AI Agents
- **Project**: AgentGuard — Autonomous AI Security Operations Center
- **Team**: Team Neural Nexus

---

## 📋 Original Submission Narrative

Enterprise security teams are overwhelmed. The average time to detect a breach is **197 days**, and containment averages **69 days**. Human analysts are inundated with 10,000+ daily alerts — over 60% of which are false positives.

AgentGuard was conceived to solve the *defender's dilemma* by orchestrating a collaborative swarm of five specialized Azure AI agents:
1. **Sentinel**: Real-time log monitoring and anomaly detection.
2. **Oracle**: Deep investigation via RAG over MITRE ATT&CK techniques and CVE databases.
3. **Striker**: Autonomous containment action execution.
4. **Nexus**: State management and inter-agent decision routing.
5. **Herald**: Automated executive and technical forensic reporting.

---

## ⚖️ Hackathon Disclosures & Attributions

- All code in this repository was developed for the Microsoft Build AI Hackathon 2026.
- The simulation drills demonstrate end-to-end multi-agent triage, investigation, and automated mitigation.
- The project implements dual-mode resilience: full cloud capability on Azure (Azure OpenAI, Azure AI Search, Azure Cosmos DB, Event Hubs, Service Bus, Power Automate), and local offline fallback modes for evaluation without cloud credentials.
