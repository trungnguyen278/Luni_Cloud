/* ============================================================
   LuniDateDevPanel — EXTERNAL dev control (lives OUTSIDE the product UI).
   Scrubs the global Luni date so the whole app can be checked across the
   lunar cycle. Render only behind NEXT_PUBLIC_LUNI_DEV. Ported from luni-moon.jsx.
   ============================================================ */
'use client';

import type { CSSProperties } from 'react';
import { hexA } from '@/lib/format';
import { fmtDate } from '@/lib/moon/engine';
import { offsetToSpecial, setLuniOffset, shiftLuniDay } from '@/lib/moon/store';
import { useLuniDate } from '@/lib/moon/useLunar';
import { Icon } from './Icon';
import { MoonGlyph } from './MoonGlyph';

const dateStepBtn: CSSProperties = {
  width: 40,
  height: 40,
  borderRadius: 12,
  flex: 'none',
  display: 'grid',
  placeItems: 'center',
  background: 'var(--bg-2)',
  border: '1px solid var(--hairline)',
};

interface QuickJumpProps {
  label: string;
  active?: boolean;
  accent?: string;
  onClick: () => void;
}

function QuickJump({ label, active, accent = '#5BE9FF', onClick }: QuickJumpProps) {
  return (
    <button
      className="press"
      onClick={onClick}
      style={{
        height: 32,
        padding: '0 13px',
        borderRadius: 99,
        fontSize: 12,
        fontWeight: 700,
        background: active ? hexA(accent, 0.16) : 'var(--bg-2)',
        color: active ? accent : 'var(--tx-soft)',
        border: `1px solid ${active ? hexA(accent, 0.4) : 'var(--hairline)'}`,
      }}
    >
      {label}
    </button>
  );
}

export interface LuniDateDevPanelProps {
  accent?: string;
}

export function LuniDateDevPanel({ accent = '#5BE9FF' }: LuniDateDevPanelProps) {
  const { info, now, offset, isToday } = useLuniDate();

  return (
    <div style={{ width: 230, padding: 16, borderRadius: 18, background: 'var(--bg-1)', border: '1px dashed var(--hairline-2)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 13 }}>
        <span style={{ width: 7, height: 7, borderRadius: 99, background: '#FFD166', flex: 'none' }} />
        <span className="t-over" style={{ margin: 0 }}>
          Dev · chỉnh ngày (ngoài app)
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
        <MoonGlyph p={info.p} size={42} color={accent} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13.5, fontWeight: 800, letterSpacing: '-.01em' }}>{info.phase.vi}</div>
          <div className="mono" style={{ fontSize: 10.5, color: 'var(--tx-faint)', marginTop: 2 }}>
            Âm lịch {info.lunarDay}/30 · sáng {Math.round(info.illum * 100)}%
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <button className="press" onClick={() => shiftLuniDay(-1)} style={dateStepBtn}>
          <Icon name="back" size={17} color="var(--tx-soft)" />
        </button>
        <div style={{ flex: 1, textAlign: 'center' }}>
          <div style={{ fontSize: 12.5, fontWeight: 800, letterSpacing: '-.01em', whiteSpace: 'nowrap' }}>{fmtDate(now)}</div>
          <div className="mono" style={{ fontSize: 10, color: 'var(--tx-faint)', marginTop: 2 }}>
            {isToday ? 'hôm nay (thật)' : `lệch ${offset > 0 ? '+' : ''}${offset} ngày`}
          </div>
        </div>
        <button className="press" onClick={() => shiftLuniDay(1)} style={dateStepBtn}>
          <Icon name="chevron" size={17} color="var(--tx-soft)" />
        </button>
      </div>

      {/* fine scrub: ±15 ngày quanh hôm nay */}
      <input
        type="range"
        min="-15"
        max="15"
        step="1"
        value={Math.max(-15, Math.min(15, offset))}
        onChange={(e) => setLuniOffset(parseInt(e.target.value))}
        style={{ width: '100%', accentColor: accent, height: 4, cursor: 'pointer', margin: '14px 0 4px' }}
      />

      <div style={{ display: 'flex', gap: 7, marginTop: 10, flexWrap: 'wrap' }}>
        <QuickJump label="Hôm nay" active={isToday} accent={accent} onClick={() => setLuniOffset(0)} />
        <QuickJump label="Đêm Rằm" accent="#FFD166" onClick={() => setLuniOffset(offsetToSpecial('ram'))} />
        <QuickJump label="Mùng 1" accent="#B48CFF" onClick={() => setLuniOffset(offsetToSpecial('soc'))} />
      </div>
    </div>
  );
}
