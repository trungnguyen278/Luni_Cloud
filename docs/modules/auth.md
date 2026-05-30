# Module: Auth & Security

Ba loại danh tính trong hệ thống, mỗi loại một cơ chế xác thực. Code: `core/security.py`, `api/deps.py`, `services/auth.py`, `api/v1/auth.py`.

## 1. User auth (App/Web) — JWT

- `POST /auth/register`, `POST /auth/login` → `{ user, access_token, refresh_token }`.
- Password hash bằng **bcrypt** (`passlib`). Verify trong `services/auth.py:login()`.
- **Access token**: JWT HS256, `type=access`, hết hạn `JWT_ACCESS_EXPIRE_MINUTES` (mặc định 60').
- **Refresh token**: JWT HS256, `type=refresh`, có `jti`, lưu trong bảng `refresh_tokens`, hết hạn `JWT_REFRESH_EXPIRE_DAYS` (mặc định 30 ngày).
- `POST /auth/refresh` → verify chữ ký + `type=refresh` + token còn trong DB (chưa revoke) + chưa hết hạn → cấp access token mới.
- `POST /auth/logout` → xoá refresh token khỏi DB (revoke).
- `GET /auth/me` (Bearer) → thông tin user hiện tại.

Mọi JWT ký bằng `SECRET_KEY`. Đổi `SECRET_KEY` ⇒ vô hiệu hoá toàn bộ token đang phát hành.

### Request dependency

`api/deps.py`:
- `get_current_user` — đọc `Authorization: Bearer`, decode JWT, check `type=access`, load `User`, chặn nếu `is_active=false` (403).
- `require_admin` — yêu cầu `user.role == "admin"` (403 nếu không).

## 2. Device auth — device_token (pre-shared)

> ⚠️ Thực tế triển khai dùng **device_token + MAC** (không phải MAC-only như bản plan cũ).

- Khi user pair robot: `POST /devices {mac, model, name}` (JWT) → server tạo `device_token = secrets.token_hex(64)` (128 hex chars) lưu vào `devices.device_token`, trả về `{ device_id, device_token, admin_secret }`.
- App ghi `device_token` vào robot qua BLE (GATT `0x0008`).
- Robot kết nối `/ws/device`, gửi message `auth` chứa `{ device_token, mac, fw_version, model }` trong vòng 5s.
- Server tra `Device` theo MAC, so `device.device_token == device_token` → ok / fail (close 4001). Xem [websocket.md](websocket.md).
- Re-register cùng MAC + cùng owner → cấp `device_token` mới (rotate). Cùng MAC + khác owner → `409 CONFLICT`.

> **MAC canonical**: server chuẩn hoá MAC về dạng **không dấu hai chấm, viết hoa** (`AABBCCDDEEFF`) — đúng dạng firmware sinh ra (`getDLuniceEfuseID()`). `POST /devices` nhận cả `AA:BB:CC:DD:EE:FF` lẫn `AABBCCDDEEFF`; lookup WS auth cũng chuẩn hoá tương tự (`normalize_mac` trong `core/security.py`). Vì `admin_secret = HMAC(mac, SECRET_KEY)`, dạng MAC phải nhất quán giữa register / WS auth / admin HMAC.

## 3. Admin BLE (Level 2) — admin_secret + HMAC

Dùng cho thao tác admin trên robot qua BLE (factory reset, diagnostics, rollback) mà không cần Internet.

```
admin_secret = HMAC-SHA256( mac , SECRET_KEY )          # server derive (security.py)
```

- Trả trong response `POST /devices`; App ghi vào robot qua BLE (`0x0014`) lúc pairing.
- Khi cần thao tác admin, App gọi **`POST /devices/{device_id}/ble-token`** (JWT, chỉ owner/admin) → server trả `{ admin_token, timestamp }`.
  - `admin_token` (hex) = `HMAC-SHA256(mac || timestamp, admin_secret)` (32 byte) **+ timestamp dạng 4 byte little-endian** → tổng 36 byte, App ghi nguyên vẹn vào GATT `0x0012`.
  - Robot verify: `HMAC-SHA256(mac || timestamp_str, admin_secret) == token[:32]` và `timestamp` trong ±5 phút (replay protection).
- `admin_secret` ổn định theo MAC; chỉ đổi khi admin rotate `SECRET_KEY`.
- Chi tiết flow + GATT: [Luni_App ble-pairing](https://github.com/trungnguyen278/Luni_App/blob/main/docs/ble-pairing.md), [Luni_Robot BLE_APP_DEV](https://github.com/trungnguyen278/Luni_Robot/blob/main/esp32-c5/docs/BLE_APP_DEV.md).

## Error envelope

```json
{ "error": { "code": "AUTH_REQUIRED", "message": "Invalid email or password", "details": {} } }
```

| Code | HTTP |
|------|------|
| AUTH_REQUIRED / AUTH_EXPIRED | 401 |
| FORBIDDEN | 403 |
| NOT_FOUND | 404 |
| CONFLICT / DEVICE_OFFLINE | 409 |
| VALIDATION_ERROR | 422 |
| RATE_LIMITED | 429 |

## Hardening & known issues

- **Rate limit**: `/auth/login` (10 req / 5 phút / IP) và `/auth/register` (5 req / giờ / IP) — fixed-window backed by Redis (`rate_limit` trong `api/deps.py`). **Fail-open**: nếu Redis sập thì không chặn đăng nhập.
- **WS token trong query string** (`/ws/app/{id}?token=`, `/ws/device`): có thể bị log bởi nginx/Cloudflare. Cân nhắc chuyển sang `Sec-WebSocket-Protocol` header hoặc ticket ngắn hạn. *Chưa xử lý — theo dõi.*
- **Access token không revoke được giữa chừng**: TTL 60' nên user bị `is_active=false` vẫn dùng được tối đa 60'. Refresh thì bị chặn ngay (check DB).
- **`device_token` không hết hạn**: chỉ rotate khi re-register. Token rò rỉ ⇒ phải re-register thủ công.
- **BLE GATT plaintext**: provisioning dựa vào tính kề-cận vật lý (one-time). Cân nhắc bật mã hoá BLE ở production.
- **⚠️ Firmware admin-token timestamp (BLOCKER cho admin BLE)**: `BluetoothService::verifyAdminToken` so `timestamp` với `esp_timer_get_time()` (uptime kể từ boot), **không phải** wall-clock. Server gửi Unix epoch ⇒ luôn lệch ⇒ admin auth fail dù HMAC khớp. **Cần sửa firmware** dùng wall-clock (SNTP `time(NULL)`) trước khi admin BLE chạy được trên phần cứng thật. HMAC contract đã đúng (đã verify byte-level).
