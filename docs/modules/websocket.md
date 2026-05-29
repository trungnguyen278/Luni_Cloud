# Module: WebSocket

Hai endpoint WS, quản lý bởi `ConnectionManager` (`services/ws_manager.py`). Routes: `api/ws/device.py`, `api/ws/app_client.py`. nginx nâng cấp WS với read-timeout 24h cho device, 1h cho app.

## Message format (text frames)

```json
{ "type": "<type>", "id": "uuid-v4", "ts": 1716825600000, "payload": { ... } }
```

`type` = tên cụ thể (không dùng category). `id` để match ACK. `ts` = epoch ms.
Schemas: `schemas/ws_protocol.py`.

## `/ws/device` — Robot

Auth: device gửi `auth` ngay sau khi mở WS (timeout 5s, không thì close 4002).

```
device → { "type":"auth", "payload":{ "device_token","mac","fw_version","model" } }
server → { "type":"auth_result", "payload":{ "status":"ok" } }
server → { "type":"sync_data", "payload":{...} }      # push ngay sau auth
```

Verify (`api/ws/device.py:_authenticate_device`): tra `Device` theo MAC → nếu không có `device_not_found`; nếu `device_token` lệch `token_mismatch` → gửi `auth_result` fail rồi close **4001**. OK → đánh dấu online, đăng ký vào ConnectionManager, push `sync_data`, vào vòng nhận message.

### Device → Server

| type | Mô tả |
|------|-------|
| `heartbeat` | health (uptime, free_heap, rssi) — mỗi 30s |
| `device_info` | fw_version, model (cập nhật DB) |
| `state_update` | đổi trạng thái → cache Redis + DB + forward app |
| `battery` | mức pin → forward app |
| `log` | log entry → ingest `device_logs` |
| `error` | lỗi → forward app |
| `ota_progress` | tiến trình OTA → forward app |
| `audio_end` | kết thúc thu âm → trigger STT→Chat→TTS |
| binary | audio uplink (xem dưới) |

### Server → Device (commands)

`set_volume`, `set_brightness`, `set_emotion`, `set_scene`, `reboot`, `ota_available`, `sync_data`, `tts_play`, `audio_stop`, `config_update`, `interaction_msg`, `ack`.

### Binary frames (audio)

```
[ direction:1 ][ sequence:2 LE ][ length:2 LE ][ Opus payload:N ]
direction: 0xAA = uplink (mic→server), 0xAB = downlink (server→speaker)
Opus 48kHz, 16-bit mono, frame 20ms
```

### Heartbeat / timeouts

| Tham số | Giá trị |
|---------|---------|
| Device heartbeat interval | 30s |
| Server check interval | 60s |
| Offline threshold | 90s (3 lần miss → mark offline + close) |
| WS auth timeout | 5s |
| Reconnect backoff (device) | 1→2→4…→30s, max 10 lần |

## `/ws/app/{device_id}` — App/Web

Auth: JWT qua query `?token=<access_token>`. `api/ws/app_client.py` decode + check `type=access`; sai → close 4001. Đăng ký client vào ConnectionManager, gửi snapshot `current_state`, sau đó nhận event relay.

Server → App: `current_state`, `device_online`, `device_offline`, `state_update`, `battery`, `error`, `ota_progress`, `interaction_result`.

## ConnectionManager (`services/ws_manager.py`)

```
device_connections : dict[device_id, WebSocket]
app_connections    : dict[device_id, set[(user_id, WebSocket)]]
last_heartbeat     : dict[device_id, float]
redis              : pub/sub + cache
```

- `send_to_device(id, msg)` — gửi command, trả False nếu offline.
- `notify_app_clients(id, msg)` — broadcast tới mọi app đang xem device, tự dọn client đã rớt.
- `handle_device_message` — route theo `type` (xem bảng trên); binary → `handle_audio_uplink`.
