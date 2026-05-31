# Luni Cloud

Backend server + Web admin dashboard cho hệ thống Luni Robot.

## Architecture

```
luni-cloud/
├── docker-compose.yml          # 7 services: api, db, redis, nginx, web, ai, tunnel
├── nginx/                      # Reverse proxy config
├── server/                     # FastAPI backend (Python)
├── ai/                         # AI gateway (STT / Chat / TTS)
└── web/                        # Web admin dashboard (placeholder — xem docs/guides/WEB_DASHBOARD.md)
```

**Stack:** FastAPI + PostgreSQL 16 + Redis 7 + Nginx + Cloudflare Tunnel.
Tích hợp: boto3 (Cloudflare R2 — OTA firmware) · firebase-admin (FCM push).

## Services

| Service | Port | Mô tả |
|---------|------|--------|
| `api` | 8000 | FastAPI — REST API + WebSocket (device & app) |
| `db` | 5432 | PostgreSQL 16 — single source of truth |
| `redis` | 6379 | Cache (weather, session) + pub/sub |
| `nginx` | 80 | Reverse proxy, WS upgrade, static files |
| `web` | 3000 | Web admin dashboard (hiện là placeholder — spec ở `docs/guides/WEB_DASHBOARD.md`) |
| `ai` | 8081 | AI gateway nội bộ — `/chat`, `/stt`, `/tts` (chỉ server gọi) |
| `tunnel` | — | Cloudflare Tunnel — expose HTTPS + WSS |

## Quick Start

```bash
cp .env.example .env          # rồi sửa SECRET_KEY, DB_PASSWORD, DOMAIN, CF_TUNNEL_TOKEN
docker compose up -d
docker compose exec api alembic -c /app/alembic.ini upgrade head   # gồm 003_push_tokens
curl http://localhost/api/v1/health   # {"status":"ok",...}
```

Tạo admin đầu tiên: đăng ký 1 user (`POST /api/v1/auth/register`) rồi
`UPDATE users SET role='admin' WHERE email='…';`.

Dev mode (hot-reload, không cần tunnel): `docker compose -f docker-compose.yml -f docker-compose.dev.yml up`.

> ⚠️ **Vận hành:** `nginx` mount `./nginx/nginx.conf` theo bind-mount. **Di
> chuyển/đổi tên thư mục repo sẽ làm hỏng mount → chết nginx → đứt Cloudflare
> tunnel & lunirobot.io.vn.** Giữ nguyên đường dẫn repo khi deploy.

## API & realtime (tóm tắt)

REST `/api/v1`: **auth** (gồm `forgot-password`), **devices** (CRUD, command,
share, ble-token), **interactions** (chat AI), **data** (weather/calendar/sync),
**OTA/firmware** (`/ota/check`, `/devices/{id}/ota`, `/admin/firmware`,
`/firmware/{id}/download`), **stats** (`/devices/{id}/stats`), **push**
(`/push/register`), **logs** + **admin users**.

WebSocket: `wss://<domain>/ws/device` (robot: `device_token`+`mac`) và
`wss://<domain>/ws/app/{device_id}?token=<jwt>` (app).

Chi tiết: [docs/guides/API.md](docs/guides/API.md).

## Documentation

📖 **[docs/](docs/README.md)** — index đầy đủ. Một số điểm chính:

- [Architecture](docs/architecture.md) — services, data flow, trạng thái triển khai
- Modules: [auth](docs/modules/auth.md) · [websocket](docs/modules/websocket.md) · [database](docs/modules/database.md) · [data-pipeline](docs/modules/data-pipeline.md) · [logging](docs/modules/logging.md)
- Guides: [setup](docs/guides/SETUP.md) · [deployment](docs/guides/DEPLOYMENT.md) · [testing](docs/guides/TESTING.md) · [API](docs/guides/API.md) · [web dashboard spec](docs/guides/WEB_DASHBOARD.md)

## Related Repos

| Repo | Mô tả |
|------|--------|
| [Luni_Robot](https://github.com/trungnguyen278/Luni_Robot) | Firmware ESP32-S3 + ESP32-C5 (display, audio, network) |
| [Luni_App](https://github.com/trungnguyen278/Luni_App) | Flutter app (iOS/Android) — BLE pairing, device control |
