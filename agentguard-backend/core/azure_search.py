from azure.core.credentials import AzureKeyCredential
from azure.search.documents.aio import SearchClient
from azure.search.documents.models import VectorizedQuery
from core.config import settings
from core.azure_openai import generate_embeddings
from utils.logger import logger

class AzureSearchManager:
    def __init__(self):
        self.endpoint = settings.AZURE_SEARCH_ENDPOINT
        self.use_mock = not self.endpoint or not settings.AZURE_SEARCH_KEY
        self.status_reason = "missing search configuration" if self.use_mock else "Azure AI Search configured"
        self.credential = AzureKeyCredential(settings.AZURE_SEARCH_KEY) if not self.use_mock else None

    def health_status(self) -> dict:
        return {
            "status": "fallback" if self.use_mock else "ok",
            "reason": self.status_reason,
        }

    def get_client(self, index_name: str) -> SearchClient:
        return SearchClient(
            endpoint=self.endpoint,
            index_name=index_name,
            credential=self.credential
        )

    async def search_threat_intel(self, query: str) -> list[dict]:
        if self.use_mock:
            return []
        try:
            vector_query = VectorizedQuery(
                vector=await generate_embeddings(query),
                k_nearest_neighbors=3,
                fields="embedding"
            )
            async with self.get_client(settings.AZURE_SEARCH_INDEX_THREATS) as client:
                results = await client.search(
                    search_text=query,
                    vector_queries=[vector_query],
                    select=["id", "content", "source"],
                    top=3
                )
                return [doc async for doc in results]
        except Exception as e:
            self.status_reason = f"Threat intelligence search degraded: {str(e)[:120]}"
            logger.warning("Azure Search error (threat intel): %s", str(e)[:200])
            return []

    async def search_mitre(self, query: str) -> list[dict]:
        if self.use_mock:
            return []
        try:
            vector_query = VectorizedQuery(
                vector=await generate_embeddings(query),
                k_nearest_neighbors=3,
                fields="embedding"
            )
            async with self.get_client(settings.AZURE_SEARCH_INDEX_MITRE) as client:
                results = await client.search(
                    search_text=query,
                    vector_queries=[vector_query],
                    select=["technique_id", "technique_name", "tactic", "description"],
                    top=3
                )
                return [doc async for doc in results]
        except Exception as e:
            self.status_reason = f"MITRE search degraded: {str(e)[:120]}"
            logger.warning("Azure Search error (mitre): %s", str(e)[:200])
            return []

search_manager = AzureSearchManager()
