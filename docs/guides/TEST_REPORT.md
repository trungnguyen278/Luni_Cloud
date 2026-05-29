# Luni Cloud Retest Defect Report

Ngay retest: 2026-05-29, timezone Asia/Bangkok.

Vai tro: tester retest cac loi da ghi nhan sau khi dev fix.

Pham vi: chi giu lai cac loi con ton tai hoac loi moi phat hien trong qua trinh retest. Cac loi da retest PASS khong duoc liet ke trong report nay.

## DEFECT-001: Docker Compose van canh bao do ky tu `$` trong environment value

Severity: Medium

Status: Still failing

Affected area: local/prod setup reliability.

Precondition:

- `.env` hien tai co gia tri `DB_PASSWORD` chua ky tu `$`.

Steps to reproduce:

```powershell
cd D:\Luni_Cloud
docker-compose ps
```

Actual result:

```text
The "xLQ7" variable is not set. Defaulting to a blank string.
```

Expected result:

```text
Docker Compose commands should run without variable interpolation warnings.
```

Impact/Risk:

- Docker Compose co the interpret `$...` nhu bien moi truong.
- Password thuc te co the bi bien doi khi recreate/fresh setup.
- Warning xuat hien lap lai tren gan nhu moi lenh `docker-compose`, lam nhieu output test bi nhiem noise.

Suggested fix:

- Escape `$` thanh `$$` trong `.env`, hoac
- Doi `DB_PASSWORD` sang gia tri khong dung `$`, hoac
- Ghi ro yeu cau escape `$` trong `docs/guides/SETUP.md`.

Retest evidence:

```text
docker-compose ps
=> van in warning "The \"xLQ7\" variable is not set..."
```

## DEFECT-002: Nginx tra 502 sau khi recreate API/web container cho den khi restart nginx

Severity: Medium

Status: New defect found during retest

Affected area: Docker runtime/reverse proxy reliability.

Precondition:

- Stack dang chay qua Docker Compose.
- `nginx` da start truoc do.
- API hoac web container duoc recreate, lam container IP thay doi.

Steps to reproduce:

```powershell
cd D:\Luni_Cloud
docker-compose build api
docker-compose up -d api
curl.exe -s -i http://localhost/api/v1/health
```

Actual result:

```text
HTTP/1.1 502 Bad Gateway
```

Nginx log:

```text
connect() failed (111: Connection refused) while connecting to upstream,
upstream: "http://172.18.0.2:8000/api/v1/health"
```

Direct API port still works:

```powershell
curl.exe -s -i http://localhost:8000/api/v1/health
```

Observed direct result:

```text
HTTP/1.1 200 OK
{"status":"ok","version":"0.1.0"}
```

Workaround used during retest:

```powershell
docker-compose restart nginx
```

After workaround:

```powershell
curl.exe -s -i http://localhost/api/v1/health
```

Observed result:

```text
HTTP/1.1 200 OK
{"status":"ok","version":"0.1.0"}
```

Root cause suspected:

- Nginx resolves Docker upstream hostnames such as `api` and `web` at startup.
- After `api` or `web` is recreated, nginx can keep the stale container IP.

Suggested fix options:

1. Document that `nginx` must be restarted after recreating upstream services:

```powershell
docker-compose up -d api web
docker-compose restart nginx
```

2. Configure nginx with Docker DNS resolver (`127.0.0.11`) and variable-based `proxy_pass` so upstream names can be re-resolved.

3. Add an operational script/Make target that recreates API/web and restarts nginx together.
