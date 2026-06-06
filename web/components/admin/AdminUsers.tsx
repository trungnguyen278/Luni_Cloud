/* ============================================================
   AdminUsers — user table with role + lock actions, wired to
   /admin/users (list) and PATCH /admin/users/{id}. The invite flow
   has no backend endpoint, so it is demo. Ported from web-admin.jsx.
   ============================================================ */
'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { hexA2 } from '@/lib/format';
import { createUser, updateUser } from '@/lib/api/users';
import { ApiError } from '@/lib/api/client';
import type { AdminUser } from '@/lib/api/types';
import { useUsers } from '@/lib/hooks/useAdmin';
import { Icon } from '@/components/brand/Icon';
import { Avatar, Confirm, EmptyState, Field, Modal, PageHead, Pill, Spinner, luniToast } from '@/components/base/ui';

type ConfirmState = { kind: 'lock' | 'role'; u: AdminUser } | null;

export function AdminUsers() {
  const qc = useQueryClient();
  const { data, isLoading, isError } = useUsers();
  const users = data ?? [];
  const [invite, setInvite] = useState(false);
  const [confirm, setConfirm] = useState<ConfirmState>(null);

  const refresh = () => qc.invalidateQueries({ queryKey: ['admin-users'] });

  const doLock = async (u: AdminUser) => {
    try {
      await updateUser(u.id, { is_active: !u.is_active });
      luniToast(u.is_active ? 'Đã khoá tài khoản' : 'Đã mở khoá', 'acc', 'check');
      refresh();
    } catch {
      luniToast('Thao tác thất bại', 'red', 'alert');
    }
  };
  const doRole = async (u: AdminUser) => {
    try {
      await updateUser(u.id, { role: u.role === 'admin' ? 'user' : 'admin' });
      luniToast('Đã đổi vai trò', 'acc', 'shield');
      refresh();
    } catch {
      luniToast('Đổi vai trò thất bại', 'red', 'alert');
    }
  };

  return (
    <>
      <PageHead title="Người dùng" sub={`${users.length} tài khoản · ${users.filter((u) => u.role === 'admin').length} admin`}>
        <button className="btn btn-acc" onClick={() => setInvite(true)}>
          <Icon name="plus" size={16} color="var(--acc-ink)" />
          Mời người dùng
        </button>
      </PageHead>
      <div className="panel" style={{ overflow: 'hidden' }}>
        {isLoading ? (
          <div style={{ display: 'grid', placeItems: 'center', padding: 40 }}>
            <Spinner />
          </div>
        ) : isError ? (
          <EmptyState icon="alert" text="Không tải được danh sách người dùng" sub="Thử lại sau." />
        ) : (
          <table className="wtable">
            <thead>
              <tr>
                <th>Tên</th>
                <th>Email</th>
                <th>Vai trò</th>
                <th>Thiết bị</th>
                <th>Đăng nhập</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} style={{ opacity: u.is_active ? 1 : 0.5 }}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                      <Avatar name={u.name} size={32} accent={u.role === 'admin' ? '#B48CFF' : '#5BE9FF'} />
                      <div>
                        <div style={{ fontWeight: 700, color: 'var(--tx)' }}>{u.name}</div>
                        <div className="mono" style={{ fontSize: 11, color: 'var(--tx-faint)' }}>
                          {u.id.slice(0, 12)}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="mono" style={{ fontSize: 12.5 }}>
                    {u.email}
                  </td>
                  <td>
                    {u.role === 'admin' ? <Pill tone="#B48CFF">Admin</Pill> : <Pill tone="#8592AB">User</Pill>}
                    {!u.is_active && (
                      <Pill tone="#FF5B6E" style={{ marginLeft: 6 }}>
                        Đã khoá
                      </Pill>
                    )}
                  </td>
                  <td className="mono">{u.device_count}</td>
                  <td style={{ fontSize: 12.5, color: 'var(--tx-mute)' }}>{u.last_login || '—'}</td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: 6 }}>
                      <button className="btn btn-sm" title="Đổi vai trò" onClick={() => setConfirm({ kind: 'role', u })}>
                        <Icon name="shield" size={14} color="var(--tx-mute)" />
                      </button>
                      <button className={'btn btn-sm' + (u.is_active ? ' btn-danger' : '')} onClick={() => (u.is_active ? setConfirm({ kind: 'lock', u }) : doLock(u))}>
                        {u.is_active ? 'Khoá' : 'Mở'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {invite && <InviteModal onClose={() => setInvite(false)} onCreated={refresh} />}
      {confirm?.kind === 'lock' && (
        <Confirm
          icon="lock"
          danger
          title="Khoá tài khoản?"
          sub={confirm.u.email}
          cta="Khoá"
          body={`${confirm.u.name} sẽ không thể đăng nhập hay điều khiển robot cho tới khi được mở khoá.`}
          onClose={() => setConfirm(null)}
          onOk={() => doLock(confirm.u)}
        />
      )}
      {confirm?.kind === 'role' && (
        <Confirm
          icon="shield"
          title="Đổi vai trò?"
          sub={confirm.u.email}
          cta={confirm.u.role === 'admin' ? 'Hạ về User' : 'Nâng lên Admin'}
          body={confirm.u.role === 'admin' ? 'Gỡ quyền quản trị của tài khoản này.' : 'Cấp quyền truy cập toàn bộ console quản trị (fleet, firmware, log).'}
          onClose={() => setConfirm(null)}
          onOk={() => doRole(confirm.u)}
        />
      )}
    </>
  );
}

function InviteModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('user');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    if (!name.trim()) return setErr('Nhập tên người dùng.');
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return setErr('Email không hợp lệ.');
    setBusy(true);
    try {
      const u = await createUser({ name: name.trim(), email: email.trim(), role });
      onCreated();
      if (u.temp_password) luniToast(`Đã tạo tài khoản · mật khẩu tạm: ${u.temp_password}`, 'green', 'key');
      else luniToast('Đã tạo tài khoản ' + u.email, 'green', 'check');
      onClose();
    } catch (e) {
      setErr(e instanceof ApiError && e.status === 409 ? 'Email đã tồn tại.' : 'Tạo tài khoản thất bại.');
      setBusy(false);
    }
  };
  return (
    <Modal title="Mời người dùng" sub="Tạo tài khoản mới · mật khẩu tạm sẽ hiện sau khi tạo" icon="mail" onClose={onClose} width={460}>
      <div style={{ padding: 22, display: 'grid', gap: 14 }}>
        <Field label="Tên hiển thị" required>
          <input className="winput" value={name} onChange={(e) => { setName(e.target.value); setErr(''); }} placeholder="Nguyễn Văn A" />
        </Field>
        <Field label="Email" required>
          <input className="winput mono" value={email} onChange={(e) => { setEmail(e.target.value); setErr(''); }} placeholder="nguoidung@gmail.com" />
        </Field>
        <Field label="Vai trò">
          <div style={{ display: 'flex', gap: 10 }}>
            {(
              [
                ['user', 'Người dùng', '#5BE9FF', 'user'],
                ['admin', 'Admin', '#B48CFF', 'shield'],
              ] as [string, string, string, string][]
            ).map(([v, lab, c, ic]) => (
              <button
                key={v}
                className="press"
                onClick={() => setRole(v)}
                style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 9, padding: '11px 13px', borderRadius: 12, whiteSpace: 'nowrap', background: role === v ? hexA2(c, 0.12) : 'var(--bg-2)', border: `1.5px solid ${role === v ? hexA2(c, 0.4) : 'var(--hairline)'}` }}
              >
                <Icon name={ic} size={16} color={c} />
                <span style={{ fontSize: 13, fontWeight: 700, color: role === v ? c : 'var(--tx-soft)' }}>{lab}</span>
              </button>
            ))}
          </div>
        </Field>
        {err && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: 'var(--red)' }}>
            <Icon name="alert" size={15} color="var(--red)" />
            {err}
          </div>
        )}
      </div>
      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', padding: '14px 22px', borderTop: '1px solid var(--hairline)' }}>
        <button className="btn" onClick={onClose} disabled={busy}>
          Huỷ
        </button>
        <button className="btn btn-acc" onClick={submit} disabled={busy}>
          {busy ? <Spinner size={15} color="var(--acc-ink)" /> : <Icon name="send" size={15} color="var(--acc-ink)" />}
          Tạo tài khoản
        </button>
      </div>
    </Modal>
  );
}
