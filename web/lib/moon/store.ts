/* ============================================================
   moon/store.ts — the global "Luni date" offset (a day offset from
   real today so the whole app can be scrubbed across the month).
   Replaces the prototype's module-level LUNI_OFFSET + listener Set +
   raw localStorage with a zustand persist store (SSR-safe rehydrate).
   ============================================================ */
'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { lunarInfo, SYNODIC } from './engine';

interface MoonState {
  offset: number;
  setOffset: (days: number) => void;
  shift: (delta: number) => void;
}

export const useMoonStore = create<MoonState>()(
  persist(
    (set, get) => ({
      offset: 0,
      setOffset: (days) => set({ offset: days }),
      shift: (delta) => set({ offset: get().offset + delta }),
    }),
    { name: 'luni_day_offset' },
  ),
);

/* ---- non-reactive accessors (parity with the prototype helpers) ---- */
export const getLuniOffset = (): number => useMoonStore.getState().offset;
export const setLuniOffset = (days: number): void => useMoonStore.getState().setOffset(days);
export const shiftLuniDay = (delta: number): void => useMoonStore.getState().shift(delta);
export const getLuniNow = (): Date => new Date(Date.now() + getLuniOffset() * 86400000);

// Offset that lands the app on the nearest occurrence of phase p.
export function offsetToPhase(targetP: number): number {
  const cur = lunarInfo(getLuniNow());
  let dAge = targetP * SYNODIC - cur.age;
  dAge = ((dAge % SYNODIC) + SYNODIC) % SYNODIC;
  if (dAge > SYNODIC / 2) dAge -= SYNODIC;
  return getLuniOffset() + Math.round(dAge);
}

// Offset to the next Rằm / mùng 1 going forward.
export function offsetToSpecial(kind: 'ram' | 'soc'): number {
  const base = getLuniOffset();
  const now = getLuniNow();
  for (let k = 1; k <= 60; k++) {
    const info = lunarInfo(new Date(now.getTime() + k * 86400000));
    if (kind === 'ram' && info.illum > 0.965) return base + k;
    if (kind === 'soc' && info.illum < 0.035) return base + k;
  }
  return base;
}
