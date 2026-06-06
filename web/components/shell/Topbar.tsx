/* ============================================================
   Topbar — page title, search, notifications, user menu.
   Ported from web-shell.jsx. The prototype's DEMO role-switch is
   removed: the real role comes from /auth/me and the server enforces
   it on every endpoint. A static role badge remains by the avatar.
   ============================================================ */
'use client';

import { useRouter } from 'next/navigation';
import { useState, type CSSProperties } from 'react';
import { hexA2 } from '@/lib/format';
import type { User } from '@/lib/api/types';
import { Icon } from '@/components/brand/Icon';
import { Avatar, Modal, luniToast } from '@/components/base/ui';
import { PAGE_META } from './nav';

const menuRow: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  width: '100%',
  padding: '10px 14px',
  fontSize: 13,
  fontWeight: 600,
  color: 'var(--tx-soft)',
  textAlign: 'left',
  transition: 'background .12s',
};

export interface TopbarProps {
  role: 'user' | 'admin';
  section: string;
  user: User;
  onLogout: () => void;
}

export function Topbar({ role, section, user, onLogout }: TopbarProps) {
  const router = useRouter();
  const [menu, setMenu] = useState(false);
  const [notif, setNotif] = useState(false);
  const [help, setHelp] = useState(false);
  const meta = PAGE_META[section] || { t: '', s: '' };
  const NOTIFS: [string, string, string, string][] =
    role === 'admin'
      ? [
          ['alert', '#FF5B6E', 'Luni #0311 crash loop (NVS 0x0a)', '2 phút'],
          ['download', '#FFD166', 'v2.2.0 (beta) sẵn sàng phát hành', '18 phút'],
          ['power', '#5C6680', 'Luni #0205 mất kết nối 3 ngày', '1 giờ'],
        ]
      : [
          ['sparkle', '#FFD166', 'Đêm Rằm — Luni đang rạng rỡ', 'hôm nay'],
          ['bolt', '#7BE88E', 'Luni Phòng khách đã sạc đầy', '1 giờ'],
          ['download', '#76B8FF', 'Có bản firmware v2.1.0', 'hôm qua'],
        ];
  const goSettings = () => {
    setMenu(false);
    if (role === 'user') router.push('/console/settings');
    else luniToast('Cài đặt admin sắp ra mắt', 'acc', 'gear');
  };

  return (
    <header className="topbar">
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 17, fontWeight: 800, letterSpacing: '-.02em' }}>{meta.t}</div>
        <div style={{ fontSize: 12, color: 'var(--tx-faint)', marginTop: 1 }}>{meta.s}</div>
      </div>

      <div style={{ position: 'relative', width: 240 }} className="topbar-search">
        <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }}>
          <Icon name="search" size={16} color="var(--tx-faint)" />
        </span>
        <input className="winput" style={{ height: 38, paddingLeft: 36, fontSize: 13 }} placeholder="Tìm kiếm…" />
      </div>

      {/* notifications */}
      <div style={{ position: 'relative' }}>
        <button className="btn btn-icon" onClick={() => setNotif((n) => !n)} style={{ position: 'relative' }}>
          <Icon name="info" size={18} color="var(--tx-mute)" />
          <span style={{ position: 'absolute', top: 8, right: 8, width: 7, height: 7, borderRadius: 99, background: 'var(--red)', boxShadow: '0 0 6px var(--red)' }} />
        </button>
        {notif && (
          <>
            <div style={{ position: 'fixed', inset: 0, zIndex: 40 }} onClick={() => setNotif(false)} />
            <div
              className="fadein"
              style={{ position: 'absolute', right: 0, top: 'calc(100% + 8px)', width: 320, background: 'var(--bg-1)', border: '1px solid var(--hairline-2)', borderRadius: 14, boxShadow: 'var(--shadow-pop)', zIndex: 50, overflow: 'hidden' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 15px', borderBottom: '1px solid var(--hairline)' }}>
                <span style={{ fontSize: 13.5, fontWeight: 700 }}>Thông báo</span>
                <button
                  className="press"
                  onClick={() => {
                    setNotif(false);
                    luniToast('Đã đánh dấu đã đọc', 'acc', 'check');
                  }}
                  style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--acc)' }}
                >
                  Đọc hết
                </button>
              </div>
              {NOTIFS.map(([ic, c, txt, t], i) => (
                <div key={i} style={{ display: 'flex', gap: 11, padding: '12px 15px', borderBottom: i < NOTIFS.length - 1 ? '1px solid var(--hairline)' : 'none' }}>
                  <span style={{ width: 30, height: 30, borderRadius: 9, display: 'grid', placeItems: 'center', background: hexA2(c, 0.13), flex: 'none' }}>
                    <Icon name={ic} size={15} color={c} />
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12.5, color: 'var(--tx-soft)', lineHeight: 1.4 }}>{txt}</div>
                    <div style={{ fontSize: 10.5, color: 'var(--tx-faint)', marginTop: 3 }}>{t} trước</div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* user menu */}
      <div style={{ position: 'relative' }}>
        <button
          className="press"
          onClick={() => setMenu((m) => !m)}
          style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '5px 8px 5px 5px', borderRadius: 11, background: 'var(--bg-2)', border: '1px solid var(--hairline)' }}
        >
          <Avatar name={user.name} size={30} />
          <span style={{ textAlign: 'left' }}>
            <span style={{ display: 'block', fontSize: 12.5, fontWeight: 700, lineHeight: 1.1 }}>{user.name}</span>
            <span style={{ fontSize: 10.5, color: 'var(--acc)', fontWeight: 700 }}>{role === 'admin' ? 'ADMIN' : 'NGƯỜI DÙNG'}</span>
          </span>
          <Icon name="chevronDown" size={14} color="var(--tx-faint)" />
        </button>
        {menu && (
          <>
            <div style={{ position: 'fixed', inset: 0, zIndex: 40 }} onClick={() => setMenu(false)} />
            <div
              className="fadein"
              style={{ position: 'absolute', right: 0, top: 'calc(100% + 8px)', width: 220, background: 'var(--bg-1)', border: '1px solid var(--hairline-2)', borderRadius: 14, boxShadow: 'var(--shadow-pop)', zIndex: 50, overflow: 'hidden' }}
            >
              <div style={{ padding: '13px 14px', borderBottom: '1px solid var(--hairline)' }}>
                <div style={{ fontSize: 13, fontWeight: 700 }}>{user.name}</div>
                <div className="mono" style={{ fontSize: 11, color: 'var(--tx-faint)', marginTop: 2 }}>
                  {user.email}
                </div>
              </div>
              <button className="menu-row" style={menuRow} onClick={goSettings}>
                <Icon name="user" size={16} color="var(--tx-mute)" />
                Hồ sơ
              </button>
              <button className="menu-row" style={menuRow} onClick={goSettings}>
                <Icon name="gear" size={16} color="var(--tx-mute)" />
                Cài đặt
              </button>
              <button
                className="menu-row"
                style={menuRow}
                onClick={() => {
                  setMenu(false);
                  setHelp(true);
                }}
              >
                <Icon name="info" size={16} color="var(--tx-mute)" />
                Trợ giúp
              </button>
              <div className="hr" />
              <button className="menu-row" style={{ ...menuRow, color: 'var(--red)' }} onClick={onLogout}>
                <Icon name="power" size={16} color="var(--red)" />
                Đăng xuất
              </button>
            </div>
          </>
        )}
      </div>

      {help && (
        <Modal title="Trợ giúp & về Luni" sub="Luni Cloud Console · v0.9.2" icon="info" onClose={() => setHelp(false)} width={460}>
          <div style={{ padding: 22, display: 'grid', gap: 12 }}>
            {(
              [
                ['globe', 'Tài liệu API', 'docs/guides/API.md'],
                ['cpu', 'Trạng thái hệ thống', 'lunirobot.io.vn/api/v1/health'],
                ['mail', 'Liên hệ hỗ trợ', 'support@luni.vn'],
              ] as [string, string, string][]
            ).map(([ic, t, s]) => (
              <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 13px', borderRadius: 12, background: 'var(--bg-2)', border: '1px solid var(--hairline)' }}>
                <span style={{ width: 34, height: 34, borderRadius: 10, display: 'grid', placeItems: 'center', background: 'var(--acc-12)', flex: 'none' }}>
                  <Icon name={ic} size={17} color="var(--acc)" />
                </span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 700 }}>{t}</div>
                  <div className="mono" style={{ fontSize: 11.5, color: 'var(--tx-faint)', marginTop: 2 }}>
                    {s}
                  </div>
                </div>
                <Icon name="link" size={16} color="var(--tx-faint)" />
              </div>
            ))}
          </div>
        </Modal>
      )}
    </header>
  );
}
