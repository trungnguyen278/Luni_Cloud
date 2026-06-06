/* ============================================================
   LunarMonthGrid — 30-day lunar month, current day lit. Tap a day to
   scrub the whole app to that ngày âm lịch. Ported from lib/luni-moon.jsx.
   ============================================================ */
'use client';

import { hexA } from '@/lib/format';
import { LUNAR_DAYS } from '@/lib/moon/engine';
import { MoonGlyph } from './MoonGlyph';

export interface LunarMonthGridProps {
  accent?: string;
  activeDay?: number;
  onPick?: (day: number) => void;
}

export function LunarMonthGrid({ accent = '#5BE9FF', activeDay, onPick }: LunarMonthGridProps) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(10, 1fr)', gap: 6 }}>
      {LUNAR_DAYS.map(({ day, p, kind }) => {
        const on = day === activeDay;
        const spC = kind === 'full' ? '#FFD96B' : kind === 'new' ? '#B9A0FF' : accent;
        return (
          <button
            key={day}
            className="press"
            onClick={onPick ? () => onPick(day) : undefined}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 3,
              padding: '6px 0 4px',
              borderRadius: 11,
              cursor: onPick ? 'pointer' : 'default',
              background: on ? hexA(spC, 0.14) : 'transparent',
              border: `1px solid ${on ? hexA(spC, 0.4) : 'transparent'}`,
              transition: 'all .18s var(--ease)',
            }}
          >
            <MoonGlyph p={p} size={on ? 22 : 18} color={accent} glow={on || kind !== 'normal'} ring strokeOpacity={on ? 0.6 : 0.22} />
            <span
              className="mono"
              style={{ fontSize: 8.5, fontWeight: 700, color: on ? spC : kind !== 'normal' ? hexA(spC, 0.9) : 'var(--tx-faint)' }}
            >
              {day}
            </span>
          </button>
        );
      })}
    </div>
  );
}
