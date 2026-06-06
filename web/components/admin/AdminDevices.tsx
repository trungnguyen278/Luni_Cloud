/* ============================================================
   AdminDevices — fleet table + detail drawer + export, wired to
   GET /admin/devices. Drawer commands go through POST /devices/{id}/command.
   Export builds a real CSV/JSON client-side. Ported from web-admin.jsx.
   ============================================================ */
'use client';

import { useState } from 'react';
import { hexA2 } from '@/lib/format';
import { sendCommand } from '@/lib/api/devices';
import { ApiError } from '@/lib/api/client';
import { useAdminDevices } from '@/lib/hooks/useAdmin';
import { FLEET_STATUS } from '@/lib/mock/data';
import type { FleetDevice, FleetStatus } from '@/lib/types';
import { Icon } from '@/components/brand/Icon';
import { LuniFace } from '@/components/brand/LuniFace';
import { Confirm, EmptyState, Field, Modal, Pill, Seg, Spinner, luniToast } from '@/components/base/ui';

const DEV_FILTERS = [
  { id: 'all', label: 'Tất cả' },
  { id: 'attention', label: 'Cần xử lý' },
  { id: 'offline', label: 'Ngoại tuyến' },
  { id: 'updating', label: 'Đang cập nhật' },
];

function statusMeta(s: string) {
  return FLEET_STATUS[s as FleetStatus] || FLEET_STATUS.ok;
}

function downloadBlob(name: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

export function AdminDevices() {
  const { data, isLoading, isError } = useAdminDevices();
  const fleet = data ?? [];
  const [filter, setFilter] = useState('all');
  const [q, setQ] = useState('');
  const [sel, setSel] = useState<FleetDevice | null>(null);
  const [exp, setExp] = useState(false);

  const list = fleet.filter((d) => {
    if (filter === 'attention' && (d.status === 'ok' || d.status === 'updating')) return false;
    if (filter === 'offline' && d.status !== 'offline') return false;
    if (filter === 'updating' && d.status !== 'updating') return false;
    if (q.trim()) {
      const s = (d.name + d.id + d.owner + d.city).toLowerCase();
      if (!s.includes(q.trim().toLowerCase())) return false;
    }
    return true;
  });

  return (
    <>
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 220, maxWidth: 340 }}>
          <span style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)' }}>
            <Icon name="search" size={16} color="var(--tx-faint)" />
          </span>
          <input className="winput mono" style={{ paddingLeft: 38 }} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tên · MAC · chủ sở hữu" />
        </div>
        <Seg options={DEV_FILTERS} value={filter} onChange={setFilter} />
        <button className="btn" style={{ marginLeft: 'auto' }} onClick={() => setExp(true)} disabled={!list.length}>
          <Icon name="download" size={16} color="var(--tx-mute)" />
          Xuất CSV
        </button>
      </div>
      <div className="panel" style={{ overflow: 'hidden' }}>
        {isLoading ? (
          <div style={{ display: 'grid', placeItems: 'center', padding: 40 }}>
            <Spinner />
          </div>
        ) : isError ? (
          <EmptyState icon="alert" text="Không tải được fleet" sub="Thử lại sau." />
        ) : (
          <table className="wtable">
            <thead>
              <tr>
                <th>Thiết bị</th>
                <th>Chủ sở hữu</th>
                <th>Trạng thái</th>
                <th>FW</th>
                <th>Pin</th>
                <th>Sóng</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {list.map((d) => {
                const st = statusMeta(d.status);
                return (
                  <tr key={d.id} className="row-click" onClick={() => setSel(d)}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                        <span style={{ width: 34, height: 34, borderRadius: 9, display: 'grid', placeItems: 'center', background: 'var(--bg-2)', flex: 'none' }}>
                          <LuniFace emotion={d.emotion} size={26} state="idle" noPhase dim={!d.online} />
                        </span>
                        <div>
                          <div style={{ fontWeight: 700, color: 'var(--tx)' }}>{d.name}</div>
                          <div className="mono" style={{ fontSize: 11, color: 'var(--tx-faint)' }}>
                            {d.id}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>
                      {!d.owner || d.owner.startsWith('—') ? (
                        <span style={{ color: 'var(--tx-faint)' }}>chưa gán</span>
                      ) : (
                        <div>
                          <div style={{ color: 'var(--tx-soft)' }}>{d.owner}</div>
                          <div style={{ fontSize: 11, color: 'var(--tx-faint)' }}>{d.city}</div>
                        </div>
                      )}
                    </td>
                    <td>
                      <Pill tone={st.c} dot={d.online}>
                        {st.label}
                      </Pill>
                    </td>
                    <td className="mono" style={{ color: 'var(--tx-soft)' }}>
                      v{d.fw}
                    </td>
                    <td className="mono" style={{ color: d.battery <= 15 ? 'var(--red)' : 'var(--tx-soft)' }}>
                      {d.online ? d.battery + '%' : '—'}
                    </td>
                    <td className="mono" style={{ color: 'var(--tx-mute)' }}>
                      {d.online ? d.rssi : '—'}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <Icon name="chevron" size={16} color="var(--tx-faint)" />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
        {!isLoading && !isError && list.length === 0 && <EmptyState text="Không có thiết bị nào khớp." />}
      </div>
      {sel && <DeviceDrawer d={sel} onClose={() => setSel(null)} />}
      {exp && <ExportModal list={list} all={fleet} onClose={() => setExp(false)} />}
    </>
  );
}

function ExportModal({ list, all, onClose }: { list: FleetDevice[]; all: FleetDevice[]; onClose: () => void }) {
  const [fmt, setFmt] = useState('csv');
  const [scope, setScope] = useState('filtered');
  const run = () => {
    const rows = scope === 'filtered' ? list : all;
    const stamp = new Date().toISOString().slice(0, 10);
    if (fmt === 'json') {
      downloadBlob(`luni-fleet-${stamp}.json`, JSON.stringify(rows, null, 2), 'application/json');
    } else {
      const cols = ['id', 'name', 'owner', 'email', 'city', 'model', 'fw', 'online', 'battery', 'rssi', 'status', 'lastSeen'] as const;
      const head = cols.join(',');
      const body = rows
        .map((d) => {
          const rec = d as unknown as Record<string, unknown>;
          return cols.map((c) => `"${String(rec[c] ?? '').replace(/"/g, '""')}"`).join(',');
        })
        .join('\n');
      downloadBlob(`luni-fleet-${stamp}.csv`, head + '\n' + body, 'text/csv');
    }
    luniToast('Đã xuất ' + rows.length + ' thiết bị', 'green', 'download');
    onClose();
  };
  return (
    <Modal title="Xuất dữ liệu fleet" sub="Tải về danh sách thiết bị" icon="download" onClose={onClose} width={440}>
      <div style={{ padding: 22, display: 'grid', gap: 16 }}>
        <Field label="Phạm vi">
          <div style={{ display: 'flex', gap: 10 }}>
            {(
              [
                ['filtered', `Đang lọc (${list.length})`],
                ['all', `Toàn fleet (${all.length})`],
              ] as [string, string][]
            ).map(([v, lab]) => (
              <button
                key={v}
                className="press"
                onClick={() => setScope(v)}
                style={{ flex: 1, padding: '11px 13px', borderRadius: 11, fontSize: 13, fontWeight: 700, background: scope === v ? 'var(--acc-12)' : 'var(--bg-2)', color: scope === v ? 'var(--acc)' : 'var(--tx-soft)', border: `1.5px solid ${scope === v ? 'var(--acc-32)' : 'var(--hairline)'}` }}
              >
                {lab}
              </button>
            ))}
          </div>
        </Field>
        <Field label="Định dạng">
          <Seg
            options={[
              { id: 'csv', label: 'CSV' },
              { id: 'json', label: 'JSON' },
            ]}
            value={fmt}
            onChange={setFmt}
          />
        </Field>
      </div>
      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', padding: '14px 22px', borderTop: '1px solid var(--hairline)' }}>
        <button className="btn" onClick={onClose}>
          Huỷ
        </button>
        <button className="btn btn-acc" onClick={run}>
          <Icon name="download" size={15} color="var(--acc-ink)" />
          Tải về
        </button>
      </div>
    </Modal>
  );
}

const CMDS: [string, string, string, string, boolean, string, string, Record<string, unknown>][] = [
  ['Khởi động lại', 'refresh', '#5BE9FF', 'reboot', true, 'Robot ngoại tuyến ~20 giây rồi khởi động lại mềm.', 'reboot', {}],
  ['Gửi lệnh đọc', 'volume', '#76B8FF', 'tts_play', false, 'Yêu cầu Luni đọc một câu chào (TTS).', 'tts_play', { text: 'Xin chào, mình là Luni!' }],
  ['Đồng bộ trăng', 'moon', '#FFD166', 'set_scene', false, 'Cập nhật cảnh hiển thị theo âm lịch hôm nay.', 'set_scene', { scene: 'moon' }],
];

function DeviceDrawer({ d, onClose }: { d: FleetDevice; onClose: () => void }) {
  const st = statusMeta(d.status);
  const [confirm, setConfirm] = useState<(typeof CMDS)[number] | null>(null);
  const metrics: [string, string][] = [
    ['pin', d.online ? d.battery + '%' : '—'],
    ['rssi', d.online ? d.rssi + ' dBm' : '—'],
    ['firmware', 'v' + d.fw],
    ['cập nhật', d.lastSeen],
  ];

  const runCmd = async (type: string, payload: Record<string, unknown>, label: string, icon: string) => {
    try {
      await sendCommand(d.id, type, payload);
      luniToast('Đã gửi ' + label, 'acc', icon);
    } catch (e) {
      const offline = e instanceof ApiError && e.status === 503;
      luniToast(offline ? 'Thiết bị ngoại tuyến' : 'Gửi lệnh thất bại', 'red', 'alert');
    }
  };

  return (
    <div className="scrim" onMouseDown={onClose} style={{ justifyContent: 'flex-end', padding: 0 }}>
      <div
        className="scrolly"
        onMouseDown={(e) => e.stopPropagation()}
        style={{ width: 420, maxWidth: '92vw', height: '100vh', background: 'var(--bg-base)', borderLeft: '1px solid var(--hairline-2)', boxShadow: 'var(--shadow-pop)', animation: 'webSlideIn .3s var(--ease) both' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 20px', borderBottom: '1px solid var(--hairline)', position: 'sticky', top: 0, background: 'var(--bg-base)', zIndex: 2 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 16, fontWeight: 800 }}>{d.name}</div>
            <div className="mono" style={{ fontSize: 11.5, color: 'var(--tx-faint)' }}>
              {d.id}
            </div>
          </div>
          <Pill tone={st.c} dot={d.online}>
            {st.label}
          </Pill>
          <button className="btn btn-icon" onClick={onClose}>
            <Icon name="close" size={18} color="var(--tx-mute)" />
          </button>
        </div>
        <div style={{ padding: 20, display: 'grid', gap: 18 }}>
          <div className="panel" style={{ display: 'grid', placeItems: 'center', padding: '24px 0 18px', background: 'radial-gradient(120% 120% at 50% 0%, var(--acc-12), transparent 60%)' }}>
            <LuniFace emotion={d.emotion} size={150} state="idle" dim={!d.online} />
            <div style={{ marginTop: 10, fontSize: 13, color: 'var(--tx-mute)' }}>
              {d.owner} · {d.city}
            </div>
          </div>
          {d.issue && (
            <div style={{ display: 'flex', gap: 10, padding: '12px 14px', borderRadius: 12, background: hexA2(st.c, 0.08), border: `1px solid ${hexA2(st.c, 0.26)}` }}>
              <Icon name="alert" size={16} color={st.c} />
              <span style={{ fontSize: 13, color: 'var(--tx-soft)', fontWeight: 600 }}>{d.issue}</span>
            </div>
          )}
          <div>
            <div className="t-cap" style={{ marginBottom: 10 }}>
              CHẨN ĐOÁN
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {metrics.map(([k, v]) => (
                <div key={k} className="card-2" style={{ padding: '11px 13px' }}>
                  <div className="mono" style={{ fontSize: 10.5, color: 'var(--tx-faint)' }}>
                    {k}
                  </div>
                  <div className="mono" style={{ fontSize: 14.5, fontWeight: 700, marginTop: 4 }}>
                    {v}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div>
            <div className="t-cap" style={{ marginBottom: 10 }}>
              LỆNH · CHR_COMMAND
            </div>
            <div style={{ display: 'grid', gap: 8 }}>
              {CMDS.map((c) => (
                <button
                  key={c[0]}
                  className="press"
                  onClick={() => setConfirm(c)}
                  style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 12, borderRadius: 12, background: 'var(--bg-2)', border: '1px solid var(--hairline)', width: '100%' }}
                >
                  <span style={{ width: 34, height: 34, borderRadius: 10, display: 'grid', placeItems: 'center', background: hexA2(c[2], 0.14) }}>
                    <Icon name={c[1]} size={17} color={c[2]} />
                  </span>
                  <span style={{ flex: 1, textAlign: 'left', fontSize: 13.5, fontWeight: 700 }}>{c[0]}</span>
                  <Icon name="chevron" size={15} color="var(--tx-faint)" />
                </button>
              ))}
            </div>
          </div>
        </div>
        {confirm && (
          <Confirm
            icon={confirm[1]}
            danger={confirm[4]}
            title={confirm[0] + '?'}
            sub={d.name}
            cta={confirm[0]}
            body={confirm[5] + (d.online ? '' : ' ⚠ Thiết bị đang ngoại tuyến — lệnh có thể không tới được.')}
            onClose={() => setConfirm(null)}
            onOk={() => runCmd(confirm[6], confirm[7], confirm[0], confirm[1])}
          />
        )}
      </div>
    </div>
  );
}
