# Luni Cloud — Phase 2: Core Features (Server Implementation Plan)

> Scope: Server-side features only (Luni_Cloud repo)
> Prerequisite: Phase 1 Foundation completed
> Duration ước tính: 4-6 tuần
> Reference: [SYSTEM_ARCHITECTURE.md](SYSTEM_ARCHITECTURE.md) §5, §6, §8, §9 | [PLAN_SERVER.md](PLAN_SERVER.md) §6-§8

---

## 1. Tổng quan Phase 2

Phase 2 triển khai 3 nhóm tính năng server:

| # | Feature | Mô tả | Priority |
|---|---------|--------|----------|
| 1 | **sync_data system** | Weather, calendar, time sync → Redis cache → push WS | P0 |
| 2 | **AI container (generic gateway)** | Nhận input (text/audio/image...) → trả output (text/audio...). Implementation bên trong TBD | P0 |
| 3 | **Structured logging to DB** | structlog → server_logs table, queryable | P1 |

**Chiến lược AI: Generic AI Gateway Container**

AI container (`luni-ai`) là một **abstraction layer** — server chỉ cần biết gửi gì vào, nhận gì ra.
Cách xử lý bên trong container (model nào, API nào, self-hosted hay cloud) là việc riêng của container, có thể thay đổi bất cứ lúc nào mà không ảnh hưởng server.

| Capability | Input | Output | Implementation |
|-----------|-------|--------|----------------|
| **Chat** | text (+ optional context) | text + emotion | TBD (Gemini free, Ollama, GPT, Claude...) |
| **STT** | audio file (WAV/OGG/OPUS...) | text | TBD (faster-whisper, Vosk, cloud API...) |
| **TTS** | text | audio bytes | TBD (Piper, Edge TTS, XTTS, cloud API...) |
| **Vision** | image (+ optional prompt) | text | TBD (future) |

**Phụ thuộc bên ngoài:**
- OpenWeather API key (free tier: 60 calls/min, 1M calls/month)
- Tuỳ implementation AI container: có thể cần API keys hoặc không

**Docker services mới:**
- `luni-ai` — Generic AI gateway container, expose REST API nội bộ trên Docker network

---

## 2. Project Structure — New & Modified Files

### 2.1 Root — Docker / AI Container

```
luni-cloud/
├── docker-compose.yml              ⟳ MODIFY — thêm service luni-ai
├── docker-compose.dev.yml          ⟳ MODIFY — thêm dev overrides cho ai
├── .env.example                    ⟳ MODIFY — thêm AI_SERVICE_URL + tuỳ chọn
│
├── ai/                             ★ NEW — Generic AI gateway container
│   ├── Dockerfile                  ★ NEW — Base image + dependencies
│   ├── requirements.txt            ★ NEW — Tuỳ implementation
│   ├── server.py                   ★ NEW — FastAPI app expose /chat, /stt, /tts
│   ├── models/                     ★ NEW — Downloaded model files (gitignored)
│   └── .env.example                ★ NEW — AI-specific config (model names, API keys nếu cần)
```

### 2.2 Server — FastAPI Changes

```
server/app/
├── services/
│   ├── weather.py              ★ NEW — OpenWeather API + Redis cache
│   ├── calendar_service.py     ★ NEW — Lunar calendar + events
│   ├── sync_data.py            ★ NEW — Aggregate sync payload, push to device
│   ├── ai.py                   ★ NEW — AI client (gọi luni-ai container + Gemini API)
│   ├── interaction.py          ★ NEW — User↔Robot interaction logic
│   ├── log_db.py               ★ NEW — structlog → PostgreSQL processor
│   ├── ws_manager.py           ⟳ MODIFY — integrate sync_data push, audio routing
│   ├── device.py               ⟳ MODIFY — flesh out get_sync_payload
│   └── log_service.py          ⟳ MODIFY — add server log query
│
├── api/v1/
│   ├── data.py                 ★ NEW — Weather, calendar, sync endpoints
│   ├── interactions.py         ★ NEW — Text chat + history endpoints
│   ├── router.py               ⟳ MODIFY — include new routers
│   └── logs.py                 ⟳ MODIFY — add server log query endpoint
│
├── api/ws/
│   ├── device.py               ⟳ MODIFY — handle audio binary frames
│   └── app_client.py           ⟳ MODIFY — interaction_msg forwarding
│
├── tasks/
│   ├── scheduler.py            ⟳ MODIFY — register new jobs
│   ├── weather_sync.py         ★ NEW — Periodic weather fetch
│   ├── calendar_sync.py        ★ NEW — Daily calendar refresh
│   └── log_cleanup.py          ★ NEW — Log retention cleanup
│
├── schemas/
│   ├── data.py                 ★ NEW — Weather, calendar, sync schemas
│   └── interaction.py          ★ NEW — Interaction request/response schemas
│
├── core/
│   └── logging.py              ⟳ MODIFY — add DB log processor
│
└── config.py                   ⟳ MODIFY — add AI/personality settings
```

**Summary: 16 new files (incl. ai/ container), 12 modified files**

---

## 3. sync_data System

### 3.1 Tổng quan

```
                    ┌──────────────────────────────────┐
                    │         Redis Cache              │
                    │                                  │
  OpenWeather ─────▶│  weather:{lat}:{lon}  TTL:20min  │
  Lunar calc ──────▶│  calendar:{date}      TTL:24h    │
                    │  sync:{device_id}     TTL:20min  │
                    └─────────┬────────────────────────┘
                              │
               ┌──────────────▼──────────────┐
               │     sync_data service       │
               │                             │
               │  aggregate(device) →        │
               │    time + weather +          │
               │    calendar + location      │
               └─────────┬──────────────────┘
                         │
              ┌──────────▼──────────┐
              │  Push via WS to     │
              │  online devices     │
              │  (on connect +      │
              │   periodic refresh) │
              └─────────────────────┘
```

### 3.2 Weather Service

#### File: `server/app/services/weather.py`

```python
class WeatherService:
    """OpenWeather API integration with Redis cache."""

    def __init__(self, redis: Redis, settings: Settings):
        self.redis = redis
        self.api_key = settings.openweather_api_key
        self.client = httpx.AsyncClient(timeout=10.0)

    async def get_weather(self, lat: float, lon: float) -> dict:
        """
        Get weather data for coordinates.
        Cache key: weather:{lat:.2f}:{lon:.2f}
        TTL: 20 minutes
        """
        cache_key = f"weather:{lat:.2f}:{lon:.2f}"

        # Check cache
        cached = await self.redis.get(cache_key)
        if cached:
            return json.loads(cached)

        # Fetch from OpenWeather
        data = await self._fetch_current(lat, lon)
        forecast = await self._fetch_forecast(lat, lon)

        result = {
            "temp": data["main"]["temp"],
            "feels_like": data["main"]["feels_like"],
            "humidity": data["main"]["humidity"],
            "condition": self._map_condition(data["weather"][0]["id"]),
            "icon": data["weather"][0]["icon"],
            "aqi": await self._fetch_aqi(lat, lon),
            "forecast": self._format_forecast(forecast),
        }

        await self.redis.setex(cache_key, 1200, json.dumps(result))
        return result

    async def _fetch_current(self, lat: float, lon: float) -> dict:
        """GET /data/2.5/weather"""
        resp = await self.client.get(
            "https://api.openweathermap.org/data/2.5/weather",
            params={
                "lat": lat, "lon": lon,
                "appid": self.api_key,
                "units": "metric",
                "lang": "vi",
            },
        )
        resp.raise_for_status()
        return resp.json()

    async def _fetch_forecast(self, lat: float, lon: float) -> dict:
        """GET /data/2.5/forecast — 5 day / 3 hour."""
        resp = await self.client.get(
            "https://api.openweathermap.org/data/2.5/forecast",
            params={
                "lat": lat, "lon": lon,
                "appid": self.api_key,
                "units": "metric",
                "cnt": 24,  # 3 days
            },
        )
        resp.raise_for_status()
        return resp.json()

    async def _fetch_aqi(self, lat: float, lon: float) -> int | None:
        """GET /data/2.5/air_pollution — Air Quality Index."""
        try:
            resp = await self.client.get(
                "https://api.openweathermap.org/data/2.5/air_pollution",
                params={"lat": lat, "lon": lon, "appid": self.api_key},
            )
            resp.raise_for_status()
            return resp.json()["list"][0]["main"]["aqi"]
        except Exception:
            return None

    def _map_condition(self, weather_id: int) -> str:
        """Map OpenWeather condition ID to simplified condition string."""
        if weather_id == 800:
            return "clear"
        elif weather_id == 801:
            return "few_clouds"
        elif weather_id in (802, 803):
            return "partly_cloudy"
        elif weather_id == 804:
            return "overcast"
        elif 200 <= weather_id < 300:
            return "thunderstorm"
        elif 300 <= weather_id < 400:
            return "drizzle"
        elif 500 <= weather_id < 600:
            return "rain"
        elif 600 <= weather_id < 700:
            return "snow"
        elif 700 <= weather_id < 800:
            return "fog"
        return "unknown"

    def _format_forecast(self, data: dict) -> list[dict]:
        """Group 3-hour forecast into daily high/low."""
        from collections import defaultdict
        daily = defaultdict(lambda: {"highs": [], "lows": [], "conditions": []})

        for item in data.get("list", []):
            from datetime import datetime
            dt = datetime.fromtimestamp(item["dt"])
            day_key = dt.strftime("%a").lower()
            daily[day_key]["highs"].append(item["main"]["temp_max"])
            daily[day_key]["lows"].append(item["main"]["temp_min"])
            daily[day_key]["conditions"].append(item["weather"][0]["id"])

        result = []
        for day, vals in list(daily.items())[:3]:
            result.append({
                "day": day,
                "high": round(max(vals["highs"])),
                "low": round(min(vals["lows"])),
                "condition": self._map_condition(
                    max(vals["conditions"], key=vals["conditions"].count)
                ),
            })
        return result
```

**API OpenWeather sử dụng:**
| Endpoint | Free tier limit | Dùng cho |
|----------|----------------|----------|
| `/data/2.5/weather` | 60/min | Current weather |
| `/data/2.5/forecast` | 60/min | 3-day forecast |
| `/data/2.5/air_pollution` | 60/min | AQI |

**Rate planning:** Với 15 phút/lần sync × ~100 devices (max ~20 unique locations) = ~4 calls/15min = rất an toàn.

### 3.3 Calendar Service

#### File: `server/app/services/calendar_service.py`

```python
class CalendarService:
    """Vietnamese lunar calendar + optional Google Calendar events."""

    def __init__(self, redis: Redis):
        self.redis = redis

    async def get_calendar(self, date: str, timezone: str = "Asia/Ho_Chi_Minh") -> dict:
        """
        Get calendar data for a date.
        Cache key: calendar:{date}
        TTL: 24h
        """
        cache_key = f"calendar:{date}"
        cached = await self.redis.get(cache_key)
        if cached:
            return json.loads(cached)

        lunar = self._calculate_lunar(date)
        result = {
            "lunar": lunar,
            "events": [],   # Google Calendar integration — future
        }

        await self.redis.setex(cache_key, 86400, json.dumps(result))
        return result

    def _calculate_lunar(self, date_str: str) -> dict:
        """
        Convert Gregorian date to Vietnamese lunar date.
        Uses astronomical calculation (Jean Meeus algorithm).
        """
        from datetime import date

        d = date.fromisoformat(date_str)
        lunar_day, lunar_month, lunar_year, is_leap = self._gregorian_to_lunar(
            d.day, d.month, d.year
        )

        # Thiên Can - Địa Chi cho năm
        can = ["Giáp", "Ất", "Bính", "Đinh", "Mậu",
               "Kỷ", "Canh", "Tân", "Nhâm", "Quý"]
        chi = ["Tý", "Sửu", "Dần", "Mão", "Thìn", "Tỵ",
               "Ngọ", "Mùi", "Thân", "Dậu", "Tuất", "Hợi"]

        can_index = (lunar_year + 6) % 10
        chi_index = (lunar_year + 8) % 12

        return {
            "day": lunar_day,
            "month": lunar_month,
            "year": f"{can[can_index]} {chi[chi_index]}",
            "year_number": lunar_year,
            "is_leap_month": is_leap,
        }

    def _gregorian_to_lunar(self, dd: int, mm: int, yy: int) -> tuple:
        """
        Core lunar conversion algorithm.
        Returns: (lunar_day, lunar_month, lunar_year, is_leap_month)

        Based on Ho Ngoc Duc's algorithm for Vietnamese calendar.
        Reference: https://www.informatik.uni-leipzig.de/~duc/amlich/
        """
        # Implementation of the lunar conversion algorithm
        # This is a well-known algorithm for Vietnamese lunar calendar
        # Full implementation with new moon calculation using Julian Day Number
        ...  # Chi tiết implementation xem §3.3.1
```

#### §3.3.1 Lunar Calendar Algorithm

Sử dụng thuật toán của Hồ Ngọc Đức — đã được verify và sử dụng rộng rãi cho lịch Âm Việt Nam.

**Dependency option:** Có thể dùng package `lunarcalendar` hoặc `lunardate` thay vì tự implement:

```
# requirements.txt
lunarcalendar>=0.0.9
```

Tuy nhiên, các package này tính âm lịch Trung Quốc — khác Việt Nam ở múi giờ tính tiết khí (UTC+7 vs UTC+8). Nên tự implement hoặc fork/adjust.

**Quyết định:** Tự implement thuật toán Hồ Ngọc Đức (JavaScript → Python port). ~150 dòng code, zero dependency, chính xác cho Việt Nam.

### 3.4 sync_data Aggregation

#### File: `server/app/services/sync_data.py`

```python
class SyncDataService:
    """Aggregate and push sync_data payload to devices."""

    def __init__(self, redis: Redis, db: AsyncSession):
        self.redis = redis
        self.db = db
        self.weather = WeatherService(redis, get_settings())
        self.calendar = CalendarService(redis)

    async def build_sync_payload(self, device: Device) -> dict:
        """
        Build full sync_data message for a device.
        Cached per device in Redis (TTL: 20min).

        Output format matches SYSTEM_ARCHITECTURE §5 sync_data payload.
        """
        cache_key = f"sync:{device.id}"
        cached = await self.redis.get(cache_key)
        if cached:
            return json.loads(cached)

        import time
        from datetime import datetime
        import zoneinfo

        tz = zoneinfo.ZoneInfo(device.timezone or "Asia/Ho_Chi_Minh")
        now = datetime.now(tz)

        # Weather (requires lat/lon from device config)
        weather = None
        if device.latitude and device.longitude:
            try:
                weather = await self.weather.get_weather(
                    device.latitude, device.longitude
                )
            except Exception as e:
                logger.warning("sync.weather_failed", device_id=device.id, error=str(e))

        # Calendar
        calendar = None
        try:
            calendar = await self.calendar.get_calendar(
                now.strftime("%Y-%m-%d"),
                device.timezone or "Asia/Ho_Chi_Minh",
            )
        except Exception as e:
            logger.warning("sync.calendar_failed", device_id=device.id, error=str(e))

        payload = {
            "time": {
                "unix": int(time.time()),
                "tz": device.timezone or "Asia/Ho_Chi_Minh",
                "utc_offset": now.utcoffset().total_seconds() / 3600,
            },
            "weather": weather,
            "calendar": calendar,
            "location": {
                "city": device.city,
                "lat": device.latitude,
                "lon": device.longitude,
            } if device.latitude else None,
        }

        # Cache per device
        await self.redis.setex(cache_key, 1200, json.dumps(payload))
        return payload

    async def push_to_device(self, device_id: str) -> bool:
        """Build sync_data and push to device via WS."""
        from app.services.ws_manager import manager

        device = await self._get_device(device_id)
        if not device:
            return False

        payload = await self.build_sync_payload(device)

        message = {
            "type": "sync_data",
            "id": str(uuid4()),
            "ts": int(time.time() * 1000),
            "payload": payload,
        }

        return await manager.send_to_device(device_id, message)

    async def push_to_all_online(self):
        """Push sync_data to all currently connected devices."""
        from app.services.ws_manager import manager

        for device_id in list(manager.device_connections.keys()):
            try:
                await self.push_to_device(device_id)
            except Exception as e:
                logger.error("sync.push_failed", device_id=device_id, error=str(e))
```

### 3.5 API Endpoints — Data

#### File: `server/app/api/v1/data.py`

```
GET  /api/v1/data/weather?lat=&lon=          # Weather (cached)
GET  /api/v1/data/calendar?date=             # Calendar + lunar
GET  /api/v1/data/sync/{device_id}           # Full sync bundle for device
POST /api/v1/data/sync/{device_id}/push      # Force push sync_data to device
```

```python
router = APIRouter(prefix="/data", tags=["data"])

@router.get("/weather")
async def get_weather(
    lat: float = Query(...),
    lon: float = Query(...),
    user: User = Depends(get_current_user),
    redis: Redis = Depends(get_redis),
):
    service = WeatherService(redis, get_settings())
    return await service.get_weather(lat, lon)

@router.get("/calendar")
async def get_calendar(
    date: str = Query(None),  # YYYY-MM-DD, default today
    user: User = Depends(get_current_user),
    redis: Redis = Depends(get_redis),
):
    if not date:
        from datetime import date as d
        date = d.today().isoformat()
    service = CalendarService(redis)
    return await service.get_calendar(date)

@router.get("/sync/{device_id}")
async def get_sync_data(
    device_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    redis: Redis = Depends(get_redis),
):
    """Get the sync_data payload for a device (what would be pushed via WS)."""
    # Access check
    device = await _get_device_with_access(device_id, user, db)
    service = SyncDataService(redis, db)
    return await service.build_sync_payload(device)

@router.post("/sync/{device_id}/push")
async def force_push_sync(
    device_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    redis: Redis = Depends(get_redis),
):
    """Force push sync_data to device now."""
    device = await _get_device_with_access(device_id, user, db)
    service = SyncDataService(redis, db)
    sent = await service.push_to_device(device_id)
    if not sent:
        raise DeviceOfflineError(device_id)
    return {"status": "ok"}
```

### 3.6 Background Tasks — Weather & Calendar Sync

#### File: `server/app/tasks/weather_sync.py`

```python
@scheduler.scheduled_job("interval", minutes=15, id="weather_sync")
async def weather_sync():
    """
    Fetch weather for all online devices, cache in Redis, push via WS.

    Flow:
    1. Get all online device IDs from ws_manager
    2. Group by location (lat/lon rounded to 2 decimals) — avoid duplicate API calls
    3. Fetch weather for each unique location
    4. Build sync_data for each device
    5. Push to device via WS
    """
    from app.services.ws_manager import manager
    from app.db.database import async_session

    online_devices = list(manager.device_connections.keys())
    if not online_devices:
        return

    async with async_session() as db:
        redis = manager.redis
        sync_service = SyncDataService(redis, db)

        for device_id in online_devices:
            try:
                await sync_service.push_to_device(device_id)
            except Exception as e:
                logger.error("task.weather_sync_failed",
                    device_id=device_id, error=str(e))
```

#### File: `server/app/tasks/calendar_sync.py`

```python
@scheduler.scheduled_job("cron", hour=0, minute=5, id="calendar_sync")
async def calendar_sync():
    """
    Refresh calendar cache daily at 00:05.
    Invalidate all calendar:* keys and re-fetch for online devices.
    """
    from app.services.ws_manager import manager

    redis = manager.redis
    if not redis:
        return

    # Invalidate all calendar cache
    keys = []
    async for key in redis.scan_iter(match="calendar:*"):
        keys.append(key)
    if keys:
        await redis.delete(*keys)

    # Also invalidate sync cache (forces rebuild with new calendar)
    sync_keys = []
    async for key in redis.scan_iter(match="sync:*"):
        sync_keys.append(key)
    if sync_keys:
        await redis.delete(*sync_keys)

    logger.info("task.calendar_sync", invalidated_keys=len(keys) + len(sync_keys))
```

### 3.7 Integration: WS Manager → sync_data on Device Connect

Khi device connect thành công (sau auth), server cần push `sync_data` ngay:

```python
# Trong ws/device.py — sau khi auth thành công:
# MODIFY existing connect flow
async def device_websocket(ws: WebSocket):
    ...
    # After auth success + mark online:
    await manager.connect_device(device_id, ws)

    # ★ NEW: Push sync_data immediately after connection
    try:
        async with async_session() as db:
            redis = manager.redis
            sync_service = SyncDataService(redis, db)
            await sync_service.push_to_device(device_id)
    except Exception as e:
        logger.warning("ws.sync_push_failed", device_id=device_id, error=str(e))

    # Message loop continues...
```

---

## 4. AI Container — Generic AI Gateway

### 4.1 Triết lý thiết kế

AI container (`luni-ai`) là **black box** — server chỉ biết:
- Gửi input (text, audio, image...) vào đúng endpoint
- Nhận output (text, audio...) ra

**Server KHÔNG biết** bên trong container dùng model gì, gọi API nào, hay xử lý như thế nào.
Điều này cho phép thay đổi toàn bộ AI backend mà không sửa một dòng code server.

```
┌─────────────────────────────────────────────────────────────────┐
│  Docker Compose (luni-net)                                      │
│                                                                  │
│  ┌──────────────┐        ┌──────────────────────────────┐       │
│  │  luni-api     │        │  luni-ai (generic gateway)    │       │
│  │  (FastAPI)    │        │  Port 8081 (internal only)    │       │
│  │               │        │                              │       │
│  │  ai.py ───────┼──────▶ │  POST /chat                  │       │
│  │  (HTTP client)│        │    In:  text + context        │       │
│  │               │        │    Out: text + emotion        │       │
│  │               │        │                              │       │
│  │               │──────▶ │  POST /stt                   │       │
│  │               │        │    In:  audio file            │       │
│  │               │        │    Out: {"text": "..."}       │       │
│  │               │        │                              │       │
│  │               │──────▶ │  POST /tts                   │       │
│  │               │        │    In:  text                  │       │
│  │               │        │    Out: audio bytes           │       │
│  │               │        │                              │       │
│  │               │        │  Implementation: TBD         │       │
│  │               │        │  (self-hosted, API, hybrid)   │       │
│  └──────────────┘        └──────────────────────────────┘       │
└─────────────────────────────────────────────────────────────────┘
```

### 4.2 API Contract (Interface cố định — server dựa vào đây)

Dù implementation bên trong thay đổi, các endpoint này **KHÔNG đổi**:

#### `GET /health`

```json
// Response 200
{
  "status": "ok",
  "capabilities": {
    "chat": true,
    "stt": true,
    "tts": true,
    "vision": false
  }
}
```

#### `POST /chat`

```
Content-Type: application/json

// Request
{
  "message": "Hôm nay thời tiết thế nào?",
  "context": {                          // optional — thông tin ngữ cảnh
    "weather": {"temp": 32, "condition": "sunny"},
    "calendar": {"lunar": {"day": 3, "month": 5, "year": "Bính Ngọ"}},
    "device_name": "Luni phòng khách",
    "user_name": "Trung"
  },
  "history": [                          // optional — lịch sử hội thoại
    {"role": "user", "content": "Xin chào"},
    {"role": "assistant", "content": "Chào bạn! [happy]"}
  ]
}

// Response 200
{
  "text": "Trời đẹp lắm! 32 độ, nắng ấm nè!",
  "emotion": "happy"                    // happy|sad|excited|curious|sleepy|angry|love|neutral
}
```

#### `POST /stt`

```
Content-Type: multipart/form-data

// Request
file: <audio binary>                    // WAV, OGG, OPUS, MP3, FLAC
language: "vi"                          // optional, default "vi"

// Response 200
{
  "text": "xin chào bạn",
  "language": "vi"
}
```

#### `POST /tts`

```
Content-Type: application/x-www-form-urlencoded  (hoặc multipart/form-data)

// Request
text: "Xin chào bạn!"

// Response 200
Content-Type: audio/wav (hoặc audio/mp3, audio/opus)
Body: <audio binary>
```

#### `POST /vision` (future)

```
Content-Type: multipart/form-data

// Request
file: <image binary>                    // JPG, PNG
prompt: "Mô tả hình này"               // optional

// Response 200
{
  "text": "Đây là một bức ảnh chụp..."
}
```

### 4.3 Docker Compose — Thêm AI service

```yaml
# Thêm vào docker-compose.yml:

  # === AI Gateway (internal only — không expose port ra host) ===
  ai:
    build: ./ai
    container_name: luni-ai
    restart: unless-stopped
    # KHÔNG có ports — chỉ accessible qua Docker network (http://ai:8081)
    volumes:
      - ai_models:/app/models      # Persist downloaded models
    env_file:
      - ./ai/.env                  # AI-specific config (model names, API keys...)
    networks:
      - luni-net
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8081/health"]
      interval: 30s
      timeout: 10s
      retries: 3

# Thêm volume:
volumes:
  ai_models:     # ★ NEW — persist models across container rebuilds
```

```yaml
# docker-compose.dev.yml — thêm dev override:

  ai:
    ports:
      - "127.0.0.1:8081:8081"   # Dev only — expose ra host để debug/test trực tiếp
    volumes:
      - ./ai:/app:ro              # Hot reload
      - ai_models:/app/models
    command: >
      uvicorn server:app
      --host 0.0.0.0
      --port 8081
      --reload
```

### 4.4 AI Client trong FastAPI (server gọi container)

#### File: `server/app/services/ai.py`

Server chỉ biết gọi HTTP tới AI container — không biết bên trong dùng gì:

```python
class AIService:
    """
    AI client — gọi luni-ai container qua HTTP.
    Server không biết/quan tâm implementation bên trong container.
    """

    def __init__(self, settings: Settings):
        self.ai_url = settings.ai_service_url  # "http://ai:8081"
        self.http = httpx.AsyncClient(timeout=30.0)

    async def health(self) -> dict:
        """Check AI container capabilities."""
        resp = await self.http.get(f"{self.ai_url}/health")
        resp.raise_for_status()
        return resp.json()

    async def chat(
        self,
        message: str,
        context: dict | None = None,
        history: list[dict] | None = None,
    ) -> dict:
        """
        Send text → AI container → get response + emotion.
        Returns: {"text": "...", "emotion": "happy|..."}
        """
        payload = {"message": message}
        if context:
            payload["context"] = context
        if history:
            payload["history"] = history

        resp = await self.http.post(f"{self.ai_url}/chat", json=payload)
        resp.raise_for_status()
        return resp.json()  # {"text": "...", "emotion": "..."}

    async def transcribe(self, audio_data: bytes, language: str = "vi") -> str:
        """
        Send audio → AI container → get text.
        Returns: transcribed text string.
        """
        resp = await self.http.post(
            f"{self.ai_url}/stt",
            files={"file": ("audio.wav", audio_data, "audio/wav")},
            data={"language": language},
        )
        resp.raise_for_status()
        return resp.json()["text"]

    async def synthesize(self, text: str) -> bytes:
        """
        Send text → AI container → get audio bytes.
        Returns: audio file content (WAV/MP3/OPUS).
        """
        resp = await self.http.post(
            f"{self.ai_url}/tts",
            data={"text": text},
        )
        resp.raise_for_status()
        return resp.content

    # === Orchestration (server-side, dùng các method trên) ===

    async def process_text_interaction(
        self,
        text: str,
        device_id: str,
        user_id: str | None,
        device_context: dict | None = None,
        conversation_history: list[dict] | None = None,
    ) -> dict:
        """
        Full pipeline: text → chat → TTS → push to device via WS.
        """
        from app.services.ws_manager import manager
        import time
        from uuid import uuid4

        # 1. Chat (→ AI container)
        chat_result = await self.chat(
            message=text,
            context=device_context,
            history=conversation_history,
        )

        # 2. TTS (→ AI container)
        audio = await self.synthesize(chat_result["text"])

        # 3. Push to device via WS
        audio_sent = False

        await manager.send_to_device(device_id, {
            "type": "set_emotion",
            "id": str(uuid4()),
            "ts": int(time.time() * 1000),
            "payload": {"emotion": chat_result["emotion"]},
        })

        await manager.send_to_device(device_id, {
            "type": "tts_play",
            "id": str(uuid4()),
            "ts": int(time.time() * 1000),
            "payload": {"text": chat_result["text"]},
        })

        if audio:
            audio_sent = await manager.send_binary_to_device(device_id, audio)

        # 4. Notify app clients
        await manager.notify_app_clients(device_id, {
            "type": "interaction_result",
            "id": str(uuid4()),
            "ts": int(time.time() * 1000),
            "payload": {
                "input": text,
                "output": chat_result["text"],
                "emotion": chat_result["emotion"],
            },
        })

        return {
            "text": chat_result["text"],
            "emotion": chat_result["emotion"],
            "audio_sent": audio_sent,
        }
```

### 4.5 Voice Interaction Flow (Device mic → Server → Device speaker)

```
Device Button Press
    │
    ▼
WS Binary: 0xAA + seq + len + opus_payload
    │ (multiple frames, ~20ms each)
    ▼
luni-api: Buffer frames until silence (1.5s) or max 30s
    │
    ▼
luni-api: ffmpeg decode opus → WAV
    │
    ▼
luni-api → luni-ai: POST /stt (WAV) → text
    │
    ▼
luni-api → luni-ai: POST /chat (text + context) → response + emotion
    │
    ▼
luni-api → luni-ai: POST /tts (response text) → audio
    │
    ├──▶ WS Text: set_emotion command → device
    ├──▶ WS Binary: audio → device speaker
    ├──▶ WS Text: interaction_result → app clients
    └──▶ DB: save Interaction record
```

**Audio buffering trong ws_manager.py:**

```python
# New state in ConnectionManager
self.audio_buffers: dict[str, list[bytes]] = {}
self.audio_start_time: dict[str, float] = {}

async def handle_audio_uplink(self, device_id: str, data: bytes):
    """Buffer incoming audio frames for STT processing."""
    if device_id not in self.audio_buffers:
        self.audio_buffers[device_id] = []
        self.audio_start_time[device_id] = time.time()

    self.audio_buffers[device_id].append(data)

    elapsed = time.time() - self.audio_start_time[device_id]
    if elapsed > 30:
        await self._process_audio(device_id)

async def handle_audio_silence(self, device_id: str):
    """Called when silence detected (no audio for 1.5s)."""
    if device_id in self.audio_buffers:
        await self._process_audio(device_id)

async def _process_audio(self, device_id: str):
    """Process buffered audio: STT → Chat → TTS → push."""
    frames = self.audio_buffers.pop(device_id, [])
    self.audio_start_time.pop(device_id, None)

    if not frames:
        return

    ai = AIService(get_settings())

    wav_data = await decode_opus_to_wav(frames)

    text = await ai.transcribe(wav_data)
    if not text.strip():
        return

    device_context = await self._get_device_context(device_id)
    history = await self._get_recent_interactions(device_id, limit=10)

    result = await ai.process_text_interaction(
        text=text,
        device_id=device_id,
        user_id=None,
        device_context=device_context,
        conversation_history=history,
    )

    await self._save_interaction(
        device_id=device_id,
        user_id=None,
        direction="voice",
        source="voice",
        input_text=text,
        output_text=result["text"],
        emotion=result["emotion"],
        audio_secs=len(frames) * 0.02,
    )
```

### 4.6 Implementation gợi ý (tham khảo, KHÔNG bắt buộc)

Dưới đây là một số lựa chọn có thể dùng bên trong AI container. Việc chọn gì là tự do — chỉ cần đảm bảo đúng API contract ở §4.2:

| Capability | Option A (self-hosted) | Option B (free API) | Option C (paid API) |
|-----------|----------------------|--------------------|--------------------|
| **Chat** | Ollama (Qwen2.5, Llama3...) | Gemini free tier (15 RPM) | OpenAI, Claude... |
| **STT** | faster-whisper, Vosk | Google STT free tier | Whisper API |
| **TTS** | Piper TTS, Coqui XTTS | Edge TTS (Microsoft, free) | ElevenLabs, OpenAI TTS |
| **Vision** | LLaVA, Moondream | Gemini Vision free | GPT-4 Vision |

### 4.7 AI Container — Scope & Ranh giới

**AI container chịu trách nhiệm:**
- Nhận request, xử lý, trả kết quả đúng format
- Quản lý models (download, load, inference)
- Quản lý API keys nếu gọi external API
- Health check: báo capabilities nào available

**AI container KHÔNG chịu trách nhiệm:**
- Conversation history (server quản lý qua DB `interactions` table)
- Device context (server build từ sync_data rồi truyền qua `context` field)
- Audio buffering / WS routing (server side)
- Access control / auth (container chỉ accessible trên internal Docker network)

---

## 5. Interaction System

### 5.1 API Endpoints

#### File: `server/app/api/v1/interactions.py`

```
POST   /api/v1/devices/{id}/interact       # Send text → LLM → TTS → device
GET    /api/v1/devices/{id}/interactions    # Chat history (paginated)
DELETE /api/v1/devices/{id}/interactions    # Clear history
```

```python
router = APIRouter(tags=["interactions"])

@router.post("/devices/{device_id}/interact")
async def interact(
    device_id: str,
    body: InteractRequest,  # { "text": "Hôm nay thời tiết thế nào?" }
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    redis: Redis = Depends(get_redis),
):
    """
    Send text to device via LLM pipeline.

    Flow:
    1. User sends text from app/web
    2. Server processes through LLM → get response + emotion
    3. Server sends tts_play + set_emotion to device via WS
    4. Server notifies app clients via WS (interaction_result)
    5. Server saves interaction to DB
    6. Return response to caller
    """
    # Access check
    device = await _get_device_with_access(device_id, user, db)

    # Get device context (weather, calendar for LLM context)
    sync_service = SyncDataService(redis, db)
    device_context = None
    try:
        device_context = await sync_service.build_sync_payload(device)
    except Exception:
        pass

    # Get conversation history
    interaction_service = InteractionService(db)
    history = await interaction_service.get_history(
        device_id=device_id, limit=10
    )

    # Process through AI
    ai = AIService(get_settings())
    start_time = time.time()

    result = await ai.process_text_interaction(
        text=body.text,
        device_id=device_id,
        user_id=str(user.id),
        device_context=device_context,
        conversation_history=history,
    )

    latency_ms = int((time.time() - start_time) * 1000)

    # Save interaction
    interaction = await interaction_service.save(
        device_id=device_id,
        user_id=user.id,
        direction="user_to_device",
        source=body.source or "web",
        input_text=body.text,
        output_text=result["text"],
        emotion=result["emotion"],
        latency_ms=latency_ms,
    )

    return InteractResponse(
        input=body.text,
        output=result["text"],
        emotion=result["emotion"],
        latency_ms=latency_ms,
        interaction_id=interaction.id,
    )

@router.get("/devices/{device_id}/interactions")
async def get_interactions(
    device_id: str,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get interaction history for a device (paginated)."""
    device = await _get_device_with_access(device_id, user, db)
    service = InteractionService(db)
    return await service.get_history(
        device_id=device_id, limit=limit, offset=offset
    )

@router.delete("/devices/{device_id}/interactions")
async def clear_interactions(
    device_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Clear interaction history for a device."""
    device = await _get_device_with_access(device_id, user, db, require_owner=True)
    service = InteractionService(db)
    await service.clear_history(device_id)
    return {"status": "ok"}
```

### 5.2 Interaction Service

#### File: `server/app/services/interaction.py`

```python
class InteractionService:
    """Manage user ↔ device interactions."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def save(
        self,
        device_id: str,
        user_id: UUID | None,
        direction: str,
        source: str,
        input_text: str | None,
        output_text: str | None,
        emotion: str | None = None,
        audio_secs: float | None = None,
        latency_ms: int | None = None,
    ) -> Interaction:
        interaction = Interaction(
            device_id=device_id,
            user_id=user_id,
            direction=direction,
            source=source,
            input_text=input_text,
            output_text=output_text,
            emotion=emotion,
            audio_secs=audio_secs,
            latency_ms=latency_ms,
        )
        self.db.add(interaction)
        await self.db.flush()
        return interaction

    async def get_history(
        self,
        device_id: str,
        limit: int = 50,
        offset: int = 0,
    ) -> list[Interaction]:
        result = await self.db.execute(
            select(Interaction)
            .where(Interaction.device_id == device_id)
            .order_by(Interaction.created_at.desc())
            .limit(limit)
            .offset(offset)
        )
        return list(result.scalars().all())

    async def clear_history(self, device_id: str) -> None:
        await self.db.execute(
            delete(Interaction).where(Interaction.device_id == device_id)
        )
```

### 5.3 Schemas

#### File: `server/app/schemas/interaction.py`

```python
class InteractRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=2000)
    source: str = Field(default="web", pattern=r"^(app|web)$")

class InteractResponse(BaseModel):
    input: str
    output: str
    emotion: str
    latency_ms: int
    interaction_id: int

class InteractionResponse(BaseModel):
    id: int
    device_id: str
    user_id: UUID | None = None
    direction: str
    source: str
    input_text: str | None = None
    output_text: str | None = None
    emotion: str | None = None
    audio_secs: float | None = None
    latency_ms: int | None = None
    created_at: datetime

    model_config = {"from_attributes": True}
```

### 5.4 Schemas — Data

#### File: `server/app/schemas/data.py`

```python
class WeatherResponse(BaseModel):
    temp: float
    feels_like: float
    humidity: int
    condition: str
    icon: str
    aqi: int | None = None
    forecast: list[ForecastDay] = []

class ForecastDay(BaseModel):
    day: str
    high: int
    low: int
    condition: str

class LunarDate(BaseModel):
    day: int
    month: int
    year: str
    year_number: int
    is_leap_month: bool = False

class CalendarResponse(BaseModel):
    lunar: LunarDate
    events: list[dict] = []

class SyncDataResponse(BaseModel):
    time: dict
    weather: WeatherResponse | None = None
    calendar: CalendarResponse | None = None
    location: dict | None = None
```

---

## 6. Structured Logging to PostgreSQL

### 6.1 Tổng quan

Phase 1 đã có structlog + JSON output tới stdout. Phase 2 thêm:
- Log processor ghi vào `server_logs` table
- API endpoint query server logs (admin)
- Log cleanup task

### 6.2 DB Log Processor

#### File: `server/app/services/log_db.py`

```python
class DBLogProcessor:
    """
    structlog processor that writes log entries to server_logs table.

    Chỉ ghi log level >= threshold (mặc định: INFO).
    Ghi async qua background task để không block request.
    """

    def __init__(self):
        self._queue: asyncio.Queue = asyncio.Queue(maxsize=10000)
        self._task: asyncio.Task | None = None

    def start(self):
        """Start background log writer."""
        self._task = asyncio.create_task(self._writer_loop())

    async def stop(self):
        """Flush and stop."""
        if self._task:
            self._task.cancel()

    async def _writer_loop(self):
        """Batch-write logs to DB every 5 seconds or when queue has 100+ items."""
        while True:
            batch = []
            try:
                # Collect up to 100 items or wait 5 seconds
                while len(batch) < 100:
                    try:
                        item = await asyncio.wait_for(
                            self._queue.get(), timeout=5.0
                        )
                        batch.append(item)
                    except asyncio.TimeoutError:
                        break

                if batch:
                    await self._write_batch(batch)

            except asyncio.CancelledError:
                # Flush remaining
                while not self._queue.empty():
                    batch.append(self._queue.get_nowait())
                if batch:
                    await self._write_batch(batch)
                break
            except Exception as e:
                # Don't let DB errors crash the logger
                print(f"DBLogProcessor error: {e}")

    async def _write_batch(self, batch: list[dict]):
        """Write a batch of log entries to DB."""
        from app.db.database import async_session

        async with async_session() as db:
            for entry in batch:
                db.add(ServerLog(
                    level=entry.get("level", "info"),
                    module=entry.get("module", "unknown"),
                    message=entry.get("event", ""),
                    metadata_=entry.get("metadata"),
                    request_id=entry.get("request_id"),
                    user_id=entry.get("user_id"),
                    device_id=entry.get("device_id"),
                ))
            await db.commit()

    def __call__(self, logger, method_name, event_dict):
        """structlog processor — enqueue log entry for DB write."""
        level = event_dict.get("level", "info").lower()

        # Only write INFO+ to DB
        level_num = {"debug": 10, "info": 20, "warning": 30, "warn": 30, "error": 40}
        if level_num.get(level, 0) >= 20:
            try:
                self._queue.put_nowait({
                    "level": level,
                    "module": event_dict.get("_logger", "unknown"),
                    "event": event_dict.get("event", ""),
                    "metadata": {
                        k: str(v) for k, v in event_dict.items()
                        if k not in ("event", "level", "timestamp", "_logger",
                                     "request_id", "user_id", "device_id")
                    } or None,
                    "request_id": event_dict.get("request_id"),
                    "user_id": event_dict.get("user_id"),
                    "device_id": event_dict.get("device_id"),
                })
            except asyncio.QueueFull:
                pass  # Drop log rather than block

        return event_dict  # Pass through for console output
```

### 6.3 Integration với core/logging.py

```python
# Modify setup_logging() to add DB processor

from app.services.log_db import DBLogProcessor

db_log_processor = DBLogProcessor()

def setup_logging(log_level: str = "INFO") -> None:
    numeric_level = getattr(logging, log_level.upper(), logging.INFO)
    logging.basicConfig(level=numeric_level, format="%(message)s")

    structlog.configure(
        processors=[
            structlog.contextvars.merge_contextvars,
            structlog.processors.add_log_level,
            structlog.processors.TimeStamper(fmt="iso"),
            structlog.processors.StackInfoRenderer(),
            structlog.processors.format_exc_info,
            db_log_processor,                           # ★ NEW: Write to DB
            structlog.processors.JSONRenderer(),
        ],
        wrapper_class=structlog.make_filtering_bound_logger(numeric_level),
        logger_factory=structlog.PrintLoggerFactory(),
        cache_logger_on_first_use=True,
    )

    # Start background writer
    db_log_processor.start()
```

### 6.4 Server Log Query — Admin API

Thêm vào `logs.py`:

```python
@router.get("/admin/logs/server", response_model=list[ServerLogResponse])
async def admin_get_server_logs(
    level: str | None = Query(None),
    module: str | None = Query(None),
    request_id: str | None = Query(None),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Query server (FastAPI) logs — admin only."""
    service = LogService(db)
    return await service.query_server_logs(
        level=level,
        module=module,
        request_id=request_id,
        limit=limit,
        offset=offset,
    )
```

**Schema: ServerLogResponse**

```python
class ServerLogResponse(BaseModel):
    id: int
    level: str
    module: str
    message: str
    metadata: dict | None = Field(None, validation_alias="metadata_")
    request_id: UUID | None = None
    user_id: UUID | None = None
    device_id: str | None = None
    created_at: datetime

    model_config = {"from_attributes": True}
```

### 6.5 Log Cleanup Task

#### File: `server/app/tasks/log_cleanup.py`

```python
@scheduler.scheduled_job("cron", day_of_week="sun", hour=3, id="log_cleanup")
async def log_cleanup():
    """
    Clean up old logs — run weekly Sunday 03:00.
    - device_logs: delete > 90 days
    - server_logs: delete > 30 days
    """
    from datetime import datetime, timedelta, timezone

    from sqlalchemy import delete

    from app.db.database import async_session
    from app.db.models import DeviceLog, ServerLog

    cutoff_device = datetime.now(timezone.utc) - timedelta(days=90)
    cutoff_server = datetime.now(timezone.utc) - timedelta(days=30)

    try:
        async with async_session() as db:
            r1 = await db.execute(
                delete(DeviceLog).where(DeviceLog.created_at < cutoff_device)
            )
            r2 = await db.execute(
                delete(ServerLog).where(ServerLog.created_at < cutoff_server)
            )
            await db.commit()

            logger.info("task.log_cleanup",
                device_logs_deleted=r1.rowcount,
                server_logs_deleted=r2.rowcount,
            )
    except Exception as e:
        logger.error("task.log_cleanup_failed", error=str(e))
```

---

## 7. Config Changes

### 7.1 Thêm settings vào `config.py`

```python
class Settings(BaseSettings):
    ...

    # === AI Container (Phase 2) ===
    ai_service_url: str = "http://ai:8081"   # luni-ai container (internal Docker network)
    stt_language: str = "vi"                 # Default language gửi tới /stt
    max_interaction_length: int = 2000       # Max chars for text interaction
    max_audio_duration: int = 30             # Max seconds for voice recording

    # === Sync Data ===
    weather_sync_interval_minutes: int = 15
    weather_cache_ttl_seconds: int = 1200    # 20 min
    calendar_cache_ttl_seconds: int = 86400  # 24h
    sync_cache_ttl_seconds: int = 1200       # 20 min
```

> **Lưu ý:** API keys, model names, và các config AI-specific nằm trong `ai/.env` — không nằm trong server config.
> Server chỉ cần biết URL của AI container (`AI_SERVICE_URL`).

### 7.2 Thêm env vars vào `.env.example`

```bash
# === AI Container (Phase 2) ===
AI_SERVICE_URL=http://ai:8081         # luni-ai container URL (internal Docker network)
STT_LANGUAGE=vi                       # Default language gửi tới /stt

# === Sync Data ===
WEATHER_SYNC_INTERVAL_MINUTES=15
```

### 7.3 AI container env — `ai/.env.example`

```bash
# Config riêng của AI container — tuỳ implementation
# Ví dụ nếu dùng Gemini + faster-whisper + Piper:
# GEMINI_API_KEY=your_key_here
# GEMINI_MODEL=gemini-2.0-flash
# WHISPER_MODEL=base
# PIPER_VOICE=vi_VN-vais1000-medium
#
# Nếu dùng Ollama:
# OLLAMA_URL=http://ollama:11434
# OLLAMA_MODEL=qwen2.5:7b
```

---

## 8. Redis Cache — Full Structure (Phase 2)

```
# Weather data per location
weather:{lat:.2f}:{lon:.2f}           → JSON weather data          TTL: 20min

# Calendar per date
calendar:{YYYY-MM-DD}                 → JSON calendar + lunar       TTL: 24h

# Aggregated sync payload per device
sync:{device_id}                      → JSON full sync bundle       TTL: 20min

# Device runtime state (updated on every state_update WS message)
device:state:{device_id}              → JSON last known state       TTL: none

# Audio buffer tracking (for voice interaction)
audio:session:{device_id}             → "recording" | "processing"  TTL: 60s

# Rate limiting (Phase 4, but key structure defined now)
rate:{ip}:{endpoint}                  → request count               TTL: 60s
```

---

## 9. Dependencies

### 9.1 Server (`server/requirements.txt`) — Không thêm AI packages

```
# Phase 2 KHÔNG thêm AI packages vào server.
# Server chỉ gọi HTTP tới AI container — httpx (đã có) là đủ.
#
# === Already present, no changes needed ===
# httpx>=0.27         → gọi AI container + OpenWeather API
# redis[hiredis]>=5.0 → caching
# structlog>=24.1     → logging to DB
```

### 9.2 AI Container (`ai/requirements.txt`) — Tuỳ implementation

```
# Base (luôn cần):
fastapi>=0.115
uvicorn[standard]>=0.30

# Phần còn lại tuỳ vào lựa chọn implementation.
# Ví dụ nếu dùng faster-whisper + Piper + Gemini:
# faster-whisper>=1.0
# piper-tts>=1.2
# google-generativeai>=0.8
#
# Ví dụ nếu dùng Ollama + Edge TTS:
# edge-tts>=6.1
# httpx>=0.27
```

---

## 10. Router Updates

### `server/app/api/v1/router.py` — thêm routers mới

```python
from app.api.v1.data import router as data_router
from app.api.v1.interactions import router as interactions_router

api_router.include_router(data_router, prefix="/data", tags=["data"])
api_router.include_router(interactions_router, tags=["interactions"])
```

### `server/app/tasks/scheduler.py` — register new jobs

```python
# Import new task modules (their decorators auto-register with scheduler)
import app.tasks.weather_sync     # noqa: F401
import app.tasks.calendar_sync    # noqa: F401
import app.tasks.log_cleanup      # noqa: F401
```

---

## 11. WS Manager — Phase 2 Modifications

### Thay đổi chính:

1. **`connect_device`** → thêm push `sync_data` ngay sau connect
2. **`handle_device_message`** → connect log ingestion tới `LogService`
3. **`handle_device_message` (device_info)** → update DB (fw_version, model)
4. **Audio buffer** → new methods cho voice interaction
5. **State cache** → update Redis `device:state:{id}` on `state_update`

```python
# Key changes in handle_device_message:

elif msg_type == "device_info":
    # ★ MODIFY: Actually update DB
    async with async_session() as db:
        await db.execute(
            update(Device)
            .where(Device.id == device_id)
            .values(
                fw_version=payload.get("fw_version"),
                model=payload.get("model"),
            )
        )
        await db.commit()

elif msg_type == "log":
    # ★ MODIFY: Ingest to DB via LogService
    async with async_session() as db:
        service = LogService(db)
        log_schema = DeviceLogSchema(
            level=payload.get("level", "info"),
            tag=payload.get("tag", "unknown"),
            message=payload.get("message", ""),
            metadata=payload.get("metadata"),
        )
        await service.ingest_device_log(device_id, log_schema)

elif msg_type == "state_update":
    # ★ MODIFY: Cache state in Redis
    if self.redis:
        await self.redis.set(
            f"device:state:{device_id}",
            json.dumps(payload),
        )
    # Update DB last_state
    async with async_session() as db:
        await db.execute(
            update(Device)
            .where(Device.id == device_id)
            .values(last_state=payload)
        )
        await db.commit()
    await self.notify_app_clients(device_id, msg)
```

---

## 12. Verification Plan

### 12.1 Weather Service

```bash
# 1. Start services
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up

# 2. Register user + login → get token
TOKEN=$(curl -s -X POST http://localhost/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123!"}' | jq -r .access_token)

# 3. Fetch weather
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost/api/v1/data/weather?lat=21.03&lon=105.85"

# 4. Check Redis cache
docker-compose exec redis redis-cli GET "weather:21.03:105.85"

# 5. Verify cache hit (second call should be instant)
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost/api/v1/data/weather?lat=21.03&lon=105.85"
```

### 12.2 Calendar & Lunar

```bash
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost/api/v1/data/calendar?date=2026-05-28"
# Expected: {"lunar": {"day": ..., "month": ..., "year": "Bính Ngọ"}, "events": []}
```

### 12.3 sync_data

```bash
# Register a device with lat/lon
curl -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  "http://localhost/api/v1/devices" \
  -d '{"mac":"AA:BB:CC:DD:EE:FF","model":"luni_v2_s3c5"}'

# Set location
curl -X PATCH -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  "http://localhost/api/v1/devices/AA:BB:CC:DD:EE:FF" \
  -d '{"latitude":21.03,"longitude":105.85,"city":"Hà Nội"}'

# Get sync bundle
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost/api/v1/data/sync/AA:BB:CC:DD:EE:FF"
```

### 12.4 AI Container (internal — gọi qua docker exec)

```bash
# AI container không expose port ra host, phải exec vào container để test:

# Health check
docker-compose exec ai curl -s http://localhost:8081/health
# Expected: {"status":"ok","capabilities":{"chat":true,"stt":true,"tts":true,"vision":false}}

# Chat test
docker-compose exec ai curl -s -X POST http://localhost:8081/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"Xin chào!"}'
# Expected: {"text":"Chào bạn!...","emotion":"happy"}

# Hoặc test từ luni-api container (giống cách server thật sự gọi):
docker-compose exec api python -c "
import httpx, asyncio
async def test():
    async with httpx.AsyncClient() as c:
        r = await c.get('http://ai:8081/health')
        print(r.json())
asyncio.run(test())
"
```

### 12.5 Text Interaction (qua server API)

```bash
curl -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  "http://localhost/api/v1/devices/AA:BB:CC:DD:EE:FF/interact" \
  -d '{"text":"Hôm nay thời tiết thế nào?"}'
# Expected: {"input":"...","output":"...","emotion":"happy","latency_ms":...}

# Get history
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost/api/v1/devices/AA:BB:CC:DD:EE:FF/interactions"
```

### 12.6 Server Logs (Admin)

```bash
ADMIN_TOKEN=...
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
  "http://localhost/api/v1/admin/logs/server?level=info&limit=10"
```

### 12.7 WebSocket Integration Test

```bash
# Device WS: connect → auth → receive sync_data
websocat ws://localhost/ws/device
> {"type":"auth","payload":{"device_token":"...","mac":"AA:BB:CC:DD:EE:FF"}}
# Should receive: auth_result (ok) → sync_data (weather + calendar)

# App WS: connect → receive current_state
websocat "ws://localhost/ws/app/AA:BB:CC:DD:EE:FF?token=$TOKEN"
# Should receive: current_state → (then interaction_result when interactions happen)
```

---

## 13. Implementation Order (Recommended)

| Step | Task | Est. | Depends on |
|------|------|------|------------|
| 1 | Weather service + Redis cache | 2d | — |
| 2 | Calendar service (lunar algorithm) | 2d | — |
| 3 | sync_data aggregation service | 1d | Step 1, 2 |
| 4 | Data API endpoints | 1d | Step 3 |
| 5 | Background tasks (weather_sync, calendar_sync) | 1d | Step 3 |
| 6 | WS integration: push sync_data on connect | 0.5d | Step 3 |
| 7 | AI container: Dockerfile + server.py (implement /health, /chat, /stt, /tts) | 3d | — |
| 8 | AI client: `server/app/services/ai.py` (HTTP client gọi container) | 1d | Step 7 |
| 9 | Interaction service + API endpoints | 2d | Step 8 |
| 10 | Audio codec + voice interaction flow | 2d | Step 8 |
| 11 | WS manager: audio buffer + routing | 2d | Step 10 |
| 12 | WS manager: device_info/log/state DB updates | 1d | — |
| 13 | DB log processor (structlog → PostgreSQL) | 1d | — |
| 14 | Server log query API | 0.5d | Step 13 |
| 15 | Log cleanup task | 0.5d | — |
| 16 | Config updates + env vars | 0.5d | — |
| 17 | Integration testing | 2d | All |

**Parallel tracks:**
- Track A (Steps 1-6): sync_data system — có thể deploy + test độc lập
- Track B (Steps 7-11): AI container + integration — container build trước, server client sau
- Track C (Steps 12-15): Logging + cleanup — độc lập

**Total estimate: ~21 working days (~4 weeks)**

---

## 14. Risk & Decisions

| # | Risk / Decision | Mitigation |
|---|----------------|------------|
| 1 | OpenWeather API key not configured | Graceful fallback: sync_data có weather=null, device vẫn hoạt động |
| 2 | AI container down hoặc chưa implement | Server check `/health` capabilities trước khi gọi. Trả lỗi rõ ràng nếu AI unavailable. Device vẫn hoạt động bình thường (chỉ mất AI features) |
| 3 | AI implementation chưa quyết | Không block Phase 2 — chỉ cần AI container đúng API contract (§4.2). Implementation có thể thay đổi bất cứ lúc nào |
| 4 | Lunar calendar accuracy | Dùng thuật toán Hồ Ngọc Đức — đã verify cho VN. Unit test các ngày đặc biệt |
| 5 | Audio latency (voice interaction) | Target <3s total (STT + Chat + TTS). Tuỳ implementation trong AI container |
| 6 | ffmpeg process overhead | Mỗi voice interaction spawn 1 ffmpeg process. OK cho <100 concurrent |
| 7 | DB log write pressure | Batch writer (100 items hoặc 5s), async queue, drop khi full |
| 8 | Redis memory | Weather + calendar + sync cache tổng ~1MB cho 100 devices. Rất nhỏ |
| 9 | AI container resource usage | Tuỳ implementation: self-hosted models cần RAM/CPU nhiều hơn, API calls cần ít hơn. Docker resource limits nếu cần |

---

> **Next phases:**
> - Phase 3: Web dashboard (Next.js), OTA management, text chat UI, device control UI
> - Phase 4: Rate limiting, push notifications, monitoring, log partitioning
