"""
Luni Server — Device WebSocket endpoint.

WS /ws/device — device connects, authenticates via device_token, then
sends heartbeats, state updates, logs, etc.
"""

import asyncio
import json
import time
from uuid import uuid4

import structlog
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from sqlalchemy import select, update

from app.core.security import normalize_mac
from app.db.database import async_session
from app.db.models import Device
from app.services.ws_manager import manager

logger = structlog.get_logger()

router = APIRouter()


@router.websocket("/ws/device")
async def device_websocket(ws: WebSocket):
    """
    WebSocket endpoint for device connections.

    Auth handshake protocol:
    1. Device connects
    2. Device sends: {"type": "auth", "payload": {"device_token": "...", "mac": "...", ...}}
    3. Server verifies token + MAC in DB
    4. Server responds: {"type": "auth_result", "payload": {"status": "ok"}}
    5. On success: push sync_data, enter message loop
    6. On failure: respond fail, close after 1s
    """
    await ws.accept()

    device_id = None

    try:
        # === Auth handshake (5s timeout) ===
        device_id = await _authenticate_device(ws)

        if not device_id:
            return  # Already closed in _authenticate_device

        # Mark device online in DB
        async with async_session() as db:
            await db.execute(
                update(Device)
                .where(Device.id == device_id)
                .values(
                    is_online=True,
                    last_seen=None,  # Will be set on disconnect
                )
            )
            await db.commit()

        # Register connection
        await manager.connect_device(device_id, ws)

        # Push sync_data immediately after connection
        try:
            from app.services.sync_data import SyncDataService
            if manager.redis:
                async with async_session() as sync_db:
                    sync_service = SyncDataService(manager.redis, sync_db)
                    await sync_service.push_to_device(device_id)
        except Exception as e:
            logger.warning("ws.sync_push_failed", device_id=device_id, error=str(e))

        # === Message loop ===
        while True:
            try:
                # Receive text or binary
                message = await ws.receive()

                if message["type"] == "websocket.receive":
                    if "text" in message:
                        await manager.handle_device_message(device_id, message["text"])
                    elif "bytes" in message:
                        await manager.handle_device_message(device_id, message["bytes"])

                elif message["type"] == "websocket.disconnect":
                    break

            except WebSocketDisconnect:
                break

    except Exception as e:
        logger.error("ws.device_error", device_id=device_id, error=str(e))

    finally:
        # Cleanup on disconnect. Pass this socket so the manager can tell a real
        # teardown from a stale socket that was already replaced by a newer
        # connection — only mark the device offline in the former case.
        if device_id:
            cleaned = await manager.disconnect_device(device_id, ws)

            if cleaned:
                # Mark offline in DB
                try:
                    from datetime import datetime, timezone
                    async with async_session() as db:
                        await db.execute(
                            update(Device)
                            .where(Device.id == device_id)
                            .values(
                                is_online=False,
                                last_seen=datetime.now(timezone.utc),
                            )
                        )
                        await db.commit()
                except Exception as e:
                    logger.error("ws.db_update_failed", device_id=device_id, error=str(e))


async def _authenticate_device(ws: WebSocket) -> str | None:
    """
    Wait for auth message, verify device_token + MAC, return device_id or None.
    Timeout: 5s after WS open.
    """
    try:
        raw = await asyncio.wait_for(ws.receive_text(), timeout=5.0)
        msg = json.loads(raw)

        if msg.get("type") != "auth":
            await ws.send_json({
                "type": "auth_result",
                "id": msg.get("id", str(uuid4())),
                "ts": int(time.time() * 1000),
                "payload": {"status": "fail", "reason": "expected_auth_message"},
            })
            await asyncio.sleep(1)
            await ws.close(code=4001, reason="auth_failed")
            return None

        payload = msg.get("payload", {})
        device_token = payload.get("device_token", "")
        mac = normalize_mac(payload.get("mac", ""))

        if not device_token or not mac:
            await ws.send_json({
                "type": "auth_result",
                "id": msg.get("id", str(uuid4())),
                "ts": int(time.time() * 1000),
                "payload": {"status": "fail", "reason": "missing_credentials"},
            })
            await asyncio.sleep(1)
            await ws.close(code=4001, reason="auth_failed")
            return None

        # Lookup device in DB
        async with async_session() as db:
            result = await db.execute(
                select(Device).where(Device.id == mac)
            )
            device = result.scalar_one_or_none()

        if not device:
            await ws.send_json({
                "type": "auth_result",
                "id": msg.get("id", str(uuid4())),
                "ts": int(time.time() * 1000),
                "payload": {"status": "fail", "reason": "device_not_found"},
            })
            await asyncio.sleep(1)
            await ws.close(code=4001, reason="auth_failed")
            logger.warning("ws.auth_failed", mac=mac, reason="device_not_found")
            return None

        if device.device_token != device_token:
            await ws.send_json({
                "type": "auth_result",
                "id": msg.get("id", str(uuid4())),
                "ts": int(time.time() * 1000),
                "payload": {"status": "fail", "reason": "token_mismatch"},
            })
            await asyncio.sleep(1)
            await ws.close(code=4001, reason="auth_failed")
            logger.warning("ws.auth_failed", mac=mac, reason="token_mismatch")
            return None

        # Auth success
        await ws.send_json({
            "type": "auth_result",
            "id": msg.get("id", str(uuid4())),
            "ts": int(time.time() * 1000),
            "payload": {"status": "ok"},
        })

        logger.info(
            "ws.device_authenticated",
            device_id=mac,
            fw_version=payload.get("fw_version", ""),
            model=payload.get("model", ""),
        )

        return mac

    except asyncio.TimeoutError:
        logger.warning("ws.auth_timeout")
        try:
            await ws.close(code=4002, reason="auth_timeout")
        except Exception:
            pass
        return None

    except Exception as e:
        logger.error("ws.auth_error", error=str(e))
        try:
            await ws.close(code=4001, reason="auth_error")
        except Exception:
            pass
        return None
