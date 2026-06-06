/* ============================================================
   moon/useLunar.ts — React hooks for the live lunar date.

   SSR safety: the first client render (and the server render) both use
   a fixed reference date + offset 0, so the markup matches exactly and
   React never warns about a hydration mismatch. After mount we switch to
   the real `Date.now()` + persisted offset — a one-frame correction that
   is visually imperceptible on the glow / terminator.
   ============================================================ */
'use client';

import { useEffect, useState } from 'react';
import { lunarInfo, type LunarInfo } from './engine';
import { useMoonStore } from './store';

// Deterministic placeholder shared by server + first client paint.
const SSR_REF = new Date('2026-06-15T12:00:00Z');

interface LuniClock {
  now: Date;
  offset: number;
  isToday: boolean;
  mounted: boolean;
}

function useLuniClock(): LuniClock {
  const offset = useMoonStore((s) => s.offset);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return { now: SSR_REF, offset: 0, isToday: true, mounted: false };
  return { now: new Date(Date.now() + offset * 86400000), offset, isToday: offset === 0, mounted: true };
}

/** Live lunar info; re-renders when the global Luni date moves. */
export function useLunar(): LunarInfo {
  const { now } = useLuniClock();
  return lunarInfo(now);
}

/** Richer hook for cards/dev panel that also need the date + offset. */
export function useLuniDate(): LuniClock & { info: LunarInfo } {
  const clock = useLuniClock();
  return { ...clock, info: lunarInfo(clock.now) };
}
