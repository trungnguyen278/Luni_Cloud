/* ============================================================
   AdminOverview — fleet KPIs + activity + attention list, fully wired
   to /admin/overview, /admin/ai/usage (daily fleet activity),
   /admin/stats/emotions and /admin/devices. Ported from web-admin.jsx.
   ============================================================ */
'use client';

import { hexA2 } from '@/lib/format';
import { emotionDistRows } from '@/lib/emotions';
import { useAdminDevices, useAdminOverview, useAiUsage, useEmotionStats } from '@/lib/hooks/useAdmin';
import { FLEET_STATUS } from '@/lib/mock/data';
import type { FleetStatus } from '@/lib/types';
import { Icon } from '@/components/brand/Icon';
import { BarChart, EmptyState, HBars, KPI, PageHead, PanelHead, Pill, Spinner } from '@/components/base/ui';

const WD = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
function dayLabels(n: number): string[] {
  return Array.from({ length: n }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (n - 1 - i));
    return WD[d.getDay()];
  });
}

export function AdminOverview({ onNav }: { onNav: (s: string) => void }) {
  const { data: ov } = useAdminOverview();
  const { data: usage } = useAiUsage(7);
  const { data: emo } = useEmotionStats(7);
  const { data: devices } = useAdminDevices();

  const total = ov?.devices_total ?? 0;
  const online = ov?.devices_online ?? 0;
  const attention = (devices ?? []).filter((d) => d.status !== 'ok' && d.status !== 'updating');
  const activity = usage?.daily_conv ?? [];
  const emoRows = emotionDistRows(emo ?? []);

  return (
    <>
      <PageHead title="Tổng quan fleet" sub="Trạng thái toàn hệ thống Luni · realtime">
        <button className="btn" onClick={() => onNav('logs')}>
          <Icon name="logs" size={16} color="var(--tx-mute)" />
          Nhật ký
        </button>
        <button className="btn btn-acc" onClick={() => onNav('firmware')}>
          <Icon name="download" size={16} color="var(--acc-ink)" />
          Phát hành OTA
        </button>
      </PageHead>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 18 }}>
        <KPI icon="cpu" label="Thiết bị trực tuyến" value={`${online}/${total}`} sub={total ? `${Math.round((online / total) * 100)}% fleet` : '—'} tone="#7BE88E" />
        <KPI icon="users" label="Người dùng" value={ov?.users ?? '—'} tone="var(--acc)" />
        <KPI icon="chat" label="Tương tác hôm nay" value={ov?.interactions_today ?? '—'} tone="#76B8FF" />
        <KPI icon="alert" label="Lỗi 24h" value={ov?.errors_24h ?? '—'} tone="#FF5B6E" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 18, alignItems: 'start' }}>
        <div className="panel">
          <PanelHead icon="chart" title="Hoạt động 7 ngày" sub="Tổng tương tác toàn fleet" />
          <div className="panel-pad">
            {activity.length ? <BarChart data={activity} labels={dayLabels(activity.length)} accent="var(--acc)" height={170} /> : <EmptyState text="Chưa có dữ liệu hoạt động." />}
          </div>
        </div>
        <div className="panel">
          <PanelHead icon="sparkle" title="Phân bố cảm xúc" sub="Toàn fleet · 7 ngày" />
          <div className="panel-pad">{emoRows.length ? <HBars rows={emoRows} /> : <EmptyState icon="sparkle" text="Chưa có dữ liệu cảm xúc." />}</div>
        </div>
      </div>

      <div className="panel" style={{ marginTop: 18 }}>
        <PanelHead
          icon="alert"
          title="Cần xử lý"
          sub={`${attention.length} thiết bị cần chú ý`}
          right={
            <button className="btn btn-sm" onClick={() => onNav('devices')}>
              Xem tất cả
              <Icon name="chevron" size={14} color="var(--tx-mute)" />
            </button>
          }
        />
        <div style={{ padding: 8 }}>
          {!devices ? (
            <div style={{ display: 'grid', placeItems: 'center', padding: 24 }}>
              <Spinner />
            </div>
          ) : attention.length === 0 ? (
            <EmptyState icon="check" text="Mọi thiết bị đều ổn." />
          ) : (
            attention.map((d) => {
              const st = FLEET_STATUS[d.status as FleetStatus] || FLEET_STATUS.ok;
              return (
                <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '11px 12px', borderRadius: 12 }}>
                  <span style={{ width: 36, height: 36, borderRadius: 10, display: 'grid', placeItems: 'center', background: hexA2(st.c, 0.14), flex: 'none' }}>
                    <Icon name={st.icon} size={17} color={st.c} />
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 700 }}>
                      {d.name} <span style={{ fontWeight: 400, color: 'var(--tx-faint)' }}>· {d.owner}</span>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--tx-mute)', marginTop: 2 }}>{d.issue || st.label}</div>
                  </div>
                  <Pill tone={st.c}>{st.label}</Pill>
                  <span className="mono" style={{ fontSize: 11, color: 'var(--tx-faint)', width: 92, textAlign: 'right' }}>
                    {d.lastSeen}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </>
  );
}
