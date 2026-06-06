/* ============================================================
   UserDashboard — section dispatcher for the user role. Loads the
   user's devices once, fetches live status for each, maps to studio
   view-models, and routes the active section to its component.
   Ported from UserDashboard in web-user.jsx.
   ============================================================ */
'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toStudioDevice } from '@/lib/device/toStudioDevice';
import { useDeviceStatuses, useDevices } from '@/lib/hooks/useDevices';
import { EmptyState, PageHead, Spinner } from '@/components/base/ui';
import { UserChat } from './UserChat';
import { UserOTA } from './UserOTA';
import { UserOverview } from './UserOverview';
import { UserSettings } from './UserSettings';
import { UserStats } from './UserStats';
import { UserStudio } from './UserStudio';

export function UserDashboard({ section }: { section: string }) {
  const router = useRouter();
  const { data: devices, isLoading, isError } = useDevices();
  const list = devices ?? [];
  const statusMap = useDeviceStatuses(list.map((d) => d.id));
  const studioDevices = list.map((d) => toStudioDevice(d, statusMap[d.id]));
  const [sel, setSel] = useState<string | null>(null);
  const selId = sel ?? studioDevices[0]?.id ?? null;
  const device = studioDevices.find((d) => d.id === selId) || studioDevices[0];
  const go = (s: string) => router.push(`/console/${s}`);

  // Settings doesn't need a device.
  if (section === 'settings') return <UserSettings />;

  if (isLoading) {
    return (
      <div style={{ display: 'grid', placeItems: 'center', minHeight: '50vh' }}>
        <Spinner size={30} />
      </div>
    );
  }
  if (isError) {
    return (
      <div>
        <PageHead title="Robot của tôi" />
        <div className="panel panel-pad">
          <EmptyState icon="alert" text="Không tải được danh sách robot" sub="Kiểm tra kết nối rồi thử lại." />
        </div>
      </div>
    );
  }
  if (studioDevices.length === 0) {
    return (
      <div>
        <PageHead title="Chưa có robot nào" sub="Ghép nối Luni bằng ứng dụng di động để bắt đầu." />
        <div className="panel panel-pad">
          <EmptyState icon="cpu" text="Bạn chưa có robot Luni nào." sub="Mở app Luni → Thêm thiết bị để ghép nối qua Bluetooth." />
        </div>
      </div>
    );
  }

  switch (section) {
    case 'studio':
      return <UserStudio device={device} devices={studioDevices} sel={selId} setSel={setSel} />;
    case 'chat':
      return <UserChat device={studioDevices[0]} />;
    case 'stats':
      return <UserStats device={studioDevices[0]} />;
    case 'ota':
      return <UserOTA devices={studioDevices} />;
    case 'overview':
    default:
      return <UserOverview device={studioDevices[0]} devices={studioDevices} onNav={go} />;
  }
}
