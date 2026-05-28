# Luni Server & Web — Detailed Plan

> Backend: FastAPI (Python 3.12) | Frontend: Next.js 14 (React)
> DB: PostgreSQL | Cache: Redis
> Deploy: Docker Compose | Expose: Cloudflare Tunnel (free)

**Status:**
- Phase 1 (Foundation): ✅ Complete — Docker, Auth, Devices, WebSocket, Logging, DB
- Phase 2 (Core Features): ✅ Complete — sync_data, AI container, Interactions, Structured logging
- Phase 3 (Management & Interaction): Planned
- Phase 4 (Polish): Planned

**Guides:** [Setup](guides/SETUP.md) | [Testing](guides/TESTING.md) | [API Reference](guides/API.md)

---

## 1. Project Structure

```
luni-cloud/                             # Root — docker-compose ở đây
├── docker-compose.yml                  # All services
├── docker-compose.dev.yml              # Dev overrides (hot reload, debug)
├── .env.example                        # Environment template
├── nginx/
│   └── nginx.conf                      # Reverse proxy config
│
├── server/                             # FastAPI backend
│   ├── app/
│   │   ├── main.py                     # App factory, lifespan, startup
│   │   ├── config.py                   # Settings from env (pydantic-settings)
│   │   │
│   │   ├── api/
│   │   │   ├── deps.py                 # Dependency injection (db, auth, etc.)
│   │   │   ├── v1/
│   │   │   │   ├── router.py           # v1 router aggregator
│   │   │   │   ├── auth.py             # Login, register, refresh, logout
│   │   │   │   ├── users.py            # User profile, admin user management
│   │   │   │   ├── devices.py          # CRUD devices, pairing, sharing
│   │   │   │   ├── commands.py         # Send commands to device
│   │   │   │   ├── ota.py              # Firmware management, check, download
│   │   │   │   ├── data.py             # Weather, time, calendar sync
│   │   │   │   ├── logs.py             # Device + server log query
│   │   │   │   ├── stats.py            # Usage statistics
│   │   │   │   └── interactions.py     # Chat history, send message
│   │   │   └── ws/
│   │   │       ├── device.py           # WebSocket endpoint for devices
│   │   │       └── app_client.py       # WebSocket endpoint for app/web
│   │   │
│   │   ├── core/
│   │   │   ├── security.py             # JWT, password hashing, device token
│   │   │   ├── exceptions.py           # Custom exceptions + handlers
│   │   │   └── logging.py              # structlog setup, log levels
│   │   │
│   │   ├── db/
│   │   │   ├── database.py             # AsyncSession factory (asyncpg)
│   │   │   ├── models.py               # SQLAlchemy ORM models
│   │   │   └── migrations/             # Alembic migrations
│   │   │       ├── env.py
│   │   │       └── versions/
│   │   │
│   │   ├── services/
│   │   │   ├── auth.py                 # Auth business logic
│   │   │   ├── device.py               # Device business logic
│   │   │   ├── ws_manager.py           # WebSocket connection manager
│   │   │   ├── ota.py                  # OTA + R2 upload/download
│   │   │   ├── weather.py              # OpenWeather + Redis cache
│   │   │   ├── calendar.py             # Calendar + lunar
│   │   │   ├── sync_data.py            # Aggregate sync payload
│   │   │   ├── ai.py                   # STT/TTS/LLM proxy
│   │   │   ├── interaction.py          # User↔Robot interaction logic
│   │   │   ├── log_service.py          # Log ingestion, query, cleanup
│   │   │   └── stats.py                # Usage aggregation
│   │   │
│   │   ├── tasks/
│   │   │   ├── scheduler.py            # APScheduler setup
│   │   │   ├── weather_sync.py         # Periodic weather fetch
│   │   │   ├── log_cleanup.py          # Log rotation / partition drop
│   │   │   └── stats_aggregate.py      # Daily stats rollup
│   │   │
│   │   ├── schemas/
│   │   │   ├── auth.py                 # Pydantic request/response models
│   │   │   ├── device.py
│   │   │   ├── user.py
│   │   │   ├── log.py
│   │   │   ├── ota.py
│   │   │   ├── stats.py
│   │   │   ├── interaction.py
│   │   │   └── ws_protocol.py          # WebSocket message schemas
│   │   │
│   │   └── utils/
│   │       ├── r2.py                   # Cloudflare R2 client (boto3 S3-compatible)
│   │       └── validators.py           # Shared validators
│   │
│   ├── tests/
│   │   ├── conftest.py                 # Fixtures (test DB, client, auth)
│   │   ├── test_auth.py
│   │   ├── test_devices.py
│   │   ├── test_ws.py
│   │   └── test_ota.py
│   │
│   ├── alembic.ini
│   ├── requirements.txt
│   ├── Dockerfile
│   └── pyproject.toml
│
└── web/                                # Next.js frontend
    ├── src/
    │   ├── app/
    │   │   ├── layout.tsx
    │   │   ├── page.tsx
    │   │   ├── (auth)/                 # Login, register
    │   │   ├── (dashboard)/            # User pages (devices, stats, logs, settings)
    │   │   └── (admin)/               # Admin pages (users, firmware, server logs, system)
    │   ├── components/                 # UI components (shadcn/ui, charts, device, chat, logs)
    │   ├── lib/                        # api.ts, auth.ts, ws.ts, utils.ts
    │   └── types/                      # TypeScript types
    ├── Dockerfile
    ├── next.config.js
    ├── tailwind.config.ts
    └── package.json
```

> Chi tiết web frontend structure: xem §14.2

## 2. Docker Compose

```yaml
# docker-compose.yml
services:
  # === FastAPI Backend ===
  api:
    build: ./server
    container_name: luni-api
    restart: unless-stopped
    env_file: .env
    environment:
      - DATABASE_URL=postgresql+asyncpg://luni:${DB_PASSWORD}@db:5432/luni
      - REDIS_URL=redis://redis:6379/0
      - LOG_LEVEL=${LOG_LEVEL:-info}
    ports:
      - "8000:8000"
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_healthy
    volumes:
      - firmware_storage:/app/storage/firmware  # local firmware fallback
    networks:
      - luni-net

  # === PostgreSQL ===
  db:
    image: postgres:16-alpine
    container_name: luni-db
    restart: unless-stopped
    environment:
      POSTGRES_DB: luni
      POSTGRES_USER: luni
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    ports:
      - "127.0.0.1:5432:5432"           # local access only
    volumes:
      - pg_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U luni"]
      interval: 5s
      timeout: 5s
      retries: 5
    networks:
      - luni-net

  # === Redis ===
  redis:
    image: redis:7-alpine
    container_name: luni-redis
    restart: unless-stopped
    ports:
      - "127.0.0.1:6379:6379"
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 5s
      retries: 5
    networks:
      - luni-net

  # === Nginx Reverse Proxy ===
  nginx:
    image: nginx:alpine
    container_name: luni-nginx
    restart: unless-stopped
    ports:
      - "80:80"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
    depends_on:
      - api
      - web
    networks:
      - luni-net

  # === Next.js Frontend ===
  web:
    build: ./web
    container_name: luni-web
    restart: unless-stopped
    environment:
      - NEXT_PUBLIC_API_URL=/api
      - NEXT_PUBLIC_WS_URL=wss://${DOMAIN}/ws
    ports:
      - "3000:3000"
    networks:
      - luni-net

  # === Cloudflare Tunnel ===
  tunnel:
    image: cloudflare/cloudflared:latest
    container_name: luni-tunnel
    restart: unless-stopped
    command: tunnel run
    environment:
      - TUNNEL_TOKEN=${CF_TUNNEL_TOKEN}
    depends_on:
      - nginx
    networks:
      - luni-net

volumes:
  pg_data:
  redis_data:
  firmware_storage:

networks:
  luni-net:
    driver: bridge
```

### Nginx Config

```nginx
# nginx/nginx.conf
events { worker_connections 1024; }

http {
    upstream api {
        server api:8000;
    }
    upstream web {
        server web:3000;
    }

    server {
        listen 80;

        # API routes
        location /api/ {
            proxy_pass http://api;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        }

        # WebSocket — device connections
        location /ws/device {
            proxy_pass http://api;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
            proxy_set_header Host $host;
            proxy_read_timeout 86400;       # 24h keep-alive
            proxy_send_timeout 86400;
        }

        # WebSocket — app/web client connections
        location /ws/app/ {
            proxy_pass http://api;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
            proxy_set_header Host $host;
            proxy_read_timeout 3600;
        }

        # Frontend (Next.js)
        location / {
            proxy_pass http://web;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
        }
    }
}
```

## 3. API Endpoints

### 3.1 Authentication

```
POST   /api/v1/auth/register          # Đăng ký (email + password + name)
POST   /api/v1/auth/login             # → { access_token, refresh_token, user }
POST   /api/v1/auth/refresh           # → { access_token }
POST   /api/v1/auth/logout            # Revoke refresh token
GET    /api/v1/auth/me                # Current user info
PATCH  /api/v1/auth/me                # Update profile (name, avatar)
POST   /api/v1/auth/change-password   # Change password
```

### 3.2 Device Management

```
GET    /api/v1/devices                # List user's devices (owned + shared)
POST   /api/v1/devices                # Register device (pairing)
                                        # Body: { mac } — MAC (BLE) = device identity
                                        # → returns { device_id, admin_secret }
                                        # admin_secret = HMAC-SHA256(mac, SERVER_SECRET_KEY)
                                        # Re-register (same MAC, same owner) → trả admin_secret mới
                                        # Re-register (same MAC, khác owner) → 409 CONFLICT
GET    /api/v1/devices/:id            # Device detail + current state
PATCH  /api/v1/devices/:id            # Update config (name, tz, location, log_level)
DELETE /api/v1/devices/:id            # Unregister device

GET    /api/v1/devices/:id/status     # Realtime status (online, state, battery)
POST   /api/v1/devices/:id/command    # Send command → WS forward
POST   /api/v1/devices/:id/ble-token     # Admin: generate HMAC token for BLE Level 2
                                        # admin_secret = HMAC-SHA256(mac, SERVER_SECRET_KEY)
                                        # ble_token = HMAC-SHA256(mac || timestamp, admin_secret)

POST   /api/v1/devices/:id/share      # Share with user (email + permission)
GET    /api/v1/devices/:id/shares     # List shares
DELETE /api/v1/devices/:id/shares/:user_id
```

### 3.3 Interactions (App/Web ↔ Robot)

```
POST   /api/v1/devices/:id/interact   # Send text → LLM → TTS → device
GET    /api/v1/devices/:id/interactions  # Chat history (paginated)
DELETE /api/v1/devices/:id/interactions  # Clear history
```

### 3.4 OTA Firmware

```
GET    /api/v1/ota/check               # Device checks for update
GET    /api/v1/ota/download/:id        # Download firmware binary

# Admin only
GET    /api/v1/admin/firmware          # List all firmware
POST   /api/v1/admin/firmware          # Upload new → R2 + DB
PATCH  /api/v1/admin/firmware/:id      # Update metadata
DELETE /api/v1/admin/firmware/:id      # Remove firmware
```

### 3.5 Data Sync

```
GET    /api/v1/data/weather?lat=&lon=  # Weather (cached in Redis)
GET    /api/v1/data/calendar?date=     # Calendar + lunar
GET    /api/v1/data/sync/:device_id    # Full sync bundle
```

### 3.6 Logs

```
GET    /api/v1/devices/:id/logs        # Device logs (filter: level, tag, from, to)
GET    /api/v1/logs                    # All my devices' logs

# Admin only
GET    /api/v1/admin/logs/devices      # All device logs (any device)
GET    /api/v1/admin/logs/server       # Server logs (filter: level, module)
POST   /api/v1/admin/logs/config       # Set server log level at runtime
DELETE /api/v1/admin/logs/cleanup      # Trigger manual log cleanup
```

### 3.7 Statistics

```
GET    /api/v1/devices/:id/stats       # Device stats (period: day|week|month)
GET    /api/v1/stats/overview          # All devices overview

# Admin only
GET    /api/v1/admin/stats/system      # System-wide: users, devices, errors
GET    /api/v1/admin/stats/firmware    # Firmware distribution
```

### 3.8 Admin — User Management

```
GET    /api/v1/admin/users             # List all users
GET    /api/v1/admin/users/:id         # User detail + devices
PATCH  /api/v1/admin/users/:id         # Update role, active status
DELETE /api/v1/admin/users/:id         # Deactivate user
```

## 4. WebSocket Session Manager

```python
# app/services/ws_manager.py

class ConnectionManager:
    """Manages all WebSocket connections — devices and app clients."""

    def __init__(self):
        # device_id → WebSocket
        self.device_connections: dict[str, WebSocket] = {}
        # device_id → set of (user_id, WebSocket) app viewers
        self.app_connections: dict[str, set[tuple[str, WebSocket]]] = {}
        # Redis pub/sub for multi-worker scaling (future)
        self.redis: Redis | None = None

    # === Device connections ===

    async def connect_device(self, device_id: str, ws: WebSocket):
        """Device authenticates and joins session."""
        self.device_connections[device_id] = ws
        await self.mark_online(device_id)
        await self.push_sync_data(device_id)
        await self.notify_app_clients(device_id, {"type": "device_online"})

    async def disconnect_device(self, device_id: str):
        self.device_connections.pop(device_id, None)
        await self.mark_offline(device_id)
        await self.notify_app_clients(device_id, {"type": "device_offline"})

    async def send_to_device(self, device_id: str, message: dict) -> bool:
        """Send JSON command to device. Returns False if offline."""
        ws = self.device_connections.get(device_id)
        if ws:
            await ws.send_json(message)
            return True
        return False

    async def send_binary_to_device(self, device_id: str, data: bytes) -> bool:
        """Send binary (audio) to device."""
        ws = self.device_connections.get(device_id)
        if ws:
            await ws.send_bytes(data)
            return True
        return False

    # === App client connections ===

    async def connect_app(self, device_id: str, user_id: str, ws: WebSocket):
        """App/web client subscribes to a device's events."""
        if device_id not in self.app_connections:
            self.app_connections[device_id] = set()
        self.app_connections[device_id].add((user_id, ws))
        # Send current state
        state = await self.get_device_state(device_id)
        await ws.send_json({"type": "current_state", "payload": state})

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

    # === Message routing ===

    async def authenticate_device(self, ws: WebSocket) -> str | None:
        """Wait for auth message, verify MAC identity, return device_id or None.
        MAC (BLE) is the permanent device identity — survives NVS reset.
        Timeout: 5s after WS open."""
        try:
            data = await asyncio.wait_for(ws.receive_text(), timeout=5.0)
            msg = json.loads(data)
            if msg.get("type") != "auth":
                return None
            payload = msg.get("payload", {})
            mac = payload.get("mac")
            # Lookup device by MAC in DB
            device = await self.get_device_by_mac(mac)
            if device:
                await ws.send_json({
                    "type": "auth_result",
                    "id": msg.get("id", str(uuid4())),
                    "ts": int(time.time() * 1000),
                    "payload": {"status": "ok"}
                })
                return device.id
            else:
                await ws.send_json({
                    "type": "auth_result",
                    "id": msg.get("id", str(uuid4())),
                    "ts": int(time.time() * 1000),
                    "payload": {"status": "fail", "reason": "unknown_device"}
                })
                await asyncio.sleep(1)
                await ws.close(code=4001, reason="auth_failed")
                return None
        except asyncio.TimeoutError:
            await ws.close(code=4002, reason="auth_timeout")
            return None

    async def handle_device_message(self, device_id: str, data: str | bytes):
        """Route incoming device message (after auth)."""
        if isinstance(data, str):
            msg = json.loads(data)
            msg_type = msg.get("type")

            if msg_type == "device_info":
                # Also detects fw_version downgrade (OTA rollback)
                # → create ota_history entry with status "rolled_back"
                await self.handle_device_info(device_id, msg)
            elif msg_type == "heartbeat":
                await self.handle_heartbeat(device_id, msg)
            elif msg_type == "state_update":
                await self.handle_state_update(device_id, msg)
                await self.notify_app_clients(device_id, msg)
            elif msg_type == "log":
                await self.handle_log(device_id, msg)
            elif msg_type == "error":
                await self.handle_error(device_id, msg)
                await self.notify_app_clients(device_id, msg)
            elif msg_type == "ota_progress":
                await self.notify_app_clients(device_id, msg)
            elif msg_type == "battery":
                await self.handle_battery(device_id, msg)
                await self.notify_app_clients(device_id, msg)
        else:
            # Binary = audio uplink
            await self.handle_audio_uplink(device_id, data)
```

## 5. Server Logging System

### Config

```python
# app/core/logging.py
import structlog
import logging

def setup_logging(log_level: str = "INFO"):
    """Configure structured logging for the entire server."""

    structlog.configure(
        processors=[
            structlog.contextvars.merge_contextvars,
            structlog.processors.add_log_level,
            structlog.processors.TimeStamper(fmt="iso"),
            structlog.processors.StackInfoRenderer(),
            structlog.processors.format_exc_info,
            structlog.processors.JSONRenderer(),     # JSON output
        ],
        wrapper_class=structlog.make_filtering_bound_logger(
            getattr(logging, log_level.upper())
        ),
        logger_factory=structlog.PrintLoggerFactory(),
    )

# Usage everywhere:
logger = structlog.get_logger()

# In request middleware — bind request context
@app.middleware("http")
async def log_requests(request, call_next):
    request_id = str(uuid4())
    structlog.contextvars.clear_contextvars()
    structlog.contextvars.bind_contextvars(
        request_id=request_id,
        method=request.method,
        path=request.url.path,
    )
    logger.info("request.start")
    response = await call_next(request)
    logger.info("request.end", status=response.status_code)
    return response
```

### Log to DB (optional, for admin UI query)

```python
# app/services/log_service.py

class LogService:
    async def ingest_device_log(self, device_id: str, log: DeviceLogSchema):
        """Save device log to DB if meets threshold."""
        device = await self.get_device(device_id)
        device_log_level = device.config.get("log_level", "info")

        if log.level_num >= LEVEL_MAP[device_log_level]:
            await self.db.execute(
                insert(DeviceLog).values(
                    device_id=device_id,
                    source="device",
                    level=log.level,
                    tag=log.tag,
                    message=log.message,
                    metadata=log.metadata,
                )
            )

    async def query_logs(
        self,
        device_id: str | None = None,
        level: str | None = None,
        tag: str | None = None,
        from_dt: datetime | None = None,
        to_dt: datetime | None = None,
        limit: int = 50,
        offset: int = 0,
    ) -> list[DeviceLog]:
        """Query logs with filters, pagination."""
        query = select(DeviceLog)
        if device_id:
            query = query.where(DeviceLog.device_id == device_id)
        if level:
            query = query.where(DeviceLog.level == level)
        if tag:
            query = query.where(DeviceLog.tag == tag)
        if from_dt:
            query = query.where(DeviceLog.created_at >= from_dt)
        if to_dt:
            query = query.where(DeviceLog.created_at <= to_dt)
        query = query.order_by(DeviceLog.created_at.desc())
        query = query.limit(limit).offset(offset)
        return (await self.db.execute(query)).scalars().all()

    async def set_device_log_level(self, device_id: str, level: str):
        """Change device log level (also pushes config_update via WS)."""
        await self.db.execute(
            update(Device)
            .where(Device.id == device_id)
            .values(config=func.jsonb_set(
                Device.config, '{log_level}', f'"{level}"'
            ))
        )
        await ws_manager.send_to_device(device_id, {
            "type": "config_update",
            "id": str(uuid4()),
            "ts": int(time.time() * 1000),
            "payload": {
                "key": "log_level",
                "value": level,
            }
        })
```

### Runtime log level change (admin endpoint)

```python
# app/api/v1/logs.py

@router.post("/admin/logs/config")
async def set_server_log_level(
    body: LogLevelSchema,         # { "level": "debug" }
    user: User = Depends(require_admin),
):
    """Change server log level at runtime (no restart needed)."""
    new_level = getattr(logging, body.level.upper())
    structlog.configure(
        wrapper_class=structlog.make_filtering_bound_logger(new_level)
    )
    logger.info("server.log_level_changed", new_level=body.level, by=user.email)
    return {"status": "ok", "level": body.level}
```

## 6. AI / Audio Pipeline

```
┌──────────┐      ┌──────────────┐      ┌──────────────┐
│  Device   │      │  FastAPI      │      │  External AI │
│  (mic)    │      │  WS Handler   │      │  APIs        │
│           │      │               │      │              │
│ Opus ─────┼─────▶│ Buffer opus   │      │              │
│ binary    │      │ frames        │      │              │
│ frames    │      │    │          │      │              │
│           │      │    ▼          │      │              │
│           │      │ Decode opus   │      │              │
│           │      │ → PCM WAV     │─────▶│ Whisper STT  │
│           │      │               │      │ → text       │
│           │      │               │      │              │
│           │      │               │      │ Claude / GPT │
│           │      │               │◀─────│ → response   │
│           │      │               │      │              │
│           │      │               │─────▶│ TTS API      │
│           │      │ Encode opus   │◀─────│ → audio      │
│           │      │    │          │      │              │
│           │◀─────┼────┘          │      │              │
│ Opus      │      │ binary        │      │              │
│ downlink  │      │ frames        │      │              │
└───────────┘      └──────────────┘      └──────────────┘

Đồng thời:
  • Save interaction to DB (interactions table)
  • Notify app clients qua WS (response text + emotion)
  • Update device emotion via WS command
```

## 7. Background Tasks (APScheduler)

```python
# app/tasks/scheduler.py

scheduler = AsyncIOScheduler()

# Weather fetch — mỗi 15 phút
@scheduler.scheduled_job('interval', minutes=15, id='weather_sync')
async def weather_sync():
    """Fetch weather for all online devices, cache in Redis, push via WS."""
    ...

# Calendar update — mỗi ngày 00:00
@scheduler.scheduled_job('cron', hour=0, minute=0, id='calendar_sync')
async def calendar_sync():
    """Update calendar + lunar data."""
    ...

# Stats aggregation — mỗi ngày 01:00
@scheduler.scheduled_job('cron', hour=1, minute=0, id='stats_aggregate')
async def stats_aggregate():
    """Aggregate daily usage stats from logs → usage_stats table."""
    ...

# Log cleanup — mỗi tuần CN 03:00
@scheduler.scheduled_job('cron', day_of_week='sun', hour=3, id='log_cleanup')
async def log_cleanup():
    """Drop old log partitions (> 90 days), vacuum."""
    ...

# Heartbeat check — mỗi 60s
@scheduler.scheduled_job('interval', seconds=60, id='heartbeat_check')
async def heartbeat_check():
    """Mark devices as offline if no heartbeat for 90s."""
    ...

# Token cleanup — mỗi ngày
@scheduler.scheduled_job('cron', hour=2, minute=0, id='token_cleanup')
async def token_cleanup():
    """Remove expired refresh tokens."""
    ...
```

## 8. Redis Cache Structure

```
weather:{lat:.2f}:{lon:.2f}   → JSON weather data          TTL: 20min
calendar:{date}               → JSON calendar + lunar       TTL: 24h
sync:{device_id}              → JSON full sync bundle       TTL: 20min
device:state:{device_id}      → JSON last known state       TTL: none (updated on change)
rate:{ip}:{endpoint}          → request count               TTL: 60s
```

## 9. Environment Variables

```bash
# .env.example

# === Server ===
DOMAIN=luni.example.com
SECRET_KEY=your-secret-key-change-this
LOG_LEVEL=info                          # debug | info | warn | error
ENVIRONMENT=production                  # development | production

# === Database ===
DB_PASSWORD=your-db-password

# === Redis ===
REDIS_URL=redis://redis:6379/0

# === Cloudflare ===
CF_TUNNEL_TOKEN=your-tunnel-token
CF_R2_ACCOUNT_ID=your-account-id
CF_R2_ACCESS_KEY=your-r2-access-key
CF_R2_SECRET_KEY=your-r2-secret-key
CF_R2_BUCKET=luni-firmware

# === AI APIs ===
OPENAI_API_KEY=your-openai-key         # Whisper STT + TTS
ANTHROPIC_API_KEY=your-anthropic-key   # Claude LLM (optional)

# === External Data ===
OPENWEATHER_API_KEY=your-weather-key

# === JWT ===
JWT_ACCESS_EXPIRE_MINUTES=60
JWT_REFRESH_EXPIRE_DAYS=30
```

## 10. Dockerfile

```dockerfile
FROM python:3.12-slim

WORKDIR /app

# System deps for asyncpg, opus
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq-dev libopus-dev ffmpeg \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app/ ./app/
COPY alembic.ini .

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]
```

## 11. Key Dependencies

```
# requirements.txt
fastapi>=0.111
uvicorn[standard]>=0.30
pydantic>=2.7
pydantic-settings>=2.3

# Database
sqlalchemy[asyncio]>=2.0
asyncpg>=0.29
alembic>=1.13

# Redis
redis[hiredis]>=5.0

# Auth
python-jose[cryptography]>=3.3    # JWT
passlib[bcrypt]>=1.7              # Password hashing

# WebSocket
websockets>=12.0

# AI / Audio
openai>=1.30                     # Whisper STT + TTS
anthropic>=0.25                  # Claude LLM
opuslib>=3.0                     # Opus codec

# External data
httpx>=0.27                      # HTTP client for APIs
boto3>=1.34                      # R2 (S3-compatible)

# Background tasks
apscheduler>=3.10

# Logging
structlog>=24.1

# Utils
python-multipart>=0.0.9          # File upload
```

## 12. Cloudflare Tunnel Setup

```bash
# 1. Install cloudflared
# 2. Login
cloudflared tunnel login

# 3. Create tunnel
cloudflared tunnel create luni-cloud

# 4. Configure DNS
cloudflared tunnel route dns luni-cloud luni.example.com

# 5. Get tunnel token → put in .env CF_TUNNEL_TOKEN

# 6. docker-compose up -d
# Tunnel container auto-connects and exposes nginx:80 as HTTPS
```

**Cloudflare free tier usage:**
- Tunnel: Free, unlimited bandwidth
- R2: 10GB storage, 10M Class A, 10M Class B requests/month (free)
- DNS: Free
- DDoS protection: Free (included with tunnel)

## 13. Error Handling

```python
# Standard API error response
{
    "error": {
        "code": "DEVICE_OFFLINE",
        "message": "Device is not currently connected",
        "details": {"device_id": "AA:BB:CC:DD:EE:FF", "last_seen": "..."}
    }
}

# Error codes
AUTH_REQUIRED       = 401
AUTH_EXPIRED        = 401
FORBIDDEN           = 403
NOT_FOUND           = 404
DEVICE_OFFLINE      = 409
OTA_IN_PROGRESS     = 409
VALIDATION_ERROR    = 422
RATE_LIMITED        = 429
INTERNAL_ERROR      = 500
```

---

## 14. Web Frontend (Next.js)

### 14.1 Vai trò

```
Web dùng CHUNG API với Flutter App (xem PLAN_APP.md mục 1).

Web có RIÊNG:
  ✓ Admin dashboard (system health, all users, all devices)
  ✓ Server log viewer (FastAPI server logs)
  ✓ Firmware management (upload, deploy, rollout tracking)
  ✓ User management (roles, activate/deactivate)
  ✓ Change server log level at runtime
  ✓ Desktop-optimized UI (tables, multi-panel)

Web KHÔNG có:
  ✗ BLE pairing (browser BLE không đáng tin, dùng app)
  ✗ Push-to-talk audio
  ✗ Native push notifications (dùng browser notification nếu cần)
```

### 14.2 Project Structure

```
web/
├── src/
│   ├── app/
│   │   ├── layout.tsx                  # Root layout, providers
│   │   ├── page.tsx                    # Redirect → /dashboard or /login
│   │   │
│   │   ├── (auth)/
│   │   │   ├── login/page.tsx
│   │   │   └── register/page.tsx
│   │   │
│   │   ├── (dashboard)/               # Authenticated user layout
│   │   │   ├── layout.tsx              # Sidebar + Header
│   │   │   ├── page.tsx               # Overview dashboard
│   │   │   │
│   │   │   ├── devices/
│   │   │   │   ├── page.tsx           # Device list (table + card view)
│   │   │   │   └── [id]/
│   │   │   │       ├── page.tsx       # Device detail + control panel
│   │   │   │       ├── chat/page.tsx  # Interaction / chat with robot
│   │   │   │       ├── logs/page.tsx  # Device logs (filter by level)
│   │   │   │       ├── stats/page.tsx # Device statistics
│   │   │   │       └── settings/page.tsx
│   │   │   │
│   │   │   ├── stats/page.tsx         # All devices overview
│   │   │   ├── logs/page.tsx          # My devices logs (merged view)
│   │   │   └── settings/page.tsx      # User profile
│   │   │
│   │   └── (admin)/                   # Admin-only (role guard in layout)
│   │       ├── layout.tsx
│   │       ├── page.tsx               # Admin dashboard (system overview)
│   │       ├── users/
│   │       │   ├── page.tsx           # User list table
│   │       │   └── [id]/page.tsx      # User detail, change role
│   │       ├── firmware/
│   │       │   ├── page.tsx           # Firmware version list
│   │       │   └── upload/page.tsx    # Upload new firmware → R2
│   │       ├── logs/
│   │       │   ├── devices/page.tsx   # ALL device logs (any device)
│   │       │   └── server/page.tsx    # Server (FastAPI) logs
│   │       └── system/page.tsx        # System health, change log level
│   │
│   ├── components/
│   │   ├── ui/                        # shadcn/ui (Button, Dialog, Table, etc.)
│   │   ├── charts/
│   │   │   ├── InteractionChart.tsx
│   │   │   ├── UptimeChart.tsx
│   │   │   └── FirmwareDistribution.tsx
│   │   ├── device/
│   │   │   ├── DeviceCard.tsx
│   │   │   ├── DeviceTable.tsx
│   │   │   ├── StatusBadge.tsx
│   │   │   ├── CommandPanel.tsx
│   │   │   └── EmotionPicker.tsx
│   │   ├── chat/
│   │   │   ├── ChatPanel.tsx
│   │   │   ├── ChatBubble.tsx
│   │   │   └── ChatInput.tsx
│   │   ├── logs/
│   │   │   ├── LogTable.tsx
│   │   │   ├── LogFilter.tsx
│   │   │   └── LogLevelBadge.tsx
│   │   └── layout/
│   │       ├── Sidebar.tsx
│   │       ├── Header.tsx
│   │       ├── BreadcrumbNav.tsx
│   │       └── RoleGuard.tsx
│   │
│   ├── lib/
│   │   ├── api.ts                     # Fetch wrapper (JWT auto-attach + refresh)
│   │   ├── auth.ts                    # Token storage (localStorage/cookie)
│   │   ├── ws.ts                      # WebSocket hook (useDeviceWs)
│   │   └── utils.ts
│   │
│   └── types/
│       └── index.ts                   # TypeScript types (match API schemas)
│
├── public/
├── Dockerfile
├── next.config.js
├── tailwind.config.ts
├── package.json
└── tsconfig.json
```

### 14.3 Page Layouts

#### Dashboard (User Role)

```
┌─────────────────────────────────────────────────────────────────┐
│  Dashboard                                        [Username v] │
├─────────┬───────────────────────────────────────────────────────┤
│         │                                                       │
│ Home    │  My Devices                                           │
│ Devices │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐   │
│ Stats   │  │ Luni-Phong  │  │ Luni-Bep   │  │  + Pair via │   │
│ Logs    │  │ * Online    │  │ * Offline   │  │    App      │   │
│ Settings│  │ Bat 85%     │  │ Last: 2h    │  │             │   │
│         │  │ Happy       │  │             │  │ (scan QR or │   │
│ --------│  └─────────────┘  └─────────────┘  │  use app)   │   │
│ Admin   │                                     └─────────────┘   │
│ (if     │  Quick Stats (7 days)                                 │
│  admin) │  ┌────────────────────────────────────────────────┐   │
│         │  │ Interactions: 847  |  Audio: 3.2h  |  Err: 2  │   │
│         │  └────────────────────────────────────────────────┘   │
│         │                                                       │
│         │  Activity Chart                                       │
│         │  ┌────────────────────────────────────────────────┐   │
│         │  │  ▃▅▇▆▄▃▅▇▆▄▃▅  interactions / day             │   │
│         │  └────────────────────────────────────────────────┘   │
└─────────┴───────────────────────────────────────────────────────┘
```

#### Device Detail (tabs: Overview / Control / Chat / Logs / Stats / OTA / Settings)

```
┌─────────────────────────────────────────────────────────────────┐
│  <- Devices / Luni-Phong Khach                                  │
├─────────────────────────────────────────────────────────────────┤
│  [Overview] [Control] [Chat] [Logs] [Stats] [OTA] [Settings]   │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Status: * Online   FW: v2.1.0   Model: S3+C5                  │
│  Battery: ######## 85%   WiFi: -42 dBm   Uptime: 3d 14h        │
│                                                                  │
│  Control Panel                                                   │
│  ┌───────────────────────────────────────────────────────┐      │
│  │ Volume:     [=====|=====---] 80                      │      │
│  │ Brightness: [===========---] 100                     │      │
│  │ Log level:  [info v]                                 │      │
│  │                                                      │      │
│  │ Emotion: [Happy v]       Scene: [Weather v]         │      │
│  │                                                      │      │
│  │ [Reboot]  [Send TTS: __________ ] [Mute]           │      │
│  └───────────────────────────────────────────────────────┘      │
│                                                                  │
│  Chat                                                            │
│  ┌───────────────────────────────────────────────────────┐      │
│  │ You: "Hom nay thoi tiet the nao?"                    │      │
│  │ Luni: "Troi nang 32 do, do am 75%"  [happy]         │      │
│  │ You: "Hat bai di"                                     │      │
│  │ Luni: "Duoc roi, de Luni hat nhe~"  [excited]        │      │
│  ├───────────────────────────────────────────────────────┤      │
│  │ [Type message...                            ] [Send] │      │
│  └───────────────────────────────────────────────────────┘      │
└─────────────────────────────────────────────────────────────────┘
```

#### Log Viewer

```
┌─────────────────────────────────────────────────────────────────┐
│  Logs                                                           │
├─────────────────────────────────────────────────────────────────┤
│ Device: [All v]  Level: [All v]  Tag: [All v]  Date: [Today v] │
│ Search: [........................................] [Search]     │
├─────────┬──────┬────────────┬───────────────────────────────────┤
│ Time    │Level │ Tag        │ Message                           │
├─────────┼──────┼────────────┼───────────────────────────────────┤
│ 14:30:22│ INFO │ State      │ LISTENING -> PROCESSING           │
│ 14:30:20│ INFO │ Audio      │ Mic stream started                │
│ 14:29:58│DEBUG │ SPI        │ Frame TX seq=1423                 │
│ 14:29:55│ INFO │ State      │ IDLE -> TRIGGERED                 │
│ 14:15:00│ INFO │ Sync       │ Weather updated: 32C              │
│ 13:05:12│ WARN │ Power      │ Battery 15%, suggest charging     │
│ 12:45:33│ERROR │ WiFi       │ Disconnected, reconnecting (1)    │
└─────────┴──────┴────────────┴───────────────────────────────────┘
│ Page 1 of 25                    [< 1 2 3 4 5 ... 25 >]         │
└─────────────────────────────────────────────────────────────────┘
```

#### Admin Dashboard

```
┌─────────────────────────────────────────────────────────────────┐
│  Admin Dashboard                                                │
├─────────┬───────────────────────────────────────────────────────┤
│         │                                                       │
│ Overview│  System Overview                                      │
│ Users   │  ┌────────────────────────────────────────────────┐   │
│ Firmware│  │ Users: 45  | Devices: 78 | Online: 52 (67%)  │   │
│ Logs    │  │ Errors(24h): 3                                │   │
│  Device │  └────────────────────────────────────────────────┘   │
│  Server │                                                       │
│ System  │  Server Log Level                                     │
│         │  ┌────────────────────────────────────────────────┐   │
│         │  │ Current: INFO   [Change to: [debug v] [Apply]]│   │
│         │  └────────────────────────────────────────────────┘   │
│         │                                                       │
│         │  Firmware Distribution                                │
│         │  ┌────────────────────────────────────────────────┐   │
│         │  │ v2.1.0: ############## 60 (77%)               │   │
│         │  │ v2.0.0: ####           15 (19%)               │   │
│         │  │ v1.9.x: #              3  (4%)                │   │
│         │  └────────────────────────────────────────────────┘   │
│         │                                                       │
│         │  Server Logs (recent)                                 │
│         │  ┌────────────────────────────────────────────────┐   │
│         │  │ [INFO] api.auth    Login: user@example.com    │   │
│         │  │ [INFO] ws.device   Connected: AA:BB:CC:DD     │   │
│         │  │ [WARN] task.weather Rate limit hit             │   │
│         │  │ [ERROR] ws.device  Unexpected disconnect       │   │
│         │  └────────────────────────────────────────────────┘   │
└─────────┴───────────────────────────────────────────────────────┘
```

#### Admin — User Management

```
┌─────────────────────────────────────────────────────────────────┐
│  User Management                                    [+ Invite]  │
├─────────────────────────────────────────────────────────────────┤
│ Search: [............]  Role: [All v]  Status: [All v]          │
├──────┬──────────────────┬────────┬──────────┬───────┬───────────┤
│ Name │ Email            │ Role   │ Devices  │ Active│ Last login│
├──────┼──────────────────┼────────┼──────────┼───────┼───────────┤
│ Trung│ trung@...        │ admin  │ 3        │ Yes   │ 2h ago    │
│ Minh │ minh@...         │ user   │ 2        │ Yes   │ 1d ago    │
│ Lan  │ lan@...          │ user   │ 1        │ No    │ 30d ago   │
└──────┴──────────────────┴────────┴──────────┴───────┴───────────┘
```

#### Admin — Firmware Management

```
┌─────────────────────────────────────────────────────────────────┐
│  Firmware Management                              [+ Upload]    │
├─────────────────────────────────────────────────────────────────┤
│ Model: [All v]  Channel: [All v]                                │
├─────────┬────────┬─────────┬─────────┬────────┬─────────────────┤
│ Version │ Model  │ Channel │ Size    │ Active │ Rollout         │
├─────────┼────────┼─────────┼─────────┼────────┼─────────────────┤
│ v2.1.0  │ S3     │ stable  │ 2.1 MB  │ Yes    │ 60/78 (77%)    │
│ v2.1.0  │ C5     │ stable  │ 1.2 MB  │ Yes    │ 55/78 (71%)    │
│ v2.1.0  │ S3     │ beta    │ 2.2 MB  │ Yes    │ 5/5 beta users │
│ v2.0.0  │ S3     │ stable  │ 2.0 MB  │ No     │ 15/78 (legacy) │
└─────────┴────────┴─────────┴─────────┴────────┴─────────────────┘
```

### 14.4 Role-Based Access

| Feature | User | Admin |
|---------|------|-------|
| View own devices | Y | Y |
| Control own devices | Y | Y |
| Chat with own robot | Y | Y |
| View own device logs | Y | Y |
| Filter logs by level | Y | Y |
| Set device log level (own) | Y | Y |
| View own device stats | Y | Y |
| Share own device | Y | Y |
| View all users | - | Y |
| Manage user roles | - | Y |
| Upload firmware | - | Y |
| View all device logs (any) | - | Y |
| View server logs | - | Y |
| Change server log level | - | Y |
| System health dashboard | - | Y |
| Delete any device | - | Y |

### 14.5 Tech Stack

```json
{
  "dependencies": {
    "next": "^14",
    "@tanstack/react-query": "^5",
    "tailwindcss": "^3",
    "shadcn/ui": "latest",
    "recharts": "^2",
    "zod": "^3",
    "date-fns": "^3",
    "lucide-react": "latest"
  }
}
```

### 14.6 Design System

Shared với App — xem PLAN_APP.md mục 10.

```css
:root {
  --luni-cyan:    #5be9ff;
  --luni-warm:    #ffd166;
  --luni-rose:    #ff6b9d;
  --luni-red:     #ff5b6e;
  --luni-blue:    #76b8ff;
  --luni-green:   #7be88e;
  --luni-purple:  #b48cff;
  --luni-orange:  #ff9d5b;
  --luni-white:   #f0f4ff;

  --bg-dark:      #0a0e1a;
  --bg-card:      #141825;
  --text-primary: #e8ecf4;
  --text-secondary: #8892a8;
}
```
