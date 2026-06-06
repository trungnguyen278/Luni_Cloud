/* ============================================================
   moon/engine.ts — pure, isomorphic lunar math + constants.
   No window / localStorage / hooks here (safe for SSR).
   Ported from lib/luni-moon.jsx.
   ============================================================ */

export const SYNODIC = 29.530588853; // mean synodic month (days)
export const NEW_MOON_REF = Date.UTC(2000, 0, 6, 18, 14) / 86400000; // JD-ish day index of a known new moon

export interface MoonPhase {
  key: string;
  vi: string;
  sub: string;
  p: number;
}

// 8 canonical phases with Vietnamese names (dân gian + thiên văn)
export const MOON_PHASES: MoonPhase[] = [
  { key: 'new', vi: 'Trăng non', sub: 'Sóc · mùng 1', p: 0.0 },
  { key: 'wax-cre', vi: 'Lưỡi liềm đầu', sub: 'Trăng thượng tuần', p: 0.125 },
  { key: 'first-q', vi: 'Thượng huyền', sub: 'Bán nguyệt đầu', p: 0.25 },
  { key: 'wax-gib', vi: 'Trăng khuyết đầu', sub: 'Trương huyền đầu', p: 0.375 },
  { key: 'full', vi: 'Trăng tròn', sub: 'Vọng · Rằm', p: 0.5 },
  { key: 'wan-gib', vi: 'Trăng khuyết cuối', sub: 'Trương huyền cuối', p: 0.625 },
  { key: 'last-q', vi: 'Hạ huyền', sub: 'Bán nguyệt cuối', p: 0.75 },
  { key: 'wan-cre', vi: 'Lưỡi liềm tàn', sub: 'Trăng hạ tuần', p: 0.875 },
];

export interface LunarInfo {
  p: number;
  illum: number;
  age: number;
  lunarDay: number;
  waxing: boolean;
  phase: MoonPhase;
  phaseIndex: number;
}

// Compute the synodic phase (0..1), illuminated fraction, lunar day for a JS Date.
export function lunarInfo(date: Date = new Date()): LunarInfo {
  const dayIndex = date.getTime() / 86400000;
  let age = (dayIndex - NEW_MOON_REF) % SYNODIC;
  if (age < 0) age += SYNODIC;
  const p = age / SYNODIC; // 0 new → .5 full → 1 new
  const illum = (1 - Math.cos(2 * Math.PI * p)) / 2;
  const lunarDay = Math.floor(age) + 1; // ngày âm lịch (1..30)
  const waxing = p < 0.5;
  // nearest canonical phase
  let nearest = 0;
  let best = 9;
  MOON_PHASES.forEach((ph, i) => {
    let d = Math.abs(ph.p - p);
    d = Math.min(d, 1 - d);
    if (d < best) {
      best = d;
      nearest = i;
    }
  });
  return { p, illum, age, lunarDay, waxing, phase: MOON_PHASES[nearest], phaseIndex: nearest };
}

export function phaseFromLunarDay(d: number): number {
  // ngày âm lịch 1..30 → phase p
  return ((d - 1) % SYNODIC) / SYNODIC;
}

export interface LunarDay {
  day: number;
  p: number;
  illum: number;
  waxing: boolean;
  kind: 'full' | 'new' | 'normal';
}

/* The 30-day standard set — Luni's icon for every ngày âm lịch. */
export const LUNAR_DAYS: LunarDay[] = Array.from({ length: 30 }, (_, i) => {
  const d = i + 1;
  const p = (d - 1) / SYNODIC;
  const illum = (1 - Math.cos(2 * Math.PI * p)) / 2;
  const kind: LunarDay['kind'] = illum > 0.985 ? 'full' : illum < 0.03 ? 'new' : 'normal';
  return { day: d, p, illum, waxing: p < 0.5, kind };
});

export function lunarDayMeta(d: number): LunarDay {
  return LUNAR_DAYS[(((d - 1) % 30) + 30) % 30];
}

export interface SpecialDay {
  kind: 'ram' | 'soc';
  vi: string;
  emotion: string;
  color: string;
  desc: string;
}

// Special lunar days → Luni shifts mood on its own.
export function specialDay(info: LunarInfo): SpecialDay | null {
  if (info.illum > 0.965)
    return { kind: 'ram', vi: 'Đêm Rằm', emotion: 'excited', color: '#FFD166', desc: 'Trăng tròn vành vạnh — Luni rạng rỡ, vầng sáng nở hết cỡ.' };
  if (info.illum < 0.035)
    return { kind: 'soc', vi: 'Mùng Một', emotion: 'sleepy', color: '#B48CFF', desc: 'Trăng tối (Sóc) — Luni trầm lắng, thắp ánh dịu để bầu bạn.' };
  return null;
}

const WEEKDAY_VI = ['Chủ nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
export function fmtDate(d: Date): string {
  return `${WEEKDAY_VI[d.getDay()]} · ${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

// Derive display info from a raw phase p (used for scrub preview)
export function phaseMetaFromP(p: number) {
  p = ((p % 1) + 1) % 1;
  const illum = (1 - Math.cos(2 * Math.PI * p)) / 2;
  const lunarDay = Math.floor(p * SYNODIC) + 1;
  let nearest = 0;
  let best = 9;
  MOON_PHASES.forEach((ph, i) => {
    let d = Math.abs(ph.p - p);
    d = Math.min(d, 1 - d);
    if (d < best) {
      best = d;
      nearest = i;
    }
  });
  return { p, illum, lunarDay, waxing: p < 0.5, phase: MOON_PHASES[nearest], phaseIndex: nearest };
}

/* Special accents for the two extremes of the cycle. */
export const FULL_GOLD = '#FFD96B';
export const NEW_VIOLET = '#B9A0FF';

export interface MoonAccent {
  kind: 'full' | 'new' | 'normal';
  accent: string;
  base: string;
}

export function moonAccent(illum: number, base: string): MoonAccent {
  if (illum > 0.985) return { kind: 'full', accent: FULL_GOLD, base }; // Rằm (ngày 15 & 16)
  if (illum < 0.03) return { kind: 'new', accent: NEW_VIOLET, base }; // Sóc / mùng 1
  return { kind: 'normal', accent: base, base };
}
