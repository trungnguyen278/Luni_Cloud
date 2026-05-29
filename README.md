# Luni Cloud

Backend server + Web admin dashboard cho hệ thống Luni Robot.

## Architecture

```
luni-cloud/
├── docker-compose.yml          # 6 services: api, db, redis, nginx, web, tunnel
├── nginx/                      # Reverse proxy config
├── server/                     # FastAPI backend (Python 3.12)
└── web/                        # Next.js 14 frontend (React)
```

**Stack:** FastAPI + PostgreSQL 16 + Redis 7 + Nginx + Next.js 14 + Cloudflare Tunnel

## Services

| Service | Port | Mô tả |
|---------|------|--------|
| `api` | 8000 | FastAPI — REST API + WebSocket (device & app) |
| `db` | 5432 | PostgreSQL 16 — single source of truth |
| `redis` | 6379 | Cache (weather, session) + pub/sub |
| `nginx` | 80 | Reverse proxy, WS upgrade, static files |
| `web` | 3000 | Next.js — web admin dashboard |
| `tunnel` | — | Cloudflare Tunnel — expose HTTPS + WSS |

## Quick Start

```bash
cp .env.example .env          # rồi sửa SECRET_KEY, DB_PASSWORD, DOMAIN, CF_TUNNEL_TOKEN
docker compose up -d
docker compose exec api alembic -c /app/alembic.ini upgrade head
curl http://localhost/api/v1/health   # {"status":"ok",...}
```

Dev mode (hot-reload, không cần tunnel): `docker compose -f docker-compose.yml -f docker-compose.dev.yml up`.

## Documentation

📖 **[docs/](docs/README.md)** — index đầy đủ. Một số điểm chính:

- [Architecture](docs/architecture.md) — services, data flow, trạng thái triển khai
- Modules: [auth](docs/modules/auth.md) · [websocket](docs/modules/websocket.md) · [database](docs/modules/database.md) · [data-pipeline](docs/modules/data-pipeline.md) · [logging](docs/modules/logging.md)
- Guides: [setup](docs/guides/SETUP.md) · [deployment](docs/guides/DEPLOYMENT.md) · [testing](docs/guides/TESTING.md) · [API](docs/guides/API.md)

## Related Repos

| Repo | Mô tả |
|------|--------|
| [Luni_Robot](https://github.com/trungnguyen278/Luni_Robot) | Firmware ESP32-S3 + ESP32-C5 (display, audio, network) |
| [Luni_App](https://github.com/trungnguyen278/Luni_App) | Flutter mobile app (iOS/Android) — BLE pairing, device control |
