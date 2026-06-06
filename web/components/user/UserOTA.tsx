'use client';

import { useState } from 'react';
import { otaTrigger } from '@/lib/api/ota';
import { useOtaCheck } from '@/lib/hooks/useDevices';
import { useDeviceSocket } from '@/lib/ws/useDeviceSocket';
import type { StudioDevice } from '@/lib/types';
import { Icon } from '@/components/brand/Icon';
import { LuniFace } from '@/components/brand/LuniFace';
import { Pill, Spinner, luniToast } from '@/components/base/ui';
import { Toggle } from './parts';

const OTA_PHASE: Record<string, string> = { download: 'Đang tải', verify: 'Đang kiểm tra', flash: 'Đang ghi' };

function DeviceOtaRow({ d, auto }: { d: StudioDevice; auto: boolean }) {
  const { data: check, isLoading } = useOtaCheck(d.id, d.fw);
  const live = useDeviceSocket(d.id);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const behind = !!check?.available;
  const ota = live.ota; // live { percent, phase } from ws ota_progress
  const updating = !!ota && ota.percent < 100;
  const done = !!ota && ota.percent >= 100;

  const run = async () => {
    if (!check?.firmware_id) return;
    setBusy(true);
    try {
      const r = await otaTrigger(d.id, check.firmware_id);
      luniToast(r.sent ? `Đã gửi OTA v${check.version} → robot bắt đầu cập nhật` : 'Robot ngoại tuyến — đã lên lịch', r.sent ? 'green' : 'amber', 'download');
      setSent(true);
    } catch {
      luniToast('Không gửi được OTA', 'red', 'alert');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="panel panel-pad" style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
      <span style={{ flex: 'none' }}>
        <LuniFace emotion={d.emotion || 'idle'} size={54} state={updating || (sent && !done) ? 'thinking' : 'idle'} noPhase dim={!d.online} />
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 15, fontWeight: 700 }}>{d.name}</span>
          {isLoading ? null : done ? <Pill tone="#7BE88E" dot>Đã cập nhật</Pill> : behind ? <Pill tone="#FFD166">Có bản v{check?.version}</Pill> : <Pill tone="#7BE88E" dot>Mới nhất</Pill>}
        </div>
        <div className="mono" style={{ fontSize: 12, color: 'var(--tx-faint)', marginTop: 4 }}>
          Đang chạy v{d.fw} · {d.model}
        </div>
        {updating ? (
          <div style={{ marginTop: 10 }}>
            <div className="progress">
              <i style={{ width: ota.percent + '%' }} />
            </div>
            <div className="mono" style={{ fontSize: 11, color: 'var(--acc)', marginTop: 5 }}>
              {OTA_PHASE[ota.phase] || ota.phase} · {ota.percent}%
            </div>
          </div>
        ) : sent && !done ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 8, fontSize: 12, color: 'var(--acc)', fontWeight: 600 }}>
            <Icon name="download" size={14} color="var(--acc)" />
            Đã gửi — chờ robot bắt đầu tải…
          </div>
        ) : (
          behind &&
          auto && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 8, fontSize: 12, color: 'var(--warm)', fontWeight: 600 }}>
              <Icon name="clock" size={14} color="var(--warm)" />
              {d.charging ? 'Đang chuẩn bị cài…' : 'Đã lên lịch — sẽ cài khi cắm sạc'}
            </div>
          )
        )}
      </div>
      {updating ? (
        <span className="mono" style={{ fontSize: 14, fontWeight: 700, color: 'var(--acc)', width: 52, textAlign: 'right' }}>
          {ota.percent}%
        </span>
      ) : sent && !done ? (
        <Spinner size={20} />
      ) : behind && !done ? (
        <button className={auto ? 'btn' : 'btn btn-acc'} disabled={busy || !d.online} onClick={run}>
          {busy ? <Spinner size={16} color="var(--acc-ink)" /> : <Icon name="download" size={16} color={auto ? 'var(--tx-soft)' : 'var(--acc-ink)'} />}
          Cập nhật ngay
        </button>
      ) : (
        <button className="btn" disabled>
          <Icon name="check" size={16} color="var(--green)" />
          Mới nhất
        </button>
      )}
    </div>
  );
}

export function UserOTA({ devices }: { devices: StudioDevice[] }) {
  const [auto, setAuto] = useState(true);
  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <div className="panel panel-pad" style={{ display: 'flex', alignItems: 'center', gap: 16, background: 'radial-gradient(120% 130% at 0% 0%, var(--acc-12), transparent 60%)' }}>
        <span style={{ width: 44, height: 44, borderRadius: 12, display: 'grid', placeItems: 'center', background: 'var(--acc-12)', flex: 'none' }}>
          <Icon name="download" size={22} color="var(--acc)" />
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 800 }}>Tự động cập nhật</div>
          <div style={{ fontSize: 12.5, color: 'var(--tx-mute)', marginTop: 3, lineHeight: 1.5 }}>
            Luni tự cài bản firmware mới tương thích khi <b style={{ color: 'var(--tx-soft)' }}>đang sạc & rảnh</b> — bạn không cần làm gì.
          </div>
        </div>
        <Toggle
          on={auto}
          onClick={() => {
            setAuto((a) => !a);
            luniToast(auto ? 'Đã tắt tự động cập nhật' : 'Đã bật tự động cập nhật', 'acc', auto ? 'close' : 'check');
          }}
        />
      </div>

      {devices.map((d) => (
        <DeviceOtaRow key={d.id} d={d} auto={auto} />
      ))}

      <div className="panel panel-pad" style={{ display: 'flex', alignItems: 'center', gap: 12, color: 'var(--tx-mute)', fontSize: 13 }}>
        <Icon name="info" size={17} color="var(--tx-faint)" />
        OTA 2 phân vùng — nếu mất điện giữa chừng robot tự quay về bản cũ, luôn an toàn.
      </div>
    </div>
  );
}
