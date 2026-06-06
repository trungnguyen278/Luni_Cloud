/* ============================================================
   AdminFirmware — firmware catalogue + upload + delete (all real),
   plus the publish/rollout panel (demo — no rollout endpoint).
   Ported from web-firmware.jsx.
   ============================================================ */
'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { fmtSize, hexA2 } from '@/lib/format';
import { deleteFirmware } from '@/lib/api/firmware';
import type { FirmwareBuild } from '@/lib/api/types';
import { useFirmware } from '@/lib/hooks/useAdmin';
import { CHANNEL } from '@/lib/mock/data';
import { Icon } from '@/components/brand/Icon';
import { EmptyState, Modal, PageHead, PanelHead, Pill, Spinner, luniToast } from '@/components/base/ui';
import { DemoNote } from '@/components/user/parts';
import { ReleasePanel } from './ReleasePanel';
import { UploadDialog } from './UploadDialog';

export function AdminFirmware() {
  const qc = useQueryClient();
  const { data, isLoading, isError } = useFirmware();
  const list = data ?? [];
  const [showUp, setShowUp] = useState(false);
  const [confirmDel, setConfirmDel] = useState<FirmwareBuild | null>(null);
  const [deleting, setDeleting] = useState(false);
  // "published" is demo state (no publish endpoint) — defaults to the latest per channel.
  const [published, setPublished] = useState<Record<string, string>>({});

  const livePublished: Record<string, string> = { ...autoPublished(list), ...published };

  const refresh = () => qc.invalidateQueries({ queryKey: ['firmware'] });

  const del = async (id: string) => {
    setDeleting(true);
    try {
      await deleteFirmware(id);
      luniToast('Đã xoá firmware (kèm binary)', 'red', 'trash');
      setConfirmDel(null);
      refresh();
    } catch {
      luniToast('Xoá thất bại', 'red', 'alert');
    } finally {
      setDeleting(false);
    }
  };

  const publish = (f: FirmwareBuild) => {
    setPublished((p) => ({ ...p, [f.channel]: f.id }));
    luniToast(`Đã phát hành v${f.version} · kênh ${f.channel} (demo)`, 'green', 'check');
  };

  return (
    <>
      <PageHead title="Firmware (OTA)" sub="Xuất bản bản nạp — robot tự cập nhật khi tới phiên">
        <button className="btn btn-acc" onClick={() => setShowUp(true)}>
          <Icon name="plus" size={16} color="var(--acc-ink)" />
          Tải lên firmware
        </button>
      </PageHead>

      <div className="panel" style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '13px 18px', marginBottom: 18, background: 'radial-gradient(120% 130% at 0% 0%, var(--acc-12), transparent 60%)' }}>
        <span style={{ width: 36, height: 36, borderRadius: 10, display: 'grid', placeItems: 'center', background: 'var(--acc-12)', flex: 'none' }}>
          <Icon name="info" size={18} color="var(--acc)" />
        </span>
        <p style={{ flex: 1, fontSize: 13, color: 'var(--tx-soft)', lineHeight: 1.55, margin: 0 }}>
          Bạn chỉ <b style={{ color: 'var(--tx)' }}>xuất bản</b> firmware lên kênh. Mỗi robot tự gọi <span className="mono" style={{ color: 'var(--acc)' }}>/ota/check</span>, thấy bản mới
          tương thích model + kênh của mình thì <b style={{ color: 'var(--tx)' }}>tự tải & cài</b> khi đang sạc và rảnh.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.55fr 1fr', gap: 18, alignItems: 'start' }}>
        <div className="panel" style={{ overflow: 'hidden' }}>
          <PanelHead icon="chip" title="Kho firmware" sub={`${list.length} bản · R2 + đĩa`} />
          {isLoading ? (
            <div style={{ display: 'grid', placeItems: 'center', padding: 40 }}>
              <Spinner />
            </div>
          ) : isError ? (
            <EmptyState icon="alert" text="Không tải được kho firmware" sub="Thử lại sau." />
          ) : list.length === 0 ? (
            <EmptyState icon="chip" text="Chưa có firmware nào." sub="Tải lên bản .bin đầu tiên." />
          ) : (
            <table className="wtable">
              <thead>
                <tr>
                  <th>Phiên bản</th>
                  <th>Model</th>
                  <th>Kênh</th>
                  <th>Kích thước</th>
                  <th>Trạng thái</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {list.map((f) => {
                  const ch = CHANNEL[f.channel];
                  const isLive = livePublished[f.channel] === f.id;
                  return (
                    <tr key={f.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span style={{ width: 32, height: 32, borderRadius: 9, display: 'grid', placeItems: 'center', background: isLive ? hexA2(ch.c, 0.14) : 'var(--bg-2)', flex: 'none' }}>
                            <Icon name="cpu" size={16} color={isLive ? ch.c : 'var(--tx-mute)'} />
                          </span>
                          <div>
                            <div className="mono" style={{ fontWeight: 700, color: 'var(--tx)' }}>
                              v{f.version}
                            </div>
                            <div className="mono" style={{ fontSize: 10.5, color: 'var(--tx-faint)' }}>
                              {f.installed} đã cài
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="mono" style={{ fontSize: 12.5 }}>
                        {f.model}
                      </td>
                      <td>
                        <Pill tone={ch.c} dot>
                          {ch.label}
                        </Pill>
                      </td>
                      <td className="mono" style={{ fontSize: 12.5 }}>
                        {fmtSize(f.size)}
                      </td>
                      <td>{isLive ? <Pill tone="#7BE88E" dot>Đang phát hành</Pill> : <span style={{ fontSize: 12, color: 'var(--tx-faint)' }}>Bản cũ</span>}</td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: 6 }}>
                          {!isLive && (
                            <button className="btn btn-sm" onClick={() => publish(f)}>
                              <Icon name="download" size={13} color="var(--acc)" />
                              Phát hành
                            </button>
                          )}
                          <button className="btn btn-sm btn-danger" onClick={() => setConfirmDel(f)} title="Xoá" disabled={isLive}>
                            <Icon name="trash" size={14} color={isLive ? 'var(--tx-faint)' : 'var(--red)'} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        <ReleasePanel firmwares={list} published={livePublished} />
      </div>

      {showUp && <UploadDialog onClose={() => setShowUp(false)} onDone={() => refresh()} />}
      {confirmDel && (
        <Modal title="Xoá firmware?" sub={`v${confirmDel.version} · ${confirmDel.model}`} icon="trash" onClose={() => setConfirmDel(null)} width={420}>
          <div style={{ padding: 20 }}>
            <p style={{ fontSize: 13.5, color: 'var(--tx-soft)', lineHeight: 1.6, margin: '0 0 18px' }}>
              Thao tác này xoá cả bản ghi và file binary. Không hoàn tác được.{' '}
              {confirmDel.installed > 0 && <span style={{ color: 'var(--warm)' }}>{confirmDel.installed} thiết bị đang chạy bản này.</span>}
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button className="btn" onClick={() => setConfirmDel(null)} disabled={deleting}>
                Huỷ
              </button>
              <button className="btn btn-danger" style={{ background: 'rgba(255,91,110,.12)', borderColor: 'rgba(255,91,110,.32)' }} onClick={() => del(confirmDel.id)} disabled={deleting}>
                {deleting ? <Spinner size={15} /> : <Icon name="trash" size={15} color="var(--red)" />}
                Xoá vĩnh viễn
              </button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}

/** Default "published" = newest active build per channel (demo, until a publish endpoint exists). */
function autoPublished(list: FirmwareBuild[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const f of list) {
    if (!f.is_active) continue;
    if (!out[f.channel]) out[f.channel] = f.id; // list is newest-first
  }
  return out;
}
