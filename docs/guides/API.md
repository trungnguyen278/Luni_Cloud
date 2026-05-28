# Luni Cloud — API Reference

Base URL: `http://localhost/api/v1` (dev) hoặc `https://<domain>/api/v1` (prod)

Auth: `Authorization: Bearer <access_token>` (trừ register, login)

---

## Auth (`/api/v1/auth`)

| Method | Endpoint | Auth | Mô tả |
|--------|----------|------|--------|
| POST | `/auth/register` | No | Đăng ký user mới → trả access + refresh token |
| POST | `/auth/login` | No | Đăng nhập → trả access + refresh token |
| POST | `/auth/refresh` | No | Refresh token → access token mới |
| POST | `/auth/logout` | Yes | Revoke refresh token |
| GET | `/auth/me` | Yes | Xem profile |
| PATCH | `/auth/me` | Yes | Cập nhật profile (name, avatar_url) |
| POST | `/auth/change-password` | Yes | Đổi mật khẩu |

## Devices (`/api/v1/devices`)

| Method | Endpoint | Auth | Mô tả |
|--------|----------|------|--------|
| GET | `/devices` | Yes | List devices (owned + shared) |
| POST | `/devices` | Yes | Register device (MAC + model) → trả device_token |
| GET | `/devices/{id}` | Yes | Get device info |
| PATCH | `/devices/{id}` | Yes | Update device (name, location, config...) |
| DELETE | `/devices/{id}` | Owner | Xoá device |
| GET | `/devices/{id}/status` | Yes | Trạng thái online/offline + last_state |
| POST | `/devices/{id}/command` | Yes | Gửi command tới device qua WS |
| POST | `/devices/{id}/share` | Owner | Share device với user khác |
| GET | `/devices/{id}/shares` | Owner | List shares |
| DELETE | `/devices/{id}/shares/{user_id}` | Owner | Xoá share |

## Data (`/api/v1/data`) — Phase 2

| Method | Endpoint | Auth | Mô tả |
|--------|----------|------|--------|
| GET | `/data/weather?lat=&lon=` | Yes | Thời tiết (cached 20 phút) |
| GET | `/data/calendar?date=` | Yes | Lịch âm + events |
| GET | `/data/sync/{device_id}` | Yes | Full sync payload cho device |
| POST | `/data/sync/{device_id}/push` | Yes | Force push sync_data tới device |

## Interactions (`/api/v1`) — Phase 2

| Method | Endpoint | Auth | Mô tả |
|--------|----------|------|--------|
| POST | `/devices/{id}/interact` | Yes | Gửi text → AI → TTS → device |
| GET | `/devices/{id}/interactions` | Yes | Lịch sử chat (paginated) |
| DELETE | `/devices/{id}/interactions` | Owner | Xoá lịch sử chat |

**POST `/devices/{id}/interact`** — Request:
```json
{"text": "Hôm nay thời tiết thế nào?", "source": "web"}
```

Response 200:
```json
{
  "input": "Hôm nay thời tiết thế nào?",
  "output": "Trời đẹp lắm! 32 độ, nắng ấm!",
  "emotion": "happy",
  "latency_ms": 1234,
  "interaction_id": 42
}
```

Response 503 (AI unavailable):
```json
{"detail": "AI service unavailable"}
```

## Logs (`/api/v1`)

| Method | Endpoint | Auth | Mô tả |
|--------|----------|------|--------|
| GET | `/devices/{id}/logs` | Yes | Logs của device cụ thể |
| GET | `/logs` | Yes | Logs tất cả devices của user |
| GET | `/admin/logs/devices` | Admin | Logs tất cả devices |
| GET | `/admin/logs/server` | Admin | Server logs (Phase 2) |
| POST | `/admin/logs/config` | Admin | Đổi log level runtime |

**Query params cho logs:**
- `level` — debug, info, warn, error
- `tag` — filter by tag
- `from_dt` / `to_dt` — ISO datetime range
- `limit` — 1-200 (default 50)
- `offset` — pagination offset

**Server logs query params:**
- `level`, `module`, `request_id`, `limit`, `offset`

## Admin Users (`/api/v1/admin/users`)

| Method | Endpoint | Auth | Mô tả |
|--------|----------|------|--------|
| GET | `/admin/users` | Admin | List all users |
| GET | `/admin/users/{id}` | Admin | Get user detail + device count |
| PATCH | `/admin/users/{id}` | Admin | Update user (role, is_active) |
| DELETE | `/admin/users/{id}` | Admin | Deactivate user |

---

## WebSocket

### Device WS: `ws://host/ws/device`

Auth: gửi auth message sau khi connect (timeout 5s)

```
→ {"type":"auth","payload":{"device_token":"...","mac":"AA:BB:CC:DD:EE:FF"}}
← {"type":"auth_result","payload":{"status":"ok"}}
← {"type":"sync_data","payload":{...}}    ← tự động push sau auth
```

Message types (device → server):
- `heartbeat` — giữ kết nối (mỗi 30s)
- `state_update` — battery, wifi, sensors...
- `device_info` — fw_version, model
- `log` — device log entry
- `battery` — battery level
- `error` — device error
- `ota_progress` — OTA update progress
- `audio_end` — kết thúc ghi âm

Binary frames: audio uplink (0xAA header)

### App Client WS: `ws://host/ws/app/{device_id}?token=<jwt>`

Auth: JWT qua query param

```
← {"type":"current_state","payload":{"is_online":true}}
← {"type":"state_update",...}           ← forwarded từ device
← {"type":"interaction_result",...}     ← kết quả AI chat
← {"type":"device_online",...}
← {"type":"device_offline",...}
```

---

## AI Container (internal, chỉ server gọi được)

| Method | Endpoint | Mô tả |
|--------|----------|--------|
| GET | `/health` | Health check + capabilities |
| POST | `/chat` | Text → text + emotion |
| POST | `/stt` | Audio → text |
| POST | `/tts` | Text → audio |

Chi tiết API contract: xem [PLAN_PHASE2.md §4.2](../plan/PLAN_PHASE2.md)

---

## Error format

Tất cả errors trả JSON:

```json
{
  "detail": "Error message here"
}
```

HTTP status codes:
- `400` — Validation error
- `401` — Unauthorized (missing/invalid token)
- `403` — Forbidden (no access)
- `404` — Not found
- `409` — Conflict (duplicate)
- `429` — Rate limited (Phase 4)
- `503` — AI service unavailable
