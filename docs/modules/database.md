# Module: Database

PostgreSQL 16, truy cập async qua SQLAlchemy 2 + asyncpg. Models: `db/models.py`. Migrations: Alembic (`db/migrations/`). **Mọi client (App, Web, Device) đi qua FastAPI — không client nào nối DB trực tiếp.**

Chạy migration: `docker compose exec api alembic -c /app/alembic.ini upgrade head`.

## Core tables (đã triển khai)

### users
`id UUID pk` · `email unique` · `password` (bcrypt) · `name` · `role` (`user`|`admin`) · `avatar_url` · `is_active` · `created_at` · `updated_at` · `last_login`.

### refresh_tokens
`id UUID pk` · `user_id → users` (cascade) · `token unique` · `device_info` · `expires_at` · `created_at`. Index: `user_id`, `expires_at`. Xoá khi logout/expire (task cleanup).

### devices
`id VARCHAR(17) pk` = MAC `AA:BB:CC:DD:EE:FF` · `owner_id → users` (cascade) · `name` · `model` · `fw_version` · `hw_version` · `location` · `timezone` (default `Asia/Ho_Chi_Minh`) · `latitude`/`longitude`/`city` · `config JSONB` (`volume`, `brightness`, `log_level`, `auto_ota`, `sleep_schedule`) · `device_token VARCHAR(128)` (pre-shared WS auth) · `is_online` · `last_state JSONB` · `last_seen` · timestamps.

### device_shares
PK (`device_id`, `user_id`) · `permission` (`view`|`control`) · `created_at`. Chia sẻ thiết bị cho user khác.

### device_logs / server_logs
Log từ device (qua WS) và server (structlog). Xem [logging.md](logging.md). `device_logs` dự kiến partition theo tháng, retention ~90 ngày (task `log_cleanup`).

### interactions
Lịch sử hội thoại App/Web ↔ Robot: `device_id` · `user_id` · `direction` · `source` (`app`|`web`|`voice`|`button`) · `input_text` · `output_text` · `emotion` · `latency_ms` · `created_at`. (Migration `002` nới rộng `direction`.)

## Planned tables

`firmware`, `ota_history` (OTA + R2), `usage_stats` (thống kê ngày). Đã có trong thiết kế gốc nhưng route/feature tương ứng chưa triển khai — xem trạng thái trong [../architecture.md](../architecture.md).

> Để xem schema thật, đọc `server/app/db/models.py` và migration mới nhất trong `db/migrations/versions/`.
