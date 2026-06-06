/* ============================================================
   Sidebar — console nav rail. Ported from web-shell.jsx; nav items
   are now <Link>s and the active item is derived from the route.
   ============================================================ */
'use client';

import Link from 'next/link';
import { useLunar } from '@/lib/moon/useLunar';
import { Icon } from '@/components/brand/Icon';
import { MoonGlyph } from '@/components/brand/MoonGlyph';
import { ADMIN_NAV, USER_NAV } from './nav';

export interface SidebarProps {
  role: 'user' | 'admin';
  section: string;
  onToggleRail: () => void;
}

export function Sidebar({ role, section, onToggleRail }: SidebarProps) {
  const items = role === 'admin' ? ADMIN_NAV : USER_NAV;
  const moon = useLunar();
  return (
    <aside className="sidebar">
      <div style={{ display: 'flex', alignItems: 'center', gap: 11, height: 'var(--topbar-h)', padding: '0 18px', borderBottom: '1px solid var(--hairline)' }}>
        <MoonGlyph p={moon.p} size={32} color={role === 'admin' ? '#B48CFF' : '#5BE9FF'} eyes />
        <div className="brand-text" style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 16, fontWeight: 800, letterSpacing: '-.02em', lineHeight: 1 }}>Luni</div>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--acc)', marginTop: 3 }}>
            {role === 'admin' ? 'Admin Console' : 'Cloud'}
          </div>
        </div>
        <button className="nav-label" onClick={onToggleRail} style={{ width: 28, height: 28, display: 'grid', placeItems: 'center', borderRadius: 8 }} title="Thu gọn">
          <Icon name="sliders" size={16} color="var(--tx-faint)" />
        </button>
      </div>

      <nav className="scrolly" style={{ flex: 1, padding: '8px 0 14px' }}>
        {items.map((it, i) =>
          it.group ? (
            <div key={'g' + i} className="nav-group">
              {it.group}
            </div>
          ) : (
            <Link key={it.id} href={`/console/${it.id}`} className={'nav-item' + (section === it.id ? ' on' : '')} title={it.label}>
              <Icon name={it.icon as string} size={19} color={section === it.id ? 'var(--acc)' : 'var(--tx-faint)'} strokeWidth={1.8} />
              <span className="nav-label" style={{ flex: 1, textAlign: 'left' }}>
                {it.label}
              </span>
              {it.star && (
                <span className="nav-label spill" style={{ height: 18, padding: '0 7px', fontSize: 9.5, background: 'var(--acc-12)', color: 'var(--acc)' }}>
                  OTA
                </span>
              )}
            </Link>
          ),
        )}
      </nav>

      <div style={{ padding: 12, borderTop: '1px solid var(--hairline)' }}>
        <div className="side-foot-text" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 8px 8px' }}>
          <span className="cdot" style={{ background: 'var(--green)', boxShadow: '0 0 7px var(--green)' }} />
          <span style={{ fontSize: 11.5, color: 'var(--tx-mute)' }}>API · khoẻ</span>
          <span className="mono" style={{ marginLeft: 'auto', fontSize: 10.5, color: 'var(--tx-faint)' }}>
            v0.9.2
          </span>
        </div>
      </div>
    </aside>
  );
}
