"""
Luni Server — Weather service (OpenWeather API + Redis cache).
"""

import json

import httpx
import structlog
from redis.asyncio import Redis

from app.config import Settings

logger = structlog.get_logger()


class WeatherService:
    """OpenWeather API integration with Redis cache."""

    def __init__(self, redis: Redis, settings: Settings):
        self.redis = redis
        self.api_key = settings.openweather_api_key
        self.cache_ttl = settings.weather_cache_ttl_seconds
        self.client = httpx.AsyncClient(timeout=10.0)

    async def get_weather(self, lat: float, lon: float) -> dict | None:
        if not self.api_key:
            return None

        cache_key = f"weather:{lat:.2f}:{lon:.2f}"

        cached = await self.redis.get(cache_key)
        if cached:
            return json.loads(cached)

        try:
            data = await self._fetch_current(lat, lon)
            forecast = await self._fetch_forecast(lat, lon)
        except httpx.HTTPError as e:
            logger.warning("weather.fetch_failed", error=str(e))
            return None

        result = {
            "temp": data["main"]["temp"],
            "feels_like": data["main"]["feels_like"],
            "humidity": data["main"]["humidity"],
            "condition": self._map_condition(data["weather"][0]["id"]),
            "icon": data["weather"][0]["icon"],
            "aqi": await self._fetch_aqi(lat, lon),
            "forecast": self._format_forecast(forecast),
        }

        await self.redis.setex(cache_key, self.cache_ttl, json.dumps(result))
        return result

    async def _fetch_current(self, lat: float, lon: float) -> dict:
        resp = await self.client.get(
            "https://api.openweathermap.org/data/2.5/weather",
            params={
                "lat": lat,
                "lon": lon,
                "appid": self.api_key,
                "units": "metric",
                "lang": "vi",
            },
        )
        resp.raise_for_status()
        return resp.json()

    async def _fetch_forecast(self, lat: float, lon: float) -> dict:
        resp = await self.client.get(
            "https://api.openweathermap.org/data/2.5/forecast",
            params={
                "lat": lat,
                "lon": lon,
                "appid": self.api_key,
                "units": "metric",
                "cnt": 24,
            },
        )
        resp.raise_for_status()
        return resp.json()

    async def _fetch_aqi(self, lat: float, lon: float) -> int | None:
        try:
            resp = await self.client.get(
                "https://api.openweathermap.org/data/2.5/air_pollution",
                params={"lat": lat, "lon": lon, "appid": self.api_key},
            )
            resp.raise_for_status()
            return resp.json()["list"][0]["main"]["aqi"]
        except Exception:
            return None

    def _map_condition(self, weather_id: int) -> str:
        if weather_id == 800:
            return "clear"
        elif weather_id == 801:
            return "few_clouds"
        elif weather_id in (802, 803):
            return "partly_cloudy"
        elif weather_id == 804:
            return "overcast"
        elif 200 <= weather_id < 300:
            return "thunderstorm"
        elif 300 <= weather_id < 400:
            return "drizzle"
        elif 500 <= weather_id < 600:
            return "rain"
        elif 600 <= weather_id < 700:
            return "snow"
        elif 700 <= weather_id < 800:
            return "fog"
        return "unknown"

    def _format_forecast(self, data: dict) -> list[dict]:
        from collections import defaultdict
        from datetime import datetime

        daily: dict[str, dict] = defaultdict(
            lambda: {"highs": [], "lows": [], "conditions": []}
        )

        for item in data.get("list", []):
            dt = datetime.fromtimestamp(item["dt"])
            day_key = dt.strftime("%a").lower()
            daily[day_key]["highs"].append(item["main"]["temp_max"])
            daily[day_key]["lows"].append(item["main"]["temp_min"])
            daily[day_key]["conditions"].append(item["weather"][0]["id"])

        result = []
        for day, vals in list(daily.items())[:3]:
            result.append({
                "day": day,
                "high": round(max(vals["highs"])),
                "low": round(min(vals["lows"])),
                "condition": self._map_condition(
                    max(vals["conditions"], key=vals["conditions"].count)
                ),
            })
        return result
