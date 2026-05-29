# Architecture

Luni Cloud là backend self-hosted, container hoá bằng Docker Compose, expose ra Internet qua Cloudflare Tunnel (free). App, Web và Robot đều đi qua **một** API duy nhất; PostgreSQL là single source of truth.

## System overview

```
                    ┌─────────────────────────┐
                    │   Cloudflare (free)     │
                    │  Tunnel → expose HTTPS  │
                    │  DNS    → lunirobot.io.vn│
                    └────────────┬────────────┘
                                 │ HTTPS + WSS
                       ┌─────────▼─────────┐
                       │      nginx        │  reverse proxy + WS upgrade
                       └───┬───────────┬───┘
                  /api,/ws │           │ /
                   ┌───────▼───────┐ ┌─▼──────────┐
                   │  api (FastAPI)│ │ web (stub) │
                   │  REST + WS    │ └────────────┘
                   └──┬────┬────┬──┘
              ┌───────┘    │    └────────┐
        ┌─────▼───┐  ┌─────▼───┐   ┌─────▼────┐
        │ postgres│  │  redis  │   │ ai (stub)│  STT/LLM/TTS gateway
        └─────────┘  └─────────┘   └──────────┘
                 │                │
            WSS  │                │  REST + FCM
        ┌────────▼──┐      ┌──────▼──────┐
        │ Luni Robot│      │ Flutter App │
        │  (ESP32)  │      │ (iOS/Android)│
        └───────────┘      └─────────────┘
```

## Services (docker-compose.yml)

| Service | Container | Port | Vai trò |
|---------|-----------|------|---------|
| `api` | luni-api | 8000 | FastAPI — REST API + WebSocket (device & app) |
| `db` | luni-db | 127.0.0.1:5432 | PostgreSQL 16 — single source of truth |
| `redis` | luni-redis | 127.0.0.1:6379 | Cache (weather/calendar/sync/state) + pub/sub |
| `nginx` | luni-nginx | 80 | Reverse proxy, WS upgrade, body size limit |
| `web` | luni-web | 3000 | Next.js admin dashboard (**hiện tại là stub `server.js`**) |
| `ai` | luni-ai | 8081 (internal) | AI gateway STT/LLM/TTS (**hiện tại là stub**) |
| `tunnel` | luni-tunnel | — | Cloudflare Tunnel → expose nginx ra `lunirobot.io.vn` |

Dev mode (`docker-compose.dev.yml`): api/ai hot-reload, ai expose 8081 ra host, tunnel tắt → truy cập qua `http://localhost`.

## Communication channels

| Kênh | Protocol | Endpoint | Auth |
|------|----------|----------|------|
| App/Web → API | HTTPS REST | `/api/v1/*` | JWT Bearer |
| Robot ↔ API | WSS (persistent, 24h) | `/ws/device` | device_token + MAC |
| App ↔ API | WSS (foreground) | `/ws/app/{device_id}?token=<jwt>` | JWT query |
| App ← Cloud | FCM | — | Firebase (background alerts) |

Chi tiết: [modules/websocket.md](modules/websocket.md), [modules/auth.md](modules/auth.md).

## Backend layout (`server/app/`)

```
main.py            App factory, lifespan, /api/v1/health, mount WS routes
config.py          Settings (pydantic-settings, đọc từ .env)
api/
  deps.py          DI: get_db, get_current_user, require_admin
  v1/router.py     Aggregator → auth, devices, data, interactions, admin/users, logs
  v1/{auth,devices,data,interactions,users,logs}.py
  ws/device.py     WebSocket /ws/device (device_token auth)
  ws/app_client.py WebSocket /ws/app/{id} (JWT auth)
core/
  security.py      JWT, bcrypt, generate_device_token, generate_admin_secret
  exceptions.py    Error envelope + handlers
  logging.py       structlog setup
db/
  database.py      Async engine/session (asyncpg)
  models.py        SQLAlchemy ORM (xem modules/database.md)
  migrations/      Alembic
services/          auth, device, ws_manager, weather, calendar_service,
                   sync_data, ai, interaction, log_service, log_db
tasks/             scheduler, weather_sync, calendar_sync, log_cleanup
schemas/           Pydantic models (auth, device, user, data, interaction, log, ws_protocol)
```

## Implementation status

| Khu vực | Trạng thái |
|---------|-----------|
| Auth (register/login/refresh/logout/me), JWT + refresh token | ✅ |
| Device CRUD, register (device_token + admin_secret), status, command | ✅ |
| WebSocket device + app, ConnectionManager, heartbeat, sync push | ✅ |
| Data: weather (OpenWeather + Redis), calendar (lunar VN), sync_data | ✅ |
| Interactions: text → AI gateway → lưu DB | ✅ (AI là stub) |
| Logging: structlog, device/server log ingest, admin query, runtime level | ✅ |
| Background tasks: weather_sync, calendar_sync, log_cleanup | ✅ |
| AI gateway (`ai/server.py`): chat/stt/tts | ⏳ stub — chưa nối STT/TTS thật |
| Web dashboard (Next.js) | ⏳ stub (`web/server.js`) — chưa build UI |
| OTA firmware (R2 upload, /ota/check, rollout) | ⏳ planned |
| Usage statistics, device sharing, rate limiting | ⏳ planned |

> Endpoint thực tế đang chạy: xem [guides/API.md](guides/API.md). Các tính năng "planned" chưa có route.

## Tech stack

FastAPI (Python 3.12) · SQLAlchemy 2 async + asyncpg · PostgreSQL 16 · Redis 7 · structlog · APScheduler · nginx · Cloudflare Tunnel + R2 (planned cho OTA).
