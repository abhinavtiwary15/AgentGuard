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
            vector_queries = None
            try:
                emb = await generate_embeddings(query)
                if emb:
                    vector_queries = [VectorizedQuery(vector=emb, k_nearest_neighbors=3, fields="embedding")]
            except Exception as emb_err:
                logger.debug("Embeddings unavailable for threat query, using text search: %s", emb_err)

            async with self.get_client(settings.AZURE_SEARCH_INDEX_THREATS) as client:
                if vector_queries:
                    try:
                        results = await client.search(
                            search_text=query,
                            vector_queries=vector_queries,
                            select=["id", "content", "source"],
                            top=3
                        )
                        docs = [doc async for doc in results]
                        if docs:
                            return docs
                    except Exception as vec_err:
                        logger.info("Vector query unavailable on threat index, falling back to keyword search: %s", vec_err)

                # Keyword search fallback
                results = await client.search(
                    search_text=query,
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
            vector_queries = None
            try:
                emb = await generate_embeddings(query)
                if emb:
                    vector_queries = [VectorizedQuery(vector=emb, k_nearest_neighbors=3, fields="embedding")]
            except Exception as emb_err:
                logger.debug("Embeddings unavailable for MITRE query, using text search: %s", emb_err)

            async with self.get_client(settings.AZURE_SEARCH_INDEX_MITRE) as client:
                if vector_queries:
                    try:
                        results = await client.search(
                            search_text=query,
                            vector_queries=vector_queries,
                            select=["technique_id", "technique_name", "tactic", "description"],
                            top=3
                        )
                        docs = [doc async for doc in results]
                        if docs:
                            return docs
                    except Exception as vec_err:
                        logger.info("Vector query unavailable on MITRE index, falling back to keyword search: %s", vec_err)

                # Keyword search fallback
                results = await client.search(
                    search_text=query,
                    select=["technique_id", "technique_name", "tactic", "description"],
                    top=3
                )
                return [doc async for doc in results]
        except Exception as e:
            self.status_reason = f"MITRE search degraded: {str(e)[:120]}"
            logger.warning("Azure Search error (mitre): %s", str(e)[:200])
            return []

search_manager = AzureSearchManager()
