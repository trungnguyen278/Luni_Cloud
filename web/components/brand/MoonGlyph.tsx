/* ============================================================
   MoonGlyph — the ONE canonical phase-aware Luni moon (redraws per p).
   MoonEyes — Luni's two-eye gaze sized to the 100×100 moon viewBox.
   Ported from lib/luni-moon.jsx (pure SVG, no hooks).
   ============================================================ */
import type { CSSProperties } from 'react';
import { hexA } from '@/lib/format';
import { moonAccent } from '@/lib/moon/engine';

export interface MoonEyesProps {
  color?: string;
  dim?: boolean;
}

export function MoonEyes({ color = '#5BE9FF', dim = false }: MoonEyesProps) {
  const c = dim ? hexA(color, 0.9) : color;
  return (
    <g fill={c} style={{ filter: `drop-shadow(0 0 4px ${hexA(color, 0.95)})` }}>
      <rect x="34" y="37" width="11.5" height="26" rx="5.75" />
      <rect x="54.5" y="37" width="11.5" height="26" rx="5.75" />
    </g>
  );
}

export interface MoonGlyphProps {
  p?: number;
  size?: number;
  color?: string;
  lit?: string;
  dark?: string;
  glow?: boolean;
  ring?: boolean;
  strokeOpacity?: number;
  eyes?: boolean;
  style?: CSSProperties;
}

export function MoonGlyph({
  p = 0.5,
  size = 48,
  color = '#5BE9FF',
  lit,
  dark = '#0B0F18',
  glow = true,
  ring = true,
  strokeOpacity = 0.4,
  eyes = false,
  style,
}: MoonGlyphProps) {
  const litC = lit || '#EAF2FF';
  const R = 50;
  const cx = 50;
  const cy = 50;
  const cos = Math.cos(2 * Math.PI * p);
  const illum = (1 - cos) / 2;
  const waxing = p < 0.5;
  const rx = R * Math.abs(cos);
  const gibbous = illum > 0.5;
  const sp = moonAccent(illum, color);
  const rimC = sp.kind === 'normal' ? color : sp.accent;
  // glow: warm + wide at Rằm, a tight violet ember at Sóc, scales with light otherwise
  const glowC =
    sp.kind === 'full' ? hexA(sp.accent, 0.6) : sp.kind === 'new' ? hexA(sp.accent, 0.42) : hexA(color, 0.55 * illum + 0.1);
  const glowR = sp.kind === 'full' ? 9 : sp.kind === 'new' ? 3.5 : 2 + illum * 6;
  // lit semicircle (right when waxing, left when waning)
  const semi = waxing
    ? `M${cx},${cy - R} A${R},${R} 0 0 1 ${cx},${cy + R} Z`
    : `M${cx},${cy - R} A${R},${R} 0 0 0 ${cx},${cy + R} Z`;
  const uid = 'mg' + Math.round(p * 1000) + '_' + size;
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} style={{ display: 'block', flex: 'none', overflow: 'visible', ...style }}>
      <defs>
        <radialGradient id={uid + 'g'} cx="36%" cy="32%" r="74%">
          <stop offset="0%" stopColor={sp.kind === 'full' ? '#FFF6E0' : litC} />
          <stop offset="74%" stopColor={litC} />
          <stop offset="100%" stopColor={sp.kind === 'full' ? '#F2D58F' : '#B8CCEC'} />
        </radialGradient>
      </defs>
      {/* dark disc */}
      <circle cx={cx} cy={cy} r={R} fill={dark} />
      {/* faint earthshine on the dark side (stronger at Sóc so the disc is felt) */}
      <circle cx={cx} cy={cy} r={R} fill={sp.kind === 'new' ? sp.accent : color} opacity={sp.kind === 'new' ? 0.13 : 0.06} />
      {/* lit region */}
      <g style={glow ? { filter: `drop-shadow(0 0 ${glowR}px ${glowC})` } : undefined}>
        {illum > 0.012 && <path d={semi} fill={`url(#${uid}g)`} />}
        {rx > 0.4 && <ellipse cx={cx} cy={cy} rx={rx} ry={R} fill={gibbous ? `url(#${uid}g)` : dark} />}
      </g>
      {/* craters hint on lit area */}
      {illum > 0.45 && (
        <g fill={sp.kind === 'full' ? '#E9C97E' : '#C9DCF5'} opacity={sp.kind === 'full' ? 0.42 : 0.5}>
          <circle cx={waxing && !gibbous ? 64 : 42} cy="37" r="4" />
          <circle cx={waxing && !gibbous ? 58 : 56} cy="62" r="6" />
          <circle cx={waxing && !gibbous ? 74 : 32} cy="56" r="3" />
        </g>
      )}
      {/* rim ring — at the extremes it carries the special accent + extra weight */}
      {ring && (
        <circle
          cx={cx}
          cy={cy}
          r={R - 0.8}
          fill="none"
          stroke={rimC}
          strokeOpacity={sp.kind === 'new' ? 0.85 : sp.kind === 'full' ? 0.6 : strokeOpacity}
          strokeWidth={sp.kind === 'new' ? 2 : 1.4}
          style={sp.kind === 'new' && glow ? { filter: `drop-shadow(0 0 4px ${hexA(sp.accent, 0.7)})` } : undefined}
        />
      )}
      {eyes && <MoonEyes color={color} dim={illum < 0.06} />}
    </svg>
  );
}
