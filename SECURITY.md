# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

The AgentGuard team takes security vulnerabilities seriously. We appreciate your efforts to responsibly disclose findings before public release.

### How to Report

If you discover a security vulnerability in AgentGuard:

1. **Do not** open a public GitHub issue.
2. Email your findings to **security@agentguard.ai** (or open a confidential GitHub Security Advisory).
3. Include the following details:
   - Type of vulnerability (e.g. prompt injection, privilege escalation, token validation bypass).
   - Step-by-step instructions or proof-of-concept script to reproduce.
   - Affected components (`agentguard-backend`, `agentguard-frontend`, API endpoints, or agent orchestrator).
   - Any proposed remediation or mitigation.

### Response Timeline

- **Initial Acknowledgement**: Within 48 hours of report receipt.
- **Triage & Assessment**: Within 5 business days with severity assessment (CVSS).
- **Remediation & Patch**: Security patch releases prioritized according to severity.
- **Public Disclosure**: Coordinated disclosure after fix has been published and deployed.

## Security Architecture Guidelines

- **Production Mode**: Always run with `ENVIRONMENT=production` to strictly enforce cryptographic JWT validation and prevent bypass tokens.
- **Default Credentials**: Change default bootstrap administrator credentials (`admin` / `AdminGuard2026!`) immediately upon deployment.
- **Azure Secrets**: Store Azure OpenAI, Cosmos DB, and AI Search keys securely in Azure Key Vault or environment secret managers rather than `.env` files.
