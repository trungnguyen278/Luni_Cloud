/* ============================================================
   web-admin.jsx — ADMIN role (purple). Fleet ops: overview,
   devices + detail drawer, users, logs. Firmware → web-firmware.jsx
   ============================================================ */

/* ---------------- Overview ---------------- */
function AdminOverview({ setNav }) {
  const total = FLEET.length;
  const online = FLEET.filter(d => d.online).length;
  const attention = FLEET.filter(d => d.status !== 'ok' && d.status !== 'updating');
  const errors = LOGS.filter(l => l.lv === 'error' || l.lv === 'critical').length;
  return (
    <>
      <PageHead title="Tổng quan fleet" sub="Trạng thái toàn hệ thống Luni · cập nhật realtime">
        <button className="btn" onClick={() => setNav('logs')}><Icon name="logs" size={16} color="var(--tx-mute)" />Nhật ký</button>
        <button className="btn btn-acc" onClick={() => setNav('firmware')}><Icon name="download" size={16} color="var(--acc-ink)" />Phát hành OTA</button>
      </PageHead>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 18 }}>
        <KPI icon="cpu" label="Thiết bị trực tuyến" value={`${online}/${total}`} sub={`${Math.round(online / total * 100)}% fleet`} tone="#7BE88E" />
        <KPI icon="users" label="Người dùng" value={USERS.filter(u => u.role === 'user').length} trend={9} tone="var(--acc)" />
        <KPI icon="chat" label="Tương tác / ngày" value="1.28K" trend={12} tone="#76B8FF" />
        <KPI icon="alert" label="Lỗi 24h" value={errors} sub="2 thiết bị" tone="#FF5B6E" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 18, alignItems: 'start' }}>
        <div className="panel"><PanelHead icon="chart" title="Hoạt động 7 ngày" sub="Tổng tương tác toàn fleet" right={<Seg options={[{ id: 'd', label: 'Ngày' }, { id: 'w', label: 'Tuần' }]} value="d" onChange={() => {}} />} />
          <div className="panel-pad"><BarChart data={STAT_7D} labels={STAT_LABELS} accent="var(--acc)" height={170} /></div>
        </div>
        <div className="panel"><PanelHead icon="sparkle" title="Phân bố cảm xúc" sub="Toàn fleet, hôm nay" />
          <div className="panel-pad"><HBars rows={EMOTION_DIST.map(e => ({ ...e, unit: '%' }))} /></div>
        </div>
      </div>

      <div className="panel" style={{ marginTop: 18 }}>
        <PanelHead icon="alert" title="Cần xử lý" sub={`${attention.length} thiết bị cần chú ý`} right={<button className="btn btn-sm" onClick={() => setNav('devices')}>Xem tất cả<Icon name="chevron" size={14} color="var(--tx-mute)" /></button>} />
        <div style={{ padding: 8 }}>
          {attention.map(d => {
            const st = FLEET_STATUS[d.status];
            return (
              <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '11px 12px', borderRadius: 12 }}>
                <span style={{ width: 36, height: 36, borderRadius: 10, display: 'grid', placeItems: 'center', background: hexA2(st.c, .14), flex: 'none' }}><Icon name={st.icon} size={17} color={st.c} /></span>
                <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 13.5, fontWeight: 700 }}>{d.name} <span style={{ fontWeight: 400, color: 'var(--tx-faint)' }}>· {d.owner}</span></div><div style={{ fontSize: 12, color: 'var(--tx-mute)', marginTop: 2 }}>{d.issue}</div></div>
                <Pill tone={st.c}>{st.label}</Pill>
                <span className="mono" style={{ fontSize: 11, color: 'var(--tx-faint)', width: 92, textAlign: 'right' }}>{d.lastSeen}</span>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}

/* ---------------- Devices ---------------- */
const DEV_FILTERS = [{ id: 'all', label: 'Tất cả' }, { id: 'attention', label: 'Cần xử lý' }, { id: 'offline', label: 'Ngoại tuyến' }, { id: 'updating', label: 'Đang cập nhật' }];
function AdminDevices() {
  const [filter, setFilter] = useS('all');
  const [q, setQ] = useS('');
  const [sel, setSel] = useS(null);
  const [exp, setExp] = useS(false);
  const list = FLEET.filter(d => {
    if (filter === 'attention' && (d.status === 'ok' || d.status === 'updating')) return false;
    if (filter === 'offline' && d.status !== 'offline') return false;
    if (filter === 'updating' && d.status !== 'updating') return false;
    if (q.trim()) { const s = (d.name + d.id + d.owner + d.city).toLowerCase(); if (!s.includes(q.trim().toLowerCase())) return false; }
    return true;
  });
  return (
    <>
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 220, maxWidth: 340 }}>
          <span style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)' }}><Icon name="search" size={16} color="var(--tx-faint)" /></span>
          <input className="winput mono" style={{ paddingLeft: 38 }} value={q} onChange={e => setQ(e.target.value)} placeholder="Tên · MAC · chủ sở hữu" />
        </div>
        <Seg options={DEV_FILTERS} value={filter} onChange={setFilter} />
        <button className="btn" style={{ marginLeft: 'auto' }} onClick={() => setExp(true)}><Icon name="download" size={16} color="var(--tx-mute)" />Xuất CSV</button>
      </div>
      <div className="panel" style={{ overflow: 'hidden' }}>
        <table className="wtable">
          <thead><tr><th>Thiết bị</th><th>Chủ sở hữu</th><th>Trạng thái</th><th>FW</th><th>Pin</th><th>Sóng</th><th></th></tr></thead>
          <tbody>
            {list.map(d => {
              const st = FLEET_STATUS[d.status];
              return (
                <tr key={d.id} className="row-click" onClick={() => setSel(d)}>
                  <td><div style={{ display: 'flex', alignItems: 'center', gap: 11 }}><span style={{ width: 34, height: 34, borderRadius: 9, display: 'grid', placeItems: 'center', background: 'var(--bg-2)', flex: 'none' }}><LuniFace emotion={d.emotion} size={26} state="idle" noPhase dim={!d.online} /></span><div><div style={{ fontWeight: 700, color: 'var(--tx)' }}>{d.name}</div><div className="mono" style={{ fontSize: 11, color: 'var(--tx-faint)' }}>{d.id}</div></div></div></td>
                  <td>{d.owner.startsWith('—') ? <span style={{ color: 'var(--tx-faint)' }}>chưa gán</span> : <div><div style={{ color: 'var(--tx-soft)' }}>{d.owner}</div><div style={{ fontSize: 11, color: 'var(--tx-faint)' }}>{d.city}</div></div>}</td>
                  <td><Pill tone={st.c} dot={d.online}>{st.label}</Pill></td>
                  <td className="mono" style={{ color: d.fw === '2.1.0' ? 'var(--tx-soft)' : 'var(--warm)' }}>v{d.fw}</td>
                  <td className="mono" style={{ color: d.battery <= 15 ? 'var(--red)' : 'var(--tx-soft)' }}>{d.online ? d.battery + '%' : '—'}</td>
                  <td className="mono" style={{ color: 'var(--tx-mute)' }}>{d.online ? d.rssi : '—'}</td>
                  <td style={{ textAlign: 'right' }}><Icon name="chevron" size={16} color="var(--tx-faint)" /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {list.length === 0 && <EmptyState text="Không có thiết bị nào khớp." />}
      </div>
      {sel && <DeviceDrawer d={sel} onClose={() => setSel(null)} />}
      {exp && <ExportModal count={list.length} onClose={() => setExp(false)} />}
    </>
  );
}

function ExportModal({ count, onClose }) {
  const [fmt, setFmt] = useS('csv');
  const [scope, setScope] = useS('filtered');
  const [busy, setBusy] = useS(false);
  const run = () => { setBusy(true); setTimeout(() => { setBusy(false); luniToast('Đã xuất ' + (scope === 'filtered' ? count : FLEET.length) + ' thiết bị (.' + fmt + ')', 'green', 'download'); onClose(); }, 900); };
  return (
    <Modal title="Xuất dữ liệu fleet" sub="Tải về danh sách thiết bị" icon="download" onClose={onClose} width={440}>
      <div style={{ padding: 22, display: 'grid', gap: 16 }}>
        <Field label="Phạm vi">
          <div style={{ display: 'flex', gap: 10 }}>
            {[['filtered', `Đang lọc (${count})`], ['all', `Toàn fleet (${FLEET.length})`]].map(([v, lab]) => (
              <button key={v} className="press" onClick={() => setScope(v)} style={{ flex: 1, padding: '11px 13px', borderRadius: 11, fontSize: 13, fontWeight: 700, background: scope === v ? 'var(--acc-12)' : 'var(--bg-2)', color: scope === v ? 'var(--acc)' : 'var(--tx-soft)', border: `1.5px solid ${scope === v ? 'var(--acc-32)' : 'var(--hairline)'}` }}>{lab}</button>
            ))}
          </div>
        </Field>
        <Field label="Định dạng">
          <Seg options={[{ id: 'csv', label: 'CSV' }, { id: 'json', label: 'JSON' }, { id: 'xlsx', label: 'Excel' }]} value={fmt} onChange={setFmt} />
        </Field>
      </div>
      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', padding: '14px 22px', borderTop: '1px solid var(--hairline)' }}>
        <button className="btn" onClick={onClose} disabled={busy}>Huỷ</button>
        <button className="btn btn-acc" onClick={run} disabled={busy}>{busy ? <><Spinner size={16} color="var(--acc-ink)" />Đang xuất…</> : <><Icon name="download" size={15} color="var(--acc-ink)" />Tải về</>}</button>
      </div>
    </Modal>
  );
}

function DeviceDrawer({ d, onClose }) {
  const st = FLEET_STATUS[d.status];
  const [confirm, setConfirm] = useS(null);
  const metrics = [['free_heap', d.online ? '45 032 B' : '—'], ['uptime', d.online ? '23g 58p' : '—'], ['rssi', d.online ? d.rssi + ' dBm' : '—'], ['reset', d.online ? 'POWERON' : '—']];
  const cmds = [['Khởi động lại', 'refresh', '#5BE9FF', '0x01', true, 'Robot ngoại tuyến ~20 giây rồi khởi động lại mềm.'], ['Gửi lệnh đọc', 'volume', '#76B8FF', '0x05', false, 'Yêu cầu Luni đọc một câu chào (TTS).'], ['Đồng bộ trăng', 'moon', '#FFD166', '0x08', false, 'Cập nhật pha trăng & cảnh hiển thị theo âm lịch hôm nay.']];
  return (
    <div className="scrim" onMouseDown={onClose} style={{ justifyContent: 'flex-end', padding: 0 }}>
      <div className="scrolly" onMouseDown={e => e.stopPropagation()} style={{ width: 420, maxWidth: '92vw', height: '100vh', background: 'var(--bg-base)', borderLeft: '1px solid var(--hairline-2)', boxShadow: 'var(--shadow-pop)', animation: 'webSlideIn .3s var(--ease) both' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 20px', borderBottom: '1px solid var(--hairline)', position: 'sticky', top: 0, background: 'var(--bg-base)', zIndex: 2 }}>
          <div style={{ flex: 1 }}><div style={{ fontSize: 16, fontWeight: 800 }}>{d.name}</div><div className="mono" style={{ fontSize: 11.5, color: 'var(--tx-faint)' }}>{d.id}</div></div>
          <Pill tone={st.c} dot={d.online}>{st.label}</Pill>
          <button className="btn btn-icon" onClick={onClose}><Icon name="close" size={18} color="var(--tx-mute)" /></button>
        </div>
        <div style={{ padding: 20, display: 'grid', gap: 18 }}>
          <div className="panel" style={{ display: 'grid', placeItems: 'center', padding: '24px 0 18px', background: 'radial-gradient(120% 120% at 50% 0%, var(--acc-12), transparent 60%)' }}>
            <LuniFace emotion={d.emotion} size={150} state="idle" dim={!d.online} />
            <div style={{ marginTop: 10, fontSize: 13, color: 'var(--tx-mute)' }}>{d.owner} · {d.city}</div>
          </div>
          {d.issue && <div style={{ display: 'flex', gap: 10, padding: '12px 14px', borderRadius: 12, background: hexA2(st.c, .08), border: `1px solid ${hexA2(st.c, .26)}` }}><Icon name="alert" size={16} color={st.c} /><span style={{ fontSize: 13, color: 'var(--tx-soft)', fontWeight: 600 }}>{d.issue}</span></div>}
          <div>
            <div className="t-cap" style={{ marginBottom: 10 }}>CHẨN ĐOÁN · CHR_DIAG_INFO</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {metrics.map(([k, v]) => <div key={k} className="card-2" style={{ padding: '11px 13px' }}><div className="mono" style={{ fontSize: 10.5, color: 'var(--tx-faint)' }}>{k}</div><div className="mono" style={{ fontSize: 14.5, fontWeight: 700, marginTop: 4 }}>{v}</div></div>)}
            </div>
          </div>
          <div>
            <div className="t-cap" style={{ marginBottom: 10 }}>LỆNH · CHR_COMMAND</div>
            <div style={{ display: 'grid', gap: 8 }}>
              {cmds.map(([l, ic, c, code, danger, body]) => (
                <button key={l} className="press" onClick={() => setConfirm({ l, ic, c, code, danger, body })} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 12, borderRadius: 12, background: 'var(--bg-2)', border: '1px solid var(--hairline)', width: '100%' }}>
                  <span style={{ width: 34, height: 34, borderRadius: 10, display: 'grid', placeItems: 'center', background: hexA2(c, .14) }}><Icon name={ic} size={17} color={c} /></span>
                  <span style={{ flex: 1, textAlign: 'left', fontSize: 13.5, fontWeight: 700 }}>{l}</span>
                  <span className="mono" style={{ fontSize: 11, color: 'var(--tx-faint)' }}>{code}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
        {confirm && <Confirm icon={confirm.ic} danger={confirm.danger} title={confirm.l + '?'} sub={`${d.name} · CHR_COMMAND ${confirm.code}`} cta={confirm.l} body={confirm.body + (d.online ? '' : ' ⚠ Thiết bị đang ngoại tuyến — lệnh sẽ chờ tới khi kết nối lại.')} onClose={() => setConfirm(null)} onOk={() => luniToast('Đã gửi ' + confirm.l + ' (' + confirm.code + ')', 'acc', confirm.ic)} />}
      </div>
    </div>
  );
}

/* ---------------- Users ---------------- */
function AdminUsers() {
  const [users, setUsers] = useS(USERS);
  const [invite, setInvite] = useS(false);
  const [confirm, setConfirm] = useS(null);
  const doLock = (u) => { setUsers(us => us.map(x => x.id === u.id ? { ...x, is_active: !x.is_active } : x)); luniToast(u.is_active ? 'Đã khoá tài khoản' : 'Đã mở khoá', 'acc', 'check'); };
  const doRole = (u) => { setUsers(us => us.map(x => x.id === u.id ? { ...x, role: x.role === 'admin' ? 'user' : 'admin' } : x)); luniToast('Đã đổi vai trò', 'acc', 'shield'); };
  const addUser = (u) => setUsers(us => [{ id: 'usr_' + Date.now(), name: u.name, email: u.email, role: u.role, is_active: true, device_count: 0, created_at: 'vừa xong', last_login: 'chưa đăng nhập' }, ...us]);
  return (
    <>
      <PageHead title="Người dùng" sub={`${users.length} tài khoản · ${users.filter(u => u.role === 'admin').length} admin`}>
        <button className="btn btn-acc" onClick={() => setInvite(true)}><Icon name="plus" size={16} color="var(--acc-ink)" />Mời người dùng</button>
      </PageHead>
      <div className="panel" style={{ overflow: 'hidden' }}>
        <table className="wtable">
          <thead><tr><th>Tên</th><th>Email</th><th>Vai trò</th><th>Thiết bị</th><th>Đăng nhập</th><th></th></tr></thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id} style={{ opacity: u.is_active ? 1 : .5 }}>
                <td><div style={{ display: 'flex', alignItems: 'center', gap: 11 }}><Avatar name={u.name} size={32} accent={u.role === 'admin' ? '#B48CFF' : '#5BE9FF'} /><div><div style={{ fontWeight: 700, color: 'var(--tx)' }}>{u.name}</div><div className="mono" style={{ fontSize: 11, color: 'var(--tx-faint)' }}>{u.id}</div></div></div></td>
                <td className="mono" style={{ fontSize: 12.5 }}>{u.email}</td>
                <td>{u.role === 'admin' ? <Pill tone="#B48CFF">Admin</Pill> : <Pill tone="#8592AB">User</Pill>}{!u.is_active && <Pill tone="#FF5B6E" style={{ marginLeft: 6 }}>Đã khoá</Pill>}</td>
                <td className="mono">{u.device_count}</td>
                <td style={{ fontSize: 12.5, color: 'var(--tx-mute)' }}>{u.last_login}</td>
                <td style={{ textAlign: 'right' }}>
                  <div style={{ display: 'inline-flex', gap: 6 }}>
                    <button className="btn btn-sm" title="Đổi vai trò" onClick={() => setConfirm({ kind: 'role', u })}><Icon name="shield" size={14} color="var(--tx-mute)" /></button>
                    <button className={'btn btn-sm' + (u.is_active ? ' btn-danger' : '')} onClick={() => u.is_active ? setConfirm({ kind: 'lock', u }) : doLock(u)}>{u.is_active ? 'Khoá' : 'Mở'}</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {invite && <InviteModal onClose={() => setInvite(false)} onDone={(u) => { addUser(u); luniToast('Đã gửi lời mời tới ' + u.email, 'green', 'mail'); }} />}
      {confirm && confirm.kind === 'lock' && <Confirm icon="lock" danger title="Khoá tài khoản?" sub={confirm.u.email} cta="Khoá" body={`${confirm.u.name} sẽ không thể đăng nhập hay điều khiển robot cho tới khi được mở khoá.`} onClose={() => setConfirm(null)} onOk={() => doLock(confirm.u)} />}
      {confirm && confirm.kind === 'role' && <Confirm icon="shield" title="Đổi vai trò?" sub={confirm.u.email} cta={confirm.u.role === 'admin' ? 'Hạ về User' : 'Nâng lên Admin'} body={confirm.u.role === 'admin' ? 'Gỡ quyền quản trị của tài khoản này.' : 'Cấp quyền truy cập toàn bộ console quản trị (fleet, firmware, log).'} onClose={() => setConfirm(null)} onOk={() => doRole(confirm.u)} />}
    </>
  );
}

function InviteModal({ onClose, onDone }) {
  const [name, setName] = useS('');
  const [email, setEmail] = useS('');
  const [role, setRole] = useS('user');
  const [err, setErr] = useS('');
  const submit = () => {
    if (!name.trim()) { setErr('Nhập tên người dùng.'); return; }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { setErr('Email không hợp lệ.'); return; }
    onDone({ name: name.trim(), email: email.trim(), role }); onClose();
  };
  return (
    <Modal title="Mời người dùng" sub="Gửi email lời mời tạo tài khoản" icon="mail" onClose={onClose} width={460}>
      <div style={{ padding: 22, display: 'grid', gap: 14 }}>
        <Field label="Tên hiển thị" required><input className="winput" value={name} onChange={e => { setName(e.target.value); setErr(''); }} placeholder="Nguyễn Văn A" /></Field>
        <Field label="Email" required><input className="winput mono" value={email} onChange={e => { setEmail(e.target.value); setErr(''); }} placeholder="nguoidung@gmail.com" /></Field>
        <Field label="Vai trò">
          <div style={{ display: 'flex', gap: 10 }}>
            {[['user', 'Người dùng', '#5BE9FF', 'user'], ['admin', 'Admin', '#B48CFF', 'shield']].map(([v, lab, c, ic]) => (
              <button key={v} className="press" onClick={() => setRole(v)} style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 9, padding: '11px 13px', borderRadius: 12, whiteSpace: 'nowrap', background: role === v ? hexA2(c, .12) : 'var(--bg-2)', border: `1.5px solid ${role === v ? hexA2(c, .4) : 'var(--hairline)'}` }}>
                <Icon name={ic} size={16} color={c} /><span style={{ fontSize: 13, fontWeight: 700, color: role === v ? c : 'var(--tx-soft)' }}>{lab}</span>
              </button>
            ))}
          </div>
        </Field>
        {err && <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: 'var(--red)' }}><Icon name="alert" size={15} color="var(--red)" />{err}</div>}
      </div>
      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', padding: '14px 22px', borderTop: '1px solid var(--hairline)' }}>
        <button className="btn" onClick={onClose}>Huỷ</button>
        <button className="btn btn-acc" onClick={submit}><Icon name="send" size={15} color="var(--acc-ink)" />Gửi lời mời</button>
      </div>
    </Modal>
  );
}

/* ---------------- Logs ---------------- */
function AdminLogs() {
  const [lv, setLv] = useS('all');
  const [src, setSrc] = useS('all');
  const list = LOGS.filter(l => (lv === 'all' || l.lv === lv) && (src === 'all' || (src === 'server' ? l.dev === 'server' : l.dev !== 'server')));
  return (
    <>
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <Seg options={[{ id: 'all', label: 'Tất cả' }, { id: 'server', label: 'Máy chủ' }, { id: 'device', label: 'Thiết bị' }]} value={src} onChange={setSrc} />
        <Seg options={[{ id: 'all', label: 'Mọi cấp' }, { id: 'info', label: 'Info' }, { id: 'warn', label: 'Warn' }, { id: 'error', label: 'Error' }]} value={lv} onChange={setLv} />
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--tx-faint)' }}><span className="cdot" style={{ background: 'var(--green)', boxShadow: '0 0 7px var(--green)', animation: 'chargePulse 1.6s infinite' }} />tail · realtime</div>
      </div>
      <div className="panel" style={{ overflow: 'hidden' }}>
        <table className="wtable">
          <thead><tr><th style={{ width: 92 }}>Thời gian</th><th style={{ width: 120 }}>Nguồn</th><th style={{ width: 80 }}>Cấp</th><th>Nội dung</th></tr></thead>
          <tbody>
            {list.map((l, i) => {
              const lc = LOG_LV[l.lv];
              return (
                <tr key={i}>
                  <td className="mono" style={{ fontSize: 12, color: 'var(--tx-faint)' }}>{l.t}</td>
                  <td style={{ fontSize: 12.5, color: l.dev === 'server' ? 'var(--tx-mute)' : 'var(--tx-soft)' }}>{l.dev}</td>
                  <td><span className="spill" style={{ height: 20, fontSize: 10, background: hexA2(lc.c, .14), color: lc.c }}>{lc.label}</span></td>
                  <td className="mono" style={{ fontSize: 12.5, color: 'var(--tx-soft)' }}><span style={{ color: 'var(--tx-faint)' }}>[{l.tag}]</span> {l.msg}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {list.length === 0 && <EmptyState text="Không có log nào khớp bộ lọc." />}
      </div>
    </>
  );
}

/* ---------------- router ---------------- */
function AdminDashboard({ nav, setNav }) {
  if (nav === 'overview') return <AdminOverview setNav={setNav} />;
  if (nav === 'devices') return <AdminDevices />;
  if (nav === 'users') return <AdminUsers />;
  if (nav === 'firmware') return <AdminFirmware />;
  if (nav === 'logs') return <AdminLogs />;
  if (nav === 'cost') return <CostDashboard />;
  return null;
}

Object.assign(window, { AdminDashboard });
