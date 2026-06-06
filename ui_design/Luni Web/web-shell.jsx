/* ============================================================
   web-shell.jsx — console chrome: login gate, sidebar, topbar,
   role switch, router. Renders UserDashboard / AdminDashboard.
   ============================================================ */

const USER_NAV = [
  { group: 'Robot' },
  { id: 'overview', label: 'Tổng quan', icon: 'grid' },
  { id: 'studio', label: 'Robot của tôi', icon: 'sparkle' },
  { id: 'chat', label: 'Trò chuyện', icon: 'chat' },
  { id: 'stats', label: 'Thống kê', icon: 'chart' },
  { group: 'Tài khoản' },
  { id: 'ota', label: 'Cập nhật', icon: 'download' },
  { id: 'settings', label: 'Cài đặt', icon: 'gear' },
];
const ADMIN_NAV = [
  { group: 'Vận hành' },
  { id: 'overview', label: 'Tổng quan', icon: 'grid' },
  { id: 'devices', label: 'Thiết bị', icon: 'cpu' },
  { id: 'users', label: 'Người dùng', icon: 'users' },
  { id: 'cost', label: 'Chi phí AI', icon: 'bolt' },
  { group: 'Phát hành' },
  { id: 'firmware', label: 'Firmware', icon: 'chip', star: true },
  { id: 'logs', label: 'Nhật ký', icon: 'logs' },
];
const PAGE_META = {
  overview: { t: 'Tổng quan', s: 'Bức tranh toàn cảnh hôm nay' },
  studio: { t: 'Robot của tôi', s: 'Xem trực tiếp & điều khiển Luni' },
  chat: { t: 'Trò chuyện', s: 'Lịch sử hội thoại với Luni' },
  stats: { t: 'Thống kê', s: 'Tương tác, pin và cảm xúc theo thời gian' },
  ota: { t: 'Cập nhật firmware', s: 'OTA cho robot của bạn' },
  settings: { t: 'Cài đặt', s: 'Tài khoản, bảo mật và ứng dụng' },
  devices: { t: 'Thiết bị', s: 'Toàn bộ fleet robot Luni' },
  users: { t: 'Người dùng', s: 'Quản lý tài khoản & vai trò' },
  firmware: { t: 'Firmware (OTA)', s: 'Xuất bản — robot tự cập nhật khi đủ điều kiện' },
  logs: { t: 'Nhật ký hệ thống', s: 'Log thiết bị & máy chủ toàn fleet' },
  cost: { t: 'Chi phí AI', s: 'Chi phí mô hình AI toàn fleet — theo ngày, dịch vụ & thiết bị' },
};

/* =================== LOGIN =================== */
function LoginScreen({ onLogin, onBack }) {
  const [email, setEmail] = useS('');
  const [pass, setPass] = useS('');
  const [show, setShow] = useS(false);
  const [err, setErr] = useS('');
  const [busy, setBusy] = useS(false);
  const moon = useLunar();

  const fill = (e, p) => { setEmail(e); setPass(p); setErr(''); };
  const submit = (ev) => {
    ev && ev.preventDefault();
    if (!email || !pass) { setErr('Nhập email và mật khẩu.'); return; }
    setBusy(true);
    setTimeout(() => {
      setBusy(false);
      const isAdmin = /admin|service|kythuat|@luni\./i.test(email);
      onLogin(isAdmin ? 'admin' : 'user', email);
    }, 850);
  };

  return (
    <div style={{ height: '100vh', display: 'grid', gridTemplateColumns: '1.05fr .95fr', overflow: 'hidden', background: 'var(--bg-base)' }}>
      {/* brand side */}
      <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '46px 52px', overflow: 'hidden',
        background: 'radial-gradient(120% 90% at 20% 0%, rgba(91,233,255,.10), transparent 55%), radial-gradient(100% 80% at 100% 100%, rgba(180,140,255,.10), transparent 55%), var(--bg-void)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="press" onClick={onBack} title="Về trang chủ" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <MoonGlyph p={moon.p} size={40} color="#5BE9FF" eyes />
            <div style={{ textAlign: 'left' }}><div style={{ fontSize: 19, fontWeight: 800, letterSpacing: '-.02em' }}>Luni</div><div className="t-over" style={{ margin: 0 }}>Cloud Console</div></div>
          </button>
        </div>
        <div>
          <div style={{ position: 'relative', display: 'inline-block' }}>
            <div style={{ position: 'absolute', inset: '-30%', background: 'radial-gradient(circle, rgba(91,233,255,.16), transparent 65%)', animation: 'glowPulse 5s var(--ease) infinite' }} />
            <LuniFace emotion="happy" size={188} state="idle" />
          </div>
          <h1 style={{ fontSize: 34, fontWeight: 800, letterSpacing: '-.03em', lineHeight: 1.08, margin: '30px 0 0', maxWidth: 420 }}>Người bạn AI<br/>đồng bộ theo tuần trăng.</h1>
          <p style={{ fontSize: 15, color: 'var(--tx-mute)', lineHeight: 1.6, margin: '14px 0 0', maxWidth: 400 }}>Bảng điều khiển web cho hệ sinh thái Luni — giám sát fleet, phát hành firmware OTA và xem robot của bạn theo thời gian thực.</p>
        </div>
        <div style={{ display: 'flex', gap: 24, fontSize: 12.5, color: 'var(--tx-faint)' }}>
          <span>lunirobot.io.vn</span><span>FastAPI · PostgreSQL · ESP32</span>
        </div>
      </div>

      {/* form side */}
      <div style={{ display: 'grid', placeItems: 'center', padding: 32, borderLeft: '1px solid var(--hairline)' }}>
        <form onSubmit={submit} style={{ width: '100%', maxWidth: 372 }}>
          <button type="button" className="press" onClick={onBack} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, height: 32, padding: '0 12px 0 9px', borderRadius: 99, background: 'var(--bg-2)', border: '1px solid var(--hairline)', fontSize: 12.5, fontWeight: 700, color: 'var(--tx-mute)', marginBottom: 22 }}><Icon name="back" size={15} color="var(--tx-mute)" />Trang chủ</button>
          <h2 style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-.02em', margin: 0 }}>Đăng nhập</h2>
          <p style={{ fontSize: 13.5, color: 'var(--tx-mute)', margin: '7px 0 26px' }}>Vai trò được suy ra từ email đăng nhập.</p>

          <label className="field-label">Email</label>
          <div style={{ position: 'relative', marginBottom: 14 }}>
            <span style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)' }}><Icon name="mail" size={17} color="var(--tx-faint)" /></span>
            <input className="winput" style={{ paddingLeft: 40 }} value={email} onChange={e => { setEmail(e.target.value); setErr(''); }} placeholder="ban@gmail.com" type="email" autoComplete="username" />
          </div>
          <label className="field-label">Mật khẩu</label>
          <div style={{ position: 'relative', marginBottom: 8 }}>
            <span style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)' }}><Icon name="lock" size={17} color="var(--tx-faint)" /></span>
            <input className="winput" style={{ paddingLeft: 40, paddingRight: 42 }} value={pass} onChange={e => { setPass(e.target.value); setErr(''); }} placeholder="••••••••" type={show ? 'text' : 'password'} autoComplete="current-password" />
            <button type="button" onClick={() => setShow(s => !s)} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', width: 30, height: 30, display: 'grid', placeItems: 'center' }}><Icon name={show ? 'eyeOff' : 'eye'} size={17} color="var(--tx-faint)" /></button>
          </div>
          {err && <div style={{ fontSize: 12.5, color: 'var(--red)', marginBottom: 8 }}>{err}</div>}
          <div style={{ textAlign: 'right', marginBottom: 18 }}><a href="#" onClick={e => e.preventDefault()} style={{ fontSize: 12.5, color: 'var(--acc)', textDecoration: 'none', fontWeight: 600 }}>Quên mật khẩu?</a></div>

          <button type="submit" className="btn btn-acc" style={{ width: '100%', height: 46 }} disabled={busy}>
            {busy ? <Spinner size={18} color="var(--acc-ink)" /> : <><Icon name="power" size={17} color="var(--acc-ink)" />Đăng nhập</>}
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '22px 0' }}>
            <span className="hr" style={{ flex: 1 }} /><span style={{ fontSize: 11, color: 'var(--tx-faint)', fontWeight: 600 }}>TÀI KHOẢN DEMO</span><span className="hr" style={{ flex: 1 }} />
          </div>
          <div style={{ display: 'grid', gap: 9 }}>
            <button type="button" className="press" onClick={() => fill('mai.nguyen@gmail.com', 'luni2026')} style={demoCard('#5BE9FF')}>
              <span style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(91,233,255,.14)', display: 'grid', placeItems: 'center', flex: 'none' }}><Icon name="user" size={17} color="#5BE9FF" /></span>
              <span style={{ flex: 1, textAlign: 'left' }}><span style={{ display: 'block', fontSize: 13, fontWeight: 700 }}>Người dùng</span><span className="mono" style={{ fontSize: 11, color: 'var(--tx-faint)' }}>mai.nguyen@gmail.com</span></span>
              <Icon name="chevron" size={16} color="var(--tx-faint)" />
            </button>
            <button type="button" className="press" onClick={() => fill('admin@luni.vn', 'luni2026')} style={demoCard('#B48CFF')}>
              <span style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(180,140,255,.14)', display: 'grid', placeItems: 'center', flex: 'none' }}><Icon name="shield" size={17} color="#B48CFF" /></span>
              <span style={{ flex: 1, textAlign: 'left' }}><span style={{ display: 'block', fontSize: 13, fontWeight: 700 }}>Admin · kỹ thuật</span><span className="mono" style={{ fontSize: 11, color: 'var(--tx-faint)' }}>admin@luni.vn</span></span>
              <Icon name="chevron" size={16} color="var(--tx-faint)" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
function demoCard(c) { return { display: 'flex', alignItems: 'center', gap: 12, padding: 11, borderRadius: 13, background: 'var(--bg-1)', border: '1px solid var(--hairline)', width: '100%' }; }

/* =================== SIDEBAR =================== */
function Sidebar({ role, nav, setNav, rail, setRail }) {
  const items = role === 'admin' ? ADMIN_NAV : USER_NAV;
  const moon = useLunar();
  return (
    <aside className="sidebar">
      <div style={{ display: 'flex', alignItems: 'center', gap: 11, height: 'var(--topbar-h)', padding: '0 18px', borderBottom: '1px solid var(--hairline)' }}>
        <MoonGlyph p={moon.p} size={32} color={role === 'admin' ? '#B48CFF' : '#5BE9FF'} eyes />
        <div className="brand-text" style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 16, fontWeight: 800, letterSpacing: '-.02em', lineHeight: 1 }}>Luni</div>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--acc)', marginTop: 3 }}>{role === 'admin' ? 'Admin Console' : 'Cloud'}</div>
        </div>
        <button className="nav-label" onClick={() => setRail(r => !r)} style={{ width: 28, height: 28, display: 'grid', placeItems: 'center', borderRadius: 8 }} title="Thu gọn"><Icon name="sliders" size={16} color="var(--tx-faint)" /></button>
      </div>

      <nav className="scrolly" style={{ flex: 1, padding: '8px 0 14px' }}>
        {items.map((it, i) => it.group ? (
          <div key={'g' + i} className="nav-group">{it.group}</div>
        ) : (
          <button key={it.id} className={'nav-item' + (nav === it.id ? ' on' : '')} onClick={() => setNav(it.id)} title={it.label}>
            <Icon name={it.icon} size={19} color={nav === it.id ? 'var(--acc)' : 'var(--tx-faint)'} strokeWidth={1.8} />
            <span className="nav-label" style={{ flex: 1, textAlign: 'left' }}>{it.label}</span>
            {it.star && <span className="nav-label spill" style={{ height: 18, padding: '0 7px', fontSize: 9.5, background: 'var(--acc-12)', color: 'var(--acc)' }}>OTA</span>}
          </button>
        ))}
      </nav>

      <div style={{ padding: 12, borderTop: '1px solid var(--hairline)' }}>
        <div className="side-foot-text" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 8px 8px' }}>
          <span className="cdot" style={{ background: 'var(--green)', boxShadow: '0 0 7px var(--green)' }} />
          <span style={{ fontSize: 11.5, color: 'var(--tx-mute)' }}>API · khoẻ</span>
          <span className="mono" style={{ marginLeft: 'auto', fontSize: 10.5, color: 'var(--tx-faint)' }}>v0.9.2</span>
        </div>
      </div>
    </aside>
  );
}

/* =================== TOPBAR =================== */
function Topbar({ role, nav, user, onSwitch, onLogout, setNav }) {
  const [menu, setMenu] = useS(false);
  const [notif, setNotif] = useS(false);
  const [help, setHelp] = useS(false);
  const meta = PAGE_META[nav] || { t: '', s: '' };
  const NOTIFS = role === 'admin'
    ? [['alert', '#FF5B6E', 'Luni #0311 crash loop (NVS 0x0a)', '2 phút'], ['download', '#FFD166', 'v2.2.0 (beta) sẵn sàng phát hành', '18 phút'], ['power', '#5C6680', 'Luni #0205 mất kết nối 3 ngày', '1 giờ']]
    : [['sparkle', '#FFD166', 'Đêm Rằm — Luni đang rạng rỡ', 'hôm nay'], ['bolt', '#7BE88E', 'Luni Phòng khách đã sạc đầy', '1 giờ'], ['download', '#76B8FF', 'Có bản firmware v2.1.0', 'hôm qua']];
  const goSettings = () => { setMenu(false); if (role === 'user') setNav('settings'); else luniToast('Cài đặt admin sắp ra mắt', 'acc', 'gear'); };
  return (
    <header className="topbar">
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 17, fontWeight: 800, letterSpacing: '-.02em' }}>{meta.t}</div>
        <div style={{ fontSize: 12, color: 'var(--tx-faint)', marginTop: 1 }}>{meta.s}</div>
      </div>

      <div style={{ position: 'relative', width: 240 }} className="topbar-search">
        <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }}><Icon name="search" size={16} color="var(--tx-faint)" /></span>
        <input className="winput" style={{ height: 38, paddingLeft: 36, fontSize: 13 }} placeholder="Tìm kiếm…" />
      </div>

      {/* role switch (demo) */}
      <div style={{ display: 'inline-flex', gap: 3, padding: 3, background: 'var(--bg-2)', borderRadius: 10, border: '1px solid var(--hairline)' }}>
        {[['user', 'User', '#5BE9FF'], ['admin', 'Admin', '#B48CFF']].map(([r, lab, c]) => (
          <button key={r} className="press" onClick={() => onSwitch(r)} style={{ height: 30, padding: '0 12px', borderRadius: 7, fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6,
            background: role === r ? hexA2(c, .16) : 'transparent', color: role === r ? c : 'var(--tx-mute)' }}>
            <Icon name={r === 'admin' ? 'shield' : 'user'} size={14} color={role === r ? c : 'var(--tx-faint)'} />{lab}
          </button>
        ))}
      </div>

      {/* notifications */}
      <div style={{ position: 'relative' }}>
        <button className="btn btn-icon" onClick={() => setNotif(n => !n)} style={{ position: 'relative' }}>
          <Icon name="info" size={18} color="var(--tx-mute)" />
          <span style={{ position: 'absolute', top: 8, right: 8, width: 7, height: 7, borderRadius: 99, background: 'var(--red)', boxShadow: '0 0 6px var(--red)' }} />
        </button>
        {notif && (
          <>
            <div style={{ position: 'fixed', inset: 0, zIndex: 40 }} onClick={() => setNotif(false)} />
            <div className="fadein" style={{ position: 'absolute', right: 0, top: 'calc(100% + 8px)', width: 320, background: 'var(--bg-1)', border: '1px solid var(--hairline-2)', borderRadius: 14, boxShadow: 'var(--shadow-pop)', zIndex: 50, overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 15px', borderBottom: '1px solid var(--hairline)' }}><span style={{ fontSize: 13.5, fontWeight: 700 }}>Thông báo</span><button className="press" onClick={() => { setNotif(false); luniToast('Đã đánh dấu đã đọc', 'acc', 'check'); }} style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--acc)' }}>Đọc hết</button></div>
              {NOTIFS.map(([ic, c, txt, t], i) => (
                <div key={i} style={{ display: 'flex', gap: 11, padding: '12px 15px', borderBottom: i < NOTIFS.length - 1 ? '1px solid var(--hairline)' : 'none' }}>
                  <span style={{ width: 30, height: 30, borderRadius: 9, display: 'grid', placeItems: 'center', background: hexA2(c, .13), flex: 'none' }}><Icon name={ic} size={15} color={c} /></span>
                  <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 12.5, color: 'var(--tx-soft)', lineHeight: 1.4 }}>{txt}</div><div style={{ fontSize: 10.5, color: 'var(--tx-faint)', marginTop: 3 }}>{t} trước</div></div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <div style={{ position: 'relative' }}>
        <button className="press" onClick={() => setMenu(m => !m)} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '5px 8px 5px 5px', borderRadius: 11, background: 'var(--bg-2)', border: '1px solid var(--hairline)' }}>
          <Avatar name={user.name} size={30} />
          <span style={{ textAlign: 'left' }}><span style={{ display: 'block', fontSize: 12.5, fontWeight: 700, lineHeight: 1.1 }}>{user.name}</span><span style={{ fontSize: 10.5, color: 'var(--acc)', fontWeight: 700 }}>{role === 'admin' ? 'ADMIN' : 'NGƯỜI DÙNG'}</span></span>
          <Icon name="chevronDown" size={14} color="var(--tx-faint)" />
        </button>
        {menu && (
          <>
            <div style={{ position: 'fixed', inset: 0, zIndex: 40 }} onClick={() => setMenu(false)} />
            <div className="fadein" style={{ position: 'absolute', right: 0, top: 'calc(100% + 8px)', width: 220, background: 'var(--bg-1)', border: '1px solid var(--hairline-2)', borderRadius: 14, boxShadow: 'var(--shadow-pop)', zIndex: 50, overflow: 'hidden' }}>
              <div style={{ padding: '13px 14px', borderBottom: '1px solid var(--hairline)' }}>
                <div style={{ fontSize: 13, fontWeight: 700 }}>{user.name}</div>
                <div className="mono" style={{ fontSize: 11, color: 'var(--tx-faint)', marginTop: 2 }}>{user.email}</div>
              </div>
              <button className="menu-row" style={menuRow} onClick={goSettings}><Icon name="user" size={16} color="var(--tx-mute)" />Hồ sơ</button>
              <button className="menu-row" style={menuRow} onClick={goSettings}><Icon name="gear" size={16} color="var(--tx-mute)" />Cài đặt</button>
              <button className="menu-row" style={menuRow} onClick={() => { setMenu(false); setHelp(true); }}><Icon name="info" size={16} color="var(--tx-mute)" />Trợ giúp</button>
              <div className="hr" />
              <button className="menu-row" style={{ ...menuRow, color: 'var(--red)' }} onClick={onLogout}><Icon name="power" size={16} color="var(--red)" />Đăng xuất</button>
            </div>
          </>
        )}
      </div>

      {help && (
        <Modal title="Trợ giúp & về Luni" sub="Luni Cloud Console · v0.9.2" icon="info" onClose={() => setHelp(false)} width={460}>
          <div style={{ padding: 22, display: 'grid', gap: 12 }}>
            {[['globe', 'Tài liệu API', 'docs/guides/API.md'], ['cpu', 'Trạng thái hệ thống', 'lunirobot.io.vn/api/v1/health'], ['mail', 'Liên hệ hỗ trợ', 'support@luni.vn']].map(([ic, t, s]) => (
              <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 13px', borderRadius: 12, background: 'var(--bg-2)', border: '1px solid var(--hairline)' }}>
                <span style={{ width: 34, height: 34, borderRadius: 10, display: 'grid', placeItems: 'center', background: 'var(--acc-12)', flex: 'none' }}><Icon name={ic} size={17} color="var(--acc)" /></span>
                <div style={{ flex: 1 }}><div style={{ fontSize: 13.5, fontWeight: 700 }}>{t}</div><div className="mono" style={{ fontSize: 11.5, color: 'var(--tx-faint)', marginTop: 2 }}>{s}</div></div>
                <Icon name="link" size={16} color="var(--tx-faint)" />
              </div>
            ))}
          </div>
        </Modal>
      )}
    </header>
  );
}
const menuRow = { display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '10px 14px', fontSize: 13, fontWeight: 600, color: 'var(--tx-soft)', textAlign: 'left', transition: 'background .12s' };

/* =================== APP ROOT =================== */
function ConsoleApp() {
  const [view, setView] = useS('landing');   // 'landing' | 'login' | 'app'
  const [role, setRole] = useS('user');
  const [email, setEmail] = useS('');
  const [nav, setNav] = useS('overview');
  const [rail, setRail] = useS(false);

  if (view === 'landing') return <><LandingPage onLogin={() => setView('login')} /><ToastHost /></>;
  if (view === 'login') return <><LoginScreen onBack={() => setView('landing')} onLogin={(r, mail) => { setRole(r); setEmail(mail); setNav('overview'); setView('app'); }} /><ToastHost /></>;

  const user = role === 'admin'
    ? { name: email.includes('service') ? 'Kỹ thuật viên' : 'Quản trị Luni', email: email || 'admin@luni.vn' }
    : { name: 'Nguyễn Mai', email: email || 'mai.nguyen@gmail.com' };

  const switchRole = (r) => { if (r === role) return; setRole(r); setNav('overview'); };

  return (
    <div className={'console ' + (role === 'admin' ? 'role-admin ' : '') + (rail ? 'rail' : '')}>
      <Sidebar role={role} nav={nav} setNav={setNav} rail={rail} setRail={setRail} />
      <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: 0 }}>
        <Topbar role={role} nav={nav} user={user} onSwitch={switchRole} setNav={setNav} onLogout={() => { setView('landing'); setRole('user'); setEmail(''); }} />
        <main className="scrolly" style={{ flex: 1, minHeight: 0, padding: '26px 30px 60px' }}>
          <div className="fadein" key={role + nav} style={{ maxWidth: 1280, margin: '0 auto' }}>
            {role === 'admin' ? <AdminDashboard nav={nav} setNav={setNav} /> : <UserDashboard nav={nav} setNav={setNav} />}
          </div>
        </main>
      </div>
      <ToastHost />
    </div>
  );
}

const _menuStyle = document.createElement('style');
_menuStyle.textContent = '.menu-row:hover{background:var(--bg-2);} @media(max-width:1080px){.topbar-search{display:none!important;}}';
document.head.appendChild(_menuStyle);

ReactDOM.createRoot(document.getElementById('root')).render(<ConsoleApp />);
Object.assign(window, { ConsoleApp, LoginScreen });
