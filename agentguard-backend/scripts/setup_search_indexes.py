"""
AgentGuard — Azure AI Search Index Setup Script
================================================
Creates (or recreates) the following indexes and seeds them with data:
  • threat-intelligence
  • mitre-attack

Usage (from agentguard-backend/):
    python scripts/setup_search_indexes.py
"""

import sys
import os

# Ensure the backend root is on the path so core.config is importable
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from core.config import settings

from azure.core.credentials import AzureKeyCredential
from azure.core.exceptions import ResourceNotFoundError
from azure.search.documents import SearchClient
from azure.search.documents.indexes import SearchIndexClient
from azure.search.documents.indexes.models import (
    SearchIndex,
    SearchField,
    SearchFieldDataType,
    SimpleField,
    SearchableField,
)

# ---------------------------------------------------------------------------
# Client helpers
# ---------------------------------------------------------------------------

def get_index_client() -> SearchIndexClient:
    return SearchIndexClient(
        endpoint=settings.AZURE_SEARCH_ENDPOINT,
        credential=AzureKeyCredential(settings.AZURE_SEARCH_KEY),
    )

def get_search_client(index_name: str) -> SearchClient:
    return SearchClient(
        endpoint=settings.AZURE_SEARCH_ENDPOINT,
        index_name=index_name,
        credential=AzureKeyCredential(settings.AZURE_SEARCH_KEY),
    )

def delete_index_if_exists(client: SearchIndexClient, name: str) -> None:
    try:
        client.delete_index(name)
        print(f"  [OK] Deleted existing index '{name}'")
    except ResourceNotFoundError:
        print(f"  [INFO] Index '{name}' did not exist - skipping delete")

# ---------------------------------------------------------------------------
# TASK 1a — threat-intelligence index
# ---------------------------------------------------------------------------

THREAT_INDEX_NAME = settings.AZURE_SEARCH_INDEX_THREATS  # "threat-intelligence"

THREAT_FIELDS = [
    SimpleField(name="id",          type=SearchFieldDataType.String, key=True, filterable=True),
    SearchableField(name="title",       type=SearchFieldDataType.String),
    SearchableField(name="description", type=SearchFieldDataType.String),
    SearchableField(name="attack_type", type=SearchFieldDataType.String, filterable=True, facetable=True),
    SearchableField(name="severity",    type=SearchFieldDataType.String, filterable=True, facetable=True),
    SearchableField(name="source",      type=SearchFieldDataType.String),
    SearchableField(name="cve_ids",     type=SearchFieldDataType.String),
    SearchableField(name="indicators",  type=SearchFieldDataType.String),
    SearchableField(name="mitigation",  type=SearchFieldDataType.String),
    # Keep a flattened 'content' field that oracle's RAG search selects
    SearchableField(name="content",     type=SearchFieldDataType.String),
]

THREAT_DOCUMENTS = [
    {
        "id": "threat-001",
        "title": "Blind SQL Injection via Login Parameter",
        "description": (
            "Attackers exploit unsanitized user input in the username parameter of the login endpoint "
            "to extract database schema and user credentials using time-based blind SQL injection. "
            "Payloads such as \"' OR SLEEP(5)--\" indicate automated exploitation tools."
        ),
        "attack_type": "SQL Injection",
        "severity": "critical",
        "source": "OWASP Top 10 / Internal SOC",
        "cve_ids": "CVE-2024-23897, CVE-2023-34362",
        "indicators": (
            "Repeated 500 errors on /auth/login; payloads containing SLEEP(), WAITFOR DELAY, UNION SELECT; "
            "DB query latency spikes; single source IP generating high request volume"
        ),
        "mitigation": (
            "Enforce parameterised queries and ORM usage; deploy WAF rule set blocking SQL meta-characters; "
            "alert on anomalous query durations > 2 s; rotate exposed credentials immediately"
        ),
        "content": (
            "Blind SQL Injection via Login Parameter — critical severity. "
            "Attack uses SLEEP() payloads on /auth/login. CVEs: CVE-2024-23897, CVE-2023-34362. "
            "Mitigate with parameterised queries and WAF."
        ),
    },
    {
        "id": "threat-002",
        "title": "Union-Based SQL Injection on Search API",
        "description": (
            "The product search endpoint concatenates user-supplied query strings directly into SQL. "
            "Attackers inject UNION SELECT statements to read sensitive tables including admin credentials "
            "and internal configuration values."
        ),
        "attack_type": "SQL Injection",
        "severity": "critical",
        "source": "Internal Pen Test Q1-2024",
        "cve_ids": "CVE-2024-1234",
        "indicators": (
            "Requests containing UNION SELECT, ORDER BY n, GROUP BY; "
            "HTTP 200 responses with unusual column counts; out-of-band data exfiltration via DNS"
        ),
        "mitigation": (
            "Whitelist allowed query characters; use stored procedures; disable detailed SQL error messages in production; "
            "implement strict input length limits"
        ),
        "content": (
            "Union-based SQL injection on /api/search. Attacker reads admin tables. "
            "CVE-2024-1234. Requires input whitelisting, stored procedures, and error suppression."
        ),
    },
    {
        "id": "threat-003",
        "title": "Credential Stuffing Attack Against Authentication Endpoint",
        "description": (
            "Threat actors use lists of breached username/password pairs obtained from dark-web marketplaces "
            "to automate login attempts against the /auth/token endpoint. Distributed across residential proxies "
            "to evade IP-based rate limits."
        ),
        "attack_type": "Credential Stuffing",
        "severity": "high",
        "source": "CERT Advisory AA24-038A",
        "cve_ids": "CVE-2023-44487",
        "indicators": (
            "High volume of failed logins from rotating IP addresses; "
            "user-agent strings matching headless browsers (python-requests, curl); "
            "successful logins from geographically anomalous locations immediately after failures"
        ),
        "mitigation": (
            "Enforce multi-factor authentication; implement CAPTCHA on nth failed attempt; "
            "deploy velocity-based rate limiting per account, not just per IP; "
            "subscribe to HaveIBeenPwned enterprise API for compromised credential detection"
        ),
        "content": (
            "Credential stuffing against /auth/token using breached credential lists. "
            "Distributed over residential proxies. CVE-2023-44487. "
            "Mitigate with MFA, CAPTCHA, and per-account rate limiting."
        ),
    },
    {
        "id": "threat-004",
        "title": "Brute Force Password Spray on Admin Panel",
        "description": (
            "Attackers systematically attempt common passwords (Password1!, Welcome2024, Summer2024!) "
            "across all known admin accounts to avoid account lockout policies that trigger on per-account "
            "thresholds. Observed with 2-3 attempts per account per hour."
        ),
        "attack_type": "Brute Force",
        "severity": "high",
        "source": "NIST SP 800-63B",
        "cve_ids": "",
        "indicators": (
            "Low-frequency login failures spread across many accounts; "
            "common password patterns in request bodies; requests originating from cloud provider IP ranges"
        ),
        "mitigation": (
            "Set global failed-login rate limit independent of account; "
            "enforce minimum password complexity and breach-password check on creation; "
            "alert SOC on any admin account with > 3 failed logins in 24 hours"
        ),
        "content": (
            "Password spray on admin panel: 2-3 attempts per account per hour to evade lockout. "
            "Common passwords tested. Mitigate with global rate limiting and breach-password checks."
        ),
    },
    {
        "id": "threat-005",
        "title": "Stored Cross-Site Scripting in User Profile Bio",
        "description": (
            "User-supplied HTML in the biography field is persisted to the database without sanitisation "
            "and rendered in other users' browsers without escaping. Attackers inject script tags to steal "
            "session cookies, redirect users to phishing pages, or perform actions on behalf of victims."
        ),
        "attack_type": "XSS",
        "severity": "high",
        "source": "OWASP Top 10 A03",
        "cve_ids": "CVE-2024-29269",
        "indicators": (
            "User-submitted content containing <script>, onerror=, javascript:, data: URIs; "
            "CSP violation reports from browser telemetry; unexpected outbound connections from client browsers"
        ),
        "mitigation": (
            "Apply HTML sanitisation library (DOMPurify) on input and context-aware output encoding on render; "
            "enforce Content-Security-Policy with script-src 'self'; "
            "set HttpOnly and Secure flags on all session cookies"
        ),
        "content": (
            "Stored XSS in user biography field. Script injected into profile persists and executes in victims' browsers. "
            "CVE-2024-29269. Mitigate with DOMPurify, CSP, and HttpOnly cookies."
        ),
    },
    {
        "id": "threat-006",
        "title": "Reflected XSS via Search Query Parameter",
        "description": (
            "The search results page reflects the q= query parameter value directly into the HTML response "
            "without encoding. Attackers craft URLs that inject arbitrary JavaScript when victims click the link, "
            "enabling session hijacking and phishing."
        ),
        "attack_type": "XSS",
        "severity": "medium",
        "source": "HackerOne Report #2024-0078",
        "cve_ids": "",
        "indicators": (
            "URLs with encoded script payloads in the q parameter; "
            "CSP violation reports; login-page redirects after clicking search links"
        ),
        "mitigation": (
            "HTML-encode all reflected parameters before insertion into the DOM; "
            "validate and reject inputs containing HTML meta-characters; "
            "deploy reflected-XSS WAF signatures"
        ),
        "content": (
            "Reflected XSS via ?q= parameter on /search. "
            "Crafted URLs execute JavaScript in victim browsers. "
            "Fix with HTML encoding and WAF signatures."
        ),
    },
    {
        "id": "threat-007",
        "title": "Insider Data Exfiltration — Bulk Download Before Resignation",
        "description": (
            "A privileged employee with access to the customer data warehouse executed automated scripts "
            "to export 8.4 GB of customer PII to a personal cloud storage account over three days "
            "prior to submitting their resignation letter."
        ),
        "attack_type": "Insider Threat",
        "severity": "critical",
        "source": "DLP Alert / UEBA Platform",
        "cve_ids": "",
        "indicators": (
            "Anomalous off-hours bulk SELECT queries; "
            "cloud sync client installation on corporate endpoint; "
            "large outbound transfers to non-corporate IP ranges; "
            "access to data sets outside normal job function"
        ),
        "mitigation": (
            "Enforce DLP policies blocking bulk export to personal storage; "
            "implement UEBA baselines for data access volume per role; "
            "require manager approval for exports exceeding configurable thresholds; "
            "immediately revoke access upon resignation notice receipt"
        ),
        "content": (
            "Insider threat: privileged employee exfiltrated 8.4 GB of customer PII to personal cloud. "
            "Detected via DLP and UEBA. Mitigate with DLP policies and access revocation on resignation."
        ),
    },
    {
        "id": "threat-008",
        "title": "Insider Privilege Escalation via Role Manipulation",
        "description": (
            "A junior developer with read-only database access exploited a missing authorization check "
            "in the internal admin API to elevate their own account to administrator, subsequently "
            "creating backdoor accounts and modifying audit log retention settings."
        ),
        "attack_type": "Insider Threat",
        "severity": "critical",
        "source": "Internal Audit",
        "cve_ids": "CVE-2024-21762",
        "indicators": (
            "Unexpected role change events in RBAC audit log; "
            "new admin accounts created outside HR provisioning workflow; "
            "audit log configuration changes; API calls from accounts with mismatched privilege levels"
        ),
        "mitigation": (
            "Enforce server-side authorization on every admin API endpoint; "
            "alert immediately on any role escalation event; "
            "implement immutable audit logging with integrity verification; "
            "conduct quarterly access reviews"
        ),
        "content": (
            "Insider escalated privileges via unprotected admin API, created backdoor accounts, tampered with audit logs. "
            "CVE-2024-21762. Fix: server-side authz checks, immutable audit logs, quarterly access reviews."
        ),
    },
    {
        "id": "threat-009",
        "title": "TCP SYN Port Scan Reconnaissance",
        "description": (
            "Automated port scanning tools (Nmap, Masscan) conducted half-open SYN scans against the production "
            "network perimeter to enumerate open ports and identify exploitable services. Scan covered "
            "all 65535 ports at a rate of 10,000 packets/second."
        ),
        "attack_type": "Port Scan",
        "severity": "medium",
        "source": "Perimeter IDS / Snort",
        "cve_ids": "",
        "indicators": (
            "SYN packets to sequential port range from single source; "
            "high ratio of SYN to SYN-ACK; "
            "IDS signature SID:1228; "
            "source IP resolving to cloud or VPN provider"
        ),
        "mitigation": (
            "Configure stateful firewall to drop packets from sources exceeding SYN threshold; "
            "implement port-knock or service cloaking for sensitive services; "
            "geo-block known scan-hosting CIDR ranges; "
            "enable IDS alerting with automated blocklist integration"
        ),
        "content": (
            "TCP SYN port scan at 10k pps over full port range. Nmap/Masscan signatures. "
            "IDS SID:1228. Mitigate with stateful firewall SYN rate limiting and IDS auto-blocklist."
        ),
    },
    {
        "id": "threat-010",
        "title": "UDP Service Discovery Scan",
        "description": (
            "Threat actor performed UDP-based service discovery scanning targeting DNS (53), SNMP (161), "
            "NTP (123), and mDNS (5353) ports to identify misconfigured amplification-capable services "
            "for use in reflection DDoS attacks."
        ),
        "attack_type": "Port Scan",
        "severity": "low",
        "source": "NetFlow Analysis",
        "cve_ids": "",
        "indicators": (
            "High-volume UDP traffic to ports 53, 123, 161, 5353; "
            "ICMP port-unreachable responses; "
            "source IPs from known scanning infrastructure"
        ),
        "mitigation": (
            "Disable recursive DNS responses for external clients; "
            "restrict SNMP to management VLAN; "
            "apply NTP monlist disable (CVE-2013-5211 mitigation); "
            "block external mDNS traffic at perimeter"
        ),
        "content": (
            "UDP scan targeting DNS/SNMP/NTP/mDNS for reflection amplification. "
            "Disable recursive DNS externally, restrict SNMP, disable NTP monlist."
        ),
    },
    {
        "id": "threat-011",
        "title": "Second-Order SQL Injection in Password Reset Flow",
        "description": (
            "Malicious data stored during account registration is later used unsafely in the password reset "
            "SQL query, leading to second-order SQL injection that bypasses the reset token validation "
            "and allows account takeover."
        ),
        "attack_type": "SQL Injection",
        "severity": "critical",
        "source": "Bug Bounty Program",
        "cve_ids": "CVE-2024-28741",
        "indicators": (
            "Registration payloads containing SQL fragments; "
            "password reset requests from accounts registered with unusual username patterns; "
            "multiple account takeover reports from users"
        ),
        "mitigation": (
            "Sanitise and parameterise all queries using stored data; "
            "treat stored data as untrusted input at every usage point; "
            "implement integration tests that trace data from input to SQL"
        ),
        "content": (
            "Second-order SQL injection via password reset. Malicious username payload stored at registration "
            "executes during reset query. CVE-2024-28741. Fix with parameterised queries on stored-data reuse."
        ),
    },
    {
        "id": "threat-012",
        "title": "DOM-Based XSS via URL Fragment",
        "description": (
            "The single-page application reads the URL fragment identifier (window.location.hash) and "
            "inserts it into the DOM using innerHTML without sanitisation. Attackers craft URLs with "
            "embedded JavaScript payloads in the fragment to execute code in victim browsers."
        ),
        "attack_type": "XSS",
        "severity": "high",
        "source": "OWASP WSTG-CLNT-01",
        "cve_ids": "",
        "indicators": (
            "URLs containing script fragments after #; "
            "JavaScript errors referencing innerHTML assignments; "
            "CSP violation reports for inline script execution"
        ),
        "mitigation": (
            "Replace innerHTML assignments with textContent or DOM creation APIs; "
            "sanitise any HTML derived from URL components with DOMPurify; "
            "enforce Content-Security-Policy prohibiting unsafe-inline"
        ),
        "content": (
            "DOM-based XSS via URL fragment inserted with innerHTML. "
            "Fix: use textContent, DOMPurify, and CSP unsafe-inline prohibition."
        ),
    },
    {
        "id": "threat-013",
        "title": "Credential Stuffing with Bot-Net Infrastructure",
        "description": (
            "Organised threat group operates a 50,000-node residential proxy botnet to conduct "
            "high-volume credential stuffing campaigns. Requests per IP never exceed 5 per day, "
            "defeating IP-rate-limiting defences. Session tokens are harvested and resold."
        ),
        "attack_type": "Credential Stuffing",
        "severity": "critical",
        "source": "Threat Intelligence Feed — Recorded Future",
        "cve_ids": "CVE-2022-26134",
        "indicators": (
            "Login failures distributed across > 10,000 unique IPs over 24 hours; "
            "requests from residential ISP ranges; successful authentications followed immediately by "
            "high-value API calls (payment, PII export)"
        ),
        "mitigation": (
            "Deploy device fingerprinting and behavioural biometrics; "
            "require step-up authentication on high-value actions; "
            "integrate threat intelligence feed blocklists for known credential-stuffing infrastructure"
        ),
        "content": (
            "Large-scale credential stuffing via 50k residential proxy botnet. CVE-2022-26134. "
            "Defeat with device fingerprinting, behavioural biometrics, and threat-intel blocklists."
        ),
    },
    {
        "id": "threat-014",
        "title": "Service Account Abuse — Lateral Movement",
        "description": (
            "A compromised service account with overly broad permissions was used to pivot across "
            "microservices, access configuration secrets in Azure Key Vault, and establish persistence "
            "by creating a new service principal with owner-level access."
        ),
        "attack_type": "Insider Threat",
        "severity": "critical",
        "source": "Azure Sentinel Alert",
        "cve_ids": "",
        "indicators": (
            "Service account accessing resources outside its designated namespace; "
            "Key Vault secret list and get operations at unusual hours; "
            "new service principal creation by non-human identity; "
            "cross-subscription resource access attempts"
        ),
        "mitigation": (
            "Apply least-privilege RBAC to all service accounts; "
            "enable Azure Defender for Key Vault; "
            "configure PIM for Just-In-Time access; "
            "alert on service principal creation by managed identities"
        ),
        "content": (
            "Compromised service account pivoted via microservices, accessed Key Vault secrets, created backdoor service principal. "
            "Mitigate with least-privilege RBAC, Defender for Key Vault, and PIM."
        ),
    },
    {
        "id": "threat-015",
        "title": "Aggressive Network Reconnaissance — Combined Port and Version Scan",
        "description": (
            "Threat actor combined Nmap TCP SYN scan with service version detection (-sV) and OS "
            "fingerprinting (-O) to build a detailed map of the target network's attack surface. "
            "Results were used to identify an unpatched Apache Struts instance exploited 48 hours later."
        ),
        "attack_type": "Port Scan",
        "severity": "medium",
        "source": "IDS / Threat Hunt",
        "cve_ids": "CVE-2023-50164",
        "indicators": (
            "Nmap OS and version detection probes; "
            "TCP banner-grab traffic patterns; "
            "subsequent exploitation attempt within 48 hours from same ASN; "
            "HTTP requests with Shodan-style user-agents"
        ),
        "mitigation": (
            "Suppress banner information from all public-facing services; "
            "deploy honeypot services to detect reconnaissance; "
            "patch management SLA: critical vulnerabilities within 24 hours; "
            "block ASN ranges identified in active scan campaigns"
        ),
        "content": (
            "Combined port and version scan used to fingerprint network before Apache Struts exploitation. "
            "CVE-2023-50164. Mitigate with banner suppression, honeypots, and 24h critical patch SLA."
        ),
    },
]

# ---------------------------------------------------------------------------
# TASK 1b — mitre-attack index
# ---------------------------------------------------------------------------

MITRE_INDEX_NAME = settings.AZURE_SEARCH_INDEX_MITRE  # "mitre-attack"

MITRE_FIELDS = [
    SimpleField(name="id",           type=SearchFieldDataType.String, key=True, filterable=True),
    SearchableField(name="technique_id",   type=SearchFieldDataType.String, filterable=True),
    SearchableField(name="technique_name", type=SearchFieldDataType.String),   # matches select in azure_search.py
    SearchableField(name="name",           type=SearchFieldDataType.String),
    SearchableField(name="description",    type=SearchFieldDataType.String),
    SearchableField(name="tactic",         type=SearchFieldDataType.String, filterable=True, facetable=True),
    SearchableField(name="severity",       type=SearchFieldDataType.String, filterable=True, facetable=True),
    SearchableField(name="detection",      type=SearchFieldDataType.String),
    SearchableField(name="mitigation",     type=SearchFieldDataType.String),
    SearchableField(name="examples",       type=SearchFieldDataType.String),
]

MITRE_DOCUMENTS = [
    {
        "id": "mitre-T1190",
        "technique_id": "T1190",
        "technique_name": "Exploit Public-Facing Application",
        "name": "Exploit Public-Facing Application",
        "description": (
            "Adversaries exploit software vulnerabilities in internet-facing applications such as web servers, "
            "databases, and API gateways. Exploitation often leads to remote code execution, authentication bypass, "
            "or direct database access. Common targets include Apache Struts, Confluence, MOVEit, and custom web APIs."
        ),
        "tactic": "Initial Access",
        "severity": "critical",
        "detection": (
            "Monitor web server error logs for unexpected 500 responses; "
            "alert on WAF rule triggers; "
            "detect anomalous outbound connections from web application processes; "
            "correlate vulnerability scanner findings with IDS alerts"
        ),
        "mitigation": (
            "Apply vendor patches within SLA (critical: 24 h); "
            "deploy WAF with OWASP Core Rule Set; "
            "conduct quarterly application penetration testing; "
            "enable network segmentation to limit blast radius of compromised app tier"
        ),
        "examples": (
            "CVE-2023-34362 (MOVEit Transfer SQL injection); "
            "CVE-2021-26084 (Confluence OGNL injection); "
            "CVE-2017-5638 (Apache Struts RCE); "
            "CVE-2024-21762 (Fortinet FortiOS auth bypass)"
        ),
    },
    {
        "id": "mitre-T1110",
        "technique_id": "T1110",
        "technique_name": "Brute Force",
        "name": "Brute Force",
        "description": (
            "Adversaries attempt to gain access to accounts using automated methods to guess credentials. "
            "Sub-techniques include password guessing (T1110.001), password spraying (T1110.003), and "
            "credential stuffing (T1110.004). Attacks target authentication endpoints across all service types."
        ),
        "tactic": "Credential Access",
        "severity": "high",
        "detection": (
            "Alert on per-account failed login thresholds; "
            "detect password spray via many accounts receiving similar failures in short windows; "
            "monitor for authentication attempts with known-breached passwords; "
            "track user-agent diversity ratios in authentication traffic"
        ),
        "mitigation": (
            "Enforce MFA on all accounts; "
            "implement CAPTCHA after failed attempt threshold; "
            "deploy per-account and global rate limiting independently; "
            "integrate HaveIBeenPwned API to block use of known-compromised passwords"
        ),
        "examples": (
            "Credential stuffing using Collections #1-5 breach data against major e-commerce platforms; "
            "Password spray at 1 attempt/account/hour against Office 365 tenants; "
            "Automated brute force of SSH with rockyou.txt wordlist"
        ),
    },
    {
        "id": "mitre-T1078",
        "technique_id": "T1078",
        "technique_name": "Valid Accounts",
        "name": "Valid Accounts",
        "description": (
            "Adversaries obtain and abuse credentials of existing accounts to gain initial access, "
            "maintain persistence, escalate privileges, or move laterally. Credentials may be obtained "
            "via phishing, credential dumps, or purchasing from dark-web markets. Sub-techniques cover "
            "default accounts, domain accounts, cloud accounts, and local accounts."
        ),
        "tactic": "Defense Evasion",
        "severity": "high",
        "detection": (
            "Baseline normal login times, locations, and device fingerprints per user; "
            "alert on authentication from new geographies or devices; "
            "detect impossible travel (login from NYC then London within 1 hour); "
            "monitor for use of service accounts outside business hours"
        ),
        "mitigation": (
            "Enforce least-privilege access and regular access reviews; "
            "require MFA especially for privileged and remote access; "
            "implement Privileged Access Workstations (PAWs) for admin operations; "
            "rotate default credentials on all infrastructure components before deployment"
        ),
        "examples": (
            "APT29 using stolen cloud credentials to access Azure AD and exfiltrate email; "
            "Default credential exploitation on IoT devices (admin/admin); "
            "Service account credential reuse across on-prem and cloud environments"
        ),
    },
    {
        "id": "mitre-T1566",
        "technique_id": "T1566",
        "technique_name": "Phishing",
        "name": "Phishing",
        "description": (
            "Adversaries send fraudulent electronic messages designed to trick targets into revealing "
            "credentials, installing malware, or taking other actions that benefit the adversary. "
            "Sub-techniques include spearphishing with attachments (T1566.001), spearphishing via link "
            "(T1566.002), and spearphishing via service (T1566.003)."
        ),
        "tactic": "Initial Access",
        "severity": "high",
        "detection": (
            "Enable anti-phishing policies in email gateway; "
            "alert on user clicks to known-malicious domains from corporate networks; "
            "detect credential entry on non-corporate domains via proxy logs; "
            "train users to report suspicious emails and track report rates"
        ),
        "mitigation": (
            "Deploy DMARC, DKIM, and SPF for outbound email authentication; "
            "enable Microsoft Defender for Office 365 Safe Links; "
            "conduct regular phishing simulation training; "
            "implement network-level DNS filtering to block newly registered domains"
        ),
        "examples": (
            "Business Email Compromise (BEC) targeting finance teams with fake CFO wire requests; "
            "APT28 spearphishing of think-tank researchers with weaponised PDF attachments; "
            "Adversary-in-the-middle phishing kits (EvilGinx2, Modlishka) bypassing MFA via session cookie theft"
        ),
    },
    {
        "id": "mitre-T1059",
        "technique_id": "T1059",
        "technique_name": "Command and Scripting Interpreter",
        "name": "Command and Scripting Interpreter",
        "description": (
            "Adversaries abuse command and script interpreters to execute commands, scripts, or binaries. "
            "Sub-techniques cover PowerShell (T1059.001), Windows Command Shell (T1059.003), "
            "Unix Shell (T1059.004), Python (T1059.006), and JavaScript (T1059.007). "
            "Interpreters are often used to download additional payloads or escalate privileges."
        ),
        "tactic": "Execution",
        "severity": "high",
        "detection": (
            "Enable PowerShell Script Block Logging and Transcription; "
            "alert on encoded PowerShell commands (base64 -EncodedCommand); "
            "detect spawning of cmd.exe or powershell.exe from web server processes; "
            "monitor for use of LOLBAS (Living Off the Land Binaries and Scripts)"
        ),
        "mitigation": (
            "Restrict PowerShell execution policy to AllSigned in production; "
            "deploy AppLocker or WDAC to whitelist approved scripts; "
            "remove unnecessary scripting engines from production servers; "
            "enable Constrained Language Mode for PowerShell"
        ),
        "examples": (
            "PowerShell Empire framework used for post-exploitation in ransomware campaigns; "
            "Python reverse shells embedded in pip packages (supply chain attack); "
            "cmd.exe spawned by IIS worker process after web shell upload"
        ),
    },
    {
        "id": "mitre-T1055",
        "technique_id": "T1055",
        "technique_name": "Process Injection",
        "name": "Process Injection",
        "description": (
            "Adversaries inject code into the address space of other running processes to evade defences, "
            "escalate privileges, or access the injected process's resources. Common sub-techniques include "
            "DLL injection, PE injection, Process Hollowing, and Thread Hijacking. "
            "Injected code typically runs with the security context of the host process."
        ),
        "tactic": "Defense Evasion",
        "severity": "high",
        "detection": (
            "Monitor for OpenProcess calls with PROCESS_VM_WRITE permissions from unexpected parents; "
            "detect CreateRemoteThread calls into remote process space; "
            "alert on VirtualAllocEx followed by WriteProcessMemory from non-system processes; "
            "use EDR solutions with memory scanning capabilities"
        ),
        "mitigation": (
            "Enable Windows Credential Guard to protect LSASS memory; "
            "deploy EDR with memory-based threat detection; "
            "enforce PPL (Protected Process Light) for sensitive system processes; "
            "apply Attack Surface Reduction (ASR) rules in Defender"
        ),
        "examples": (
            "Cobalt Strike Beacon injected into svchost.exe for persistence and C2; "
            "Mimikatz SEKURLSA module injected into LSASS to dump credentials; "
            "Mavinject.exe LOLBin used for DLL injection into trusted processes"
        ),
    },
    {
        "id": "mitre-T1083",
        "technique_id": "T1083",
        "technique_name": "File and Directory Discovery",
        "name": "File and Directory Discovery",
        "description": (
            "Adversaries enumerate files and directories on compromised systems to identify sensitive data, "
            "configuration files, credential stores, and pathways for privilege escalation or lateral movement. "
            "Techniques include recursive directory listing, search for specific file extensions, "
            "and enumeration of recently accessed files."
        ),
        "tactic": "Discovery",
        "severity": "medium",
        "detection": (
            "Alert on high-volume file enumeration from a single process in a short time window; "
            "monitor access to sensitive directories (/etc/shadow, C:\\Windows\\System32\\config\\); "
            "detect use of find, dir /s /b, or tree commands in shell history; "
            "correlate directory enumeration with subsequent data staging activity"
        ),
        "mitigation": (
            "Apply least-privilege file system permissions; "
            "encrypt sensitive configuration files at rest; "
            "use honeypot files in sensitive directories to detect enumeration; "
            "enable file system auditing on critical directories"
        ),
        "examples": (
            "find / -name '*.pem' 2>/dev/null executed post-compromise to locate SSL private keys; "
            "PowerShell Get-ChildItem -Recurse -Filter *.config to locate web.config credential files; "
            "Automated enumeration of %APPDATA% for browser credential stores"
        ),
    },
    {
        "id": "mitre-T1486",
        "technique_id": "T1486",
        "technique_name": "Data Encrypted for Impact",
        "name": "Data Encrypted for Impact",
        "description": (
            "Adversaries encrypt data on target systems to interrupt availability and extract ransom payments. "
            "Modern ransomware uses hybrid encryption (AES for data, RSA for key exchange) to make decryption "
            "infeasible without the attacker's private key. Attacks target both file systems and backup repositories."
        ),
        "tactic": "Impact",
        "severity": "critical",
        "detection": (
            "Alert on mass file rename operations with extension changes; "
            "detect rapid increase in disk write IOPS from a single process; "
            "monitor for Volume Shadow Copy deletion (vssadmin delete shadows); "
            "detect ransom note file creation (README.txt, HOW_TO_DECRYPT.html)"
        ),
        "mitigation": (
            "Maintain offline immutable backups tested quarterly; "
            "deploy EDR with ransomware behavioural detection; "
            "enable controlled folder access in Windows Defender; "
            "segment backup infrastructure from production networks; "
            "implement network-level anomaly detection for internal SMB traffic"
        ),
        "examples": (
            "LockBit 3.0 deploying via RDP brute force and encrypting ESXi hypervisor datastores; "
            "BlackCat/ALPHV ransomware targeting healthcare with triple extortion (encrypt, leak, DDoS); "
            "NotPetya wiper masquerading as ransomware causing $10B in damage"
        ),
    },
    {
        "id": "mitre-T1071",
        "technique_id": "T1071",
        "technique_name": "Application Layer Protocol",
        "name": "Application Layer Protocol",
        "description": (
            "Adversaries communicate with compromised systems using application layer protocols such as HTTP/S, "
            "DNS, SMTP, and SFTP to blend C2 traffic with legitimate network activity. "
            "Sub-techniques include Web Protocols (T1071.001), File Transfer Protocols (T1071.002), "
            "Mail Protocols (T1071.003), and DNS (T1071.004)."
        ),
        "tactic": "Command and Control",
        "severity": "high",
        "detection": (
            "Baseline expected DNS query volumes and alert on domain generation algorithm (DGA) patterns; "
            "detect HTTP C2 via beacon intervals and unusual user-agent strings; "
            "monitor for unusually large DNS TXT records (DNS tunnelling); "
            "alert on outbound SMTP from non-mail servers"
        ),
        "mitigation": (
            "Implement DNS filtering and RPZ (Response Policy Zones) to block known C2 domains; "
            "deploy SSL inspection for encrypted C2 over HTTPS; "
            "restrict outbound internet access from server-tier networks to approved destinations; "
            "use threat intelligence feeds to block known C2 infrastructure"
        ),
        "examples": (
            "Cobalt Strike using HTTPS malleable profiles to mimic legitimate CDN traffic; "
            "DNScat2 tunnelling C2 commands through DNS TXT queries; "
            "ICEDID malware using HTTP with fake Microsoft certificate fingerprints"
        ),
    },
    {
        "id": "mitre-T1021",
        "technique_id": "T1021",
        "technique_name": "Remote Services",
        "name": "Remote Services",
        "description": (
            "Adversaries use legitimate remote services such as RDP, SSH, SMB, VNC, and cloud APIs "
            "to move laterally within a network using valid credentials. Sub-techniques include "
            "Remote Desktop Protocol (T1021.001), SMB/Windows Admin Shares (T1021.002), "
            "SSH (T1021.004), and Cloud Services (T1021.007)."
        ),
        "tactic": "Lateral Movement",
        "severity": "high",
        "detection": (
            "Alert on RDP connections between servers (server-to-server lateral movement); "
            "detect logon type 10 (remote interactive) events on sensitive systems; "
            "monitor SMB connections to admin shares (C$, ADMIN$, IPC$) from non-admin workstations; "
            "alert on SSH key-based auth from newly seen source IPs"
        ),
        "mitigation": (
            "Disable RDP on all systems where not operationally required; "
            "restrict SMB admin shares via Group Policy; "
            "enforce network segmentation preventing lateral RDP between workstations; "
            "require MFA for all remote access including VPN and cloud management APIs"
        ),
        "examples": (
            "RDP lateral movement across hospital network during Ryuk ransomware deployment; "
            "PsExec used over SMB Admin Shares for remote service installation; "
            "SSH key propagation for lateral movement in Linux server environments"
        ),
    },
]

# ---------------------------------------------------------------------------
# Index schema builders
# ---------------------------------------------------------------------------

def build_threat_index() -> SearchIndex:
    return SearchIndex(name=THREAT_INDEX_NAME, fields=THREAT_FIELDS)

def build_mitre_index() -> SearchIndex:
    return SearchIndex(name=MITRE_INDEX_NAME, fields=MITRE_FIELDS)

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    print("=" * 60)
    print("AgentGuard - Azure AI Search Index Setup")
    print("=" * 60)
    print(f"Endpoint : {settings.AZURE_SEARCH_ENDPOINT}")
    print()

    index_client = get_index_client()

    # -- threat-intelligence ------------------------------------------------
    print(f"[1/4] Configuring index: '{THREAT_INDEX_NAME}'")
    delete_index_if_exists(index_client, THREAT_INDEX_NAME)

    index_client.create_index(build_threat_index())
    print(f"  [OK] Created index '{THREAT_INDEX_NAME}'")

    print(f"[2/4] Seeding '{THREAT_INDEX_NAME}' with {len(THREAT_DOCUMENTS)} documents ...")
    with get_search_client(THREAT_INDEX_NAME) as sc:
        result = sc.upload_documents(documents=THREAT_DOCUMENTS)
    succeeded = sum(1 for r in result if r.succeeded)
    failed    = sum(1 for r in result if not r.succeeded)
    print(f"  [OK] Uploaded: {succeeded} succeeded, {failed} failed")
    if failed:
        for r in result:
            if not r.succeeded:
                print(f"    [ERR] key={r.key} error={r.error_message}")

    print()

    # -- mitre-attack ------------------------------------------------------
    print(f"[3/4] Configuring index: '{MITRE_INDEX_NAME}'")
    delete_index_if_exists(index_client, MITRE_INDEX_NAME)

    index_client.create_index(build_mitre_index())
    print(f"  [OK] Created index '{MITRE_INDEX_NAME}'")

    print(f"[4/4] Seeding '{MITRE_INDEX_NAME}' with {len(MITRE_DOCUMENTS)} documents ...")
    with get_search_client(MITRE_INDEX_NAME) as sc:
        result = sc.upload_documents(documents=MITRE_DOCUMENTS)
    succeeded = sum(1 for r in result if r.succeeded)
    failed    = sum(1 for r in result if not r.succeeded)
    print(f"  [OK] Uploaded: {succeeded} succeeded, {failed} failed")
    if failed:
        for r in result:
            if not r.succeeded:
                print(f"    [ERR] key={r.key} error={r.error_message}")

    print()
    print("=" * 60)
    print("Setup complete.")
    print(f"  threat-intelligence : {len(THREAT_DOCUMENTS)} documents")
    print(f"  mitre-attack        : {len(MITRE_DOCUMENTS)} documents")
    print("=" * 60)


if __name__ == "__main__":
    main()
