/* ============================================================
   AdminDashboard — section dispatcher for the admin role.
   Ported from AdminDashboard in web-admin.jsx.
   ============================================================ */
'use client';

import { useRouter } from 'next/navigation';
import { CostDashboard } from '@/components/cost/CostDashboard';
import { AdminFirmware } from '@/components/firmware/AdminFirmware';
import { AdminDevices } from './AdminDevices';
import { AdminLogs } from './AdminLogs';
import { AdminOverview } from './AdminOverview';
import { AdminUsers } from './AdminUsers';

export function AdminDashboard({ section }: { section: string }) {
  const router = useRouter();
  const go = (s: string) => router.push(`/console/${s}`);

  switch (section) {
    case 'devices':
      return <AdminDevices />;
    case 'users':
      return <AdminUsers />;
    case 'firmware':
      return <AdminFirmware />;
    case 'logs':
      return <AdminLogs />;
    case 'cost':
      return <CostDashboard />;
    case 'overview':
    default:
      return <AdminOverview onNav={go} />;
  }
}
