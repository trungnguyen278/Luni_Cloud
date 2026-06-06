/* ============================================================
   user/parts.tsx — small shared pieces for the user dashboard:
   DeviceSwitch, MiniStat, Toggle, DemoNote. Ported from web-user.jsx.
   ============================================================ */
'use client';

import { hexA2 } from '@/lib/format';
import type { StudioDevice } from '@/lib/types';
import { Icon } from '@/components/brand/Icon';
import { LuniFace } from '@/components/brand/LuniFace';

export function DeviceSwitch({ devices, sel, onSel }: { devices: StudioDevice[]; sel: string | null; onSel: (id: string) => void }) {
  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      {devices.map((d) => {
        const on = d.id === sel;
        return (
          <button
            key={d.id}
            className="press"
            onClick={() => onSel(d.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '8px 13px 8px 9px',
              borderRadius: 12,
              background: on ? 'var(--acc-12)' : 'var(--bg-1)',
              border: `1px solid ${on ? 'var(--acc-32)' : 'var(--hairline)'}`,
            }}
          >
            <span style={{ width: 30, height: 30, borderRadius: 9, display: 'grid', placeItems: 'center', background: 'var(--bg-2)' }}>
              <LuniFace emotion={d.emotion || 'idle'} size={24} state="idle" noPhase />
            </span>
            <span style={{ textAlign: 'left' }}>
              <span style={{ display: 'block', fontSize: 13, fontWeight: 700, color: on ? 'var(--acc)' : 'var(--tx)' }}>{d.name.replace('Luni ', '')}</span>
              <span style={{ fontSize: 10.5, color: 'var(--tx-faint)' }}>
                {d.online ? 'Trực tuyến' : 'Ngoại tuyến'} · {d.battery}%
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function MiniStat({ icon, label, value, tone = 'var(--acc)' }: { icon: string; label: string; value: string; tone?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '12px 14px', background: 'var(--bg-1)', border: '1px solid var(--hairline)', borderRadius: 13 }}>
      <span style={{ width: 34, height: 34, borderRadius: 10, display: 'grid', placeItems: 'center', background: hexA2(tone, 0.13), flex: 'none' }}>
        <Icon name={icon} size={17} color={tone} />
      </span>
      <div style={{ minWidth: 0 }}>
        <div className="mono" style={{ fontSize: 15, fontWeight: 700 }}>
          {value}
        </div>
        <div style={{ fontSize: 11, color: 'var(--tx-faint)' }}>{label}</div>
      </div>
    </div>
  );
}

export function Toggle({ on, onClick, accent = 'var(--acc)' }: { on: boolean; onClick: () => void; accent?: string }) {
  return (
    <button
      className="press"
      onClick={onClick}
      style={{
        width: 46,
        height: 27,
        borderRadius: 99,
        padding: 3,
        flex: 'none',
        background: on ? accent : 'var(--bg-3)',
        border: '1px solid var(--hairline)',
        display: 'flex',
        justifyContent: on ? 'flex-end' : 'flex-start',
        transition: 'background .2s',
      }}
    >
      <span style={{ width: 21, height: 21, borderRadius: '50%', background: on ? 'var(--acc-ink)' : 'var(--tx-mute)', transition: 'all .2s' }} />
    </button>
  );
}

/** Marks a section that runs on demo data because its endpoint doesn't exist yet. */
export function DemoNote({ text = 'Dữ liệu demo — chưa có API' }: { text?: string }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 7,
        fontSize: 11.5,
        fontWeight: 700,
        color: 'var(--warm)',
        background: hexA2('#FFD166', 0.12),
        border: `1px solid ${hexA2('#FFD166', 0.3)}`,
        padding: '4px 9px',
        borderRadius: 99,
      }}
    >
      <Icon name="info" size={13} color="var(--warm)" />
      {text}
    </span>
  );
}
