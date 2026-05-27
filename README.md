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
cp .env.example .env
# Edit .env with your secrets
docker compose up -d
```

## Documentation

- [System Architecture](docs/plan/SYSTEM_ARCHITECTURE.md) — tổng quan toàn hệ thống
- [Server & Web Plan](docs/plan/PLAN_SERVER.md) — chi tiết backend + frontend

## Related Repos

| Repo | Mô tả |
|------|--------|
| [Luni_Robot](https://github.com/trungnguyen278/Luni_Robot) | Firmware ESP32-S3 + ESP32-C5 (display, audio, network) |
| [Luni_App](https://github.com/trungnguyen278/Luni_App) | Flutter mobile app (iOS/Android) — BLE pairing, device control |
