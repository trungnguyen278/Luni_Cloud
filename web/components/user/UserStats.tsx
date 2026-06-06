'use client';

import { emotionDistRows } from '@/lib/emotions';
import { useStats } from '@/lib/hooks/useDevices';
import type { StudioDevice } from '@/lib/types';
import { BarChart, EmptyState, HBars, PanelHead, Spinner } from '@/components/base/ui';

const WD = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
function dayLabels(n: number): string[] {
  return Array.from({ length: n }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (n - 1 - i));
    return WD[d.getDay()];
  });
}

export function UserStats({ device }: { device: StudioDevice }) {
  const { data: stats, isLoading, isError } = useStats(device?.id, 7);
  const daily = stats?.daily_interactions ?? [];
  const battery = (stats?.battery ?? []).map((b) => (b == null ? 0 : b));
  const emotions = emotionDistRows(stats?.emotions ?? []);
  const labels = dayLabels(daily.length || 7);

  return (
    <div style={{ display: 'grid', gap: 18 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
        <div className="panel">
          <PanelHead icon="chart" title="Tương tác 7 ngày" sub="Lượt trò chuyện mỗi ngày" />
          <div className="panel-pad">
            {isLoading ? (
              <div style={{ display: 'grid', placeItems: 'center', height: 150 }}>
                <Spinner />
              </div>
            ) : isError ? (
              <EmptyState icon="alert" text="Không tải được thống kê" sub="Thử lại sau." />
            ) : daily.length ? (
              <BarChart data={daily} labels={labels} accent="var(--acc)" />
            ) : (
              <EmptyState text="Chưa có tương tác nào." />
            )}
          </div>
        </div>
        <div className="panel">
          <PanelHead icon="battery" title="Lịch sử pin" sub="% thấp nhất theo ngày" />
          <div className="panel-pad">
            {isLoading ? (
              <div style={{ display: 'grid', placeItems: 'center', height: 150 }}>
                <Spinner />
              </div>
            ) : battery.some((b) => b > 0) ? (
              <BarChart data={battery} labels={dayLabels(battery.length)} accent="#7BE88E" unit="%" />
            ) : (
              <EmptyState text="Chưa có dữ liệu pin." />
            )}
          </div>
        </div>
      </div>
      <div className="panel">
        <PanelHead icon="sparkle" title="Phân bố cảm xúc" sub="Luni đã thể hiện trong tuần" />
        <div className="panel-pad">{emotions.length ? <HBars rows={emotions} /> : <EmptyState icon="sparkle" text="Chưa có dữ liệu cảm xúc." />}</div>
      </div>
    </div>
  );
}
