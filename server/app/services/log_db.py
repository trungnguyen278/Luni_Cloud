"""
Luni Server — structlog processor that writes log entries to server_logs table.

Batches writes asynchronously to avoid blocking requests.
"""

import asyncio


class DBLogProcessor:
    """structlog processor that enqueues log entries for async DB writes."""

    def __init__(self):
        self._queue: asyncio.Queue = asyncio.Queue(maxsize=10000)
        self._task: asyncio.Task | None = None

    def start(self):
        self._task = asyncio.create_task(self._writer_loop())

    async def stop(self):
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass

    async def _writer_loop(self):
        while True:
            batch: list[dict] = []
            try:
                while len(batch) < 100:
                    try:
                        item = await asyncio.wait_for(
                            self._queue.get(), timeout=5.0
                        )
                        batch.append(item)
                    except asyncio.TimeoutError:
                        break

                if batch:
                    await self._write_batch(batch)

            except asyncio.CancelledError:
                while not self._queue.empty():
                    batch.append(self._queue.get_nowait())
                if batch:
                    await self._write_batch(batch)
                break
            except Exception:
                pass

    async def _write_batch(self, batch: list[dict]):
        from app.db.database import async_session
        from app.db.models import ServerLog

        try:
            async with async_session() as db:
                for entry in batch:
                    db.add(ServerLog(
                        level=entry.get("level", "info"),
                        module=entry.get("module", "unknown"),
                        message=entry.get("event", ""),
                        metadata_=entry.get("metadata") or None,
                        request_id=entry.get("request_id"),
                        user_id=entry.get("user_id"),
                        device_id=entry.get("device_id"),
                    ))
                await db.commit()
        except Exception:
            pass

    def __call__(self, logger, method_name, event_dict):
        level = event_dict.get("level", "info").lower()

        level_num = {"debug": 10, "info": 20, "warning": 30, "warn": 30, "error": 40}
        if level_num.get(level, 0) >= 20:
            try:
                metadata = {
                    k: str(v)
                    for k, v in event_dict.items()
                    if k not in (
                        "event", "level", "timestamp", "_logger",
                        "request_id", "user_id", "device_id",
                    )
                }
                self._queue.put_nowait({
                    "level": level,
                    "module": event_dict.get("_logger", "unknown"),
                    "event": event_dict.get("event", ""),
                    "metadata": metadata or None,
                    "request_id": event_dict.get("request_id"),
                    "user_id": event_dict.get("user_id"),
                    "device_id": event_dict.get("device_id"),
                })
            except asyncio.QueueFull:
                pass

        return event_dict
