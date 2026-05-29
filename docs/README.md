# Luni Cloud — Documentation

Backend (FastAPI) + Web admin + AI gateway cho hệ thống Luni Robot.
Tài liệu chia theo **module** (kiến trúc + từng thành phần) và **guides** (vận hành).

## Architecture & Modules

| Doc | Nội dung |
|-----|----------|
| [architecture.md](architecture.md) | Tổng quan hệ thống, services, data flow, tech stack, trạng thái triển khai |
| [modules/auth.md](modules/auth.md) | Auth user (JWT) + auth device (device_token) + admin_secret (BLE Level 2) |
| [modules/websocket.md](modules/websocket.md) | WS `/ws/device` + `/ws/app`, handshake, heartbeat, ConnectionManager, message types |
| [modules/database.md](modules/database.md) | PostgreSQL schema (models đã triển khai) |
| [modules/data-pipeline.md](modules/data-pipeline.md) | sync_data, weather, calendar, Redis cache, AI gateway, background tasks |
| [modules/logging.md](modules/logging.md) | structlog, log levels, device log ingestion, runtime level change |

## Guides

| Guide | Nội dung |
|-------|----------|
| [guides/SETUP.md](guides/SETUP.md) | Cài đặt & chạy local (Docker Compose), migration, verify |
| [guides/DEPLOYMENT.md](guides/DEPLOYMENT.md) | Cloudflare Tunnel, domain, troubleshooting (incl. nginx/path issues) |
| [guides/TESTING.md](guides/TESTING.md) | Test từng feature qua curl/websocat |
| [guides/API.md](guides/API.md) | Tham chiếu đầy đủ REST + WebSocket endpoints |

## Related repos

| Repo | Mô tả |
|------|--------|
| [Luni_Robot](https://github.com/trungnguyen278/Luni_Robot) | Firmware ESP32-S3 + ESP32-C5 |
| [Luni_App](https://github.com/trungnguyen278/Luni_App) | Flutter app (BLE pairing, device control) |
