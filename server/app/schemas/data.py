"""
Luni Server — Data schemas (weather, calendar, sync).
"""

from pydantic import BaseModel


class ForecastDay(BaseModel):
    day: str
    high: int
    low: int
    condition: str


class WeatherResponse(BaseModel):
    temp: float
    feels_like: float
    humidity: int
    condition: str
    icon: str
    aqi: int | None = None
    forecast: list[ForecastDay] = []


class LunarDate(BaseModel):
    day: int
    month: int
    year: str
    year_number: int
    is_leap_month: bool = False


class CalendarResponse(BaseModel):
    lunar: LunarDate
    events: list[dict] = []


class SyncDataResponse(BaseModel):
    time: dict
    weather: WeatherResponse | None = None
    calendar: CalendarResponse | None = None
    location: dict | None = None
