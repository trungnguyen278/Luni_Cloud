"""
Luni AI — persona system prompt + context folding helpers.

The server passes a `context` dict (time / weather / calendar / location) and a
normalized `history` (OpenAI-style role/content). These helpers fold that into
the shape each backend needs:
  - LLM backends (gemini/openai_compat): a Luni persona system prompt + a context
    block + history + the user message.
  - AI Mode: no system prompt is possible, so we steer via the query string and a
    short one-line context hint.
"""

import datetime

LUNI_SYSTEM_VI = (
    "Bạn là Luni, một robot bạn đồng hành nhỏ, thân thiện và dễ thương. "
    "Luôn trả lời bằng tiếng Việt, ngắn gọn (1-3 câu), giọng ấm áp, tích cực và gần gũi như một người bạn. "
    "Nói tự nhiên như đang trò chuyện bằng giọng nói; tránh markdown, gạch đầu dòng hay liệt kê dài dòng. "
    "Nếu được cung cấp thông tin thời tiết, thời gian hoặc ngày âm lịch, hãy dùng khi phù hợp với câu hỏi."
)


def _fmt_time(time_val) -> str | None:
    """Accept either a human string or a {unix, utc_offset} dict."""
    if isinstance(time_val, str) and time_val.strip():
        return time_val.strip()
    if isinstance(time_val, dict):
        unix = time_val.get("unix")
        offset = time_val.get("utc_offset", 7)
        if isinstance(unix, (int, float)):
            try:
                dt = datetime.datetime.utcfromtimestamp(unix + offset * 3600)
                return dt.strftime("%H:%M %d/%m/%Y")
            except (OverflowError, OSError, ValueError):
                return None
    return None


def _weather_phrase(weather: dict) -> str | None:
    if not isinstance(weather, dict):
        return None
    bits = []
    temp = weather.get("temp")
    if temp is not None:
        bits.append(f"{temp}°C")
    cond = weather.get("condition")
    if cond:
        bits.append(str(cond))
    humidity = weather.get("humidity")
    if humidity is not None:
        bits.append(f"độ ẩm {humidity}%")
    aqi = weather.get("aqi")
    if aqi is not None:
        bits.append(f"AQI {aqi}")
    return ", ".join(bits) if bits else None


def _lunar_phrase(calendar: dict) -> str | None:
    if not isinstance(calendar, dict):
        return None
    lunar = calendar.get("lunar")
    if not isinstance(lunar, dict):
        return None
    day = lunar.get("day")
    month = lunar.get("month")
    year = lunar.get("year")
    if day is None or month is None:
        return None
    phrase = f"ngày {day} tháng {month} âm lịch"
    if year:
        phrase += f" ({year})"
    return phrase


def _events_phrase(calendar: dict) -> str | None:
    if not isinstance(calendar, dict):
        return None
    events = calendar.get("events")
    if not isinstance(events, list) or not events:
        return None
    titles = []
    for e in events[:3]:
        if isinstance(e, dict):
            titles.append(str(e.get("title") or e.get("name") or "").strip())
        elif isinstance(e, str):
            titles.append(e.strip())
    titles = [t for t in titles if t]
    return ("sự kiện: " + ", ".join(titles)) if titles else None


def build_context_block(context) -> str:
    """A readable Vietnamese sentence summarizing the device context (or '')."""
    if not isinstance(context, dict):
        return ""
    parts: list[str] = []

    t = _fmt_time(context.get("time"))
    if t:
        parts.append(f"bây giờ là {t}")

    location = context.get("location")
    city = location.get("city") if isinstance(location, dict) else None

    weather = _weather_phrase(context.get("weather"))
    if weather:
        parts.append(f"thời tiết {city + ' ' if city else ''}{weather}")
    elif city:
        parts.append(f"ở {city}")

    lunar = _lunar_phrase(context.get("calendar"))
    if lunar:
        parts.append(f"hôm nay là {lunar}")

    events = _events_phrase(context.get("calendar"))
    if events:
        parts.append(events)

    if not parts:
        return ""
    return "Thông tin hiện tại: " + "; ".join(parts) + "."


def short_context_hint(context) -> str:
    """A compact one-liner appended to the AI Mode query (weather + time only)."""
    if not isinstance(context, dict):
        return ""
    bits = []
    t = _fmt_time(context.get("time"))
    if t:
        bits.append(t)
    weather = _weather_phrase(context.get("weather"))
    if weather:
        bits.append(weather)
    return "; ".join(bits)


def build_openai_messages(message: str, context, history, max_history: int) -> list[dict]:
    """OpenAI-style messages: system persona + context + history + user turn."""
    messages: list[dict] = [{"role": "system", "content": LUNI_SYSTEM_VI}]

    ctx = build_context_block(context)
    if ctx:
        messages.append({"role": "system", "content": ctx})

    for h in (history or [])[-max_history:]:
        role = h.get("role", "user")
        if role not in ("user", "assistant"):
            role = "user"
        content = h.get("content", "")
        if content:
            messages.append({"role": role, "content": content})

    messages.append({"role": "user", "content": message})
    return messages


def to_gemini_contents(history, context, message: str, max_history: int) -> list[dict]:
    """Gemini `contents`: history mapped to user/model + context-prefixed message."""
    contents: list[dict] = []
    for h in (history or [])[-max_history:]:
        role = "model" if h.get("role") == "assistant" else "user"
        content = h.get("content", "")
        if content:
            contents.append({"role": role, "parts": [{"text": content}]})

    ctx = build_context_block(context)
    user_text = (ctx + "\n\n" if ctx else "") + message
    contents.append({"role": "user", "parts": [{"text": user_text}]})
    return contents
