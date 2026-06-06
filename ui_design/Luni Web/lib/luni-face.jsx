/* ============================================================
   LuniFace — the signature animated robot face.
   A glowing "moon" disc with expressive eyes that morph per emotion.
   Props: emotion, size, state ('idle'|'listening'|'speaking'|'thinking'),
          dim (offline), onTap
   ============================================================ */
const { useState: _useState, useEffect: _useEffect, useRef: _useRef } = React;

// Emotions the firmware can actually be commanded into (WS SET_EMOTION → StateManager).
// `face` = eye-shape archetype; `tone` follows the robot's 9-tone palette.
// settable:true = controllable via SET_EMOTION; others are display-only (autonomous).
const LUNI_EMOTIONS = {
  neutral:   { color: '#5BE9FF', label: 'Bình thường', face: 'idle',    settable: true },
  idle:      { color: '#5BE9FF', label: 'Bình thường', face: 'idle' },
  happy:     { color: '#FFD166', label: 'Vui vẻ',      face: 'arc',     settable: true },
  excited:   { color: '#FFD166', label: 'Phấn khích',  face: 'wide',    settable: true },
  curious:   { color: '#FF9D5B', label: 'Tò mò',       face: 'curious', settable: true },
  confused:  { color: '#FF9D5B', label: 'Bối rối',     face: 'curious', settable: true },
  annoyed:   { color: '#FF9D5B', label: 'Khó chịu',    face: 'angry',   settable: true },
  nervous:   { color: '#FF9D5B', label: 'Lo lắng',     face: 'curious', settable: true },
  calm:      { color: '#76B8FF', label: 'Thư giãn',    face: 'oval',    settable: true },
  cool:      { color: '#5BE9FF', label: 'Ngầu',        face: 'oval',    settable: true },
  thinking:  { color: '#5BE9FF', label: 'Đang nghĩ',   face: 'idle',    settable: true },
  sad:       { color: '#76B8FF', label: 'Buồn',        face: 'sad',     settable: true },
  angry:     { color: '#FF5B6E', label: 'Giận',        face: 'angry',   settable: true },
  disgusted: { color: '#7BE88E', label: 'Ghê',         face: 'sad',     settable: true },
  // display-only (robot expresses these on its own; not on SET_EMOTION map)
  love:      { color: '#FF6B9D', label: 'Yêu thích',   face: 'arc' },
  sleepy:    { color: '#B48CFF', label: 'Buồn ngủ',    face: 'sleepy' },
  alert:     { color: '#FF5B6E', label: 'Cảnh báo',    face: 'wide' },
};

function hexA(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

/* Eyes geometry per archetype, drawn in a 100×100 viewBox.
   Matched to the LuniRobot display (EmotionCore): the signature eye is a
   big, CHUNKY rounded-rectangle — robot EYE_W/EYE_H/EYE_RX = 88/96/22
   (aspect ~0.92, corners ~¼ of width). Scaled into the round orb here:
   base eye ≈ 23×27 with rx 7, spread toward the two ends of the face. */
const E_W = 23, E_H = 27, E_RX = 7;      // base chunky rounded-rect eye
const E_LX = 33, E_RX_X = 67, E_CY = 50; // left/right centers + vertical center

// one chunky rounded-rect eye centered at (cx,cy)
function eyeRect(cx, cy, w = E_W, h = E_H, rx = E_RX, key) {
  return <rect key={key} x={cx - w / 2} y={cy - h / 2} width={w} height={Math.max(h, 1)}
    rx={Math.min(rx, w / 2, Math.max(h, 1) / 2)} />;
}

function Eyes({ face, color, blink }) {
  const sy = blink ? 0.08 : 1;
  const grp = { transform: `scaleY(${sy})`, transformOrigin: '50px 50px', transition: 'transform .12s ease' };
  const glow = { filter: `drop-shadow(0 0 5px ${hexA(color, 0.9)})` };

  if (face === 'arc') {
    // happy — fat upward smile arcs ⌣ ⌣ (robot 'happy')
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
    // chunky eyes under slanted brow lids (robot 'angry')
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
    // asymmetric "huh?" — one tall eye, one squished (robot 'curious')
    return (
      <g style={{ ...grp, ...glow }} fill={color}>
        {eyeRect(E_LX, E_CY, E_W, 30, E_RX, 'l')}
        {eyeRect(E_RX_X, E_CY + 2, E_W + 2, 17, 8, 'r')}
      </g>
    );
  }
  if (face === 'wide') {
    // excited / surprised — big chunky eyes (robot 'surprised', solid, no pupils)
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

function LuniFace({ emotion = 'idle', size = 160, state = 'idle', dim = false, phase = null, noPhase = false, onTap, style }) {
  const em = LUNI_EMOTIONS[emotion] || LUNI_EMOTIONS.idle;
  const color = dim ? '#5C6680' : em.color;
  // Robot rule: the FACE (eyes + mouth) is always cyan — only the glow / accessory
  // glyphs carry the emotion tone. Keeps Luni's gaze identical to the app icon.
  const eyeColor = dim ? '#5C6680' : '#5BE9FF';
  const [blink, setBlink] = _useState(false);
  // glow breathes with the moon's brightness: bright at Rằm, faint at mùng 1
  const moon = useLunar();
  const illum = dim ? 0 : moon.illum;
  // Luni IS the moon — the orb wears tonight's phase as a soft terminator shadow.
  const pVal = phase != null ? phase : moon.p;
  const showPhase = !dim && !noPhase;
  const _cosP = Math.cos(2 * Math.PI * pVal), _illumP = (1 - _cosP) / 2;
  const _waxP = pVal < 0.5, _gibP = _illumP > 0.5, _rxP = 48 * Math.abs(_cosP);
  const _litSemi = _waxP ? 'M50,2 A48,48 0 0 1 50,98 Z' : 'M50,2 A48,48 0 0 0 50,98 Z';
  const _mId = 'lp' + React.useId().replace(/[:]/g, '');
  const moonF = dim ? 1 : (0.45 + 0.55 * illum);
  const glowInset = dim ? '-22%' : `${-(15 + illum * 13)}%`;

  _useEffect(() => {
    if (dim) return;
    let t;
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

  const breatheDur = emotion === 'sleepy' || emotion === 'calm' ? '5.5s'
    : emotion === 'alert' ? '1.6s' : '3.6s';

  return (
    <div
      onClick={onTap}
      style={{
        position: 'relative', width: size, height: size,
        cursor: onTap ? 'pointer' : 'default', flex: 'none',
        ...style,
      }}
    >
      {/* outer glow */}
      <div style={{
        position: 'absolute', inset: glowInset, borderRadius: '50%',
        background: `radial-gradient(circle, ${hexA(color, dim ? .12 : .42 * moonF)} 0%, transparent 62%)`,
        animation: dim ? 'none' : `glowPulse ${breatheDur} var(--ease) infinite`,
        pointerEvents: 'none',
      }} />

      {/* listening radar rings */}
      {state === 'listening' && [0, 1, 2].map(i => (
        <div key={i} style={{
          position: 'absolute', inset: 0, borderRadius: '50%',
          border: `2px solid ${hexA(color, .5)}`,
          animation: `radar 2s ${i * 0.66}s ease-out infinite`,
        }} />
      ))}

      {/* the orb */}
      <div style={{
        position: 'absolute', inset: 0, borderRadius: '50%',
        background: `
          radial-gradient(120% 120% at 32% 26%, ${hexA(color, dim ? .08 : .20)} 0%, transparent 46%),
          radial-gradient(100% 100% at 50% 118%, ${hexA(color, .14)} 0%, transparent 55%),
          linear-gradient(160deg, #161b29 0%, #0c0f18 100%)`,
        border: `1.5px solid ${hexA(color, dim ? .14 : .34)}`,
        boxShadow: dim ? 'inset 0 2px 14px rgba(0,0,0,.5)'
          : `inset 0 2px 18px rgba(0,0,0,.45), inset 0 0 30px ${hexA(color, .05 + .14 * illum)}`,
        animation: dim ? 'none' : `luniBreathe ${breatheDur} var(--ease) infinite`,
        display: 'grid', placeItems: 'center', overflow: 'hidden',
      }}>
        {/* rim crescent highlight (the "moon") */}
        <div style={{
          position: 'absolute', inset: 0, borderRadius: '50%',
          background: `radial-gradient(120% 120% at 76% 80%, ${hexA(color, .10)} 0%, transparent 40%)`,
        }} />
        {/* phase shadow — the orb shows tonight's lunar phase (đổi theo 30 ngày) */}
        {showPhase && (
          <svg viewBox="0 0 100 100" width="100%" height="100%" style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
            <defs>
              <mask id={_mId}>
                <circle cx="50" cy="50" r="48" fill="#fff" />
                <path d={_litSemi} fill="#000" />
                <ellipse cx="50" cy="50" rx={_rxP} ry="48" fill={_gibP ? '#000' : '#fff'} />
              </mask>
              <filter id={_mId + 'b'}><feGaussianBlur stdDeviation="1.3" /></filter>
            </defs>
            <circle cx="50" cy="50" r="48" fill="#05060b" fillOpacity="0.6" mask={`url(#${_mId})`} filter={`url(#${_mId}b)`} />
          </svg>
        )}
        <svg viewBox="0 0 100 100" width="100%" height="100%" style={{ position: 'absolute', inset: 0 }}>
          <Eyes face={dim ? 'sleepy' : (em.face || 'idle')} color={eyeColor} blink={blink} />
        </svg>
      </div>

      {/* accessory glyphs */}
      {!dim && emotion === 'love' && (
        <div style={{ position: 'absolute', top: '-6%', right: '4%', color, animation: 'floatY 2.4s ease-in-out infinite' }}>
          <svg width={size * 0.16} height={size * 0.16} viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 21s-7-4.6-9.3-9C1 9 2.5 5.5 6 5.5c2 0 3.2 1.2 4 2.3.8-1.1 2-2.3 4-2.3 3.5 0 5 3.5 3.3 6.5C19 16.4 12 21 12 21z"/>
          </svg>
        </div>
      )}
      {!dim && emotion === 'sleepy' && (
        <div style={{ position: 'absolute', top: '-4%', right: '2%', color, fontWeight: 800, fontSize: size * 0.14, opacity: .8, animation: 'floatY 3s ease-in-out infinite' }}>z</div>
      )}
      {!dim && emotion === 'curious' && (
        <div style={{ position: 'absolute', top: '-8%', right: '6%', color, fontWeight: 800, fontSize: size * 0.2, animation: 'floatY 2.2s ease-in-out infinite' }}>?</div>
      )}

      {/* speaking / thinking mouth-wave at base */}
      {(state === 'speaking' || state === 'thinking') && (
        <div style={{
          position: 'absolute', left: '50%', bottom: '14%', transform: 'translateX(-50%)',
          display: 'flex', alignItems: 'center', gap: size * 0.025, height: size * 0.12,
        }}>
          {[0, 1, 2, 3, 4].map(i => (
            <div key={i} style={{
              width: size * 0.028, borderRadius: 999, background: eyeColor,
              height: state === 'speaking' ? '100%' : '40%',
              animation: `thinkDot 1s ${i * 0.12}s ease-in-out infinite`,
              boxShadow: `0 0 6px ${hexA(eyeColor, .8)}`,
            }} />
          ))}
        </div>
      )}
    </div>
  );
}

// Tiny mood chip used in lists / headers
function MoodDot({ emotion = 'idle', size = 10, dim = false }) {
  const c = dim ? '#5C6680' : (LUNI_EMOTIONS[emotion] || LUNI_EMOTIONS.idle).color;
  return (
    <span style={{
      width: size, height: size, borderRadius: '50%', display: 'inline-block',
      background: c, boxShadow: dim ? 'none' : `0 0 8px ${hexA(c, .8)}`, flex: 'none',
    }} />
  );
}

Object.assign(window, { LuniFace, MoodDot, LUNI_EMOTIONS, hexA, Eyes });
