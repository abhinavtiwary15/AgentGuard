from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List, Optional
from pathlib import Path

ENV_FILE = Path(__file__).resolve().parents[1] / ".env"

class Settings(BaseSettings):
    # App
    APP_NAME: str = "AgentGuard"
    ENVIRONMENT: str = "development"
    DEBUG: bool = False
    ALLOWED_ORIGINS: List[str] = ["http://localhost:3000", "https://agentguard.azurewebsites.net"]

    # Azure OpenAI
    AZURE_OPENAI_ENDPOINT: str
    AZURE_OPENAI_KEY: str
    AZURE_OPENAI_API_VERSION: str = "2024-12-01-preview"
    AZURE_OPENAI_GPT4O_DEPLOYMENT: str = "gpt-4o"
    AZURE_OPENAI_MINI_DEPLOYMENT: str = "gpt-4o-mini"
    AZURE_OPENAI_EMBEDDING_DEPLOYMENT: str = "text-embedding-3-large"

    # Azure AI Search
    AZURE_SEARCH_ENDPOINT: str
    AZURE_SEARCH_KEY: str
    AZURE_SEARCH_INDEX_THREATS: str = "threat-intelligence"
    AZURE_SEARCH_INDEX_CVE: str = "cve-database"
    AZURE_SEARCH_INDEX_MITRE: str = "mitre-attack"

    # Azure AI Foundry
    AZURE_FOUNDRY_ENDPOINT: Optional[str] = None
    AZURE_FOUNDRY_KEY: Optional[str] = None
    AZURE_FOUNDRY_PROJECT: str = "agentguard"

    # Cosmos DB
    COSMOS_DB_CONNECTION: str
    COSMOS_DB_NAME: str = "agentguard"
    COSMOS_CONTAINER_INCIDENTS: str = "incidents"
    COSMOS_CONTAINER_AUDIT: str = "audit_log"
    COSMOS_CONTAINER_REPORTS: str = "reports"

    # Azure Event Hubs
    EVENT_HUB_CONNECTION: str
    EVENT_HUB_NAME: str = "security-logs"

    # Azure Service Bus
    SERVICE_BUS_CONNECTION: str
    SERVICE_BUS_QUEUE_THREATS: str = "threat-signals"
    SERVICE_BUS_QUEUE_RESPONSES: str = "agent-responses"

    # Azure Communication Services
    AZURE_COMMS_CONNECTION: str
    ALERT_EMAIL_FROM: str = "alerts@agentguard.ai"
    ALERT_EMAIL_TO: Optional[str] = None
    ALERT_SMS_FROM: Optional[str] = None
    ALERT_SMS_TO: Optional[str] = None

    # Microsoft Teams
    TEAMS_WEBHOOK_URL: str

    # Power Automate
    POWER_AUTOMATE_BLOCK_IP_URL: str
    POWER_AUTOMATE_REVOKE_SESSION_URL: str
    POWER_AUTOMATE_LOCK_ACCOUNT_URL: str

    # Azure AD
    AZURE_AD_TENANT_ID: str
    AZURE_AD_CLIENT_ID: str
    AZURE_AD_CLIENT_SECRET: str

    # Agent Thresholds
    THREAT_DETECTION_THRESHOLD: int = 40
    AUTO_RESPONSE_THRESHOLD: int = 70
    HUMAN_ESCALATION_CONFIDENCE: float = 0.70
    MONITORING_INTERVAL_SECONDS: int = 5

    # JWT
    JWT_SECRET: str
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 60

    model_config = SettingsConfigDict(env_file=str(ENV_FILE), env_file_encoding="utf-8", extra="ignore")

settings = Settings()
