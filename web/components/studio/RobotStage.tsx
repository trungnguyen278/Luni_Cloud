/* ============================================================
   RobotStage — centered robot orb with live/offline badge, emotion
   pill, pedestal reflection + name/ID/model. Ported from web-preview.jsx.
   ============================================================ */
'use client';

import { hexA2 } from '@/lib/format';
import type { StudioDevice } from '@/lib/types';
import { LUNI_EMOTIONS } from '@/components/brand/emotions';
import { LuniFace } from '@/components/brand/LuniFace';
import { Pill } from '@/components/base/ui';

export interface RobotStageProps {
  emotion: string;
  state?: 'idle' | 'listening' | 'speaking' | 'thinking';
  device: StudioDevice;
  accent?: string;
  size?: number;
}

export function RobotStage({ emotion, state = 'idle', device, accent = 'var(--acc)', size = 230 }: RobotStageProps) {
  const em = LUNI_EMOTIONS[emotion] || LUNI_EMOTIONS.idle;
  return (
    <div
      style={{
        flex: 1,
        minWidth: 280,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        padding: '8px 0',
      }}
    >
      {/* live badge */}
      <div
        style={{
          position: 'absolute',
          top: 4,
          left: 4,
          display: 'flex',
          alignItems: 'center',
          gap: 7,
          padding: '5px 11px',
          borderRadius: 99,
          background: 'var(--bg-2)',
          border: '1px solid var(--hairline)',
        }}
      >
        <span
          className="cdot"
          style={{
            background: device.online ? 'var(--green)' : 'var(--tx-faint)',
            boxShadow: device.online ? '0 0 8px var(--green)' : 'none',
            animation: device.online ? 'chargePulse 1.6s ease-in-out infinite' : 'none',
          }}
        />
        <span style={{ fontSize: 11, fontWeight: 700, color: device.online ? 'var(--green)' : 'var(--tx-faint)' }}>
          {device.online ? 'LIVE · trực tuyến' : 'Ngoại tuyến'}
        </span>
      </div>
      <div style={{ position: 'absolute', top: 4, right: 4 }}>
        <Pill tone={em.color} dot>
          {em.label}
        </Pill>
      </div>

      <LuniFace emotion={emotion} size={size} state={state} dim={!device.online} />

      {/* pedestal reflection */}
      <div
        style={{
          width: size * 0.78,
          height: 22,
          marginTop: -6,
          borderRadius: '50%',
          background: `radial-gradient(ellipse, ${hexA2(em.color, 0.22)}, transparent 70%)`,
          filter: 'blur(3px)',
        }}
      />
      <div style={{ marginTop: 12, textAlign: 'center' }}>
        <div style={{ fontSize: 16, fontWeight: 800, letterSpacing: '-.01em' }}>{device.name}</div>
        <div className="mono" style={{ fontSize: 11.5, color: 'var(--tx-faint)', marginTop: 3 }}>
          {device.id} · {device.model}
        </div>
      </div>
    </div>
  );
}
