from collections import defaultdict
import asyncio


class EventBus:

    def __init__(self):

        self.subscribers = defaultdict(list)

    def subscribe(self, event_type, handler):

        self.subscribers[event_type].append(handler)

    async def publish(self, event):

        handlers = self.subscribers.get(event.type, [])

        for handler in handlers:
            await handler(event)