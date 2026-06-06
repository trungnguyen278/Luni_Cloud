/* ============================================================
   LuniFace — the signature animated robot face: a glowing "moon" disc
   with expressive eyes that morph per emotion and wear tonight's lunar
   phase as a soft terminator shadow. Ported from lib/luni-face.jsx.
   ============================================================ */
'use client';

import { useEffect, useId, useState, type CSSProperties, type ReactElement } from 'react';
import { hexA } from '@/lib/format';
import { useLunar } from '@/lib/moon/useLunar';
import { LUNI_EMOTIONS } from './emotions';

/* Eyes geometry per archetype, drawn in a 100×100 viewBox. */
const E_W = 23;
const E_H = 27;
const E_RX = 7; // base chunky rounded-rect eye
const E_LX = 33;
const E_RX_X = 67;
const E_CY = 50; // left/right centers + vertical center

// one chunky rounded-rect eye centered at (cx,cy)
function eyeRect(cx: number, cy: number, w = E_W, h = E_H, rx = E_RX, key?: string): ReactElement {
  return (
    <rect
      key={key}
      x={cx - w / 2}
      y={cy - Math.max(h, 1) / 2}
      width={w}
      height={Math.max(h, 1)}
      rx={Math.min(rx, w / 2, Math.max(h, 1) / 2)}
    />
  );
}

interface EyesProps {
  face: string;
  color: string;
  blink: boolean;
}

export function Eyes({ face, color, blink }: EyesProps) {
  const sy = blink ? 0.08 : 1;
  const grp: CSSProperties = { transform: `scaleY(${sy})`, transformOrigin: '50px 50px', transition: 'transform .12s ease' };
  const glow: CSSProperties = { filter: `drop-shadow(0 0 5px ${hexA(color, 0.9)})` };

  if (face === 'arc') {
    // happy — fat upward smile arcs ⌣ ⌣
    return (
      <g style={{ ...grp, ...glow }} stroke={color} strokeWidth="9" strokeLinecap="round" fill="none">
        <path d={`M${E_LX - 11} ${E_CY - 2} Q${E_LX} ${E_CY + 12} ${E_LX + 11} ${E_CY - 2}`} />
        <path d={`M${E_RX_X - 11} ${E_CY - 2} Q${E_RX_X} ${E_CY + 12} ${E_RX_X + 11} ${E_CY - 2}`} />
      </g>
    );
  }
  if (face === 'sad') {
    // downturned arcs ⌢ ⌢
    return (
      <g style={{ ...grp, ...glow }} stroke={color} strokeWidth="9" strokeLinecap="round" fill="none">
        <path d={`M${E_LX - 11} ${E_CY + 6} Q${E_LX} ${E_CY - 7} ${E_LX + 11} ${E_CY + 6}`} />
        <path d={`M${E_RX_X - 11} ${E_CY + 6} Q${E_RX_X} ${E_CY - 7} ${E_RX_X + 11} ${E_CY + 6}`} />
      </g>
    );
  }
  if (face === 'angry') {
    // chunky eyes under slanted brow lids
    return (
      <g style={{ ...grp, ...glow }}>
        <g fill={color}>
          {eyeRect(E_LX, E_CY + 4, E_W, 22, E_RX, 'l')}
          {eyeRect(E_RX_X, E_CY + 4, E_W, 22, E_RX, 'r')}
        </g>
        <g stroke={color} strokeWidth="7" strokeLinecap="round">
          <path d={`M${E_LX - 12} ${E_CY - 16} L${E_LX + 12} ${E_CY - 9}`} />
          <path d={`M${E_RX_X + 12} ${E_CY - 16} L${E_RX_X - 12} ${E_CY - 9}`} />
        </g>
      </g>
    );
  }
  if (face === 'sleepy') {
    // soft closed eyes — shallow arcs
    return (
      <g style={{ ...grp, ...glow }} stroke={color} strokeWidth="8" strokeLinecap="round" fill="none">
        <path d={`M${E_LX - 12} ${E_CY} Q${E_LX} ${E_CY + 6} ${E_LX + 12} ${E_CY}`} />
        <path d={`M${E_RX_X - 12} ${E_CY} Q${E_RX_X} ${E_CY + 6} ${E_RX_X + 12} ${E_CY}`} />
      </g>
    );
  }
  if (face === 'curious') {
    // asymmetric "huh?" — one tall eye, one squished
    return (
      <g style={{ ...grp, ...glow }} fill={color}>
        {eyeRect(E_LX, E_CY, E_W, 30, E_RX, 'l')}
        {eyeRect(E_RX_X, E_CY + 2, E_W + 2, 17, 8, 'r')}
      </g>
    );
  }
  if (face === 'wide') {
    // excited / surprised — big chunky eyes
    return (
      <g style={{ ...grp, ...glow }} fill={color}>
        {eyeRect(E_LX, E_CY, E_W + 3, E_H + 4, 9, 'l')}
        {eyeRect(E_RX_X, E_CY, E_W + 3, E_H + 4, 9, 'r')}
      </g>
    );
  }
  if (face === 'oval') {
    // calm / cool — relaxed half-lidded chunky rects
    return (
      <g style={{ ...grp, ...glow }} fill={color}>
        {eyeRect(E_LX, E_CY, E_W, 16, 8, 'l')}
        {eyeRect(E_RX_X, E_CY, E_W, 16, 8, 'r')}
      </g>
    );
  }
  // idle / neutral — the signature chunky rounded-rect eyes
  return (
    <g style={{ ...grp, ...glow }} fill={color}>
      {eyeRect(E_LX, E_CY, E_W, E_H, E_RX, 'l')}
      {eyeRect(E_RX_X, E_CY, E_W, E_H, E_RX, 'r')}
    </g>
  );
}

export interface LuniFaceProps {
  emotion?: string;
  size?: number;
  state?: 'idle' | 'listening' | 'speaking' | 'thinking';
  dim?: boolean;
  phase?: number | null;
  noPhase?: boolean;
  onTap?: () => void;
  style?: CSSProperties;
}

export function LuniFace({
  emotion = 'idle',
  size = 160,
  state = 'idle',
  dim = false,
  phase = null,
  noPhase = false,
  onTap,
  style,
}: LuniFaceProps) {
  const em = LUNI_EMOTIONS[emotion] || LUNI_EMOTIONS.idle;
  const color = dim ? '#5C6680' : em.color;
  // Robot rule: the FACE (eyes + mouth) is always cyan — only the glow / accessory
  // glyphs carry the emotion tone.
  const eyeColor = dim ? '#5C6680' : '#5BE9FF';
  const [blink, setBlink] = useState(false);
  // glow breathes with the moon's brightness: bright at Rằm, faint at mùng 1
  const moon = useLunar();
  const illum = dim ? 0 : moon.illum;
  // Luni IS the moon — the orb wears tonight's phase as a soft terminator shadow.
  const pVal = phase != null ? phase : moon.p;
  const showPhase = !dim && !noPhase;
  const _cosP = Math.cos(2 * Math.PI * pVal);
  const _illumP = (1 - _cosP) / 2;
  const _waxP = pVal < 0.5;
  const _gibP = _illumP > 0.5;
  const _rxP = 48 * Math.abs(_cosP);
  const _litSemi = _waxP ? 'M50,2 A48,48 0 0 1 50,98 Z' : 'M50,2 A48,48 0 0 0 50,98 Z';
  const _mId = 'lp' + useId().replace(/[:]/g, '');
  const moonF = dim ? 1 : 0.45 + 0.55 * illum;
  const glowInset = dim ? '-22%' : `${-(15 + illum * 13)}%`;

  useEffect(() => {
    if (dim) return;
    let t: ReturnType<typeof setTimeout>;
    const loop = () => {
      const next = 2200 + Math.random() * 3600;
      t = setTimeout(() => {
        setBlink(true);
        setTimeout(() => setBlink(false), 130);
        loop();
      }, next);
    };
    loop();
    return () => clearTimeout(t);
  }, [dim]);

  const breatheDur = emotion === 'sleepy' || emotion === 'calm' ? '5.5s' : emotion === 'alert' ? '1.6s' : '3.6s';

  return (
    <div
      onClick={onTap}
      style={{
        position: 'relative',
        width: size,
        height: size,
        cursor: onTap ? 'pointer' : 'default',
        flex: 'none',
        ...style,
      }}
    >
      {/* outer glow */}
      <div
        style={{
          position: 'absolute',
          inset: glowInset,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${hexA(color, dim ? 0.12 : 0.42 * moonF)} 0%, transparent 62%)`,
          animation: dim ? 'none' : `glowPulse ${breatheDur} var(--ease) infinite`,
          pointerEvents: 'none',
        }}
      />

      {/* listening radar rings */}
      {state === 'listening' &&
        [0, 1, 2].map((i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: '50%',
              border: `2px solid ${hexA(color, 0.5)}`,
              animation: `radar 2s ${i * 0.66}s ease-out infinite`,
            }}
          />
        ))}

      {/* the orb */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: '50%',
          background: `
            radial-gradient(120% 120% at 32% 26%, ${hexA(color, dim ? 0.08 : 0.2)} 0%, transparent 46%),
            radial-gradient(100% 100% at 50% 118%, ${hexA(color, 0.14)} 0%, transparent 55%),
            linear-gradient(160deg, #161b29 0%, #0c0f18 100%)`,
          border: `1.5px solid ${hexA(color, dim ? 0.14 : 0.34)}`,
          boxShadow: dim
            ? 'inset 0 2px 14px rgba(0,0,0,.5)'
            : `inset 0 2px 18px rgba(0,0,0,.45), inset 0 0 30px ${hexA(color, 0.05 + 0.14 * illum)}`,
          animation: dim ? 'none' : `luniBreathe ${breatheDur} var(--ease) infinite`,
          display: 'grid',
          placeItems: 'center',
          overflow: 'hidden',
        }}
      >
        {/* rim crescent highlight (the "moon") */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: '50%',
            background: `radial-gradient(120% 120% at 76% 80%, ${hexA(color, 0.1)} 0%, transparent 40%)`,
          }}
        />
        {/* phase shadow — the orb shows tonight's lunar phase (đổi theo 30 ngày) */}
        {showPhase && (
          <svg viewBox="0 0 100 100" width="100%" height="100%" style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
            <defs>
              <mask id={_mId}>
                <circle cx="50" cy="50" r="48" fill="#fff" />
                <path d={_litSemi} fill="#000" />
                <ellipse cx="50" cy="50" rx={_rxP} ry="48" fill={_gibP ? '#000' : '#fff'} />
              </mask>
              <filter id={_mId + 'b'}>
                <feGaussianBlur stdDeviation="1.3" />
              </filter>
            </defs>
            <circle cx="50" cy="50" r="48" fill="#05060b" fillOpacity="0.6" mask={`url(#${_mId})`} filter={`url(#${_mId}b)`} />
          </svg>
        )}
        <svg viewBox="0 0 100 100" width="100%" height="100%" style={{ position: 'absolute', inset: 0 }}>
          <Eyes face={dim ? 'sleepy' : em.face || 'idle'} color={eyeColor} blink={blink} />
        </svg>
      </div>

      {/* accessory glyphs */}
      {!dim && emotion === 'love' && (
        <div style={{ position: 'absolute', top: '-6%', right: '4%', color, animation: 'floatY 2.4s ease-in-out infinite' }}>
          <svg width={size * 0.16} height={size * 0.16} viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 21s-7-4.6-9.3-9C1 9 2.5 5.5 6 5.5c2 0 3.2 1.2 4 2.3.8-1.1 2-2.3 4-2.3 3.5 0 5 3.5 3.3 6.5C19 16.4 12 21 12 21z" />
          </svg>
        </div>
      )}
      {!dim && emotion === 'sleepy' && (
        <div
          style={{
            position: 'absolute',
            top: '-4%',
            right: '2%',
            color,
            fontWeight: 800,
            fontSize: size * 0.14,
            opacity: 0.8,
            animation: 'floatY 3s ease-in-out infinite',
          }}
        >
          z
        </div>
      )}
      {!dim && emotion === 'curious' && (
        <div
          style={{
            position: 'absolute',
            top: '-8%',
            right: '6%',
            color,
            fontWeight: 800,
            fontSize: size * 0.2,
            animation: 'floatY 2.2s ease-in-out infinite',
          }}
        >
          ?
        </div>
      )}

      {/* speaking / thinking mouth-wave at base */}
      {(state === 'speaking' || state === 'thinking') && (
        <div
          style={{
            position: 'absolute',
            left: '50%',
            bottom: '14%',
            transform: 'translateX(-50%)',
            display: 'flex',
            alignItems: 'center',
            gap: size * 0.025,
            height: size * 0.12,
          }}
        >
          {[0, 1, 2, 3, 4].map((i) => (
            <div
              key={i}
              style={{
                width: size * 0.028,
                borderRadius: 999,
                background: eyeColor,
                height: state === 'speaking' ? '100%' : '40%',
                animation: `thinkDot 1s ${i * 0.12}s ease-in-out infinite`,
                boxShadow: `0 0 6px ${hexA(eyeColor, 0.8)}`,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// Tiny mood chip used in lists / headers
export interface MoodDotProps {
  emotion?: string;
  size?: number;
  dim?: boolean;
}

export function MoodDot({ emotion = 'idle', size = 10, dim = false }: MoodDotProps) {
  const c = dim ? '#5C6680' : (LUNI_EMOTIONS[emotion] || LUNI_EMOTIONS.idle).color;
  return (
    <span
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        display: 'inline-block',
        background: c,
        boxShadow: dim ? 'none' : `0 0 8px ${hexA(c, 0.8)}`,
        flex: 'none',
      }}
    />
  );
}
