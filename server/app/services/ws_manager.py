"""
Luni Server — WebSocket Connection Manager.

Manages all device and app client WebSocket connections.
See PLAN_SERVER §4 and SYSTEM_ARCHITECTURE §3.
"""

import asyncio
import json
import time
from uuid import uuid4

import structlog
from fastapi import WebSocket

logger = structlog.get_logger()


class ConnectionManager:
    """Manages all WebSocket connections — devices and app clients."""

    def __init__(self):
        # device_id → WebSocket
        self.device_connections: dict[str, WebSocket] = {}
        # device_id → set of (user_id, WebSocket) app viewers
        self.app_connections: dict[str, set[tuple[str, WebSocket]]] = {}
        # device_id → last heartbeat timestamp
        self.last_heartbeat: dict[str, float] = {}
        # Redis connection (set during startup)
        self.redis = None
        # Audio buffering for voice interaction
        self.audio_buffers: dict[str, list[bytes]] = {}
        self.audio_start_time: dict[str, float] = {}

    # === Device connections ===

    async def connect_device(self, device_id: str, ws: WebSocket):
        """Device authenticates and joins session."""
        self.device_connections[device_id] = ws
        self.last_heartbeat[device_id] = time.time()

        logger.info("ws.device_connected", device_id=device_id)

        # Notify app clients that device came online
        await self.notify_app_clients(device_id, {
            "type": "device_online",
            "id": str(uuid4()),
            "ts": int(time.time() * 1000),
            "payload": {},
        })

    async def disconnect_device(self, device_id: str):
        """Device disconnected."""
        self.device_connections.pop(device_id, None)
        self.last_heartbeat.pop(device_id, None)

        logger.info("ws.device_disconnected", device_id=device_id)

        # Notify app clients
        await self.notify_app_clients(device_id, {
            "type": "device_offline",
            "id": str(uuid4()),
            "ts": int(time.time() * 1000),
            "payload": {"last_seen": time.time()},
        })

        # Push to the owner (app may be backgrounded). No-op without FCM creds.
        await self._push_device_offline(device_id)

    async def _push_device_offline(self, device_id: str):
        """Best-effort FCM push to the device owner that it went offline."""
        try:
            from app.db.database import async_session
            from app.db.models import Device
            from app.services.push import send_to_user

            async with async_session() as db:
                device = await db.get(Device, device_id)
                if not device:
                    return
                await send_to_user(
                    db,
                    device.owner_id,
                    title="Robot ngoại tuyến",
                    body=f"{device.name} vừa ngắt kết nối.",
                    data={"type": "device_offline", "device_id": device_id},
                )
        except Exception as e:
            logger.warning("ws.push_offline_failed", device_id=device_id, error=str(e))

    async def send_to_device(self, device_id: str, message: dict) -> bool:
        """Send JSON command to device. Returns False if offline."""
        ws = self.device_connections.get(device_id)
        if ws:
            try:
                await ws.send_json(message)
                return True
            except Exception:
                logger.warning("ws.send_failed", device_id=device_id)
                return False
        return False

    async def send_binary_to_device(self, device_id: str, data: bytes) -> bool:
        """Send binary (audio) to device."""
        ws = self.device_connections.get(device_id)
        if ws:
            try:
                await ws.send_bytes(data)
                return True
            except Exception:
                return False
        return False

    def is_device_online(self, device_id: str) -> bool:
        """Check if device is connected."""
        return device_id in self.device_connections

    # === App client connections ===

    async def connect_app(self, device_id: str, user_id: str, ws: WebSocket):
        """App/web client subscribes to a device's events."""
        if device_id not in self.app_connections:
            self.app_connections[device_id] = set()
        self.app_connections[device_id].add((user_id, ws))

        logger.info("ws.app_connected", device_id=device_id, user_id=user_id)

        # Send current device state
        is_online = self.is_device_online(device_id)
        await ws.send_json({
            "type": "current_state",
            "id": str(uuid4()),
            "ts": int(time.time() * 1000),
            "payload": {
                "is_online": is_online,
            },
        })

    async def disconnect_app(self, device_id: str, user_id: str, ws: WebSocket):
        """App/web client unsubscribes."""
        clients = self.app_connections.get(device_id, set())
        clients.discard((user_id, ws))
        if not clients:
            self.app_connections.pop(device_id, None)

        logger.info("ws.app_disconnected", device_id=device_id, user_id=user_id)

    async def notify_app_clients(self, device_id: str, message: dict):
        """Broadcast event to all app clients watching this device."""
        clients = self.app_connections.get(device_id, set())
        disconnected = []

        for user_id, ws in clients:
            try:
                await ws.send_json(message)
            except Exception:
                disconnected.append((user_id, ws))

        for client in disconnected:
            clients.discard(client)

    # === Message handling ===

    async def handle_device_message(self, device_id: str, data: str | bytes):
        """Route incoming device message (after auth)."""
        if isinstance(data, bytes):
            # Binary frames are tagged by their first byte (see firmware
            # WsProtocol: 0xAA audio uplink, 0xAB audio downlink, 0xAC image).
            # A camera image is one message: 0xAC + raw JPEG (starts with FFD8).
            if len(data) >= 3 and data[0] == 0xAC and data[1] == 0xFF and data[2] == 0xD8:
                await self.handle_image_uplink(device_id, data[1:])
            else:
                await self.handle_audio_uplink(device_id, data)
            return

        # The device sends bare "START"/"END" text to bound a voice turn
        # (wake word or button). These are NOT JSON.
        marker = data.strip()
        if marker == "START":
            await self.handle_audio_start(device_id)
            return
        if marker == "END":
            await self.handle_audio_silence(device_id)
            return

        try:
            msg = json.loads(data)
        except json.JSONDecodeError:
            logger.warning("ws.invalid_json", device_id=device_id)
            return

        msg_type = msg.get("type")
        payload = msg.get("payload", {})

        if msg_type == "heartbeat":
            self.last_heartbeat[device_id] = time.time()
            logger.debug("ws.heartbeat", device_id=device_id)

        elif msg_type == "device_info":
            logger.info("ws.device_info", device_id=device_id, payload=payload)
            try:
                from sqlalchemy import update as sa_update
                from app.db.database import async_session
                from app.db.models import Device
                async with async_session() as db:
                    await db.execute(
                        sa_update(Device)
                        .where(Device.id == device_id)
                        .values(
                            fw_version=payload.get("fw_version"),
                            model=payload.get("model"),
                        )
                    )
                    await db.commit()
            except Exception as e:
                logger.error("ws.device_info_update_failed", device_id=device_id, error=str(e))

        elif msg_type == "state_update":
            logger.info("ws.state_update", device_id=device_id)
            if self.redis:
                await self.redis.set(
                    f"device:state:{device_id}",
                    json.dumps(payload),
                )
            try:
                from sqlalchemy import update as sa_update
                from app.db.database import async_session
                from app.db.models import Device
                async with async_session() as db:
                    await db.execute(
                        sa_update(Device)
                        .where(Device.id == device_id)
                        .values(last_state=payload)
                    )
                    await db.commit()
            except Exception as e:
                logger.error("ws.state_update_failed", device_id=device_id, error=str(e))
            await self.notify_app_clients(device_id, msg)

        elif msg_type == "battery":
            logger.debug("ws.battery", device_id=device_id, payload=payload)
            await self.notify_app_clients(device_id, msg)

        elif msg_type == "log":
            logger.debug("ws.device_log", device_id=device_id)
            try:
                from app.db.database import async_session
                from app.schemas.log import DeviceLogSchema
                from app.services.log_service import LogService
                log_schema = DeviceLogSchema(
                    level=payload.get("level", "info"),
                    tag=payload.get("tag", "unknown"),
                    message=payload.get("message", ""),
                    metadata=payload.get("metadata"),
                )
                async with async_session() as db:
                    service = LogService(db)
                    await service.ingest_device_log(device_id, log_schema)
                    await db.commit()
            except Exception as e:
                logger.error("ws.log_ingest_failed", device_id=device_id, error=str(e))

        elif msg_type == "error":
            logger.warning("ws.device_error", device_id=device_id, payload=payload)
            await self.notify_app_clients(device_id, msg)

        elif msg_type == "ota_progress":
            logger.info("ws.ota_progress", device_id=device_id, payload=payload)
            await self.notify_app_clients(device_id, msg)

        elif msg_type == "audio_end":
            await self.handle_audio_silence(device_id)

        elif msg_type == "imu":
            # Low-rate IMU event from the robot (e.g. fall). Sent flat (no
            # "payload" wrapper) by the firmware via LOG_ENTRY → C5 → WS text.
            await self.handle_imu_event(device_id, msg)

        else:
            logger.warning("ws.unknown_type", device_id=device_id, type=msg_type)

    # === Audio buffering ===

    async def handle_audio_uplink(self, device_id: str, data: bytes):
        """Buffer incoming audio frames for STT processing."""
        if device_id not in self.audio_buffers:
            self.audio_buffers[device_id] = []
            self.audio_start_time[device_id] = time.time()

        self.audio_buffers[device_id].append(data)

        elapsed = time.time() - self.audio_start_time[device_id]
        if elapsed > 30:
            await self._process_audio(device_id)

    async def handle_audio_start(self, device_id: str):
        """Begin a new voice turn — reset the audio buffer (device 'START')."""
        self.audio_buffers[device_id] = []
        self.audio_start_time[device_id] = time.time()
        logger.info("ws.audio_start", device_id=device_id)

    async def handle_audio_silence(self, device_id: str):
        """Called when silence detected or audio_end message received."""
        if device_id in self.audio_buffers:
            await self._process_audio(device_id)

    # === Camera image ===

    async def handle_image_uplink(self, device_id: str, jpeg: bytes):
        """A full JPEG camera frame from the robot (tag byte already stripped)."""
        logger.info("ws.camera_frame", device_id=device_id, size=len(jpeg))

        # Cache the latest frame (REST/vision can read it; short TTL).
        if self.redis:
            try:
                await self.redis.set(f"device:camera:{device_id}", jpeg, ex=60)
            except Exception as e:
                logger.warning("ws.image_cache_failed", device_id=device_id, error=str(e))

        # Relay to app viewers as base64 (frames are occasional/on-demand).
        try:
            import base64
            b64 = base64.b64encode(jpeg).decode("ascii")
            await self.notify_app_clients(device_id, {
                "type": "camera_frame",
                "id": str(uuid4()),
                "ts": int(time.time() * 1000),
                "payload": {"format": "jpeg", "size": len(jpeg), "data": b64},
            })
        except Exception as e:
            logger.warning("ws.image_forward_failed", device_id=device_id, error=str(e))

        # TODO(vision): send to AI container /vision for relative-position /
        # other-robot detection, then optionally reply with a motion command.

    # === IMU events ===

    async def handle_imu_event(self, device_id: str, msg: dict):
        """Relay an IMU event to app viewers; push to owner on fall."""
        evt = msg.get("evt", "")
        pitch = msg.get("pitch")
        roll = msg.get("roll")
        logger.info("ws.imu_event", device_id=device_id, evt=evt, pitch=pitch, roll=roll)

        await self.notify_app_clients(device_id, {
            "type": "imu",
            "id": str(uuid4()),
            "ts": int(time.time() * 1000),
            "payload": {"evt": evt, "pitch": pitch, "roll": roll},
        })

        if evt == "fall":
            await self._push_fall(device_id)

    async def _push_fall(self, device_id: str):
        """Best-effort FCM push to the owner that the robot fell over."""
        try:
            from app.db.database import async_session
            from app.db.models import Device
            from app.services.push import send_to_user

            async with async_session() as db:
                device = await db.get(Device, device_id)
                if not device:
                    return
                await send_to_user(
                    db,
                    device.owner_id,
                    title="Robot bị ngã",
                    body=f"{device.name} vừa bị ngã/nghiêng. Kiểm tra giúp nhé.",
                    data={"type": "imu_fall", "device_id": device_id},
                )
        except Exception as e:
            logger.warning("ws.push_fall_failed", device_id=device_id, error=str(e))

    async def _process_audio(self, device_id: str):
        """Process buffered audio: STT -> Chat -> TTS -> push."""
        frames = self.audio_buffers.pop(device_id, [])
        self.audio_start_time.pop(device_id, None)

        if not frames:
            return

        try:
            from app.config import get_settings
            from app.services.ai import AIService

            raw_audio = b"".join(frames)

            ai = AIService(get_settings())
            text = await ai.transcribe(raw_audio)
            if not text.strip():
                return

            device_context = await self._get_device_context(device_id)
            history = await self._get_recent_interactions(device_id, limit=10)

            result = await ai.process_text_interaction(
                text=text,
                device_id=device_id,
                user_id=None,
                device_context=device_context,
                conversation_history=history,
            )

            await self._save_interaction(
                device_id=device_id,
                user_id=None,
                direction="voice",
                source="voice",
                input_text=text,
                output_text=result["text"],
                emotion=result["emotion"],
                audio_secs=len(frames) * 0.02,
            )
        except Exception as e:
            logger.error("ws.audio_process_failed", device_id=device_id, error=str(e))

    async def _get_device_context(self, device_id: str) -> dict | None:
        """Get cached sync_data context for a device."""
        if not self.redis:
            return None
        cached = await self.redis.get(f"sync:{device_id}")
        if cached:
            return json.loads(cached)
        return None

    async def _get_recent_interactions(self, device_id: str, limit: int = 10) -> list[dict]:
        """Get recent interaction history from DB."""
        try:
            from app.db.database import async_session
            from app.services.interaction import InteractionService
            async with async_session() as db:
                service = InteractionService(db)
                rows = await service.get_history(device_id=device_id, limit=limit)
                return [
                    {
                        "direction": r.direction,
                        "input_text": r.input_text,
                        "output_text": r.output_text,
                    }
                    for r in rows
                ]
        except Exception:
            return []

    async def _save_interaction(self, **kwargs):
        """Save an interaction record to DB."""
        try:
            from app.db.database import async_session
            from app.services.interaction import InteractionService
            async with async_session() as db:
                service = InteractionService(db)
                await service.save(**kwargs)
                await db.commit()
        except Exception as e:
            logger.error("ws.interaction_save_failed", error=str(e))

    # === Heartbeat check ===

    async def check_heartbeats(self, timeout_seconds: float = 90.0):
        """Mark devices as offline if no heartbeat for timeout_seconds."""
        now = time.time()
        stale_devices = []

        for device_id, last_ts in self.last_heartbeat.items():
            if now - last_ts > timeout_seconds:
                stale_devices.append(device_id)

        for device_id in stale_devices:
            logger.warning("ws.heartbeat_timeout", device_id=device_id)
            ws = self.device_connections.get(device_id)
            if ws:
                try:
                    await ws.close(code=4003, reason="heartbeat_timeout")
                except Exception:
                    pass
            await self.disconnect_device(device_id)


# Module-level singleton
manager = ConnectionManager()
