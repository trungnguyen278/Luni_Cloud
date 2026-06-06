/* ============================================================
   ConsoleGate — client auth gate. Shows a spinner while restoring the
   session, redirects anonymous visitors to /login, and renders the
   console shell once authenticated. Role enforcement per section lives
   in the section page.
   ============================================================ */
'use client';

import { useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { Spinner } from '@/components/base/ui';
import { ConsoleShell } from './ConsoleShell';

export function ConsoleGate({ children }: { children: ReactNode }) {
  const { user, status } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (status === 'anon') router.replace('/login');
  }, [status, router]);

  if (status !== 'authed' || !user) {
    return (
      <div style={{ height: '100vh', display: 'grid', placeItems: 'center', background: 'var(--bg-base)' }}>
        <Spinner size={30} />
      </div>
    );
  }
  return <ConsoleShell user={user}>{children}</ConsoleShell>;
}
