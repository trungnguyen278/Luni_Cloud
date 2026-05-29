# Module: Data Pipeline (sync_data · weather · calendar · AI · tasks)

Cung cấp dữ liệu hiển thị cho robot (thời tiết, giờ, lịch âm) và xử lý hội thoại AI. Code: `services/{weather,calendar_service,sync_data,ai,interaction}.py`, `tasks/`, container `ai/`.

## sync_data

Server gom time + weather + calendar + location thành 1 payload, push cho device qua WS ngay sau auth và định kỳ.

```json
{
  "time":     { "unix": 1716825600, "tz": "Asia/Ho_Chi_Minh", "utc_offset": 7 },
  "weather":  { "temp": 32, "feels_like": 36, "humidity": 75, "condition": "partly_cloudy", "icon": "02d", "aqi": 85 },
  "calendar": { "lunar": { "day": 1, "month": 5, "year": "Ất Tỵ" }, "events": [] },
  "location": { "city": "Hà Nội", "lat": 21.0285, "lon": 105.8542 }
}
```

Endpoints (`api/v1/data.py`): `GET /data/weather?lat&lon`, `GET /data/calendar?date`, `GET /data/sync/{device_id}`, `POST /data/sync/{device_id}/push` (force push, 409 nếu device offline).

## Weather

`services/weather.py` — OpenWeather (`OPENWEATHER_API_KEY`), cache Redis TTL ~20'. Không có key → trả lỗi "weather service unavailable" (sync_data vẫn hoạt động, weather = null).

## Calendar

`services/calendar_service.py` — lịch dương + **âm lịch Việt Nam** (không cần API key). Cache Redis TTL ~24h.

## AI gateway (`ai/` container, internal `http://ai:8081`)

Chỉ server gọi được (không expose ra ngoài, trừ dev). Contract:

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/health` | health + capabilities |
| POST | `/chat` | text → text + emotion |
| POST | `/stt` | audio → text |
| POST | `/tts` | text → audio |

> Hiện tại `ai/server.py` là **stub**: `/chat` trả phản hồi giả, `/stt` `/tts` trả 501. Thay bằng OpenAI/Claude khi tích hợp thật.

### Interaction flow

`POST /devices/{id}/interact {text, source}` → `services/interaction.py` gọi AI `/chat` → lưu `interactions` → trả `{ input, output, emotion, latency_ms, interaction_id }`. Nếu device online: push `tts_play` + `set_emotion` qua WS. AI down → `503`.

Voice: device gửi audio uplink + `audio_end` → server STT → chat → TTS → audio downlink, đồng thời lưu interaction + notify app.

## Redis keys

```
weather:{lat:.2f}:{lon:.2f}   TTL 20m
calendar:{date}               TTL 24h
sync:{device_id}              TTL 20m
device:state:{device_id}      no TTL (update on change)
```

## Background tasks (APScheduler — `tasks/scheduler.py`)

| Task | Lịch | File |
|------|------|------|
| weather_sync | mỗi 15' | `tasks/weather_sync.py` |
| calendar_sync | hằng ngày 00:00 | `tasks/calendar_sync.py` |
| log_cleanup | hằng tuần | `tasks/log_cleanup.py` |
| heartbeat check | mỗi 60s | trong ConnectionManager |

> `stats_aggregate`, `token_cleanup` nằm trong thiết kế gốc, chưa triển khai.
