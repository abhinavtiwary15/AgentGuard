from typing import Any, Dict, List, Optional

from azure.cosmos.aio import CosmosClient
from azure.cosmos.exceptions import CosmosHttpResponseError

from core.config import settings
from utils.logger import logger


class CosmosDBManager:
    def __init__(self):
        self.use_mock = "mockkey" in settings.COSMOS_DB_CONNECTION or "your_key" in settings.COSMOS_DB_CONNECTION
        self.status_reason = "configured for in-memory fallback" if self.use_mock else "Cosmos DB client configured"
        self.memory_db = {
            settings.COSMOS_CONTAINER_INCIDENTS: {},
            settings.COSMOS_CONTAINER_AUDIT: {},
            settings.COSMOS_CONTAINER_REPORTS: {},
        }
        if not self.use_mock:
            try:
                self.client = CosmosClient.from_connection_string(settings.COSMOS_DB_CONNECTION)
                self.db = self.client.get_database_client(settings.COSMOS_DB_NAME)
            except Exception as e:
                self._activate_fallback(f"Cosmos DB connection failed: {e}")

    def health_status(self) -> dict:
        return {
            "status": "fallback" if self.use_mock else "ok",
            "reason": self.status_reason,
        }

    def get_container(self, container_name: str):
        if self.use_mock:
            return None
        return self.db.get_container_client(container_name)

    def _activate_fallback(self, reason: str):
        self.use_mock = True
        self.status_reason = reason[:300]
        logger.warning("COSMOS FALLBACK ACTIVE - data will not persist across restarts. Reason: %s", reason[:200])

    def _write_memory(self, container_name: str, item: dict):
        logger.warning("COSMOS FALLBACK ACTIVE - writing to in-memory storage; data will not persist across restarts.")
        item_id = item.get("id")
        self.memory_db.setdefault(container_name, {})[item_id] = item
        return item

    def _query_memory(
        self,
        container_name: str,
        status: Optional[str] = None,
        severity: Optional[str] = None,
        incident_id: Optional[str] = None,
        limit: Optional[int] = None,
    ) -> List[Dict[str, Any]]:
        items = list(self.memory_db.get(container_name, {}).values())
        if status:
            items = [item for item in items if item.get("status") == status]
        if severity:
            items = [item for item in items if item.get("severity") == severity]
        if incident_id:
            items = [item for item in items if item.get("incident_id") == incident_id]
        if limit is not None:
            items = items[: max(0, int(limit))]
        return items

    async def create_item(self, container_name: str, item: dict):
        if self.use_mock:
            return self._write_memory(container_name, item)
        try:
            container = self.get_container(container_name)
            return await container.create_item(body=item)
        except Exception as e:
            self._activate_fallback(f"Cosmos DB create error: {e}")
            return self._write_memory(container_name, item)

    async def read_item(self, container_name: str, item_id: str, partition_key: str):
        if self.use_mock:
            return self.memory_db.get(container_name, {}).get(item_id)
        try:
            container = self.get_container(container_name)
            return await container.read_item(item=item_id, partition_key=partition_key)
        except Exception as e:
            self._activate_fallback(f"Cosmos DB read error: {e}")
            return self.memory_db.get(container_name, {}).get(item_id)

    async def upsert_item(self, container_name: str, item: dict):
        if self.use_mock:
            return self._write_memory(container_name, item)
        try:
            container = self.get_container(container_name)
            return await container.upsert_item(body=item)
        except Exception as e:
            self._activate_fallback(f"Cosmos DB upsert error: {e}")
            return self._write_memory(container_name, item)

    async def query_items(self, container_name: str, query: str, parameters: list = None):
        if self.use_mock:
            return self._query_memory(container_name)
        try:
            container = self.get_container(container_name)
            items = container.query_items(
                query=query,
                parameters=parameters,
            )
            return [item async for item in items]
        except Exception as e:
            self._activate_fallback(f"Cosmos DB query error: {e}")
            return self._query_memory(container_name)

    async def list_items(
        self,
        container_name: str,
        status: Optional[str] = None,
        severity: Optional[str] = None,
        incident_id: Optional[str] = None,
        limit: Optional[int] = None,
    ):
        if self.use_mock:
            return self._query_memory(
                container_name,
                status=status,
                severity=severity,
                incident_id=incident_id,
                limit=limit,
            )

        clauses = ["1=1"]
        parameters = []
        if status:
            clauses.append("c.status = @status")
            parameters.append({"name": "@status", "value": status})
        if severity:
            clauses.append("c.severity = @severity")
            parameters.append({"name": "@severity", "value": severity})
        if incident_id:
            clauses.append("c.incident_id = @incident_id")
            parameters.append({"name": "@incident_id", "value": incident_id})

        top = f"TOP {max(0, int(limit))} " if limit is not None else ""
        query = f"SELECT {top}* FROM c WHERE {' AND '.join(clauses)}"
        return await self.query_items(container_name, query, parameters)


cosmos_db = CosmosDBManager()
