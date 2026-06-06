'use client';

import { hexA2 } from '@/lib/format';
import { useAuth } from '@/lib/auth/AuthContext';
import { useStats } from '@/lib/hooks/useDevices';
import { ACTIVITY } from '@/lib/mock/data';
import type { StudioDevice } from '@/lib/types';
import { Icon } from '@/components/brand/Icon';
import { MoonCard } from '@/components/brand/MoonCard';
import { LiveStudio } from '@/components/studio/LiveStudio';
import { KPI, PageHead, PanelHead } from '@/components/base/ui';
import { DemoNote } from './parts';

export function UserOverview({ device, devices, onNav }: { device: StudioDevice; devices: StudioDevice[]; onNav: (s: string) => void }) {
  const { user } = useAuth();
  const firstName = user?.name?.split(' ').filter(Boolean).slice(-1)[0] || 'bạn';
  const onlineN = devices.filter((d) => d.online).length;
  const chargingN = devices.filter((d) => d.charging).length;
  const avgBatt = devices.length ? Math.round(devices.reduce((s, d) => s + d.battery, 0) / devices.length) : 0;
  const { data: stats } = useStats(device?.id);
  const todayInteractions = stats?.daily_interactions?.length ? stats.daily_interactions[stats.daily_interactions.length - 1] : 0;

  return (
    <>
      <PageHead title={<>Chào bạn, <span style={{ color: 'var(--acc)' }}>{firstName}</span> 👋</>} sub="Tổng quan robot Luni của bạn hôm nay.">
        <button className="btn btn-acc" onClick={() => onNav('studio')}>
          <Icon name="sparkle" size={16} color="var(--acc-ink)" />
          Mở phòng xem
        </button>
      </PageHead>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 18 }}>
        <KPI icon="cpu" label="Robot" value={devices.length} sub={`${onlineN} trực tuyến`} tone="var(--acc)" />
        <KPI icon="chat" label="Tương tác hôm nay" value={todayInteractions} tone="#76B8FF" />
        <KPI icon="battery" label="Pin trung bình" value={`${avgBatt}%`} sub={`${chargingN} đang sạc`} tone="#7BE88E" />
        <KPI icon="clock" label="Phút trò chuyện" value={stats?.audio_minutes ?? '—'} sub="hôm nay" tone="#FFD166" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.55fr 1fr', gap: 18, alignItems: 'start' }}>
        <div style={{ display: 'grid', gap: 18 }}>{device && <LiveStudio device={device} />}</div>
        <div style={{ display: 'grid', gap: 18 }}>
          <MoonCard accent="var(--cyan)" />
          <div className="panel">
            <PanelHead icon="wave" title="Hoạt động gần đây" right={<DemoNote />} />
            <div style={{ padding: '6px 8px 10px' }}>
              {ACTIVITY.map((a, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 11 }}>
                  <span style={{ width: 32, height: 32, borderRadius: 9, display: 'grid', placeItems: 'center', background: hexA2(a.c, 0.13), flex: 'none' }}>
                    <Icon name={a.icon} size={15} color={a.c} />
                  </span>
                  <span style={{ flex: 1, fontSize: 13, color: 'var(--tx-soft)' }}>{a.text}</span>
                  <span className="mono" style={{ fontSize: 11, color: 'var(--tx-faint)' }}>
                    {a.t}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
