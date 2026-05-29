# Deployment Guide — Cloudflare Tunnel & Troubleshooting

Production expose stack ra Internet qua **Cloudflare Tunnel** (free, không cần IP tĩnh / mở port). Domain hiện tại: **lunirobot.io.vn**.

## Kiến trúc expose

```
Internet → Cloudflare edge → Tunnel (cloudflared) → nginx:80 → api / web
```

- `tunnel` service chạy `cloudflared` với `TUNNEL_TOKEN` (token-based / remotely-managed).
- Ingress rule (`lunirobot.io.vn → http://nginx:80`) cấu hình trong **Cloudflare Zero-Trust dashboard**, KHÔNG nằm trong repo.
- `cloudflared` resolve hostname `nginx` qua Docker DNS (127.0.0.11) trên network `luni_cloud_luni-net` → vì vậy `nginx` phải đang chạy cùng network.

## Setup tunnel lần đầu

1. Cloudflare Zero-Trust → Networks → Tunnels → tạo tunnel, lấy **token**.
2. Cấu hình Public Hostname: `lunirobot.io.vn` → service `http://nginx:80`.
3. Điền `.env`: `CF_TUNNEL_TOKEN=...` và `DOMAIN=lunirobot.io.vn`.
4. `docker compose up -d`. `web` build `NEXT_PUBLIC_WS_URL=wss://${DOMAIN}/ws` từ `DOMAIN`.

## Deploy / cập nhật

```powershell
docker compose -f /d/Luni/Luni_Cloud/docker-compose.yml up -d        # production
# hoặc dev: thêm -f docker-compose.dev.yml (tunnel tắt, truy cập http://localhost)
docker compose exec api alembic -c /app/alembic.ini upgrade head     # migration
```

Verify:
```powershell
curl -I https://lunirobot.io.vn
curl https://lunirobot.io.vn/api/v1/health        # {"status":"ok",...}
docker compose ps                                  # tất cả Up, nginx healthy
docker logs luni-tunnel --tail 20                  # không có lỗi "no such host"
```

## Troubleshooting

### Cloudflare: "Unable to reach the origin service … lookup nginx … no such host"

**Nguyên nhân:** container `nginx` không chạy ⇒ hostname `nginx` không resolve trên Docker network ⇒ tunnel không tới được origin.

```powershell
docker compose ps                  # nginx có "Exited"?
docker inspect luni-nginx --format '{{.State.ExitCode}} {{.State.Error}}'
docker logs luni-nginx --tail 30
```

**Cạm bẫy đã gặp — di chuyển thư mục repo.** `nginx` là service duy nhất bind-mount một **file** host (`./nginx/nginx.conf`). Nếu repo bị di chuyển (vd `D:\Luni_Cloud` → `D:\Luni\Luni_Cloud`) mà stack vẫn chạy theo path cũ, Docker Desktop tự tạo path cũ thành **thư mục** rồi fail mount file→file với **Exit 127** (`"trying to mount a directory onto a file"`). Các service khác (named volume / dir mount) sống sót âm thầm, chỉ `nginx` chết → kéo sập cả domain.

**Khắc phục:** recreate stack từ đúng thư mục hiện tại:
```powershell
docker compose -f /d/Luni/Luni_Cloud/docker-compose.yml down
docker compose -f /d/Luni/Luni_Cloud/docker-compose.yml up -d
```
Kiểm tra `.env`: `DOMAIN=lunirobot.io.vn` và `UI_PREVIEW_PATH` trỏ đúng path hiện tại (`D:/Luni/Luni_Robot/ui_design`).

> Để tránh tái diễn: cân nhắc đổi bind-mount `nginx.conf` (single file) sang mount thư mục hoặc bake config vào image.

### Robot không online qua domain
- `docker logs luni-nginx -f` → có `GET /ws/device HTTP/1.1 101` từ `ESP32 Websocket Client`?
- `docker logs luni-api -f` → có `ws.device_authenticated`? Nếu `ws.auth_failed` → device_token/MAC sai (re-pair).
- Kiểm tra `ws_url` trong NVS robot = `lunirobot.io.vn/ws/device`.

### Local vẫn chạy nhưng domain hỏng
api (`:8000`) và web (`:3000`) expose ra host nên local luôn truy cập được kể cả khi tunnel/nginx hỏng. Luôn test cả `https://lunirobot.io.vn` để xác nhận đường công khai.
