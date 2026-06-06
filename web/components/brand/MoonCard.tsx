/* ============================================================
   MoonCard — Overview "Tuần trăng" card: Luni redraws icons theo âm lịch.
   Ported from lib/luni-moon.jsx.
   ============================================================ */
'use client';

import { hexA } from '@/lib/format';
import { specialDay } from '@/lib/moon/engine';
import { useLuniDate } from '@/lib/moon/useLunar';
import { Icon } from './Icon';
import { MoonGlyph } from './MoonGlyph';

export interface MoonCardProps {
  accent?: string;
}

export function MoonCard({ accent = '#5BE9FF' }: MoonCardProps) {
  const { info, offset, isToday } = useLuniDate(); // live, follows the global Luni date
  const p = info.p;
  const lunarDay = info.lunarDay;
  const pct = Math.round(info.illum * 100);
  const sp = specialDay(info);

  return (
    <div className="card" style={{ overflow: 'hidden', padding: 0, borderColor: sp ? hexA(sp.color, 0.3) : hexA(accent, 0.22) }}>
      {/* hero strip */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          padding: '16px 16px 14px',
          background: `radial-gradient(120% 130% at 84% -20%, ${hexA(sp ? sp.color : accent, 0.14)}, transparent 62%)`,
        }}
      >
        <div style={{ animation: isToday ? 'floatY 5s ease-in-out infinite' : 'none', flex: 'none' }}>
          <MoonGlyph p={p} size={70} color={sp ? sp.color : accent} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
            <span className="t-h3">{info.phase.vi}</span>
            <span
              className="pill"
              style={{
                height: 18,
                padding: '0 8px',
                fontSize: 9.5,
                background: isToday ? hexA('#7BE88E', 0.14) : hexA(accent, 0.14),
                color: isToday ? 'var(--green)' : accent,
              }}
            >
              {isToday ? 'Đêm nay' : offset > 0 ? `+${offset} ngày` : `${offset} ngày`}
            </span>
          </div>
          <div style={{ fontSize: 12.5, color: 'var(--tx-mute)', marginTop: 3 }}>{info.phase.sub}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 9 }}>
            <span className="mono" style={{ fontSize: 12, color: 'var(--tx-soft)' }}>
              Âm lịch <b style={{ color: accent }}>{lunarDay}</b>/30
            </span>
            <span style={{ width: 1, height: 12, background: 'var(--hairline-2)' }} />
            <span className="mono" style={{ fontSize: 12, color: 'var(--tx-soft)' }}>
              Sáng {pct}%
            </span>
          </div>
        </div>
      </div>

      {/* special-day banner — Luni auto-shifts mood */}
      {sp && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 11,
            margin: '0 14px 12px',
            padding: '11px 13px',
            borderRadius: 14,
            background: hexA(sp.color, 0.1),
            border: `1px solid ${hexA(sp.color, 0.3)}`,
          }}
        >
          <span style={{ width: 32, height: 32, borderRadius: 9, flex: 'none', display: 'grid', placeItems: 'center', background: hexA(sp.color, 0.16) }}>
            <Icon name={sp.kind === 'ram' ? 'sparkle' : 'moon'} size={17} color={sp.color} strokeWidth={2} />
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12.5, fontWeight: 800, color: sp.color }}>{sp.vi} · Luni tự đổi biểu cảm</div>
            <div style={{ fontSize: 11, color: 'var(--tx-mute)', marginTop: 1, lineHeight: 1.35 }}>{sp.desc}</div>
          </div>
        </div>
      )}
    </div>
  );
}
