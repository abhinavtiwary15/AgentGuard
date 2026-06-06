from azure.eventhub.aio import EventHubConsumerClient

from core.config import settings


class EventHubManager:
    def __init__(self):
        connection = settings.EVENT_HUB_CONNECTION or ""
        self.use_mock = not connection or "mock" in connection or "your-eventhub" in connection
        self.status_reason = "missing Event Hub configuration" if self.use_mock else "Event Hub client configured"
        if not self.use_mock:
            try:
                self.client = EventHubConsumerClient.from_connection_string(
                    conn_str=connection,
                    consumer_group="$Default",
                    eventhub_name=settings.EVENT_HUB_NAME,
                )
            except Exception as e:
                self.status_reason = f"Event Hub initialization error: {str(e)}"
                print(f"Event Hub initialization error: {str(e)}. Falling back to fallback mode.")
                self.use_mock = True

    def health_status(self) -> dict:
        return {
            "status": "fallback" if self.use_mock else "ok",
            "reason": self.status_reason,
        }

    async def start_receiving(self, on_event_batch, on_error):
        if self.use_mock:
            print("Event Hub is running in fallback mode. Receive stream bypassed.")
            return
        try:
            async with self.client:
                await self.client.receive_batch(
                    on_event_batch=on_event_batch,
                    on_error=on_error,
                    starting_position="-1",
                )
        except Exception as e:
            self.status_reason = f"Event Hub receive error: {e}"
            print(f"Event Hub receive error: {e}")


event_hub = EventHubManager()
