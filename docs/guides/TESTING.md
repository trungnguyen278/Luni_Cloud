# Luni Cloud — Testing Guide

Hướng dẫn test từng feature của Phase 1 + Phase 2.

> Tất cả lệnh dưới đây giả định đang chạy dev mode và đã migration.

## Chuẩn bị

```bash
# Start services
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d

# Run migration
docker-compose exec api alembic upgrade head
```

## 1. Auth — Đăng ký / Đăng nhập

```bash
# Register
curl -s -X POST http://localhost/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123!","name":"Test User"}' | python -m json.tool

# Login → lấy token
TOKEN=$(curl -s -X POST http://localhost/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123!"}' \
  | python -c "import sys,json; print(json.load(sys.stdin)['access_token'])")

echo "Token: $TOKEN"

# Xem profile
curl -s -H "Authorization: Bearer $TOKEN" \
  http://localhost/api/v1/auth/me | python -m json.tool
```

## 2. Device — Đăng ký thiết bị

```bash
# Register device (MAC address as ID)
curl -s -X POST http://localhost/api/v1/devices \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"mac":"AA:BB:CC:DD:EE:FF","model":"luni_v2_s3c5"}' | python -m json.tool

# Lưu lại device_token từ response để test WS

# Set location cho device
curl -s -X PATCH http://localhost/api/v1/devices/AA:BB:CC:DD:EE:FF \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"latitude":21.03,"longitude":105.85,"city":"Hà Nội","name":"Luni phòng khách"}' \
  | python -m json.tool

# List devices
curl -s -H "Authorization: Bearer $TOKEN" \
  http://localhost/api/v1/devices | python -m json.tool
```

## 3. Weather — Thời tiết

```bash
# Fetch weather (cần OPENWEATHER_API_KEY trong .env)
curl -s -H "Authorization: Bearer $TOKEN" \
  "http://localhost/api/v1/data/weather?lat=21.03&lon=105.85" | python -m json.tool

# Nếu không có API key, sẽ trả:
# {"error": "Weather service unavailable (no API key configured)"}

# Kiểm tra Redis cache
docker-compose exec redis redis-cli GET "weather:21.03:105.85"

# Gọi lần 2 — phải hit cache (response nhanh hơn)
curl -s -H "Authorization: Bearer $TOKEN" \
  "http://localhost/api/v1/data/weather?lat=21.03&lon=105.85" | python -m json.tool
```

## 4. Calendar — Lịch âm Việt Nam

```bash
# Hôm nay
curl -s -H "Authorization: Bearer $TOKEN" \
  "http://localhost/api/v1/data/calendar" | python -m json.tool

# Ngày cụ thể
curl -s -H "Authorization: Bearer $TOKEN" \
  "http://localhost/api/v1/data/calendar?date=2026-01-29" | python -m json.tool
# Tết Nguyên Đán 2026 = 29/01/2026 → Âm lịch: 1/1 Bính Ngọ

# Ngày đặc biệt — Trung Thu
curl -s -H "Authorization: Bearer $TOKEN" \
  "http://localhost/api/v1/data/calendar?date=2026-10-05" | python -m json.tool
# Trung Thu 2026 → Âm lịch: 15/8
```

## 5. sync_data — Đồng bộ dữ liệu cho device

```bash
# Xem sync payload cho device
curl -s -H "Authorization: Bearer $TOKEN" \
  "http://localhost/api/v1/data/sync/AA:BB:CC:DD:EE:FF" | python -m json.tool

# Expected: {time: {...}, weather: {...} hoặc null, calendar: {...}, location: {...}}

# Force push (device phải online qua WS)
curl -s -X POST -H "Authorization: Bearer $TOKEN" \
  "http://localhost/api/v1/data/sync/AA:BB:CC:DD:EE:FF/push"
# Nếu device offline: {"detail": "Device AA:BB:CC:DD:EE:FF is offline"}
```

## 6. AI Chat — Text interaction

```bash
# Chat với device qua AI (AI container phải running)
curl -s -X POST http://localhost/api/v1/devices/AA:BB:CC:DD:EE:FF/interact \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"text":"Hôm nay thời tiết thế nào?"}' | python -m json.tool

# Khi AI container dùng stub:
# {"input":"Hôm nay thời tiết thế nào?","output":"[stub] Tôi nhận được: ...","emotion":"neutral",...}

# Khi AI container down:
# HTTP 503: {"detail": "AI service unavailable"}

# Xem lịch sử chat
curl -s -H "Authorization: Bearer $TOKEN" \
  "http://localhost/api/v1/devices/AA:BB:CC:DD:EE:FF/interactions" | python -m json.tool

# Xoá lịch sử (chỉ owner)
curl -s -X DELETE -H "Authorization: Bearer $TOKEN" \
  "http://localhost/api/v1/devices/AA:BB:CC:DD:EE:FF/interactions"
```

## 7. AI Container — Test trực tiếp

```bash
# Dev mode (port exposed):
curl -s http://localhost:8081/health | python -m json.tool

# Chat stub
curl -s -X POST http://localhost:8081/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"Xin chào!"}' | python -m json.tool

# STT (stub — trả 501)
curl -s -X POST http://localhost:8081/stt -F "file=@test.wav"

# TTS (stub — trả 501)
curl -s -X POST http://localhost:8081/tts -d "text=Xin chào"

# Production mode (không expose port):
docker-compose exec ai curl -s http://localhost:8081/health
docker-compose exec api python -c "
import httpx, asyncio
async def test():
    async with httpx.AsyncClient() as c:
        r = await c.get('http://ai:8081/health')
        print(r.json())
asyncio.run(test())
"
```

## 8. Server Logs — Admin query

```bash
# Cần tạo admin user trước:
# (sửa trực tiếp trong DB hoặc register rồi update role)
docker-compose exec db psql -U luni -c \
  "UPDATE users SET role='admin' WHERE email='test@example.com';"

# Re-login để lấy token mới với role admin
ADMIN_TOKEN=$(curl -s -X POST http://localhost/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123!"}' \
  | python -c "import sys,json; print(json.load(sys.stdin)['access_token'])")

# Query server logs
curl -s -H "Authorization: Bearer $ADMIN_TOKEN" \
  "http://localhost/api/v1/admin/logs/server?limit=10" | python -m json.tool

# Filter by level
curl -s -H "Authorization: Bearer $ADMIN_TOKEN" \
  "http://localhost/api/v1/admin/logs/server?level=error&limit=5" | python -m json.tool

# Query device logs (all devices)
curl -s -H "Authorization: Bearer $ADMIN_TOKEN" \
  "http://localhost/api/v1/admin/logs/devices?limit=10" | python -m json.tool

# Change server log level at runtime
curl -s -X POST -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  http://localhost/api/v1/admin/logs/config \
  -d '{"level":"debug"}'
```

## 9. WebSocket — Device + App Client

### Device WS (cần tool như websocat hoặc wscat)

```bash
# Install websocat: https://github.com/nicholasb/websocat
# hoặc: npm install -g wscat

# Connect as device
websocat ws://localhost/ws/device

# Gửi auth message:
{"type":"auth","payload":{"device_token":"<token-from-register>","mac":"AA:BB:CC:DD:EE:FF"}}

# Expected responses:
# 1. auth_result: {"type":"auth_result","payload":{"status":"ok"}}
# 2. sync_data:   {"type":"sync_data","payload":{"time":{...},"weather":...,"calendar":...}}

# Gửi heartbeat:
{"type":"heartbeat","id":"1","ts":1234567890}

# Gửi state update:
{"type":"state_update","id":"2","ts":1234567890,"payload":{"battery":85,"wifi_rssi":-45}}
```

### App Client WS

```bash
# Connect as app client watching a device
websocat "ws://localhost/ws/app/AA:BB:CC:DD:EE:FF?token=$TOKEN"

# Expected: current_state message
# Khi device gửi state_update → app client nhận được forward
```

## 10. Redis — Kiểm tra cache

```bash
docker-compose exec redis redis-cli

# Xem tất cả keys
KEYS *

# Weather cache
GET "weather:21.03:105.85"

# Calendar cache
GET "calendar:2026-05-28"

# Sync cache for device
GET "sync:AA:BB:CC:DD:EE:FF"

# Device state cache
GET "device:state:AA:BB:CC:DD:EE:FF"
```

## 11. Database — Verify tables

```bash
docker-compose exec db psql -U luni -c "\dt"

# Expected tables:
# users, refresh_tokens, devices, device_shares,
# device_logs, server_logs, usage_stats,
# firmware, ota_history, interactions,
# alembic_version
```

## Troubleshooting

### API không start

```bash
docker-compose logs api
# Kiểm tra: DB connection, Redis connection, migration status
```

### AI container restart loop

```bash
docker-compose logs ai
# Thường do thiếu dependencies trong ai/requirements.txt
```

### Migration fail

```bash
docker-compose exec api alembic history    # Xem migration history
docker-compose exec api alembic current    # Xem version hiện tại
docker-compose exec api alembic upgrade head --sql  # Preview SQL
```

### Reset toàn bộ data

```bash
docker-compose down -v    # Xoá tất cả volumes
docker-compose up -d
docker-compose exec api alembic upgrade head
```
