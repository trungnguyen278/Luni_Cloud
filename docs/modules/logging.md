# Module: Logging

Logging thống nhất cho cả server và device. Code: `core/logging.py` (structlog), `services/log_service.py` + `services/log_db.py` (ingest/query), `api/v1/logs.py` (admin endpoints).

## Log levels (chung cho mọi component)

| Level | # | Server (FastAPI) | Device (ESP32) |
|-------|---|------------------|----------------|
| DEBUG | 10 | DB queries, WS frames | SPI frames, heap |
| INFO | 20 | requests, connections | state changes, boot |
| WARN | 30 | rate limit, slow query | low battery, wifi unstable |
| ERROR | 40 | exceptions, WS errors | hardware fault, OTA fail |

## Server logging (structlog)

- Output JSON, mỗi request gắn `request_id` (middleware) để trace.
- Ví dụ event đã thấy thực tế: `request.start`, `auth.login`, `request.end`, `ws.device_authenticated`, `ws.auth_timeout`, `ws.auth_failed`.
- Cấp log mặc định: env `LOG_LEVEL` (dev = debug).

## Device log ingestion

Device gửi message `log` qua WS → `LogService.ingest_device_log` lưu vào `device_logs` **nếu** level ≥ `device.config.log_level`. Đổi log level của một device: cập nhật `config.log_level` rồi push `config_update` qua WS.

## Admin endpoints (`api/v1/logs.py`)

| Method | Endpoint | Auth | Mô tả |
|--------|----------|------|-------|
| GET | `/devices/{id}/logs` | user | Logs 1 device (filter `level,tag,from_dt,to_dt,limit,offset`) |
| GET | `/logs` | user | Logs tất cả device của user |
| GET | `/admin/logs/devices` | admin | Logs mọi device |
| GET | `/admin/logs/server` | admin | Server logs (filter `level,module,request_id`) |
| POST | `/admin/logs/config` | admin | Đổi server log level **runtime** (không restart) |

Đổi runtime: reconfigure structlog `make_filtering_bound_logger(new_level)`.

## Retention

`device_logs` dự kiến partition theo tháng, task `log_cleanup` drop partition cũ (~90 ngày).
