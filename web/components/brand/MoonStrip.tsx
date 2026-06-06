/* ============================================================
   MoonStrip — horizontal strip of the 8 canonical phases, current
   highlighted. Ported from lib/luni-moon.jsx.
   ============================================================ */
'use client';

import { hexA } from '@/lib/format';
import { MOON_PHASES } from '@/lib/moon/engine';
import { MoonGlyph } from './MoonGlyph';

const STRIP_LABELS = ['Sóc', 'Liềm', 'T.huyền', 'Khuyết', 'Rằm', 'Khuyết', 'H.huyền', 'Tàn'];

export interface MoonStripProps {
  activeIndex?: number;
  onPick?: (i: number) => void;
  color?: string;
}

export function MoonStrip({ activeIndex, onPick, color = '#5BE9FF' }: MoonStripProps) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 4 }}>
      {MOON_PHASES.map((ph, i) => {
        const on = i === activeIndex;
        return (
          <button
            key={ph.key}
            className="press"
            onClick={onPick ? () => onPick(i) : undefined}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 6,
              flex: 1,
              padding: '8px 0 6px',
              borderRadius: 13,
              background: on ? hexA(color, 0.12) : 'transparent',
              border: `1px solid ${on ? hexA(color, 0.32) : 'transparent'}`,
              cursor: onPick ? 'pointer' : 'default',
              transition: 'all .2s var(--ease)',
            }}
          >
            <MoonGlyph p={ph.p} size={on ? 30 : 25} color={color} glow={on} ring strokeOpacity={on ? 0.6 : 0.25} />
            <span style={{ fontSize: 8.5, fontWeight: 700, color: on ? color : 'var(--tx-faint)', whiteSpace: 'nowrap' }}>
              {STRIP_LABELS[i]}
            </span>
          </button>
        );
      })}
    </div>
  );
}
