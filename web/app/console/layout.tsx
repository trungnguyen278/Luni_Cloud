import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import { ConsoleGate } from '@/components/shell/ConsoleGate';

/* Server-side cheap gate: no refresh cookie → straight to /login.
   Full role gating + session restore happen client-side in ConsoleGate. */
export default function ConsoleLayout({ children }: { children: ReactNode }) {
  if (!cookies().get('luni_rt')) redirect('/login');
  return <ConsoleGate>{children}</ConsoleGate>;
}
