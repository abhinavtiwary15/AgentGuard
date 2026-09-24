"""
Azure Service Bus Manager
Note: Service Bus integration is implemented and passes local offline checks,
but has not yet been verified against a live Azure resource. Testing this
against a real deployment is a welcome contribution.
"""

from azure.servicebus.aio import ServiceBusClient
from azure.servicebus import ServiceBusMessage
from core.config import settings
import json


class ServiceBusManager:
    def __init__(self):
        connection = settings.SERVICE_BUS_CONNECTION or ""
        self.use_mock = not connection or "mock" in connection or "your-servicebus" in connection
        self.status_reason = "missing Service Bus configuration" if self.use_mock else "Service Bus client configured"
        if not self.use_mock:
            try:
                self.client = ServiceBusClient.from_connection_string(connection)
            except Exception as e:
                self.status_reason = f"Service Bus initialization error: {str(e)}"
                print(f"Service Bus initialization error: {str(e)}. Falling back to fallback mode.")
                self.use_mock = True

    def health_status(self) -> dict:
        return {
            "status": "fallback" if self.use_mock else "ok",
            "reason": self.status_reason,
        }

    def get_sender(self, queue_name: str):
        if self.use_mock:
            return None
        return self.client.get_queue_sender(queue_name=queue_name)

    def get_receiver(self, queue_name: str):
        if self.use_mock:
            return None
        return self.client.get_queue_receiver(queue_name=queue_name)

    async def send_message(self, queue_name: str, payload: dict):
        if self.use_mock:
            print(f"Service Bus in mock mode. Bypassed sending to queue '{queue_name}': {payload}")
            return
        try:
            async with self.get_sender(queue_name) as sender:
                message = ServiceBusMessage(json.dumps(payload))
                await sender.send_messages(message)
        except Exception as e:
            self.status_reason = f"Service Bus send error: {e}"
            print(f"Service Bus send error: {e}")


service_bus = ServiceBusManager()
