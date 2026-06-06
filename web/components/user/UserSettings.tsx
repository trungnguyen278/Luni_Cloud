'use client';

import { useState, type CSSProperties } from 'react';
import { changePassword, updateProfile } from '@/lib/api/auth';
import { ApiError } from '@/lib/api/client';
import { useAuth } from '@/lib/auth/AuthContext';
import { Icon } from '@/components/brand/Icon';
import { Avatar, Field, Modal, PanelHead, Pill, luniToast } from '@/components/base/ui';
import { DemoNote } from './parts';

const settingRow: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 11,
  padding: '12px 13px',
  borderRadius: 11,
  background: 'var(--bg-2)',
  border: '1px solid var(--hairline)',
  width: '100%',
};

export function UserSettings() {
  const { user, setUser } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [saving, setSaving] = useState(false);
  const [modal, setModal] = useState<null | 'pass' | '2fa' | 'sessions'>(null);

  const save = async () => {
    setSaving(true);
    try {
      const u = await updateProfile({ name });
      setUser(u);
      luniToast('Đã lưu hồ sơ', 'green', 'check');
    } catch {
      luniToast('Lưu thất bại', 'red', 'alert');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
      <div className="panel">
        <PanelHead icon="user" title="Hồ sơ" />
        <div className="panel-pad" style={{ display: 'grid', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <Avatar name={user?.name || ''} size={52} />
            <div>
              <div style={{ fontSize: 15, fontWeight: 700 }}>{user?.name}</div>
              <div className="mono" style={{ fontSize: 12, color: 'var(--tx-faint)' }}>
                {user?.email}
              </div>
            </div>
          </div>
          <div>
            <label className="field-label">Tên hiển thị</label>
            <input className="winput" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <button className="btn btn-acc" style={{ justifySelf: 'start' }} disabled={saving} onClick={save}>
            <Icon name="check" size={16} color="var(--acc-ink)" />
            Lưu thay đổi
          </button>
        </div>
      </div>
      <div style={{ display: 'grid', gap: 18 }}>
        <div className="panel">
          <PanelHead icon="lock" title="Bảo mật" />
          <div className="panel-pad" style={{ display: 'grid', gap: 10 }}>
            {(
              [
                ['Đổi mật khẩu', 'key', 'pass'],
                ['Xác thực 2 lớp (2FA)', 'shield', '2fa'],
                ['Thiết bị đăng nhập', 'globe', 'sessions'],
              ] as [string, string, 'pass' | '2fa' | 'sessions'][]
            ).map(([l, ic, m]) => (
              <button key={l} className="press" style={settingRow} onClick={() => setModal(m)}>
                <Icon name={ic} size={17} color="var(--tx-mute)" />
                <span style={{ flex: 1, textAlign: 'left', fontSize: 13.5, fontWeight: 600 }}>{l}</span>
                {m !== 'pass' && <DemoNote text="demo" />}
                <Icon name="chevron" size={16} color="var(--tx-faint)" />
              </button>
            ))}
          </div>
        </div>
        <div className="panel">
          <PanelHead icon="gear" title="Ứng dụng" right={<DemoNote text="demo" />} />
          <div className="panel-pad" style={{ display: 'grid', gap: 10 }}>
            {(
              [
                ['Ngôn ngữ', 'Tiếng Việt'],
                ['Giờ yên tĩnh', '22:00 – 7:00'],
                ['Tự động cập nhật', 'Bật'],
              ] as [string, string][]
            ).map(([l, v]) => (
              <div key={l} style={settingRow}>
                <span style={{ flex: 1, fontSize: 13.5, fontWeight: 600, color: 'var(--tx-soft)' }}>{l}</span>
                <span style={{ fontSize: 13, color: 'var(--tx-mute)' }}>{v}</span>
              </div>
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

function ChangePasswordModal({ onClose }: { onClose: () => void }) {
  const [a, setA] = useState('');
  const [b, setB] = useState('');
  const [c, setC] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    if (!a) return setErr('Nhập mật khẩu hiện tại.');
    if (b.length < 6) return setErr('Mật khẩu mới tối thiểu 6 ký tự.');
    if (b !== c) return setErr('Mật khẩu xác nhận không khớp.');
    setBusy(true);
    try {
      await changePassword(a, b);
      luniToast('Đã đổi mật khẩu', 'green', 'check');
      onClose();
    } catch (e) {
      setErr(e instanceof ApiError && e.status === 400 ? 'Mật khẩu hiện tại không đúng.' : 'Đổi mật khẩu thất bại.');
      setBusy(false);
    }
  };
  return (
    <Modal title="Đổi mật khẩu" icon="key" onClose={onClose} width={430}>
      <div style={{ padding: 22, display: 'grid', gap: 13 }}>
        <Field label="Mật khẩu hiện tại" required>
          <input className="winput" type="password" value={a} onChange={(e) => { setA(e.target.value); setErr(''); }} placeholder="••••••••" />
        </Field>
        <Field label="Mật khẩu mới" required>
          <input className="winput" type="password" value={b} onChange={(e) => { setB(e.target.value); setErr(''); }} placeholder="Tối thiểu 6 ký tự" />
        </Field>
        <Field label="Xác nhận mật khẩu mới" required>
          <input className="winput" type="password" value={c} onChange={(e) => { setC(e.target.value); setErr(''); }} placeholder="Nhập lại" />
        </Field>
        {err && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: 'var(--red)' }}>
            <Icon name="alert" size={15} color="var(--red)" />
            {err}
          </div>
        )}
      </div>
      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', padding: '14px 22px', borderTop: '1px solid var(--hairline)' }}>
        <button className="btn" onClick={onClose}>
          Huỷ
        </button>
        <button className="btn btn-acc" onClick={submit} disabled={busy}>
          <Icon name="check" size={15} color="var(--acc-ink)" />
          Cập nhật
        </button>
      </div>
    </Modal>
  );
}

function TwoFAModal({ onClose }: { onClose: () => void }) {
  return (
    <Modal title="Xác thực 2 lớp (2FA)" sub="Bảo vệ tài khoản bằng ứng dụng xác thực" icon="shield" onClose={onClose} width={440}>
      <div style={{ padding: 22 }}>
        <div style={{ display: 'flex', gap: 18, alignItems: 'center' }}>
          <div style={{ width: 132, height: 132, flex: 'none', borderRadius: 14, background: 'var(--bg-2)', border: '1px solid var(--hairline)', display: 'grid', placeItems: 'center' }}>
            <Icon name="qr" size={92} color="var(--tx-soft)" />
          </div>
          <div>
            <p style={{ fontSize: 13, color: 'var(--tx-soft)', lineHeight: 1.6, margin: 0 }}>Quét mã QR bằng Google Authenticator hoặc Authy, rồi nhập mã 6 số để hoàn tất.</p>
            <div className="mono" style={{ fontSize: 12, color: 'var(--tx-faint)', marginTop: 10, padding: '8px 10px', background: 'var(--bg-2)', borderRadius: 9, border: '1px solid var(--hairline)' }}>
              LUNI · J5K2 9F0A 7C1D
            </div>
          </div>
        </div>
        <div style={{ marginTop: 16 }}>
          <Field label="Mã xác thực">
            <input className="winput mono" placeholder="000 000" maxLength={7} style={{ letterSpacing: '.3em' }} />
          </Field>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', padding: '14px 22px', borderTop: '1px solid var(--hairline)' }}>
        <button className="btn" onClick={onClose}>
          Để sau
        </button>
        <button
          className="btn btn-acc"
          onClick={() => {
            luniToast('Đã bật 2FA (demo)', 'green', 'shield');
            onClose();
          }}
        >
          <Icon name="check" size={15} color="var(--acc-ink)" />
          Bật 2FA
        </button>
      </div>
    </Modal>
  );
}

function SessionsModal({ onClose }: { onClose: () => void }) {
  const sess = [
    { dev: 'Chrome · macOS', loc: 'Hà Nội, VN', t: 'Đang hoạt động', cur: true },
    { dev: 'Luni App · iPhone 14', loc: 'Hà Nội, VN', t: '2 giờ trước' },
    { dev: 'Safari · iPad', loc: 'Hải Phòng, VN', t: 'Hôm qua' },
  ];
  return (
    <Modal title="Thiết bị đăng nhập" sub={`${sess.length} phiên đang mở · demo`} icon="globe" onClose={onClose} width={460}>
      <div style={{ padding: 16, display: 'grid', gap: 8 }}>
        {sess.map((s, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 13px', borderRadius: 12, background: 'var(--bg-2)', border: '1px solid var(--hairline)' }}>
            <span style={{ width: 34, height: 34, borderRadius: 10, display: 'grid', placeItems: 'center', background: 'var(--bg-1)', flex: 'none' }}>
              <Icon name={s.dev.includes('App') ? 'grid' : 'globe'} size={17} color={s.cur ? 'var(--acc)' : 'var(--tx-mute)'} />
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 700 }}>
                {s.dev} {s.cur && <Pill tone="#7BE88E" style={{ marginLeft: 4, height: 18 }}>Hiện tại</Pill>}
              </div>
              <div style={{ fontSize: 11.5, color: 'var(--tx-faint)', marginTop: 2 }}>
                {s.loc} · {s.t}
              </div>
            </div>
            {!s.cur && (
              <button className="btn btn-sm btn-danger" onClick={() => luniToast('Đã đăng xuất phiên (demo)', 'red', 'power')}>
                Đăng xuất
              </button>
            )}
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '14px 22px', borderTop: '1px solid var(--hairline)' }}>
        <button
          className="btn btn-danger"
          onClick={() => {
            luniToast('Đã đăng xuất mọi nơi khác (demo)', 'red', 'power');
            onClose();
          }}
        >
          <Icon name="power" size={15} color="var(--red)" />
          Đăng xuất tất cả nơi khác
        </button>
      </div>
    </Modal>
  );
}
