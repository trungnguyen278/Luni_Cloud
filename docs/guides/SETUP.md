# Luni Cloud — Setup Guide

Hướng dẫn cài đặt và chạy Luni Cloud từ đầu.

## Yêu cầu hệ thống

- Docker Engine >= 24.0
- Docker Compose >= 2.20
- Git
- (Tuỳ chọn) OpenWeather API key — [đăng ký free](https://openweathermap.org/api)

## 1. Clone và cấu hình

```bash
git clone <repo-url> Luni_Cloud
cd Luni_Cloud

# Tạo file .env từ template
cp .env.example .env
```

Mở `.env` và sửa các giá trị bắt buộc:

```bash
# BẮT BUỘC — đổi cả hai giá trị này
SECRET_KEY=<random-64-char-string>
DB_PASSWORD=<strong-password>
# Nếu password chứa ký tự $, phải escape thành $$
# Ví dụ: pa$$word → Docker Compose đọc thành pa$word

# TUỲ CHỌN — weather sẽ trả null nếu không có
OPENWEATHER_API_KEY=<your-key>

# DEV — đổi nếu chạy local
ENVIRONMENT=development
LOG_LEVEL=debug
```

Tạo `.env` cho AI container:

```bash
cp ai/.env.example ai/.env
# Hiện tại dùng stub — không cần config gì thêm
```

## 2. Chạy với Docker Compose

### Production mode

```bash
docker-compose up -d
```

7 services sẽ start: `db`, `redis`, `ai`, `api`, `web`, `nginx`, `tunnel`

### Development mode (khuyên dùng khi dev)

```bash
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up
```

Khác biệt so với production:
- API server hot-reload (sửa code → tự restart)
- AI container hot-reload + expose port 8081 ra host
- Log level = debug
- Cloudflare tunnel tắt (truy cập qua `http://localhost`)
- Không cần `CF_TUNNEL_TOKEN`

## 3. Chạy database migration

Sau khi services đã start:

```bash
docker-compose exec api alembic -c /app/alembic.ini upgrade head
```

Lệnh này tạo tất cả tables cần thiết (users, devices, interactions, logs, ...).

## 4. Verify

### Health check

```bash
# API server
curl http://localhost/api/v1/health
# Expected: {"status":"ok","version":"0.1.0"}

# AI container (chỉ trong dev mode — port 8081 exposed)
curl http://localhost:8081/health
# Expected: {"status":"ok","capabilities":{"chat":true,"stt":false,...}}

# Hoặc qua docker exec (cả production lẫn dev):
docker-compose exec ai curl -s http://localhost:8081/health
```

### Tạo user đầu tiên

```bash
curl -X POST http://localhost/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "YourPassword123!",
    "name": "Admin"
  }'
```

### Login và test API

```bash
# Login
TOKEN=$(curl -s -X POST http://localhost/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"YourPassword123!"}' \
  | python -c "import sys,json; print(json.load(sys.stdin)['access_token'])")

echo $TOKEN

# Test weather (cần OPENWEATHER_API_KEY)
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost/api/v1/data/weather?lat=21.03&lon=105.85"

# Test calendar (không cần API key)
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost/api/v1/data/calendar?date=2026-05-28"

# Test AI chat (sẽ trả stub response)
# Cần register device trước — xem TESTING.md
```

## 5. API Documentation (Swagger)

Chỉ khả dụng trong development mode:

```
http://localhost/api/docs      # Swagger UI
http://localhost/api/redoc     # ReDoc
```

## 6. Xem logs

```bash
# Tất cả services
docker-compose logs -f

# Chỉ API server
docker-compose logs -f api

# Chỉ AI container
docker-compose logs -f ai
```

## 7. Dừng services

```bash
docker-compose down           # Dừng, giữ data
docker-compose down -v        # Dừng + xoá volumes (MẤT DATA)
```

## Cấu trúc Docker services

```
┌──────────────────────────────────────────────────────┐
│  Internet                                            │
│       │                                              │
│  ┌────▼─────┐                                        │
│  │ Cloudflare│ (tunnel — chỉ production)             │
│  │ Tunnel    │                                       │
│  └────┬─────┘                                        │
│       │                                              │
│  ┌────▼─────┐    ┌──────────┐    ┌──────────┐       │
│  │  Nginx   │───▶│ luni-api │───▶│ luni-ai  │       │
│  │  :80     │    │ :8000    │    │ :8081    │       │
│  │          │    │          │    │ (internal)│       │
│  │          │    │          │    └──────────┘       │
│  │          │    │          │                        │
│  │          │    │    ┌─────▼──┐  ┌─────────┐       │
│  │          │    │    │Postgres│  │  Redis   │       │
│  │          │    │    │ :5432  │  │  :6379   │       │
│  └──────────┘    │    └────────┘  └─────────┘       │
│                  └──────────┘                        │
│  ┌──────────┐                                        │
│  │ luni-web │ (Next.js :3000)                        │
│  └──────────┘                                        │
└──────────────────────────────────────────────────────┘
```

## Tiếp theo

- [TESTING.md](TESTING.md) — Hướng dẫn test từng feature
- [API.md](API.md) — Danh sách đầy đủ API endpoints
