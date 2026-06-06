/* ============================================================
   AdminLogs — realtime tail of device + server logs. Ported from
   web-admin.jsx; wired to /admin/logs/devices + /admin/logs/server
   with source + level filters (merged, newest-first).
   ============================================================ */
'use client';

import { useState } from 'react';
import { hexA2 } from '@/lib/format';
import { useDeviceLogs, useServerLogs } from '@/lib/hooks/useAdmin';
import { LOG_LV } from '@/lib/mock/data';
import { EmptyState, Seg, Spinner } from '@/components/base/ui';

interface Row {
  iso: string;
  t: string;
  dev: string;
  lv: string;
  tag: string;
  msg: string;
}

function timeOf(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleTimeString('vi-VN', { hour12: false });
}
function normLv(l: string): string {
  if (l === 'warning') return 'warn';
  return l;
}

export function AdminLogs() {
  const [lv, setLv] = useState('all');
  const [src, setSrc] = useState('all');
  const level = lv === 'all' ? undefined : lv;

  const devQ = useDeviceLogs({ level }, src !== 'server');
  const srvQ = useServerLogs({ level }, src !== 'device');

  const rows: Row[] = [];
  if (src !== 'server') (devQ.data ?? []).forEach((l) => rows.push({ iso: l.created_at, t: timeOf(l.created_at), dev: l.device_id, lv: normLv(l.level), tag: l.tag, msg: l.message }));
  if (src !== 'device') (srvQ.data ?? []).forEach((l) => rows.push({ iso: l.created_at, t: timeOf(l.created_at), dev: 'server', lv: normLv(l.level), tag: l.module, msg: l.message }));
  rows.sort((a, b) => b.iso.localeCompare(a.iso));

  const loading = (src !== 'server' && devQ.isLoading) || (src !== 'device' && srvQ.isLoading);
  const error = (src !== 'server' && devQ.isError) || (src !== 'device' && srvQ.isError);

  return (
    <>
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <Seg
          options={[
            { id: 'all', label: 'Tất cả' },
            { id: 'server', label: 'Máy chủ' },
            { id: 'device', label: 'Thiết bị' },
          ]}
          value={src}
          onChange={setSrc}
        />
        <Seg
          options={[
            { id: 'all', label: 'Mọi cấp' },
            { id: 'info', label: 'Info' },
            { id: 'warn', label: 'Warn' },
            { id: 'error', label: 'Error' },
          ]}
          value={lv}
          onChange={setLv}
        />
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--tx-faint)' }}>
          <span className="cdot" style={{ background: 'var(--green)', boxShadow: '0 0 7px var(--green)', animation: 'chargePulse 1.6s infinite' }} />
          tail · realtime
        </div>
      </div>
      <div className="panel" style={{ overflow: 'hidden' }}>
        {loading ? (
          <div style={{ display: 'grid', placeItems: 'center', padding: 40 }}>
            <Spinner />
          </div>
        ) : error ? (
          <EmptyState icon="alert" text="Không tải được nhật ký" sub="Thử lại sau." />
        ) : (
          <table className="wtable">
            <thead>
              <tr>
                <th style={{ width: 92 }}>Thời gian</th>
                <th style={{ width: 140 }}>Nguồn</th>
                <th style={{ width: 80 }}>Cấp</th>
                <th>Nội dung</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((l, i) => {
                const lc = LOG_LV[l.lv] || { c: '#8592AB', label: l.lv.toUpperCase() };
                return (
                  <tr key={i}>
                    <td className="mono" style={{ fontSize: 12, color: 'var(--tx-faint)' }}>
                      {l.t}
                    </td>
                    <td className="mono" style={{ fontSize: 12, color: l.dev === 'server' ? 'var(--tx-mute)' : 'var(--tx-soft)' }}>
                      {l.dev === 'server' ? 'server' : l.dev.slice(0, 12)}
                    </td>
                    <td>
                      <span className="spill" style={{ height: 20, fontSize: 10, background: hexA2(lc.c, 0.14), color: lc.c }}>
                        {lc.label}
                      </span>
                    </td>
                    <td className="mono" style={{ fontSize: 12.5, color: 'var(--tx-soft)' }}>
                      <span style={{ color: 'var(--tx-faint)' }}>[{l.tag}]</span> {l.msg}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
        {!loading && !error && rows.length === 0 && <EmptyState text="Không có log nào khớp bộ lọc." />}
      </div>
    </>
  );
}
