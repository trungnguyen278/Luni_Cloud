/* ============================================================
   Luni Moon — lunar engine + phase-aware glyphs.
   Luni *is* the moon, so the app breathes with the synodic cycle.
   Some icons (the moon glyph, the "sleep" scene, the home crest)
   redraw themselves theo sự tròn khuyết — based on âm lịch.
   ============================================================ */

const SYNODIC = 29.530588853;                 // mean synodic month (days)
const NEW_MOON_REF = Date.UTC(2000, 0, 6, 18, 14) / 86400000; // JD-ish day index of a known new moon

// 8 canonical phases with Vietnamese names (dân gian + thiên văn)
const MOON_PHASES = [
  { key: 'new',     vi: 'Trăng non',        sub: 'Sóc · mùng 1',      p: 0.0 },
  { key: 'wax-cre', vi: 'Lưỡi liềm đầu',    sub: 'Trăng thượng tuần', p: 0.125 },
  { key: 'first-q', vi: 'Thượng huyền',     sub: 'Bán nguyệt đầu',    p: 0.25 },
  { key: 'wax-gib', vi: 'Trăng khuyết đầu', sub: 'Trương huyền đầu',  p: 0.375 },
  { key: 'full',    vi: 'Trăng tròn',       sub: 'Vọng · Rằm',        p: 0.5 },
  { key: 'wan-gib', vi: 'Trăng khuyết cuối',sub: 'Trương huyền cuối', p: 0.625 },
  { key: 'last-q',  vi: 'Hạ huyền',         sub: 'Bán nguyệt cuối',   p: 0.75 },
  { key: 'wan-cre', vi: 'Lưỡi liềm tàn',    sub: 'Trăng hạ tuần',     p: 0.875 },
];

// Compute the synodic phase (0..1), illuminated fraction, lunar day for a JS Date.
function lunarInfo(date) {
  if (!date) date = getLuniNow();
  const dayIndex = date.getTime() / 86400000;
  let age = (dayIndex - NEW_MOON_REF) % SYNODIC;
  if (age < 0) age += SYNODIC;
  const p = age / SYNODIC;                        // 0 new → .5 full → 1 new
  const illum = (1 - Math.cos(2 * Math.PI * p)) / 2;
  const lunarDay = Math.floor(age) + 1;           // ngày âm lịch (1..30)
  const waxing = p < 0.5;
  // nearest canonical phase
  let nearest = 0, best = 9;
  MOON_PHASES.forEach((ph, i) => {
    let d = Math.abs(ph.p - p); d = Math.min(d, 1 - d);
    if (d < best) { best = d; nearest = i; }
  });
  return { p, illum, age, lunarDay, waxing, phase: MOON_PHASES[nearest], phaseIndex: nearest };
}

function phaseFromLunarDay(d) {        // ngày âm lịch 1..30 → phase p
  return ((d - 1) % SYNODIC) / SYNODIC;
}

/* The 30-day standard set — Luni's icon for every ngày âm lịch.
   age = d-1, illum follows the synodic curve. Days 15 & 16 both land ~99–100%
   (trăng tròn vài đêm liền), day 1 & 30 ~0% (Sóc). Tag the special extremes. */
const LUNAR_DAYS = Array.from({ length: 30 }, (_, i) => {
  const d = i + 1;
  const p = (d - 1) / SYNODIC;
  const illum = (1 - Math.cos(2 * Math.PI * p)) / 2;
  const kind = illum > 0.985 ? 'full' : illum < 0.03 ? 'new' : 'normal';
  return { day: d, p, illum, waxing: p < 0.5, kind };
});
function lunarDayMeta(d) { return LUNAR_DAYS[(((d - 1) % 30) + 30) % 30]; }

/* ============================================================
   Global "Luni date" — a day offset from the real today so the
   whole app can be scrubbed across the month. Persisted + reactive.
   ============================================================ */
const LUNI_LISTENERS = new Set();
let LUNI_OFFSET = parseInt(localStorage.getItem('luni_day_offset') || '0', 10) || 0;

function getLuniNow() { return new Date(Date.now() + LUNI_OFFSET * 86400000); }
function getLuniOffset() { return LUNI_OFFSET; }
function setLuniOffset(days) {
  LUNI_OFFSET = days;
  try { localStorage.setItem('luni_day_offset', String(days)); } catch (e) {}
  LUNI_LISTENERS.forEach(fn => fn());
}
function shiftLuniDay(delta) { setLuniOffset(LUNI_OFFSET + delta); }

// React hook: live lunar info that re-renders when the global date moves.
function useLunar() {
  const [, force] = React.useReducer(x => x + 1, 0);
  React.useEffect(() => { LUNI_LISTENERS.add(force); return () => LUNI_LISTENERS.delete(force); }, []);
  return lunarInfo(getLuniNow());
}

// Special lunar days → Luni shifts mood on its own.
function specialDay(info) {
  if (info.illum > 0.965) return { kind: 'ram', vi: 'Đêm Rằm', emotion: 'excited', color: '#FFD166', desc: 'Trăng tròn vành vạnh — Luni rạng rỡ, vầng sáng nở hết cỡ.' };
  if (info.illum < 0.035) return { kind: 'soc', vi: 'Mùng Một', emotion: 'sleepy', color: '#B48CFF', desc: 'Trăng tối (Sóc) — Luni trầm lắng, thắp ánh dịu để bầu bạn.' };
  return null;
}

// Offset that lands the app on the nearest occurrence of phase p.
function offsetToPhase(targetP) {
  const cur = lunarInfo(getLuniNow());
  let dAge = (targetP * SYNODIC) - cur.age;
  dAge = ((dAge % SYNODIC) + SYNODIC) % SYNODIC;
  if (dAge > SYNODIC / 2) dAge -= SYNODIC;
  return LUNI_OFFSET + Math.round(dAge);
}
// Offset to the next Rằm / mùng 1 going forward.
function offsetToSpecial(kind) {
  for (let k = 1; k <= 60; k++) {
    const info = lunarInfo(new Date(getLuniNow().getTime() + k * 86400000));
    if (kind === 'ram' && info.illum > 0.965) return LUNI_OFFSET + k;
    if (kind === 'soc' && info.illum < 0.035) return LUNI_OFFSET + k;
  }
  return LUNI_OFFSET;
}

const WEEKDAY_VI = ['Chủ nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
function fmtDate(d) {
  return `${WEEKDAY_VI[d.getDay()]} · ${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

// Derive display info from a raw phase p (used for scrub preview)
function phaseMetaFromP(p) {
  p = ((p % 1) + 1) % 1;
  const illum = (1 - Math.cos(2 * Math.PI * p)) / 2;
  const lunarDay = Math.floor(p * SYNODIC) + 1;
  let nearest = 0, best = 9;
  MOON_PHASES.forEach((ph, i) => { let d = Math.abs(ph.p - p); d = Math.min(d, 1 - d); if (d < best) { best = d; nearest = i; } });
  return { p, illum, lunarDay, waxing: p < 0.5, phase: MOON_PHASES[nearest], phaseIndex: nearest };
}

/* ----- Special accents for the two extremes of the cycle -----
   Full (Rằm) glows warm-gold and vành vạnh; New (Sóc) is drawn only by a
   luminous rim + earthshine so it still reads at any size. ----- */
const FULL_GOLD = '#FFD96B';
const NEW_VIOLET = '#B9A0FF';
function moonAccent(illum, base) {
  if (illum > 0.985) return { kind: 'full', accent: FULL_GOLD, base };      // Rằm (ngày 15 & 16)
  if (illum < 0.03) return { kind: 'new', accent: NEW_VIOLET, base };       // Sóc / mùng 1
  return { kind: 'normal', accent: base, base };
}

/* ----- The phase-aware moon glyph (redraws per p) — the ONE canonical
   Luni moon. App icon + dashboard + 30-day set all draw with this look.
   `eyes` overlays Luni's signature gaze so the moon reads as the character. ----- */
function MoonGlyph({ p = 0.5, size = 48, color = '#5BE9FF', lit, dark = '#0B0F18', glow = true, ring = true, strokeOpacity = 0.4, eyes = false, style }) {
  const litC = lit || '#EAF2FF';
  const R = 50, cx = 50, cy = 50;
  const cos = Math.cos(2 * Math.PI * p);
  const illum = (1 - cos) / 2;
  const waxing = p < 0.5;
  const rx = R * Math.abs(cos);
  const gibbous = illum > 0.5;
  const sp = moonAccent(illum, color);
  const rimC = sp.kind === 'normal' ? color : sp.accent;
  // glow: warm + wide at Rằm, a tight violet ember at Sóc, scales with light otherwise
  const glowC = sp.kind === 'full' ? hexA(sp.accent, 0.6)
    : sp.kind === 'new' ? hexA(sp.accent, 0.42)
    : hexA(color, 0.55 * illum + 0.1);
  const glowR = sp.kind === 'full' ? 9 : sp.kind === 'new' ? 3.5 : 2 + illum * 6;
  // lit semicircle (right when waxing, left when waning)
  const semi = waxing
    ? `M${cx},${cy - R} A${R},${R} 0 0 1 ${cx},${cy + R} Z`
    : `M${cx},${cy - R} A${R},${R} 0 0 0 ${cx},${cy + R} Z`;
  const uid = 'mg' + Math.round(p * 1000) + '_' + size;
  return (
    <svg viewBox="0 0 100 100" width={size} height={size}
      style={{ display: 'block', flex: 'none', overflow: 'visible', ...style }}>
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
      <g style={glow ? { filter: `drop-shadow(0 0 ${glowR}px ${glowC})` } : null}>
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
      {ring && <circle cx={cx} cy={cy} r={R - 0.8} fill="none" stroke={rimC}
        strokeOpacity={sp.kind === 'new' ? 0.85 : sp.kind === 'full' ? 0.6 : strokeOpacity}
        strokeWidth={sp.kind === 'new' ? 2 : 1.4}
        style={sp.kind === 'new' && glow ? { filter: `drop-shadow(0 0 4px ${hexA(sp.accent, 0.7)})` } : null} />}
      {eyes && <MoonEyes color={color} dim={illum < 0.06} />}
    </svg>
  );
}

/* Luni's two-eye gaze, sized to the 100×100 moon viewBox — the brand signature. */
function MoonEyes({ color = '#5BE9FF', dim = false }) {
  const c = dim ? hexA(color, 0.9) : color;
  return (
    <g fill={c} style={{ filter: `drop-shadow(0 0 4px ${hexA(color, 0.95)})` }}>
      <rect x="34" y="37" width="11.5" height="26" rx="5.75" />
      <rect x="54.5" y="37" width="11.5" height="26" rx="5.75" />
    </g>
  );
}

/* ----- Horizontal strip of the 8 phases, current highlighted ----- */
function MoonStrip({ activeIndex, onPick, color = '#5BE9FF' }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 4 }}>
      {MOON_PHASES.map((ph, i) => {
        const on = i === activeIndex;
        return (
          <button key={ph.key} className="press" onClick={onPick ? () => onPick(i) : undefined}
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, flex: 1,
              padding: '8px 0 6px', borderRadius: 13, background: on ? hexA(color, 0.12) : 'transparent',
              border: `1px solid ${on ? hexA(color, 0.32) : 'transparent'}`, cursor: onPick ? 'pointer' : 'default',
              transition: 'all .2s var(--ease)',
            }}>
            <MoonGlyph p={ph.p} size={on ? 30 : 25} color={color} glow={on} ring strokeOpacity={on ? 0.6 : 0.25} />
            <span style={{ fontSize: 8.5, fontWeight: 700, color: on ? color : 'var(--tx-faint)', whiteSpace: 'nowrap' }}>
              {['Sóc', 'Liềm', 'T.huyền', 'Khuyết', 'Rằm', 'Khuyết', 'H.huyền', 'Tàn'][i]}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/* ----- 30-day lunar month: Luni's full standard icon set, current day lit.
   Tap a day to scrub the whole app to that ngày âm lịch. ----- */
function LunarMonthGrid({ accent = '#5BE9FF', activeDay, onPick }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(10, 1fr)', gap: 6 }}>
      {LUNAR_DAYS.map(({ day, p, kind }) => {
        const on = day === activeDay;
        const spC = kind === 'full' ? '#FFD96B' : kind === 'new' ? '#B9A0FF' : accent;
        return (
          <button key={day} className="press" onClick={onPick ? () => onPick(day) : undefined}
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
              padding: '6px 0 4px', borderRadius: 11, cursor: onPick ? 'pointer' : 'default',
              background: on ? hexA(spC, 0.14) : 'transparent',
              border: `1px solid ${on ? hexA(spC, 0.4) : 'transparent'}`,
              transition: 'all .18s var(--ease)',
            }}>
            <MoonGlyph p={p} size={on ? 22 : 18} color={accent} glow={on || kind !== 'normal'} ring strokeOpacity={on ? 0.6 : 0.22} />
            <span className="mono" style={{ fontSize: 8.5, fontWeight: 700, color: on ? spC : (kind !== 'normal' ? hexA(spC, 0.9) : 'var(--tx-faint)') }}>{day}</span>
          </button>
        );
      })}
    </div>
  );
}

/* ----- Overview "Tuần trăng" card: Luni redraws icons theo âm lịch ----- */
function MoonCard({ accent = '#5BE9FF' }) {
  const info = useLunar();                  // live, follows the global Luni date
  const now = getLuniNow();
  const offset = getLuniOffset();
  const isToday = offset === 0;
  const p = info.p;
  const lunarDay = info.lunarDay;
  const pct = Math.round(info.illum * 100);
  const sp = specialDay(info);

  return (
    <div className="card" style={{ overflow: 'hidden', padding: 0, borderColor: sp ? hexA(sp.color, 0.3) : hexA(accent, 0.22) }}>
      {/* hero strip */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 16, padding: '16px 16px 14px',
        background: `radial-gradient(120% 130% at 84% -20%, ${hexA(sp ? sp.color : accent, 0.14)}, transparent 62%)`,
      }}>
        <div style={{ animation: isToday ? 'floatY 5s ease-in-out infinite' : 'none', flex: 'none' }}>
          <MoonGlyph p={p} size={70} color={sp ? sp.color : accent} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
            <span className="t-h3">{info.phase.vi}</span>
            <span className="pill" style={{ height: 18, padding: '0 8px', fontSize: 9.5, background: isToday ? hexA('#7BE88E', 0.14) : hexA(accent, 0.14), color: isToday ? 'var(--green)' : accent }}>
              {isToday ? 'Đêm nay' : (offset > 0 ? `+${offset} ngày` : `${offset} ngày`)}
            </span>
          </div>
          <div style={{ fontSize: 12.5, color: 'var(--tx-mute)', marginTop: 3 }}>{info.phase.sub}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 9 }}>
            <span className="mono" style={{ fontSize: 12, color: 'var(--tx-soft)' }}>Âm lịch <b style={{ color: accent }}>{lunarDay}</b>/30</span>
            <span style={{ width: 1, height: 12, background: 'var(--hairline-2)' }} />
            <span className="mono" style={{ fontSize: 12, color: 'var(--tx-soft)' }}>Sáng {pct}%</span>
          </div>
        </div>
      </div>

      {/* special-day banner — Luni auto-shifts mood */}
      {sp && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 11, margin: '0 14px 12px', padding: '11px 13px', borderRadius: 14, background: hexA(sp.color, 0.1), border: `1px solid ${hexA(sp.color, 0.3)}` }}>
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

const dateStepBtn = { width: 40, height: 40, borderRadius: 12, flex: 'none', display: 'grid', placeItems: 'center', background: 'var(--bg-2)', border: '1px solid var(--hairline)' };

function QuickJump({ label, active, accent = '#5BE9FF', onClick }) {
  return (
    <button className="press" onClick={onClick} style={{
      height: 32, padding: '0 13px', borderRadius: 99, fontSize: 12, fontWeight: 700,
      background: active ? hexA(accent, 0.16) : 'var(--bg-2)', color: active ? accent : 'var(--tx-soft)',
      border: `1px solid ${active ? hexA(accent, 0.4) : 'var(--hairline)'}`,
    }}>{label}</button>
  );
}

/* ----- EXTERNAL dev control: lives OUTSIDE the phone UI.
   Scrubs the global Luni date so the whole app can be checked
   across the lunar cycle, without putting test chrome in-product. ----- */
function LuniDateDevPanel({ accent = '#5BE9FF' }) {
  const info = useLunar();                  // re-renders when offset moves
  const now = getLuniNow();
  const offset = getLuniOffset();
  const isToday = offset === 0;

  return (
    <div style={{
      width: 230, padding: 16, borderRadius: 18,
      background: 'var(--bg-1)', border: '1px dashed var(--hairline-2)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 13 }}>
        <span style={{ width: 7, height: 7, borderRadius: 99, background: '#FFD166', flex: 'none' }} />
        <span className="t-over" style={{ margin: 0 }}>Dev · chỉnh ngày (ngoài app)</span>
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
      <input type="range" min="-15" max="15" step="1" value={Math.max(-15, Math.min(15, offset))}
        onChange={(e) => setLuniOffset(parseInt(e.target.value))}
        style={{ width: '100%', accentColor: accent, height: 4, cursor: 'pointer', margin: '14px 0 4px' }} />

      <div style={{ display: 'flex', gap: 7, marginTop: 10, flexWrap: 'wrap' }}>
        <QuickJump label="Hôm nay" active={isToday} accent={accent} onClick={() => setLuniOffset(0)} />
        <QuickJump label="Đêm Rằm" accent="#FFD166" onClick={() => setLuniOffset(offsetToSpecial('ram'))} />
        <QuickJump label="Mùng 1" accent="#B48CFF" onClick={() => setLuniOffset(offsetToSpecial('soc'))} />
      </div>
    </div>
  );
}

Object.assign(window, {
  lunarInfo, phaseFromLunarDay, phaseMetaFromP, MoonGlyph, MoonEyes, MoonStrip, MoonCard, LunarMonthGrid,
  MOON_PHASES, LUNAR_DAYS, lunarDayMeta, moonAccent, SYNODIC,
  getLuniNow, getLuniOffset, setLuniOffset, shiftLuniDay, useLunar, specialDay,
  offsetToPhase, offsetToSpecial, fmtDate, LuniDateDevPanel,
});
