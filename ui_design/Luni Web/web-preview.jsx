/* ============================================================
   web-preview.jsx — "Live Studio": the kept preview, re-laid-out.
   Robot orb (left) + phone-app mirror (right) driven by ONE set of
   live controls below. Replaces the old phone-frame + nav-rail layout.
   ============================================================ */

const STUDIO_EMOTIONS = Object.entries(LUNI_EMOTIONS)
  .filter(([k, v]) => v.settable && k !== 'idle')
  .map(([k, v]) => ({ id: k, label: v.label, color: v.color }));

const SCENES = [
  { id: 'weather', label: 'Thời tiết', icon: 'sun' },
  { id: 'moon', label: 'Tuần trăng', icon: 'moon' },
  { id: 'clock', label: 'Đồng hồ', icon: 'clock' },
  { id: 'network', label: 'Mạng', icon: 'wifi' },
  { id: 'sleep', label: 'Ngủ', icon: 'power' },
];

/* ---------- phone-app mirror (a screen, not a full bezel) ---------- */
function AppMirror({ emotion, scene, state, device, accent }) {
  const em = LUNI_EMOTIONS[emotion] || LUNI_EMOTIONS.idle;
  const moon = useLunar();
  return (
    <div style={{ width: 244, flex: 'none', borderRadius: 30, padding: 9, background: 'linear-gradient(160deg,#1a2030,#0c0f18)', border: '1px solid var(--hairline-2)', boxShadow: '0 30px 60px -24px rgba(0,0,0,.7), inset 0 1px 0 rgba(255,255,255,.05)' }}>
      <div style={{ borderRadius: 23, overflow: 'hidden', background: 'var(--bg-base)', height: 452, position: 'relative', border: '1px solid rgba(0,0,0,.5)' }}>
        {/* status bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 16px 6px' }}>
          <span className="mono" style={{ fontSize: 11, fontWeight: 700 }}>9:41</span>
          <span style={{ width: 56, height: 17, borderRadius: 99, background: '#05070d' }} />
          <span style={{ display: 'flex', gap: 5, alignItems: 'center' }}><Icon name="signal" size={13} color="var(--tx-soft)" /><Icon name="wifi" size={13} color="var(--tx-soft)" /><Icon name="battery" size={15} color="var(--tx-soft)" /></span>
        </div>
        {/* app header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 16px 2px' }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 800, letterSpacing: '-.02em' }}>{device.name.replace('Luni ', '')}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
              <MoodDot emotion={emotion} size={7} /><span style={{ fontSize: 11, color: 'var(--tx-mute)' }}>{em.label}</span>
            </div>
          </div>
          <span style={{ width: 30, height: 30, borderRadius: 9, display: 'grid', placeItems: 'center', background: 'var(--bg-2)' }}><Icon name="gear" size={15} color="var(--tx-mute)" /></span>
        </div>
        {/* hero face */}
        <div style={{ display: 'grid', placeItems: 'center', padding: '14px 0 4px' }}>
          <LuniFace emotion={emotion} size={132} state={state} />
        </div>
        <div style={{ textAlign: 'center', marginTop: 2 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: em.color }}>{state === 'speaking' ? 'Đang nói…' : state === 'listening' ? 'Đang nghe…' : em.label}</div>
        </div>
        {/* stat chips */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 7, padding: '14px 14px 0' }}>
          {[['battery', `${device.battery}%`, device.charging ? 'Đang sạc' : 'Pin'], ['cpu', `v${device.fw}`, 'Firmware'], ['wifi', `${device.rssi}dBm`, 'Sóng'], ['moon', `AL ${moon.lunarDay}`, moon.phase.vi]].map(([ic, val, lab]) => (
            <div key={lab} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '9px 10px', background: 'var(--bg-1)', borderRadius: 12, border: '1px solid var(--hairline)' }}>
              <Icon name={ic} size={15} color={accent} />
              <div style={{ minWidth: 0 }}><div className="mono" style={{ fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap' }}>{val}</div><div style={{ fontSize: 9.5, color: 'var(--tx-faint)' }}>{lab}</div></div>
            </div>
          ))}
        </div>
        {/* bottom tab bar */}
        <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, display: 'flex', justifyContent: 'space-around', padding: '9px 0 12px', background: 'linear-gradient(0deg,var(--bg-base) 60%,transparent)', borderTop: '1px solid var(--hairline)' }}>
          {['grid', 'sliders', 'chat', 'chart'].map((ic, i) => <Icon key={ic} name={ic} size={19} color={i === 0 ? accent : 'var(--tx-faint)'} />)}
        </div>
      </div>
    </div>
  );
}

/* ---------- robot stage ---------- */
function RobotStage({ emotion, state, device, accent, size = 230 }) {
  const em = LUNI_EMOTIONS[emotion] || LUNI_EMOTIONS.idle;
  return (
    <div style={{ flex: 1, minWidth: 280, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative', padding: '8px 0' }}>
      {/* live badge */}
      <div style={{ position: 'absolute', top: 4, left: 4, display: 'flex', alignItems: 'center', gap: 7, padding: '5px 11px', borderRadius: 99, background: 'var(--bg-2)', border: '1px solid var(--hairline)' }}>
        <span className="cdot" style={{ background: device.online ? 'var(--green)' : 'var(--tx-faint)', boxShadow: device.online ? '0 0 8px var(--green)' : 'none', animation: device.online ? 'chargePulse 1.6s ease-in-out infinite' : 'none' }} />
        <span style={{ fontSize: 11, fontWeight: 700, color: device.online ? 'var(--green)' : 'var(--tx-faint)' }}>{device.online ? 'LIVE · trực tuyến' : 'Ngoại tuyến'}</span>
      </div>
      <div style={{ position: 'absolute', top: 4, right: 4 }}>
        <Pill tone={em.color} dot>{em.label}</Pill>
      </div>

      <LuniFace emotion={emotion} size={size} state={state} dim={!device.online} />

      {/* pedestal reflection */}
      <div style={{ width: size * 0.78, height: 22, marginTop: -6, borderRadius: '50%', background: `radial-gradient(ellipse, ${hexA2(em.color, .22)}, transparent 70%)`, filter: 'blur(3px)' }} />
      <div style={{ marginTop: 12, textAlign: 'center' }}>
        <div style={{ fontSize: 16, fontWeight: 800, letterSpacing: '-.01em' }}>{device.name}</div>
        <div className="mono" style={{ fontSize: 11.5, color: 'var(--tx-faint)', marginTop: 3 }}>{device.id} · {device.model}</div>
      </div>
    </div>
  );
}

/* ---------- the studio (robot + app + shared controls) ---------- */
function LiveStudio({ device, accent = 'var(--acc)', defaultEmotion }) {
  const [emotion, setEmotion] = useS(defaultEmotion || device.emotion || 'happy');
  const [scene, setScene] = useS(device.scene || 'weather');
  const [state, setState] = useS('idle');

  const speak = () => {
    setState('speaking');
    luniToast('Đã gửi WS say → robot đang đọc', 'acc', 'volume');
    setTimeout(() => setState('idle'), 2600);
  };
  const toggleListen = () => setState(s => s === 'listening' ? 'idle' : 'listening');

  return (
    <div className="panel fadein" style={{ overflow: 'hidden' }}>
      <PanelHead icon="sparkle" title="Phòng xem trực tiếp" sub="Gương đôi robot ⇄ app — điều khiển bên dưới áp dụng cho cả hai"
        right={<div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-sm" onClick={toggleListen} style={state === 'listening' ? { color: accent, borderColor: 'var(--acc-32)', background: 'var(--acc-12)' } : null}><Icon name="mic" size={15} color={state === 'listening' ? accent : 'var(--tx-mute)'} />Nghe</button>
          <button className="btn btn-sm btn-acc" onClick={speak}><Icon name="volume" size={15} color="var(--acc-ink)" />Cho Luni đọc</button>
        </div>} />

      {/* dual preview */}
      <div style={{ display: 'flex', gap: 26, alignItems: 'center', padding: '22px 24px', background: 'radial-gradient(120% 120% at 30% 0%, var(--acc-12), transparent 60%)', flexWrap: 'wrap', justifyContent: 'center' }}>
        <RobotStage emotion={emotion} state={state} device={device} accent={accent} />
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          <span className="t-over" style={{ margin: 0 }}>Bản xem trên app</span>
          <AppMirror emotion={emotion} scene={scene} state={state} device={device} accent={accent} />
        </div>
      </div>

      <div className="hr" />

      {/* shared controls */}
      <div style={{ padding: '16px 24px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <span className="t-cap">Biểu cảm <span style={{ color: 'var(--tx-faint)' }}>· SET_EMOTION</span></span>
          <span className="mono" style={{ fontSize: 11, color: 'var(--tx-faint)' }}>{STUDIO_EMOTIONS.length} điều khiển được</span>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {STUDIO_EMOTIONS.map(e => {
            const on = e.id === emotion;
            return (
              <button key={e.id} className="press" onClick={() => { setEmotion(e.id); luniToast('SET_EMOTION ' + e.id, 'acc', 'check'); }} style={{
                display: 'inline-flex', alignItems: 'center', gap: 7, height: 34, padding: '0 12px', borderRadius: 99,
                background: on ? hexA2(e.color, .16) : 'var(--bg-2)', color: on ? e.color : 'var(--tx-mute)',
                border: `1px solid ${on ? hexA2(e.color, .42) : 'var(--hairline)'}`, fontSize: 12.5, fontWeight: 700,
              }}>
                <span className="cdot" style={{ background: e.color, boxShadow: on ? `0 0 7px ${hexA2(e.color, .8)}` : 'none' }} />{e.label}
              </button>
            );
          })}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '18px 0 10px' }}>
          <span className="t-cap">Cảnh hiển thị <span style={{ color: 'var(--tx-faint)' }}>· 320×240</span></span>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {SCENES.map(s => {
            const on = s.id === scene;
            return (
              <button key={s.id} className="press" onClick={() => { setScene(s.id); luniToast('Cảnh → ' + s.label, 'acc', s.icon); }} style={{
                display: 'inline-flex', alignItems: 'center', gap: 8, height: 38, padding: '0 14px', borderRadius: 11,
                background: on ? 'var(--acc-12)' : 'var(--bg-2)', color: on ? accent : 'var(--tx-mute)',
                border: `1px solid ${on ? 'var(--acc-32)' : 'var(--hairline)'}`, fontSize: 13, fontWeight: 700,
              }}>
                <Icon name={s.icon} size={16} color={on ? accent : 'var(--tx-faint)'} />{s.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { LiveStudio, AppMirror, RobotStage, STUDIO_EMOTIONS, SCENES });
