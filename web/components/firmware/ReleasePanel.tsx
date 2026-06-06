/* ============================================================
   ReleasePanel — staged OTA rollout + adoption. There is no
   /admin/ota/rollout endpoint yet, so this panel is demo (local state)
   behind NEXT_PUBLIC_MOCK_OTA_ROLLOUT, with a visible marker.
   Ported from web-firmware.jsx.
   ============================================================ */
'use client';

import { useState } from 'react';
import { hexA2 } from '@/lib/format';
import { otaRollout } from '@/lib/api/admin';
import type { FirmwareBuild } from '@/lib/api/types';
import { CHANNEL } from '@/lib/mock/data';
import { Icon } from '@/components/brand/Icon';
import { Pill, Seg, Spinner, luniToast } from '@/components/base/ui';
import { DemoNote } from '@/components/user/parts';

const ELIGIBLE: Record<string, number> = { stable: 50, beta: 6 };

export function ReleasePanel({ firmwares, published }: { firmwares: FirmwareBuild[]; published: Record<string, string> }) {
  const [ch, setCh] = useState<'stable' | 'beta'>('stable');
  const [pct, setPct] = useState<Record<string, string>>({ stable: '100', beta: '50' });
  const [nudging, setNudging] = useState(false);

  const pub = firmwares.find((f) => f.id === published[ch]);
  const c = CHANNEL[ch].c;
  const elig = ELIGIBLE[ch];
  const rollPct = parseInt(pct[ch], 10);
  const opened = Math.round((elig * rollPct) / 100);
  const updated = pub ? Math.min(pub.installed, opened) : 0;
  const pending = Math.max(0, opened - updated);
  const held = elig - opened;

  const fwId = published[ch];
  const rollout = async () => {
    if (!fwId) {
      luniToast('Chưa có bản phát hành cho kênh này', 'amber', 'info');
      return;
    }
    setNudging(true);
    try {
      const r = await otaRollout(fwId, rollPct);
      luniToast(`Đã đẩy OTA v${r.version} → ${r.sent}/${r.targeted} thiết bị (${r.eligible} đủ điều kiện)`, 'green', 'download');
    } catch {
      luniToast('Đẩy OTA thất bại', 'red', 'alert');
    } finally {
      setNudging(false);
    }
  };

  return (
    <div className="panel" style={{ position: 'sticky', top: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 20px', borderBottom: '1px solid var(--hairline)' }}>
        <span style={{ width: 32, height: 32, borderRadius: 9, display: 'grid', placeItems: 'center', background: 'var(--acc-12)', flex: 'none' }}>
          <Icon name="globe" size={17} color="var(--acc)" />
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 700 }}>Phát hành tự động</div>
          <div style={{ fontSize: 12, color: 'var(--tx-faint)', marginTop: 2 }}>Thiết bị tự cập nhật qua /ota/check</div>
        </div>
        <DemoNote text="áp dụng: ước tính" />
      </div>
      <div className="panel-pad" style={{ display: 'grid', gap: 16 }}>
        <Seg
          options={[
            { id: 'stable', label: 'Stable' },
            { id: 'beta', label: 'Beta' },
          ]}
          value={ch}
          onChange={(v) => setCh(v as 'stable' | 'beta')}
          accent={c}
        />

        <div style={{ display: 'flex', alignItems: 'center', gap: 13, padding: 14, borderRadius: 13, background: hexA2(c, 0.08), border: `1px solid ${hexA2(c, 0.3)}` }}>
          <span style={{ width: 42, height: 42, borderRadius: 12, display: 'grid', placeItems: 'center', background: hexA2(c, 0.15), flex: 'none' }}>
            <Icon name="cpu" size={21} color={c} />
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="t-cap" style={{ margin: 0 }}>
              Bản hiện hành · kênh {ch}
            </div>
            <div className="mono" style={{ fontSize: 21, fontWeight: 700, marginTop: 2 }}>
              v{pub ? pub.version : '—'}
            </div>
          </div>
          <Pill tone={c} dot>
            {CHANNEL[ch].label}
          </Pill>
        </div>

        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 9 }}>
            <label className="field-label" style={{ margin: 0 }}>
              Mở rộng dần
            </label>
            <span className="mono" style={{ fontSize: 12, fontWeight: 700, color: c }}>
              {rollPct}% fleet
            </span>
          </div>
          <Seg
            options={[
              { id: '10', label: '10%' },
              { id: '25', label: '25%' },
              { id: '50', label: '50%' },
              { id: '100', label: '100%' },
            ]}
            value={pct[ch]}
            onChange={(v) => setPct((p) => ({ ...p, [ch]: v }))}
            accent={c}
          />
        </div>

        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 9 }}>
            <label className="field-label" style={{ margin: 0 }}>
              Đã áp dụng
            </label>
            <span className="mono" style={{ fontSize: 12, color: 'var(--tx-mute)' }}>
              {updated}/{elig} thiết bị
            </span>
          </div>
          <div className="progress" style={{ height: 9 }}>
            <i style={{ width: (updated / elig) * 100 + '%', background: c }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginTop: 11 }}>
            {(
              [
                ['Đã cập nhật', updated, '#7BE88E'],
                ['Đang chờ', pending, '#FFD166'],
                ['Chưa mở', held, '#5C6680'],
              ] as [string, number, string][]
            ).map(([l, n, cc]) => (
              <div key={l} style={{ padding: '9px 11px', borderRadius: 11, background: 'var(--bg-2)', border: '1px solid var(--hairline)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span className="cdot" style={{ background: cc }} />
                  <span className="mono" style={{ fontSize: 16, fontWeight: 700 }}>
                    {n}
                  </span>
                </div>
                <div style={{ fontSize: 10.5, color: 'var(--tx-faint)', marginTop: 3 }}>{l}</div>
              </div>
            ))}
          </div>
        </div>

        <button className="btn btn-acc" style={{ width: '100%', height: 44 }} disabled={!fwId || nudging} onClick={rollout}>
          {nudging ? <Spinner size={16} color="var(--acc-ink)" /> : <Icon name="download" size={16} color="var(--acc-ink)" />}
          Đẩy OTA · {rollPct}% kênh {ch}
        </button>
      </div>
    </div>
  );
}
