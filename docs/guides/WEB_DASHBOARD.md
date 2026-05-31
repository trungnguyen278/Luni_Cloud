# Luni Web Dashboard — UI Spec (for Claude design)

Bản mô tả để đưa vào Claude design dựng giao diện **web admin console** của Luni.
Trọng tâm: **Dashboard tổng quan** + **quản lý/upload Firmware (OTA)**. Mọi màn
hình dưới đây đều đã có **API thật** ở backend (FastAPI) — phần này mô tả UI và
ghi rõ endpoint tương ứng để nối dữ liệu thật, không dùng mock.

> Prototype tham khảo (mock, chỉ để lấy bố cục + màu): `Luni_App/ui_design/screens-admin-dash.jsx`.
> Backend hiện tại: container `web` (`Luni_Cloud/web`) mới chỉ serve trang
> placeholder — cần thay bằng app thật (đề xuất Next.js hoặc Vite + React).

---

## 1. Bối cảnh & người dùng

- **Đối tượng:** operator/admin của fleet robot Luni (role = `admin`).
- **Mục đích:** giám sát thiết bị, người dùng, log, và **phát hành firmware OTA**.
- **Ngôn ngữ UI:** Tiếng Việt.
- **Truy cập:** chỉ user `role=admin` (đăng nhập qua `/auth/login`, gọi
  `/auth/me` để xác nhận role; non-admin → chặn vào console).
- **Base URL API:** `/api/v1` (cùng domain, qua nginx). WS: `wss://<domain>/ws/app/...`.
- **Auth header:** `Authorization: Bearer <access_token>` cho mọi request (trừ
  `/auth/login`, `/auth/refresh`). Refresh khi 401 qua `/auth/refresh`.

---

## 2. Design system

Lấy từ prototype (dark, data-dense console):

| Token | Giá trị | Dùng cho |
|-------|---------|----------|
| `bg` | `#0a0e1a` | nền trang |
| `bg1` | `#0e1322` | card/panel |
| `bg2` | `#141b2e` | input, hàng hover, tab active |
| `line` | `rgba(255,255,255,.08)` | viền/đường kẻ |
| `cyan` | `#5be9ff` | nhấn chính, link, CTA |
| `green` | `#46e8b0` | online/thành công |
| `amber` | `#ffd96b` | cảnh báo/beta |
| `red` | `#ff6b8a` | lỗi/nguy hiểm |
| `violet` | `#b9a0ff` | phụ trợ |
| `tx` | `#e8ecf4` | chữ chính |
| `mut` | `#8892a8` | chữ phụ |
| `faint` | `#5a647a` | chữ mờ/metadata |

- **Font:** Inter / system-ui. Heading 800 weight, body 13–14px.
- **Bo góc:** card 14px, input/nút 9–10px, pill 999px.
- **Khoảng cách:** padding card 16–18px, gap lưới 12–16px.
- **Pill trạng thái:** chữ 11px/700, nền là màu nhấn @ ~13% alpha.

---

## 3. Layout tổng

Hai cột: **Sidebar (210px) + Main (flex)**.

```
┌──────────┬───────────────────────────────────────────┐
│  Luni    │  [Tiêu đề mục]                  [user ▾]   │
│  admin   │  ─────────────────────────────────────────│
│          │                                            │
│ ◳ Tổng quan                                           │
│ ▦ Thiết bị   │   <nội dung theo tab>                  │
│ ◉ Người dùng │                                        │
│ ⬢ Firmware   │                                        │
│ ≣ Nhật ký    │                                        │
│          │                                            │
│ v0.x ·   │                                            │
└──────────┴───────────────────────────────────────────┘
```

- Logo gradient cyan→violet + chữ "Luni" + nhãn "admin".
- Mục sidebar: Tổng quan · Thiết bị · Người dùng · Firmware · Nhật ký. Mục active
  nền `bg2`, chữ `cyan`.
- Góc trên-phải main: tên admin + nút đăng xuất (xoá token → về `/login`).
- Responsive: < 900px sidebar thu thành drawer (hamburger).
- **States chung mỗi bảng:** loading (skeleton/spinner cyan), empty ("Chưa có dữ
  liệu."), error (banner đỏ + nút "Thử lại").

---

## 4. Màn hình

### 4.1 Đăng nhập admin (`/login`)
- Form email + mật khẩu, nền `bg`, card giữa màn.
- `POST /auth/login {email, password}` → lưu `access_token`+`refresh_token`.
- Gọi `GET /auth/me`; nếu `role != "admin"` → hiện lỗi "Tài khoản không có quyền
  quản trị" và không vào console.

### 4.2 Tổng quan (Overview)
4 thẻ số liệu trên cùng, 2 panel dưới (biểu đồ 7 ngày + phân bố cảm xúc).

| Thẻ | Nguồn dữ liệu |
|-----|---------------|
| Thiết bị online | đếm từ `GET /admin/... ` hoặc tổng hợp client từ danh sách thiết bị (online/total) |
| Người dùng | `GET /admin/users` (đếm) |
| Tương tác/ngày | tổng hợp từ stats các thiết bị (`/devices/{id}/stats`) |
| Lỗi 24h | `GET /admin/logs/server?level=error` (đếm) |

- Panel "Hoạt động 7 ngày": bar chart — gộp `daily_interactions` từ stats.
- Panel "Phân bố cảm xúc": thanh ngang theo emotion (từ interactions, nếu chưa có
  API tổng hợp thì để trống/àn — KHÔNG mock).
- *Lưu ý:* hiện chưa có 1 endpoint "overview" gộp sẵn — hoặc gọi nhiều endpoint
  rồi tổng hợp ở client, hoặc đề xuất thêm `GET /admin/overview` (xem §6).

### 4.3 Thiết bị (Devices)
Bảng: **Thiết bị · Chủ sở hữu · Trạng thái · FW · Pin · (hành động)**.
- Dữ liệu: chưa có endpoint admin "tất cả thiết bị" → đề xuất `GET /admin/devices`
  (xem §6). Tạm thời có thể bỏ tab này ở v1 hoặc chỉ hiện thiết bị của admin qua
  `GET /devices`.
- Hàng click → drawer chi tiết: trạng thái (`GET /devices/{id}/status`), cấu hình,
  nút gửi lệnh (`POST /devices/{id}/command`), xem log (`GET /devices/{id}/logs`).
- Pill trạng thái: online=green, offline=faint.

### 4.4 Người dùng (Users)
Bảng: **Tên · Email · Vai trò · Số thiết bị · (hành động)**.
- `GET /admin/users` → `[{id, email, name, role, is_active, device_count, created_at, last_login}]`.
- Hành động: đổi vai trò / khoá (`PATCH /admin/users/{id} {role?, is_active?}`),
  vô hiệu hoá (`DELETE /admin/users/{id}`).
- Pill vai trò: admin=violet, user=mut. is_active=false → hàng mờ + pill đỏ "Đã khoá".

### 4.5 ⭐ Firmware (OTA) — trọng tâm
Hai khối: **(A) Bảng firmware** và **(B) Triển khai OTA**, cùng **(C) Dialog upload**.

**(A) Bảng firmware** — header có nút `+ Tải lên firmware` (mở dialog C).
Cột: **Phiên bản · Model · Kênh · Kích thước · Đã cài · Trạng thái · (xoá)**.
- `GET /admin/firmware` →
  `[{id, version, model, channel, size, sha256, changelog, is_active, installed, created_at}]`.
- `size` hiển thị MB (vd `1.2 MB`); `installed` = số thiết bị đã cài (đếm OTA
  `completed`); pill kênh: stable=green, beta=amber.
- Nút xoá mỗi hàng → confirm → `DELETE /admin/firmware/{id}` (xoá cả binary).

**(B) Panel "Triển khai OTA"**
- Select phiên bản firmware + (tuỳ chọn) chọn thiết bị/nhóm + nút **"Đẩy OTA"**.
- Mỗi thiết bị đích: `POST /devices/{id}/ota {firmware_id}`.
- Sau khi đẩy: hiện tiến trình realtime nếu mở WS `/ws/app/{device_id}?token=` và
  nghe event `ota_progress` (`payload.percent`, `payload.phase`); hoặc poll lại.
- *Lưu ý:* "đẩy hàng loạt theo kênh" cần endpoint mới (xem §6); v1 có thể đẩy theo
  từng `device_id` admin chọn.

**(C) Dialog "Tải lên firmware"** — `multipart/form-data` tới `POST /admin/firmware`:

| Field | Kiểu | Bắt buộc | Ghi chú |
|-------|------|----------|---------|
| `file` | file `.bin` | ✓ | ≤ 16 MB; kéo-thả hoặc chọn |
| `version` | text | ✓ | vd `2.1.0` (semver) |
| `model` | text | ✓ | mặc định `Luni-C5` |
| `channel` | select | ✓ | `stable` \| `beta` |
| `changelog` | textarea | — | mô tả thay đổi |

- Sau upload thành công (201): server tự tính `sha256` + `size`, lưu R2/đĩa, trả
  bản ghi firmware → thêm vào đầu bảng (A), đóng dialog, toast "Đã tải lên vX.Y.Z".
- Lỗi 409 (trùng `version`+`model`) → hiện inline "Phiên bản đã tồn tại cho model này".
- Lỗi 422 (file rỗng / >16MB / channel sai) → hiện thông báo tương ứng.
- UI nên hiện progress bar khi upload (file lớn) và disable nút khi đang gửi.
- Hiển thị `sha256` (rút gọn) sau khi tạo để admin đối chiếu.

### 4.6 Nhật ký (Logs)
Bảng: **Thời gian · Thiết bị · Cấp · Nội dung**, có filter (level, tag, khoảng ngày).
- Log thiết bị toàn fleet: `GET /admin/logs/devices?device_id=&level=&tag=&limit=&offset=`.
- Log server: `GET /admin/logs/server?level=&module=&request_id=&limit=&offset=`.
- Đổi log level runtime: `POST /admin/logs/config`.
- Pill cấp: info=cyan, warn=amber, error/critical=red. Phân trang `limit`/`offset`.

---

## 5. Bản đồ endpoint theo màn hình (tóm tắt)

| Màn hình | Endpoint chính |
|----------|----------------|
| Login | `POST /auth/login`, `GET /auth/me`, `POST /auth/refresh` |
| Overview | `GET /admin/users`, `/devices/{id}/stats`, `GET /admin/logs/server?level=error` |
| Users | `GET /admin/users`, `PATCH/DELETE /admin/users/{id}` |
| Firmware | `GET/POST /admin/firmware`, `DELETE /admin/firmware/{id}`, `POST /devices/{id}/ota` |
| OTA realtime | WS `/ws/app/{device_id}?token=` → `ota_progress` |
| Logs | `GET /admin/logs/devices`, `GET /admin/logs/server`, `POST /admin/logs/config` |

Chi tiết request/response: xem [API.md](API.md).

---

## 6. Endpoint nên bổ sung (nếu muốn web đầy đủ)

Các mục này **chưa có** — nêu rõ để Claude design biết chỗ nào cần backend mới
(hoặc tổng hợp ở client tạm thời), tránh thiết kế dựa trên dữ liệu không tồn tại:

1. `GET /admin/devices` — liệt kê **toàn bộ** thiết bị (hiện chỉ có `/devices` theo
   user). Cần cho tab Thiết bị + thẻ "online/total" ở Overview.
2. `GET /admin/overview` — gộp số liệu Overview (devices online/total, users,
   interactions/ngày, errors 24h) để khỏi gọi nhiều API.
3. `POST /admin/ota/rollout` — đẩy OTA hàng loạt theo `channel`/`model` thay vì
   từng `device_id`.
4. Phân bố cảm xúc (Overview) — cần tổng hợp từ `interactions.emotion`.

---

## 7. Kỹ thuật đề xuất

- **Framework:** Next.js (App Router) hoặc Vite+React; gọi API qua fetch/axios với
  interceptor gắn Bearer + auto-refresh 401.
- **Triển khai:** thay nội dung `Luni_Cloud/web` (đang là `server.js` placeholder);
  giữ `EXPOSE 3000`; nginx đã proxy `/` → `web:3000` và `/api/` → `api:8000`, nên
  web gọi `/api/v1/...` cùng origin (không lo CORS).
- **Upload firmware:** `multipart/form-data`; nginx `client_max_body_size 20M` đã
  đủ cho giới hạn 16MB.
- **Bảo mật:** chặn toàn bộ route console nếu `role != admin`; token trong memory +
  refresh cookie/secure storage tuỳ chọn.
