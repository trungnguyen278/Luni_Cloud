"""
Luni Server — App/Web Client WebSocket endpoint.

WS /ws/app/{device_id}?token=<jwt>

App/web clients subscribe to a device's events (state updates, errors,
battery, OTA progress, interaction results).
"""

import structlog
from fastapi import APIRouter, Query, WebSocket, WebSocketDisconnect

from app.core.security import decode_token
from app.services.ws_manager import manager

logger = structlog.get_logger()

router = APIRouter()


@router.websocket("/ws/app/{device_id}")
async def app_websocket(
    ws: WebSocket,
    device_id: str,
    token: str = Query(...),
):
    """
    WebSocket endpoint for app/web clients.

    Auth: JWT access token passed as query parameter.
    Client receives relayed device events and server-generated messages.
    """
    # Verify JWT
    payload = decode_token(token)
    if not payload or payload.get("type") != "access":
        await ws.close(code=4001, reason="invalid_token")
        return

    user_id = payload.get("sub", "")

    await ws.accept()

    try:
        # Register app connection
        await manager.connect_app(device_id, user_id, ws)

        # Keep connection alive — listen for client messages
        while True:
            try:
                message = await ws.receive()

                if message["type"] == "websocket.receive":
                    # App clients can send commands through WS too
                    if "text" in message:
                        import json
                        try:
                            data = json.loads(message["text"])
                            msg_type = data.get("type")

                            if msg_type == "ping":
                                await ws.send_json({"type": "pong"})

                            elif msg_type in (
                                "set_volume", "set_brightness", "set_emotion",
                                "set_scene", "reboot", "tts_play", "audio_stop",
                                "motion", "camera_capture",
                            ):
                                # Forward command to device (robot movement /
                                # camera capture are relayed by the C5 to the S3).
                                sent = await manager.send_to_device(device_id, data)
                                await ws.send_json({
                                    "type": "command_ack",
                                    "payload": {
                                        "ref_id": data.get("id", ""),
                                        "sent": sent,
                                    },
                                })

                        except json.JSONDecodeError:
                            pass

                elif message["type"] == "websocket.disconnect":
                    break

            except WebSocketDisconnect:
                break

    except Exception as e:
        logger.error("ws.app_error", device_id=device_id, user_id=user_id, error=str(e))

    finally:
        await manager.disconnect_app(device_id, user_id, ws)
