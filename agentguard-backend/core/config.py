from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import model_validator
from typing import List, Optional
from pathlib import Path

import time

ENV_FILE = Path(__file__).resolve().parents[1] / ".env"
SERVER_START_TIME = time.time()

class Settings(BaseSettings):
    # App
    APP_NAME: str = "AgentGuard"
    ENVIRONMENT: str = "development"
    DEBUG: bool = False
    ALLOWED_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost",
        "https://agentguard-frontend.livelyflower-aebbbf70.centralindia.azurecontainerapps.io",
        "https://agentguard.azurewebsites.net",
    ]

    # Azure OpenAI (Optional defaults trigger resilient mock fallback)
    AZURE_OPENAI_ENDPOINT: Optional[str] = None
    AZURE_OPENAI_KEY: Optional[str] = None
    AZURE_OPENAI_API_VERSION: str = "2024-12-01-preview"
    AZURE_OPENAI_GPT4O_DEPLOYMENT: str = "gpt-4o"
    AZURE_OPENAI_MINI_DEPLOYMENT: str = "gpt-4o-mini"
    AZURE_OPENAI_EMBEDDING_DEPLOYMENT: str = "text-embedding-3-large"

    # Azure AI Search (Optional defaults trigger graceful degrade/bypass)
    AZURE_SEARCH_ENDPOINT: Optional[str] = None
    AZURE_SEARCH_KEY: Optional[str] = None
    AZURE_SEARCH_INDEX_THREATS: str = "threat-intelligence"
    AZURE_SEARCH_INDEX_CVE: str = "cve-database"
    AZURE_SEARCH_INDEX_MITRE: str = "mitre-attack"

    # Azure AI Foundry
    AZURE_FOUNDRY_ENDPOINT: Optional[str] = None
    AZURE_FOUNDRY_KEY: Optional[str] = None
    AZURE_FOUNDRY_PROJECT: str = "agentguard"

    # Cosmos DB (Optional defaults trigger in-memory storage fallback)
    COSMOS_DB_CONNECTION: Optional[str] = None
    COSMOS_DB_NAME: str = "agentguard"
    COSMOS_CONTAINER_INCIDENTS: str = "incidents"
    COSMOS_CONTAINER_AUDIT: str = "audit_log"
    COSMOS_CONTAINER_REPORTS: str = "reports"
    COSMOS_CONTAINER_USERS: str = "users"

    # Azure Event Hubs (Optional defaults trigger bypass mode)
    EVENT_HUB_CONNECTION: Optional[str] = None
    EVENT_HUB_NAME: str = "security-logs"

    # Azure Service Bus (Optional defaults trigger bypass mode)
    SERVICE_BUS_CONNECTION: Optional[str] = None
    SERVICE_BUS_QUEUE_THREATS: str = "threat-signals"
    SERVICE_BUS_QUEUE_RESPONSES: str = "agent-responses"

    # Azure Communication Services
    AZURE_COMMS_CONNECTION: Optional[str] = None
    ALERT_EMAIL_FROM: str = "alerts@agentguard.ai"
    ALERT_EMAIL_TO: Optional[str] = None
    ALERT_SMS_FROM: Optional[str] = None
    ALERT_SMS_TO: Optional[str] = None

    # Microsoft Teams
    TEAMS_WEBHOOK_URL: Optional[str] = None

    # Power Automate
    POWER_AUTOMATE_BLOCK_IP_URL: Optional[str] = None
    POWER_AUTOMATE_REVOKE_SESSION_URL: Optional[str] = None
    POWER_AUTOMATE_LOCK_ACCOUNT_URL: Optional[str] = None

    # Azure AD
    AZURE_AD_TENANT_ID: Optional[str] = None
    AZURE_AD_CLIENT_ID: Optional[str] = None
    AZURE_AD_CLIENT_SECRET: Optional[str] = None

    # Agent Thresholds
    THREAT_DETECTION_THRESHOLD: int = 40
    AUTO_RESPONSE_THRESHOLD: int = 70
    HUMAN_ESCALATION_CONFIDENCE: float = 0.70
    MONITORING_INTERVAL_SECONDS: int = 5

    # JWT Authentication (Default key for development; strict enforcement in production)
    JWT_SECRET: str = "dev-insecure-jwt-secret-agentguard-2026-minimum-32bytes"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 60

    model_config = SettingsConfigDict(env_file=str(ENV_FILE), env_file_encoding="utf-8", extra="ignore")

    @model_validator(mode="after")
    def validate_production_security(self):
        if self.ENVIRONMENT == "production":
            if not self.JWT_SECRET or self.JWT_SECRET.startswith("dev-insecure-"):
                raise ValueError(
                    "Security Error: JWT_SECRET must be explicitly configured with a cryptographically secure key when ENVIRONMENT='production'."
                )
        return self

settings = Settings()
