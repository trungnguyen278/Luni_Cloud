/* ============================================================
   AppMirror — phone-app mirror screen (status bar, header, hero face,
   stat chips, bottom tabs). Ported from web-preview.jsx.
   ============================================================ */
'use client';

import type { StudioDevice } from '@/lib/types';
import { useLunar } from '@/lib/moon/useLunar';
import { LUNI_EMOTIONS } from '@/components/brand/emotions';
import { Icon } from '@/components/brand/Icon';
import { LuniFace, MoodDot } from '@/components/brand/LuniFace';

export interface AppMirrorProps {
  emotion: string;
  scene?: string;
  state?: 'idle' | 'listening' | 'speaking' | 'thinking';
  device: StudioDevice;
  accent?: string;
}

export function AppMirror({ emotion, state = 'idle', device, accent = 'var(--acc)' }: AppMirrorProps) {
  const em = LUNI_EMOTIONS[emotion] || LUNI_EMOTIONS.idle;
  const moon = useLunar();
  const chips: [string, string, string][] = [
    ['battery', `${device.battery}%`, device.charging ? 'Đang sạc' : 'Pin'],
    ['cpu', `v${device.fw}`, 'Firmware'],
    ['wifi', `${device.rssi}dBm`, 'Sóng'],
    ['moon', `AL ${moon.lunarDay}`, moon.phase.vi],
  ];
  return (
    <div
      style={{
        width: 244,
        flex: 'none',
        borderRadius: 30,
        padding: 9,
        background: 'linear-gradient(160deg,#1a2030,#0c0f18)',
        border: '1px solid var(--hairline-2)',
        boxShadow: '0 30px 60px -24px rgba(0,0,0,.7), inset 0 1px 0 rgba(255,255,255,.05)',
      }}
    >
      <div style={{ borderRadius: 23, overflow: 'hidden', background: 'var(--bg-base)', height: 452, position: 'relative', border: '1px solid rgba(0,0,0,.5)' }}>
        {/* status bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 16px 6px' }}>
          <span className="mono" style={{ fontSize: 11, fontWeight: 700 }}>
            9:41
          </span>
          <span style={{ width: 56, height: 17, borderRadius: 99, background: '#05070d' }} />
          <span style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
            <Icon name="signal" size={13} color="var(--tx-soft)" />
            <Icon name="wifi" size={13} color="var(--tx-soft)" />
            <Icon name="battery" size={15} color="var(--tx-soft)" />
          </span>
        </div>
        {/* app header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 16px 2px' }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 800, letterSpacing: '-.02em' }}>{device.name.replace('Luni ', '')}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
              <MoodDot emotion={emotion} size={7} />
              <span style={{ fontSize: 11, color: 'var(--tx-mute)' }}>{em.label}</span>
            </div>
          </div>
          <span style={{ width: 30, height: 30, borderRadius: 9, display: 'grid', placeItems: 'center', background: 'var(--bg-2)' }}>
            <Icon name="gear" size={15} color="var(--tx-mute)" />
          </span>
        </div>
        {/* hero face */}
        <div style={{ display: 'grid', placeItems: 'center', padding: '14px 0 4px' }}>
          <LuniFace emotion={emotion} size={132} state={state} />
        </div>
        <div style={{ textAlign: 'center', marginTop: 2 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: em.color }}>
            {state === 'speaking' ? 'Đang nói…' : state === 'listening' ? 'Đang nghe…' : em.label}
          </div>
        </div>
        {/* stat chips */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 7, padding: '14px 14px 0' }}>
          {chips.map(([ic, val, lab]) => (
            <div key={lab} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '9px 10px', background: 'var(--bg-1)', borderRadius: 12, border: '1px solid var(--hairline)' }}>
              <Icon name={ic} size={15} color={accent} />
              <div style={{ minWidth: 0 }}>
                <div className="mono" style={{ fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap' }}>
                  {val}
                </div>
                <div style={{ fontSize: 9.5, color: 'var(--tx-faint)' }}>{lab}</div>
              </div>
            </div>
          ))}
        </div>
        {/* bottom tab bar */}
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            justifyContent: 'space-around',
            padding: '9px 0 12px',
            background: 'linear-gradient(0deg,var(--bg-base) 60%,transparent)',
            borderTop: '1px solid var(--hairline)',
          }}
        >
          {['grid', 'sliders', 'chat', 'chart'].map((ic, i) => (
            <Icon key={ic} name={ic} size={19} color={i === 0 ? accent : 'var(--tx-faint)'} />
          ))}
        </div>
      </div>
    </div>
  );
}
