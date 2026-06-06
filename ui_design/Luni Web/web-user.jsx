/* ============================================================
   web-user.jsx — USER role dashboard (cyan). Personal robots:
   overview, live studio, chat, stats, OTA, settings.
   ============================================================ */

function DeviceSwitch({ devices, sel, onSel }) {
  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      {devices.map(d => {
        const on = d.id === sel;
        return (
          <button key={d.id} className="press" onClick={() => onSel(d.id)} style={{
            display: 'flex', alignItems: 'center', gap: 10, padding: '8px 13px 8px 9px', borderRadius: 12,
            background: on ? 'var(--acc-12)' : 'var(--bg-1)', border: `1px solid ${on ? 'var(--acc-32)' : 'var(--hairline)'}`,
          }}>
            <span style={{ width: 30, height: 30, borderRadius: 9, display: 'grid', placeItems: 'center', background: 'var(--bg-2)' }}><LuniFace emotion={d.emotion} size={24} state="idle" noPhase /></span>
            <span style={{ textAlign: 'left' }}><span style={{ display: 'block', fontSize: 13, fontWeight: 700, color: on ? 'var(--acc)' : 'var(--tx)' }}>{d.name.replace('Luni ', '')}</span><span style={{ fontSize: 10.5, color: 'var(--tx-faint)' }}>{d.online ? 'Trực tuyến' : 'Ngoại tuyến'} · {d.battery}%</span></span>
          </button>
        );
      })}
    </div>
  );
}

function MiniStat({ icon, label, value, tone = 'var(--acc)' }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '12px 14px', background: 'var(--bg-1)', border: '1px solid var(--hairline)', borderRadius: 13 }}>
      <span style={{ width: 34, height: 34, borderRadius: 10, display: 'grid', placeItems: 'center', background: hexA2(tone, .13), flex: 'none' }}><Icon name={icon} size={17} color={tone} /></span>
      <div style={{ minWidth: 0 }}><div className="mono" style={{ fontSize: 15, fontWeight: 700 }}>{value}</div><div style={{ fontSize: 11, color: 'var(--tx-faint)' }}>{label}</div></div>
    </div>
  );
}

/* ---------------- Overview ---------------- */
function UserOverview({ device, setNav }) {
  const onlineN = MY_DEVICES.filter(d => d.online).length;
  return (
    <>
      <PageHead title={<>Chào buổi sáng, <span style={{ color: 'var(--acc)' }}>Mai</span> 👋</>} sub="Luni của bạn đang vui vẻ — hôm nay trăng Âm lịch.">
        <button className="btn btn-acc" onClick={() => setNav('studio')}><Icon name="sparkle" size={16} color="var(--acc-ink)" />Mở phòng xem</button>
      </PageHead>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 18 }}>
        <KPI icon="cpu" label="Robot" value={MY_DEVICES.length} sub={`${onlineN} trực tuyến`} tone="var(--acc)" />
        <KPI icon="chat" label="Tương tác hôm nay" value="13" trend={18} tone="#76B8FF" />
        <KPI icon="battery" label="Pin trung bình" value="58%" sub="1 đang sạc" tone="#7BE88E" />
        <KPI icon="clock" label="Phút trò chuyện" value="42" sub="tuần này" tone="#FFD166" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.55fr 1fr', gap: 18, alignItems: 'start' }}>
        <div style={{ display: 'grid', gap: 18 }}>
          <LiveStudio device={device} />
        </div>
        <div style={{ display: 'grid', gap: 18 }}>
          <MoonCard accent="var(--cyan)" />
          <div className="panel">
            <PanelHead icon="wave" title="Hoạt động gần đây" />
            <div style={{ padding: '6px 8px 10px' }}>
              {ACTIVITY.map((a, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 11 }}>
                  <span style={{ width: 32, height: 32, borderRadius: 9, display: 'grid', placeItems: 'center', background: hexA2(a.c, .13), flex: 'none' }}><Icon name={a.icon} size={15} color={a.c} /></span>
                  <span style={{ flex: 1, fontSize: 13, color: 'var(--tx-soft)' }}>{a.text}</span>
                  <span className="mono" style={{ fontSize: 11, color: 'var(--tx-faint)' }}>{a.t}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

/* ---------------- Studio ---------------- */
function UserStudio({ device, devices, sel, setSel }) {
  return (
    <>
      <div style={{ marginBottom: 18 }}><DeviceSwitch devices={devices} sel={sel} onSel={setSel} /></div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 18 }}>
        <LiveStudio device={device} key={device.id} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
          <MiniStat icon="battery" label={device.charging ? 'Đang sạc' : 'Pin'} value={device.battery + '%'} tone="#7BE88E" />
          <MiniStat icon="signal" label="Sóng Wi-Fi" value={device.rssi + ' dBm'} tone="#76B8FF" />
          <MiniStat icon="cpu" label="Firmware" value={'v' + device.fw} tone="var(--acc)" />
          <MiniStat icon="location" label="Vị trí" value={device.city} tone="#FFD166" />
        </div>
      </div>
    </>
  );
}

/* ---------------- Chat ---------------- */
const CHAT = [
  { me: true, t: 'Luni ơi, hôm nay Hà Nội thời tiết thế nào?' },
  { me: false, t: 'Hà Nội hôm nay 24°C, trời nhiều mây nhẹ, chiều có thể có mưa rào. Nhớ mang theo ô nha! ☁️', emo: 'happy' },
  { me: true, t: 'Cảm ơn nha. Đặt báo thức 7 giờ sáng mai giúp mình.' },
  { me: false, t: 'Đã đặt báo thức lúc 7:00 sáng mai rồi. Chúc bạn ngủ ngon~', emo: 'calm' },
  { me: true, t: 'Hôm nay là Rằm à? Trông bạn sáng hơn mọi khi.' },
  { me: false, t: 'Đúng rồi! Âm lịch 14 — sắp tới Rằm nên mình rạng rỡ hẳn. Trăng tròn làm mình vui lắm ✨', emo: 'excited' },
];
function UserChat({ device }) {
  const sessions = [
    { t: 'Thời tiết & báo thức', sub: 'hôm nay 09:14', on: true },
    { t: 'Kể chuyện trước khi ngủ', sub: 'hôm qua 21:30' },
    { t: 'Hỏi về tuần trăng', sub: '3 ngày trước' },
    { t: 'Nhắc lịch họp', sub: '5 ngày trước' },
  ];
  const [msgs, setMsgs] = useS(CHAT);
  const [draft, setDraft] = useS('');
  const scrollRef = useR(null);
  useE(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, [msgs]);
  const send = () => {
    const t = draft.trim(); if (!t) return;
    setMsgs(m => [...m, { me: true, t }]); setDraft('');
    setTimeout(() => setMsgs(m => [...m, { me: false, emo: 'happy', t: 'Mình nghe rồi nè! Đây chỉ là bản demo nên Luni chưa trả lời thật được, nhưng tin nhắn của bạn đã gửi tới robot 💫' }]), 700);
  };
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '270px 1fr', gap: 18, height: 'calc(100vh - 150px)' }}>
      <div className="panel" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <PanelHead icon="chat" title="Hội thoại" />
        <div className="scrolly" style={{ flex: 1, padding: 8 }}>
          {sessions.map((s, i) => (
            <button key={i} className="press" style={{ display: 'block', width: '100%', textAlign: 'left', padding: '11px 12px', borderRadius: 11, marginBottom: 2, background: s.on ? 'var(--acc-12)' : 'transparent', border: `1px solid ${s.on ? 'var(--acc-20)' : 'transparent'}` }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: s.on ? 'var(--acc)' : 'var(--tx-soft)' }}>{s.t}</div>
              <div style={{ fontSize: 11, color: 'var(--tx-faint)', marginTop: 2 }}>{s.sub}</div>
            </button>
          ))}
        </div>
      </div>
      <div className="panel" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <PanelHead title={device.name} sub="Trò chuyện thoại + chữ" right={<Pill tone="#7BE88E" dot>Trực tuyến</Pill>} />
        <div ref={scrollRef} className="scrolly" style={{ flex: 1, padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {msgs.map((m, i) => (
            <div key={i} style={{ display: 'flex', gap: 10, alignSelf: m.me ? 'flex-end' : 'flex-start', maxWidth: '74%', flexDirection: m.me ? 'row-reverse' : 'row' }}>
              {!m.me && <span style={{ flex: 'none' }}><LuniFace emotion={m.emo} size={34} state="idle" noPhase /></span>}
              <div style={{ padding: '11px 15px', borderRadius: m.me ? '15px 15px 4px 15px' : '15px 15px 15px 4px', fontSize: 13.5, lineHeight: 1.5,
                background: m.me ? 'var(--acc)' : 'var(--bg-2)', color: m.me ? 'var(--acc-ink)' : 'var(--tx-soft)', border: m.me ? 'none' : '1px solid var(--hairline)', fontWeight: m.me ? 600 : 400 }}>{m.t}</div>
            </div>
          ))}
        </div>
        <div style={{ padding: '14px 18px', borderTop: '1px solid var(--hairline)', display: 'flex', gap: 10 }}>
          <input className="winput" placeholder="Nhắn cho Luni…" value={draft} onChange={e => setDraft(e.target.value)} onKeyDown={e => e.key === 'Enter' && send()} />
          <button className="btn btn-icon" onClick={() => luniToast('Đang nghe… (giữ để nói)', 'acc', 'mic')}><Icon name="mic" size={18} color="var(--tx-mute)" /></button>
          <button className="btn btn-acc btn-icon" onClick={send}><Icon name="send" size={18} color="var(--acc-ink)" /></button>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Stats ---------------- */
function UserStats() {
  return (
    <div style={{ display: 'grid', gap: 18 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
        <div className="panel"><PanelHead icon="chart" title="Tương tác 7 ngày" sub="Lượt trò chuyện mỗi ngày" /><div className="panel-pad"><BarChart data={USER_7D} labels={STAT_LABELS} accent="var(--acc)" /></div></div>
        <div className="panel"><PanelHead icon="battery" title="Lịch sử pin" sub="% theo ngày" /><div className="panel-pad"><BarChart data={USER_BATTERY} labels={STAT_LABELS} accent="#7BE88E" unit="%" /></div></div>
      </div>
      <div className="panel"><PanelHead icon="sparkle" title="Phân bố cảm xúc" sub="Luni đã thể hiện trong tuần" />
        <div className="panel-pad"><HBars rows={EMOTION_DIST.map(e => ({ ...e, unit: '%' }))} /></div>
      </div>
    </div>
  );
}

/* ---------------- OTA (user) — auto-update first ---------------- */
function Toggle({ on, onClick, accent = 'var(--acc)' }) {
  return (
    <button className="press" onClick={onClick} style={{ width: 46, height: 27, borderRadius: 99, padding: 3, flex: 'none', background: on ? accent : 'var(--bg-3)', border: '1px solid var(--hairline)', display: 'flex', justifyContent: on ? 'flex-end' : 'flex-start', transition: 'background .2s, justify-content .2s' }}>
      <span style={{ width: 21, height: 21, borderRadius: '50%', background: on ? 'var(--acc-ink)' : 'var(--tx-mute)', transition: 'all .2s' }} />
    </button>
  );
}
function UserOTA({ devices }) {
  const [auto, setAuto] = useS(true);
  const [prog, setProg] = useS({});
  const run = (id) => {
    if (prog[id] != null) return;
    let p = 0; setProg(s => ({ ...s, [id]: 0 }));
    const t = setInterval(() => { p += Math.random() * 14 + 6; if (p >= 100) { p = 100; clearInterval(t); luniToast('Đã cài v2.1.0 — robot khởi động lại', 'green', 'check'); setTimeout(() => setProg(s => { const n = { ...s }; delete n[id]; return n; }), 1800); } setProg(s => ({ ...s, [id]: Math.min(100, Math.round(p)) })); }, 420);
  };
  return (
    <div style={{ display: 'grid', gap: 14 }}>
      {/* auto-update master card */}
      <div className="panel panel-pad" style={{ display: 'flex', alignItems: 'center', gap: 16, background: 'radial-gradient(120% 130% at 0% 0%, var(--acc-12), transparent 60%)' }}>
        <span style={{ width: 44, height: 44, borderRadius: 12, display: 'grid', placeItems: 'center', background: 'var(--acc-12)', flex: 'none' }}><Icon name="download" size={22} color="var(--acc)" /></span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 800 }}>Tự động cập nhật</div>
          <div style={{ fontSize: 12.5, color: 'var(--tx-mute)', marginTop: 3, lineHeight: 1.5 }}>Luni tự cài bản firmware mới tương thích khi <b style={{ color: 'var(--tx-soft)' }}>đang sạc & rảnh</b> — bạn không cần làm gì. Giống điện thoại tự cập nhật ứng dụng.</div>
        </div>
        <Toggle on={auto} onClick={() => { setAuto(a => !a); luniToast(auto ? 'Đã tắt tự động cập nhật' : 'Đã bật tự động cập nhật', 'acc', auto ? 'close' : 'check'); }} />
      </div>

      {devices.map(d => {
        const behind = d.fw !== '2.1.0';
        const p = prog[d.id];
        return (
          <div key={d.id} className="panel panel-pad" style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
            <span style={{ flex: 'none' }}><LuniFace emotion={d.emotion} size={54} state={p != null ? 'thinking' : 'idle'} noPhase dim={!d.online} /></span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><span style={{ fontSize: 15, fontWeight: 700 }}>{d.name}</span>{behind ? <Pill tone="#FFD166">Có bản v2.1.0</Pill> : <Pill tone="#7BE88E" dot>Mới nhất</Pill>}</div>
              <div className="mono" style={{ fontSize: 12, color: 'var(--tx-faint)', marginTop: 4 }}>Đang chạy v{d.fw} · {d.model} · ota_0</div>
              {p != null
                ? <div className="progress" style={{ marginTop: 11 }}><i style={{ width: p + '%' }} /></div>
                : behind && auto && <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 8, fontSize: 12, color: 'var(--warm)', fontWeight: 600 }}><Icon name="clock" size={14} color="var(--warm)" />{d.charging ? 'Đang chuẩn bị cài…' : 'Đã lên lịch — sẽ cài khi cắm sạc'}</div>}
            </div>
            {p != null
              ? <span className="mono" style={{ fontSize: 14, fontWeight: 700, color: 'var(--acc)', width: 52, textAlign: 'right' }}>{p}%</span>
              : behind
                ? <button className={auto ? 'btn' : 'btn btn-acc'} disabled={!d.online} onClick={() => run(d.id)}><Icon name="download" size={16} color={auto ? 'var(--tx-soft)' : 'var(--acc-ink)'} />Cập nhật ngay</button>
                : <button className="btn" disabled><Icon name="check" size={16} color="var(--green)" />Mới nhất</button>}
          </div>
        );
      })}
      <div className="panel panel-pad" style={{ display: 'flex', alignItems: 'center', gap: 12, color: 'var(--tx-mute)', fontSize: 13 }}>
        <Icon name="info" size={17} color="var(--tx-faint)" />OTA 2 phân vùng — nếu mất điện giữa chừng robot tự quay về bản cũ, luôn an toàn.
      </div>
    </div>
  );
}

/* ---------------- Settings (user) ---------------- */
function UserSettings({ device }) {
  const [modal, setModal] = useS(null);
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
      <div className="panel"><PanelHead icon="user" title="Hồ sơ" />
        <div className="panel-pad" style={{ display: 'grid', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}><Avatar name="Nguyễn Mai" size={52} /><div><div style={{ fontSize: 15, fontWeight: 700 }}>Nguyễn Mai</div><div className="mono" style={{ fontSize: 12, color: 'var(--tx-faint)' }}>mai.nguyen@gmail.com</div></div></div>
          <div><label className="field-label">Tên hiển thị</label><input className="winput" defaultValue="Nguyễn Mai" /></div>
          <div><label className="field-label">Thành phố</label><input className="winput" defaultValue="Hà Nội" /></div>
          <button className="btn btn-acc" style={{ justifySelf: 'start' }} onClick={() => luniToast('Đã lưu hồ sơ', 'green', 'check')}><Icon name="check" size={16} color="var(--acc-ink)" />Lưu thay đổi</button>
        </div>
      </div>
      <div style={{ display: 'grid', gap: 18 }}>
        <div className="panel"><PanelHead icon="lock" title="Bảo mật" />
          <div className="panel-pad" style={{ display: 'grid', gap: 10 }}>
            {[['Đổi mật khẩu', 'key', 'pass'], ['Xác thực 2 lớp (2FA)', 'shield', '2fa'], ['Thiết bị đăng nhập', 'globe', 'sessions']].map(([l, ic, m]) => (
              <button key={l} className="press" style={settingRow} onClick={() => setModal(m)}><Icon name={ic} size={17} color="var(--tx-mute)" /><span style={{ flex: 1, textAlign: 'left', fontSize: 13.5, fontWeight: 600 }}>{l}</span><Icon name="chevron" size={16} color="var(--tx-faint)" /></button>
            ))}
          </div>
        </div>
        <div className="panel"><PanelHead icon="gear" title="Ứng dụng" />
          <div className="panel-pad" style={{ display: 'grid', gap: 10 }}>
            {[['Ngôn ngữ', 'Tiếng Việt'], ['Giờ yên tĩnh', '22:00 – 7:00'], ['Tự động cập nhật', device.autoOta ? 'Bật' : 'Tắt']].map(([l, v]) => (
              <div key={l} style={settingRow}><span style={{ flex: 1, fontSize: 13.5, fontWeight: 600, color: 'var(--tx-soft)' }}>{l}</span><span style={{ fontSize: 13, color: 'var(--tx-mute)' }}>{v}</span></div>
            ))}
          </div>
        </div>
      </div>

      {modal === 'pass' && <ChangePasswordModal onClose={() => setModal(null)} />}
      {modal === '2fa' && <TwoFAModal onClose={() => setModal(null)} />}
      {modal === 'sessions' && <SessionsModal onClose={() => setModal(null)} />}
    </div>
  );
}

function ChangePasswordModal({ onClose }) {
  const [a, setA] = useS(''); const [b, setB] = useS(''); const [c, setC] = useS(''); const [err, setErr] = useS('');
  const submit = () => {
    if (!a) { setErr('Nhập mật khẩu hiện tại.'); return; }
    if (b.length < 8) { setErr('Mật khẩu mới tối thiểu 8 ký tự.'); return; }
    if (b !== c) { setErr('Mật khẩu xác nhận không khớp.'); return; }
    luniToast('Đã đổi mật khẩu', 'green', 'check'); onClose();
  };
  return (
    <Modal title="Đổi mật khẩu" icon="key" onClose={onClose} width={430}>
      <div style={{ padding: 22, display: 'grid', gap: 13 }}>
        <Field label="Mật khẩu hiện tại" required><input className="winput" type="password" value={a} onChange={e => { setA(e.target.value); setErr(''); }} placeholder="••••••••" /></Field>
        <Field label="Mật khẩu mới" required><input className="winput" type="password" value={b} onChange={e => { setB(e.target.value); setErr(''); }} placeholder="Tối thiểu 8 ký tự" /></Field>
        <Field label="Xác nhận mật khẩu mới" required><input className="winput" type="password" value={c} onChange={e => { setC(e.target.value); setErr(''); }} placeholder="Nhập lại" /></Field>
        {err && <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: 'var(--red)' }}><Icon name="alert" size={15} color="var(--red)" />{err}</div>}
      </div>
      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', padding: '14px 22px', borderTop: '1px solid var(--hairline)' }}>
        <button className="btn" onClick={onClose}>Huỷ</button>
        <button className="btn btn-acc" onClick={submit}><Icon name="check" size={15} color="var(--acc-ink)" />Cập nhật</button>
      </div>
    </Modal>
  );
}

function TwoFAModal({ onClose }) {
  return (
    <Modal title="Xác thực 2 lớp (2FA)" sub="Bảo vệ tài khoản bằng ứng dụng xác thực" icon="shield" onClose={onClose} width={440}>
      <div style={{ padding: 22 }}>
        <div style={{ display: 'flex', gap: 18, alignItems: 'center' }}>
          <div style={{ width: 132, height: 132, flex: 'none', borderRadius: 14, background: 'var(--bg-2)', border: '1px solid var(--hairline)', display: 'grid', placeItems: 'center' }}><Icon name="qr" size={92} color="var(--tx-soft)" /></div>
          <div>
            <p style={{ fontSize: 13, color: 'var(--tx-soft)', lineHeight: 1.6, margin: 0 }}>Quét mã QR bằng Google Authenticator hoặc Authy, rồi nhập mã 6 số để hoàn tất.</p>
            <div className="mono" style={{ fontSize: 12, color: 'var(--tx-faint)', marginTop: 10, padding: '8px 10px', background: 'var(--bg-2)', borderRadius: 9, border: '1px solid var(--hairline)' }}>LUNI · J5K2 9F0A 7C1D</div>
          </div>
        </div>
        <div style={{ marginTop: 16 }}><Field label="Mã xác thực"><input className="winput mono" placeholder="000 000" maxLength={7} style={{ letterSpacing: '.3em' }} /></Field></div>
      </div>
      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', padding: '14px 22px', borderTop: '1px solid var(--hairline)' }}>
        <button className="btn" onClick={onClose}>Để sau</button>
        <button className="btn btn-acc" onClick={() => { luniToast('Đã bật 2FA', 'green', 'shield'); onClose(); }}><Icon name="check" size={15} color="var(--acc-ink)" />Bật 2FA</button>
      </div>
    </Modal>
  );
}

function SessionsModal({ onClose }) {
  const sess = [
    { dev: 'Chrome · macOS', loc: 'Hà Nội, VN', t: 'Đang hoạt động', cur: true },
    { dev: 'Luni App · iPhone 14', loc: 'Hà Nội, VN', t: '2 giờ trước' },
    { dev: 'Safari · iPad', loc: 'Hải Phòng, VN', t: 'Hôm qua' },
  ];
  return (
    <Modal title="Thiết bị đăng nhập" sub={`${sess.length} phiên đang mở`} icon="globe" onClose={onClose} width={460}>
      <div style={{ padding: 16, display: 'grid', gap: 8 }}>
        {sess.map((s, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 13px', borderRadius: 12, background: 'var(--bg-2)', border: '1px solid var(--hairline)' }}>
            <span style={{ width: 34, height: 34, borderRadius: 10, display: 'grid', placeItems: 'center', background: 'var(--bg-1)', flex: 'none' }}><Icon name={s.dev.includes('App') ? 'grid' : 'globe'} size={17} color={s.cur ? 'var(--acc)' : 'var(--tx-mute)'} /></span>
            <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 13, fontWeight: 700 }}>{s.dev} {s.cur && <Pill tone="#7BE88E" style={{ marginLeft: 4, height: 18 }}>Hiện tại</Pill>}</div><div style={{ fontSize: 11.5, color: 'var(--tx-faint)', marginTop: 2 }}>{s.loc} · {s.t}</div></div>
            {!s.cur && <button className="btn btn-sm btn-danger" onClick={() => luniToast('Đã đăng xuất phiên', 'red', 'power')}>Đăng xuất</button>}
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '14px 22px', borderTop: '1px solid var(--hairline)' }}>
        <button className="btn btn-danger" onClick={() => { luniToast('Đã đăng xuất mọi nơi khác', 'red', 'power'); onClose(); }}><Icon name="power" size={15} color="var(--red)" />Đăng xuất tất cả nơi khác</button>
      </div>
    </Modal>
  );
}
const settingRow = { display: 'flex', alignItems: 'center', gap: 11, padding: '12px 13px', borderRadius: 11, background: 'var(--bg-2)', border: '1px solid var(--hairline)', width: '100%' };

/* ---------------- router ---------------- */
function UserDashboard({ nav, setNav }) {
  const [sel, setSel] = useS(MY_DEVICES[0].id);
  const device = MY_DEVICES.find(d => d.id === sel) || MY_DEVICES[0];
  if (nav === 'overview') return <UserOverview device={MY_DEVICES[0]} setNav={setNav} />;
  if (nav === 'studio') return <UserStudio device={device} devices={MY_DEVICES} sel={sel} setSel={setSel} />;
  if (nav === 'chat') return <UserChat device={MY_DEVICES[0]} />;
  if (nav === 'stats') return <UserStats />;
  if (nav === 'ota') return <UserOTA devices={MY_DEVICES} />;
  if (nav === 'settings') return <UserSettings device={MY_DEVICES[0]} />;
  return null;
}

Object.assign(window, { UserDashboard });
