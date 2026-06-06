/* ============================================================
   ConsoleShell — the authenticated console frame (sidebar + topbar +
   scrollable main). Ported from ConsoleApp in web-shell.jsx; routing
   state (view/nav) is now the App Router, role comes from the user.
   ============================================================ */
'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useState, type ReactNode } from 'react';
import type { User } from '@/lib/api/types';
import { useAuth } from '@/lib/auth/AuthContext';
import { FLAGS } from '@/lib/flags';
import { LuniDateDevPanel } from '@/components/brand/LuniDateDevPanel';
import { ToastHost } from '@/components/base/ui';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';

export function ConsoleShell({ user, children }: { user: User; children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const section = pathname?.split('/')[2] || 'overview';
  const role: 'user' | 'admin' = user.role === 'admin' ? 'admin' : 'user';
  const [rail, setRail] = useState(false);
  const { logout } = useAuth();

  const onLogout = async () => {
    await logout();
    router.push('/');
  };

  return (
    <div className={'console ' + (role === 'admin' ? 'role-admin ' : '') + (rail ? 'rail' : '')}>
      <Sidebar role={role} section={section} onToggleRail={() => setRail((r) => !r)} />
      <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: 0 }}>
        <Topbar role={role} section={section} user={user} onLogout={onLogout} />
        <main className="scrolly" style={{ flex: 1, minHeight: 0, padding: '26px 30px 60px' }}>
          <div className="fadein" key={section} style={{ maxWidth: 1280, margin: '0 auto' }}>
            {children}
          </div>
        </main>
      </div>
      {FLAGS.LUNI_DEV && (
        <div style={{ position: 'fixed', right: 18, bottom: 18, zIndex: 80 }}>
          <LuniDateDevPanel accent={role === 'admin' ? '#B48CFF' : '#5BE9FF'} />
        </div>
      )}
      <ToastHost />
    </div>
  );
}
