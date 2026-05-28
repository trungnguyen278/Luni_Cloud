"""
Luni Server — Vietnamese lunar calendar service.

Based on Ho Ngoc Duc's algorithm for Vietnamese calendar (UTC+7).
Reference: https://www.informatik.uni-leipzig.de/~duc/amlich/
"""

import json
import math
from datetime import date

import structlog
from redis.asyncio import Redis

logger = structlog.get_logger()

PI = math.pi


def _jd_from_date(dd: int, mm: int, yy: int) -> int:
    """Convert Gregorian date to Julian Day Number."""
    a = (14 - mm) // 12
    y = yy + 4800 - a
    m = mm + 12 * a - 3
    jd = dd + (153 * m + 2) // 5 + 365 * y + y // 4 - y // 100 + y // 400 - 32045
    return jd


def _new_moon(k: int) -> float:
    """Calculate Julian Day of k-th new moon after J2000.0."""
    T = k / 1236.85
    T2 = T * T
    T3 = T2 * T
    dr = PI / 180.0

    Jd1 = 2415020.75933 + 29.53058868 * k + 0.0001178 * T2 - 0.000000155 * T3
    Jd1 += 0.00033 * math.sin((166.56 + 132.87 * T - 0.009173 * T2) * dr)

    M = 359.2242 + 29.10535608 * k - 0.0000333 * T2 - 0.00000347 * T3
    Mpr = 306.0253 + 385.81691806 * k + 0.0107306 * T2 + 0.00001236 * T3
    F = 21.2964 + 390.67050646 * k - 0.0016528 * T2 - 0.00000239 * T3

    C1 = (0.1734 - 0.000393 * T) * math.sin(M * dr)
    C1 += 0.0021 * math.sin(2 * dr * M)
    C1 -= 0.4068 * math.sin(Mpr * dr)
    C1 += 0.0161 * math.sin(dr * 2 * Mpr)
    C1 -= 0.0004 * math.sin(dr * 3 * Mpr)
    C1 += 0.0104 * math.sin(dr * 2 * F)
    C1 -= 0.0051 * math.sin(dr * (M + Mpr))
    C1 -= 0.0074 * math.sin(dr * (M - Mpr))
    C1 += 0.0004 * math.sin(dr * (2 * F + M))
    C1 -= 0.0004 * math.sin(dr * (2 * F - M))
    C1 -= 0.0006 * math.sin(dr * (2 * F + Mpr))
    C1 += 0.0010 * math.sin(dr * (2 * F - Mpr))
    C1 += 0.0005 * math.sin(dr * (2 * Mpr + M))

    if T < -11:
        delta_T = 0.001 + 0.000839 * T + 0.0002261 * T2 - 0.00000845 * T3 - 0.000000081 * T * T3
    else:
        delta_T = -0.000278 + 0.000265 * T + 0.000262 * T2

    return Jd1 + C1 - delta_T


def _sun_longitude(jdn: float) -> float:
    """Calculate Sun longitude at Julian Day Number (degrees)."""
    T = (jdn - 2451545.0) / 36525.0
    T2 = T * T
    dr = PI / 180.0

    M = 357.52910 + 35999.05030 * T - 0.0001559 * T2 - 0.00000048 * T * T2
    L0 = 280.46645 + 36000.76983 * T + 0.0003032 * T2
    DL = (1.914600 - 0.004817 * T - 0.000014 * T2) * math.sin(dr * M)
    DL += (0.019993 - 0.000101 * T) * math.sin(dr * 2 * M) + 0.000290 * math.sin(dr * 3 * M)

    L = L0 + DL
    omega = 125.04 - 1934.136 * T
    L = L - 0.00569 - 0.00478 * math.sin(omega * dr)
    L = L % 360
    return L


def _get_sun_longitude_at_jdn(jdn: int, tz: float) -> int:
    """Get major solar term index at JDN (0-11) in given timezone."""
    return int(_sun_longitude(jdn - 0.5 + tz / 24.0) / 30)


def _get_new_moon_day(k: int, tz: float) -> int:
    """Get JDN of new moon in given timezone."""
    return int(_new_moon(k) + 0.5 + tz / 24.0)


def _get_lunar_month_11(yy: int, tz: float) -> int:
    """Find the lunar month 11 (month containing winter solstice) for a year."""
    off = _jd_from_date(31, 12, yy) - 2415021
    k = int(off / 29.530588853)
    nm = _get_new_moon_day(k, tz)
    sun_long = _get_sun_longitude_at_jdn(nm, tz)
    if sun_long >= 9:
        nm = _get_new_moon_day(k - 1, tz)
    return nm


def _get_leap_month_offset(a11: int, tz: float) -> int:
    """Find which lunar month (after month 11) is the leap month, if any."""
    k = int((a11 - 2415021.076998695) / 29.530588853 + 0.5)
    last = 0
    i = 1
    arc = _get_sun_longitude_at_jdn(_get_new_moon_day(k + i, tz), tz)
    while True:
        last = arc
        i += 1
        arc = _get_sun_longitude_at_jdn(_get_new_moon_day(k + i, tz), tz)
        if arc != last and i < 14:
            continue
        break
    return i - 1


def gregorian_to_lunar(dd: int, mm: int, yy: int, tz: float = 7.0) -> tuple[int, int, int, bool]:
    """
    Convert Gregorian date to Vietnamese lunar date.

    Args:
        dd, mm, yy: day, month, year (Gregorian)
        tz: timezone offset (default 7.0 for Vietnam UTC+7)

    Returns:
        (lunar_day, lunar_month, lunar_year, is_leap_month)
    """
    day_number = _jd_from_date(dd, mm, yy)
    k = int((day_number - 2415021.076998695) / 29.530588853)
    month_start = _get_new_moon_day(k + 1, tz)

    if month_start > day_number:
        month_start = _get_new_moon_day(k, tz)

    a11 = _get_lunar_month_11(yy, tz)
    b11 = a11

    if a11 >= month_start:
        lunar_year = yy
        a11 = _get_lunar_month_11(yy - 1, tz)
    else:
        lunar_year = yy + 1
        b11 = _get_lunar_month_11(yy + 1, tz)

    lunar_day = day_number - month_start + 1
    diff = int((month_start - a11) / 29.530588853 + 0.5)
    lunar_leap = False
    lunar_month = diff + 11

    if b11 - a11 > 365:
        leap_month_diff = _get_leap_month_offset(a11, tz)
        if diff >= leap_month_diff:
            lunar_month = diff + 10
            if diff == leap_month_diff:
                lunar_leap = True

    if lunar_month > 12:
        lunar_month -= 12
    if lunar_month >= 11 and diff < 4:
        lunar_year -= 1

    return lunar_day, lunar_month, lunar_year, lunar_leap


CAN = ["Giáp", "Ất", "Bính", "Đinh", "Mậu", "Kỷ", "Canh", "Tân", "Nhâm", "Quý"]
CHI = ["Tý", "Sửu", "Dần", "Mão", "Thìn", "Tỵ", "Ngọ", "Mùi", "Thân", "Dậu", "Tuất", "Hợi"]


class CalendarService:
    """Vietnamese lunar calendar with Redis cache."""

    def __init__(self, redis: Redis):
        self.redis = redis

    async def get_calendar(self, date_str: str, timezone: str = "Asia/Ho_Chi_Minh") -> dict:
        cache_key = f"calendar:{date_str}"
        cached = await self.redis.get(cache_key)
        if cached:
            return json.loads(cached)

        d = date.fromisoformat(date_str)
        lunar_day, lunar_month, lunar_year, is_leap = gregorian_to_lunar(
            d.day, d.month, d.year
        )

        can_index = (lunar_year + 6) % 10
        chi_index = (lunar_year + 8) % 12

        result = {
            "lunar": {
                "day": lunar_day,
                "month": lunar_month,
                "year": f"{CAN[can_index]} {CHI[chi_index]}",
                "year_number": lunar_year,
                "is_leap_month": is_leap,
            },
            "events": [],
        }

        await self.redis.setex(cache_key, 86400, json.dumps(result))
        return result
