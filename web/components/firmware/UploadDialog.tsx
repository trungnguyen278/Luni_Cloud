/* ============================================================
   UploadDialog — POST /admin/firmware (multipart). Ported from
   web-firmware.jsx; wired to the real upload. The server computes
   sha256 + size; 409 (dup version) and 422 (empty/oversize/bad
   channel) are surfaced inline.
   ============================================================ */
'use client';

import { useRef, useState, type DragEvent } from 'react';
import { fmtSize } from '@/lib/format';
import { ApiError } from '@/lib/api/client';
import { uploadFirmware } from '@/lib/api/firmware';
import type { FirmwareBuild } from '@/lib/api/types';
import { CHANNEL } from '@/lib/mock/data';
import { hexA2 } from '@/lib/format';
import { Icon } from '@/components/brand/Icon';
import { Modal, Spinner, luniToast } from '@/components/base/ui';

const MAX = 16 * 1048576;

export function UploadDialog({ onClose, onDone }: { onClose: () => void; onDone: (fw: FirmwareBuild) => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [hot, setHot] = useState(false);
  const [version, setVersion] = useState('');
  const [model, setModel] = useState('Luni-C5');
  const [channel, setChannel] = useState<'stable' | 'beta'>('stable');
  const [changelog, setChangelog] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const pick = (f?: File) => {
    if (!f) return;
    if (!f.name.endsWith('.bin')) return setErr('Chỉ chấp nhận file .bin');
    if (f.size > MAX) return setErr('File vượt quá 16 MB');
    setErr('');
    setFile(f);
  };
  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setHot(false);
    pick(e.dataTransfer.files[0]);
  };

  const submit = async () => {
    setErr('');
    if (!file) return setErr('Chọn file firmware .bin');
    if (!/^\d+\.\d+\.\d+$/.test(version)) return setErr('Phiên bản phải theo dạng semver, vd 2.2.0');
    setBusy(true);
    try {
      const fw = await uploadFirmware({ file, version, model, channel, changelog });
      onDone(fw);
      luniToast('Đã tải lên v' + version, 'green', 'check');
      onClose();
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) setErr('Phiên bản đã tồn tại cho model này (409).');
      else if (e instanceof ApiError && e.status === 422) setErr(e.detail || 'File không hợp lệ (422).');
      else setErr(e instanceof ApiError ? e.detail : 'Tải lên thất bại.');
      setBusy(false);
    }
  };

  return (
    <Modal title="Tải lên firmware" sub="POST /admin/firmware · multipart/form-data" icon="download" onClose={busy ? () => {} : onClose} width={560}>
      <div className="scrolly" style={{ padding: 22, maxHeight: '72vh' }}>
        <div
          className={'dropzone' + (hot ? ' hot' : '')}
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setHot(true);
          }}
          onDragLeave={() => setHot(false)}
          onDrop={onDrop}
          style={{ padding: file ? '18px 20px' : '34px 20px', textAlign: 'center', marginBottom: 18 }}
        >
          <input ref={inputRef} type="file" accept=".bin" style={{ display: 'none' }} onChange={(e) => pick(e.target.files?.[0])} />
          {file ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 13, textAlign: 'left' }}>
              <span style={{ width: 44, height: 44, borderRadius: 12, display: 'grid', placeItems: 'center', background: 'var(--acc-12)', flex: 'none' }}>
                <Icon name="chip" size={22} color="var(--acc)" />
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="mono" style={{ fontSize: 13.5, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {file.name}
                </div>
                <div className="mono" style={{ fontSize: 12, color: 'var(--tx-faint)', marginTop: 2 }}>
                  {fmtSize(file.size)}
                </div>
              </div>
              {!busy && (
                <button
                  className="btn btn-sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    setFile(null);
                  }}
                >
                  Đổi
                </button>
              )}
            </div>
          ) : (
            <>
              <span style={{ width: 50, height: 50, borderRadius: 14, display: 'inline-grid', placeItems: 'center', background: 'var(--bg-1)', marginBottom: 12 }}>
                <Icon name="download" size={24} color="var(--acc)" />
              </span>
              <div style={{ fontSize: 14, fontWeight: 700 }}>
                Kéo-thả file <span className="mono">.bin</span> vào đây
              </div>
              <div style={{ fontSize: 12.5, color: 'var(--tx-faint)', marginTop: 4 }}>hoặc bấm để chọn · tối đa 16 MB</div>
            </>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
          <div>
            <label className="field-label">
              Phiên bản <span style={{ color: 'var(--red)' }}>*</span>
            </label>
            <input className="winput mono" value={version} onChange={(e) => setVersion(e.target.value)} placeholder="2.2.0" disabled={busy} />
          </div>
          <div>
            <label className="field-label">
              Model <span style={{ color: 'var(--red)' }}>*</span>
            </label>
            <select className="wselect" value={model} onChange={(e) => setModel(e.target.value)} disabled={busy}>
              <option>Luni-C5</option>
              <option>Luni-C3</option>
            </select>
          </div>
        </div>
        <div style={{ marginBottom: 14 }}>
          <label className="field-label">
            Kênh phát hành <span style={{ color: 'var(--red)' }}>*</span>
          </label>
          <div style={{ display: 'flex', gap: 10 }}>
            {(Object.entries(CHANNEL) as [string, { c: string; label: string }][]).map(([k, v]) => (
              <button
                key={k}
                className="press"
                onClick={() => setChannel(k as 'stable' | 'beta')}
                disabled={busy}
                style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderRadius: 12, background: channel === k ? hexA2(v.c, 0.12) : 'var(--bg-2)', border: `1.5px solid ${channel === k ? hexA2(v.c, 0.4) : 'var(--hairline)'}` }}
              >
                <span className="cdot" style={{ background: v.c, boxShadow: `0 0 7px ${hexA2(v.c, 0.7)}` }} />
                <span style={{ textAlign: 'left' }}>
                  <span style={{ display: 'block', fontSize: 13, fontWeight: 700, color: channel === k ? v.c : 'var(--tx-soft)' }}>{v.label}</span>
                  <span style={{ fontSize: 10.5, color: 'var(--tx-faint)' }}>{k === 'stable' ? 'Phát hành rộng' : 'Thử nghiệm'}</span>
                </span>
              </button>
            ))}
          </div>
        </div>
        <div style={{ marginBottom: 8 }}>
          <label className="field-label">Changelog</label>
          <textarea className="wtextarea" rows={3} value={changelog} onChange={(e) => setChangelog(e.target.value)} placeholder="Mô tả thay đổi…" disabled={busy} />
        </div>
        {err && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: 'var(--red)', marginTop: 6 }}>
            <Icon name="alert" size={15} color="var(--red)" />
            {err}
          </div>
        )}
      </div>
      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', padding: '14px 22px', borderTop: '1px solid var(--hairline)' }}>
        <button className="btn" onClick={onClose} disabled={busy}>
          Huỷ
        </button>
        <button className="btn btn-acc" onClick={submit} disabled={busy}>
          {busy ? (
            <>
              <Spinner size={16} color="var(--acc-ink)" />
              Đang tải lên…
            </>
          ) : (
            <>
              <Icon name="download" size={16} color="var(--acc-ink)" />
              Tải lên
            </>
          )}
        </button>
      </div>
    </Modal>
  );
}
