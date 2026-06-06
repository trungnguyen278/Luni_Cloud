/* ============================================================
   web-firmware.jsx — ADMIN focus: firmware table + upload dialog
   + OTA rollout with realtime (simulated) ota_progress.
   POST /admin/firmware · DELETE /admin/firmware/{id} · POST /devices/{id}/ota
   ============================================================ */

function AdminFirmware() {
  const [list, setList] = useS(FIRMWARE);
  const [showUp, setShowUp] = useS(false);
  const [confirmDel, setConfirmDel] = useS(null);
  const [publishFw, setPublishFw] = useS(null);
  // published = bản đang phát hành cho mỗi kênh (thiết bị tự lấy bản này khi /ota/check)
  const [published, setPublished] = useS({ stable: 'fw_2100', beta: 'fw_2200' });

  const addFw = (fw) => setList(l => [fw, ...l]);
  const del = (id) => { setList(l => l.filter(f => f.id !== id)); setConfirmDel(null); luniToast('Đã xoá firmware (kèm binary)', 'red', 'trash'); };
  const publish = (f) => { setPublished(p => ({ ...p, [f.channel]: f.id })); luniToast(`Đã phát hành v${f.version} · kênh ${f.channel} — thiết bị sẽ tự cập nhật`, 'green', 'check'); };

  return (
    <>
      <PageHead title="Firmware (OTA)" sub="Xuất bản bản nạp — robot tự cập nhật khi tới phiên">
        <button className="btn btn-acc" onClick={() => setShowUp(true)}><Icon name="plus" size={16} color="var(--acc-ink)" />Tải lên firmware</button>
      </PageHead>

      {/* how it works banner */}
      <div className="panel" style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '13px 18px', marginBottom: 18, background: 'radial-gradient(120% 130% at 0% 0%, var(--acc-12), transparent 60%)' }}>
        <span style={{ width: 36, height: 36, borderRadius: 10, display: 'grid', placeItems: 'center', background: 'var(--acc-12)', flex: 'none' }}><Icon name="info" size={18} color="var(--acc)" /></span>
        <p style={{ flex: 1, fontSize: 13, color: 'var(--tx-soft)', lineHeight: 1.55, margin: 0 }}>Bạn chỉ <b style={{ color: 'var(--tx)' }}>xuất bản</b> firmware lên kênh (như đẩy bản mới lên Google Play). Mỗi robot tự gọi <span className="mono" style={{ color: 'var(--acc)' }}>/ota/check</span>, thấy bản mới tương thích model + kênh của mình thì <b style={{ color: 'var(--tx)' }}>tự tải & cài</b> khi đang sạc và rảnh — không cần đẩy thủ công.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.55fr 1fr', gap: 18, alignItems: 'start' }}>
        {/* (A) firmware table */}
        <div className="panel" style={{ overflow: 'hidden' }}>
          <PanelHead icon="chip" title="Kho firmware" sub={`${list.length} bản · R2 + đĩa`} />
          <table className="wtable">
            <thead><tr><th>Phiên bản</th><th>Model</th><th>Kênh</th><th>Kích thước</th><th>Trạng thái</th><th></th></tr></thead>
            <tbody>
              {list.map(f => {
                const ch = CHANNEL[f.channel];
                const isLive = published[f.channel] === f.id;
                return (
                  <tr key={f.id}>
                    <td><div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><span style={{ width: 32, height: 32, borderRadius: 9, display: 'grid', placeItems: 'center', background: isLive ? hexA2(ch.c, .14) : 'var(--bg-2)', flex: 'none' }}><Icon name="cpu" size={16} color={isLive ? ch.c : 'var(--tx-mute)'} /></span><div><div className="mono" style={{ fontWeight: 700, color: 'var(--tx)' }}>v{f.version}</div><div className="mono" style={{ fontSize: 10.5, color: 'var(--tx-faint)' }}>{f.installed} đã cài</div></div></div></td>
                    <td className="mono" style={{ fontSize: 12.5 }}>{f.model}</td>
                    <td><Pill tone={ch.c} dot>{ch.label}</Pill></td>
                    <td className="mono" style={{ fontSize: 12.5 }}>{fmtSize(f.size)}</td>
                    <td>{isLive ? <Pill tone="#7BE88E" dot>Đang phát hành</Pill> : <span style={{ fontSize: 12, color: 'var(--tx-faint)' }}>Bản cũ</span>}</td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: 6 }}>
                        {!isLive && <button className="btn btn-sm" onClick={() => setPublishFw(f)}><Icon name="download" size={13} color="var(--acc)" />Phát hành</button>}
                        <button className="btn btn-sm btn-danger" onClick={() => setConfirmDel(f)} title="Xoá" disabled={isLive}><Icon name="trash" size={14} color={isLive ? 'var(--tx-faint)' : 'var(--red)'} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* (B) release & adoption */}
        <ReleasePanel firmwares={list} published={published} />
      </div>

      {showUp && <UploadDialog onClose={() => setShowUp(false)} onDone={addFw} existing={list} />}
      {publishFw && <Confirm icon="download" title={`Phát hành v${publishFw.version}?`} sub={`Kênh ${publishFw.channel} · ${publishFw.model}`} cta="Phát hành" body={`Đặt v${publishFw.version} làm bản hiện hành cho kênh ${publishFw.channel}. Mọi robot ${publishFw.model} trên kênh này sẽ tự cập nhật ở lần check-in tới (khi đang sạc & rảnh).`} onClose={() => setPublishFw(null)} onOk={() => publish(publishFw)} />}
      {confirmDel && (
        <Modal title="Xoá firmware?" sub={`v${confirmDel.version} · ${confirmDel.model}`} icon="trash" onClose={() => setConfirmDel(null)} width={420}>
          <div style={{ padding: 20 }}>
            <p style={{ fontSize: 13.5, color: 'var(--tx-soft)', lineHeight: 1.6, margin: '0 0 18px' }}>Thao tác này xoá cả bản ghi và file binary trên R2. Không hoàn tác được. {confirmDel.installed > 0 && <span style={{ color: 'var(--warm)' }}>{confirmDel.installed} thiết bị đang chạy bản này.</span>}</p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button className="btn" onClick={() => setConfirmDel(null)}>Huỷ</button>
              <button className="btn btn-danger" style={{ background: 'rgba(255,91,110,.12)', borderColor: 'rgba(255,91,110,.32)' }} onClick={() => del(confirmDel.id)}><Icon name="trash" size={15} color="var(--red)" />Xoá vĩnh viễn</button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}

/* ---------------- upload dialog ---------------- */
function UploadDialog({ onClose, onDone, existing }) {
  const [file, setFile] = useS(null);
  const [hot, setHot] = useS(false);
  const [version, setVersion] = useS('');
  const [model, setModel] = useS('Luni-C5');
  const [channel, setChannel] = useS('stable');
  const [changelog, setChangelog] = useS('');
  const [busy, setBusy] = useS(false);
  const [prog, setProg] = useS(0);
  const [err, setErr] = useS('');
  const inputRef = useR(null);

  const pick = (f) => {
    if (!f) return;
    if (!f.name.endsWith('.bin')) { setErr('Chỉ chấp nhận file .bin'); return; }
    if (f.size > 16 * 1048576) { setErr('File vượt quá 16 MB'); return; }
    setErr(''); setFile(f);
  };
  const onDrop = (e) => { e.preventDefault(); setHot(false); pick(e.dataTransfer.files[0]); };

  const fakeSha = () => Array.from({ length: 48 }, () => '0123456789abcdef'[Math.floor(Math.random() * 16)]).join('');

  const submit = () => {
    setErr('');
    if (!file) { setErr('Chọn file firmware .bin'); return; }
    if (!/^\d+\.\d+\.\d+$/.test(version)) { setErr('Phiên bản phải theo dạng semver, vd 2.2.0'); return; }
    if (existing.some(f => f.version === version && f.model === model)) { setErr('Phiên bản đã tồn tại cho model này (409)'); return; }
    setBusy(true); setProg(0);
    let p = 0;
    const t = setInterval(() => {
      p += Math.random() * 18 + 8;
      if (p >= 100) {
        p = 100; clearInterval(t);
        const fw = { id: 'fw_' + Date.now(), version, model, channel, size: file.size, sha256: fakeSha(), changelog: changelog || '—', is_active: true, installed: 0, created_at: 'vừa xong' };
        setTimeout(() => { onDone(fw); luniToast('Đã tải lên v' + version, 'green', 'check'); onClose(); }, 500);
      }
      setProg(Math.min(100, Math.round(p)));
    }, 220);
  };

  return (
    <Modal title="Tải lên firmware" sub="POST /admin/firmware · multipart/form-data" icon="download" onClose={busy ? () => {} : onClose} width={560}>
      <div className="scrolly" style={{ padding: 22, maxHeight: '72vh' }}>
        {/* dropzone */}
        <div className={'dropzone' + (hot ? ' hot' : '')} onClick={() => inputRef.current.click()}
          onDragOver={e => { e.preventDefault(); setHot(true); }} onDragLeave={() => setHot(false)} onDrop={onDrop}
          style={{ padding: file ? '18px 20px' : '34px 20px', textAlign: 'center', marginBottom: 18 }}>
          <input ref={inputRef} type="file" accept=".bin" style={{ display: 'none' }} onChange={e => pick(e.target.files[0])} />
          {file ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 13, textAlign: 'left' }}>
              <span style={{ width: 44, height: 44, borderRadius: 12, display: 'grid', placeItems: 'center', background: 'var(--acc-12)', flex: 'none' }}><Icon name="chip" size={22} color="var(--acc)" /></span>
              <div style={{ flex: 1, minWidth: 0 }}><div className="mono" style={{ fontSize: 13.5, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{file.name}</div><div className="mono" style={{ fontSize: 12, color: 'var(--tx-faint)', marginTop: 2 }}>{fmtSize(file.size)}</div></div>
              {!busy && <button className="btn btn-sm" onClick={e => { e.stopPropagation(); setFile(null); }}>Đổi</button>}
            </div>
          ) : (
            <>
              <span style={{ width: 50, height: 50, borderRadius: 14, display: 'inline-grid', placeItems: 'center', background: 'var(--bg-1)', marginBottom: 12 }}><Icon name="download" size={24} color="var(--acc)" /></span>
              <div style={{ fontSize: 14, fontWeight: 700 }}>Kéo-thả file <span className="mono">.bin</span> vào đây</div>
              <div style={{ fontSize: 12.5, color: 'var(--tx-faint)', marginTop: 4 }}>hoặc bấm để chọn · tối đa 16 MB</div>
            </>
          )}
        </div>

        {busy && <div className="progress" style={{ marginBottom: 18 }}><i style={{ width: prog + '%' }} /></div>}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
          <div><label className="field-label">Phiên bản <span style={{ color: 'var(--red)' }}>*</span></label><input className="winput mono" value={version} onChange={e => setVersion(e.target.value)} placeholder="2.2.0" disabled={busy} /></div>
          <div><label className="field-label">Model <span style={{ color: 'var(--red)' }}>*</span></label>
            <select className="wselect" value={model} onChange={e => setModel(e.target.value)} disabled={busy}><option>Luni-C5</option><option>Luni-C3</option></select>
          </div>
        </div>
        <div style={{ marginBottom: 14 }}>
          <label className="field-label">Kênh phát hành <span style={{ color: 'var(--red)' }}>*</span></label>
          <div style={{ display: 'flex', gap: 10 }}>
            {Object.entries(CHANNEL).map(([k, v]) => (
              <button key={k} className="press" onClick={() => setChannel(k)} disabled={busy} style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderRadius: 12, background: channel === k ? hexA2(v.c, .12) : 'var(--bg-2)', border: `1.5px solid ${channel === k ? hexA2(v.c, .4) : 'var(--hairline)'}` }}>
                <span className="cdot" style={{ background: v.c, boxShadow: `0 0 7px ${hexA2(v.c, .7)}` }} />
                <span style={{ textAlign: 'left' }}><span style={{ display: 'block', fontSize: 13, fontWeight: 700, color: channel === k ? v.c : 'var(--tx-soft)' }}>{v.label}</span><span style={{ fontSize: 10.5, color: 'var(--tx-faint)' }}>{k === 'stable' ? 'Phát hành rộng' : 'Thử nghiệm'}</span></span>
              </button>
            ))}
          </div>
        </div>
        <div style={{ marginBottom: 8 }}><label className="field-label">Changelog</label><textarea className="wtextarea" rows={3} value={changelog} onChange={e => setChangelog(e.target.value)} placeholder="Mô tả thay đổi…" disabled={busy} /></div>
        {err && <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: 'var(--red)', marginTop: 6 }}><Icon name="alert" size={15} color="var(--red)" />{err}</div>}
      </div>
      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', padding: '14px 22px', borderTop: '1px solid var(--hairline)' }}>
        <button className="btn" onClick={onClose} disabled={busy}>Huỷ</button>
        <button className="btn btn-acc" onClick={submit} disabled={busy}>{busy ? <><Spinner size={16} color="var(--acc-ink)" />Đang tải {prog}%</> : <><Icon name="download" size={16} color="var(--acc-ink)" />Tải lên</>}</button>
      </div>
    </Modal>
  );
}

/* ---------------- release & auto-adoption ---------------- */
const ELIGIBLE = { stable: 50, beta: 6 };   // robot đủ điều kiện mỗi kênh (demo)

function ReleasePanel({ firmwares, published }) {
  const [ch, setCh] = useS('stable');
  const [pct, setPct] = useS({ stable: 100, beta: 50 });
  const [nudging, setNudging] = useS(false);

  const pub = firmwares.find(f => f.id === published[ch]);
  const c = CHANNEL[ch].c;
  const elig = ELIGIBLE[ch];
  const rollPct = pct[ch];
  const opened = Math.round(elig * rollPct / 100);
  const updated = pub ? Math.min(pub.installed, opened) : 0;
  const pending = Math.max(0, opened - updated);
  const held = elig - opened;

  const nudge = () => { if (!pending) return; setNudging(true); luniToast(`Đã nhắc ${pending} thiết bị gọi /ota/check ngay`, 'acc', 'refresh'); setTimeout(() => setNudging(false), 1400); };

  return (
    <div className="panel" style={{ position: 'sticky', top: 0 }}>
      <PanelHead icon="globe" title="Phát hành tự động" sub="Thiết bị tự cập nhật qua /ota/check" />
      <div className="panel-pad" style={{ display: 'grid', gap: 16 }}>
        <Seg options={[{ id: 'stable', label: 'Stable' }, { id: 'beta', label: 'Beta' }]} value={ch} onChange={setCh} accent={c} />

        {/* current published version */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 13, padding: 14, borderRadius: 13, background: hexA2(c, .08), border: `1px solid ${hexA2(c, .3)}` }}>
          <span style={{ width: 42, height: 42, borderRadius: 12, display: 'grid', placeItems: 'center', background: hexA2(c, .15), flex: 'none' }}><Icon name="cpu" size={21} color={c} /></span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="t-cap" style={{ margin: 0 }}>Bản hiện hành · kênh {ch}</div>
            <div className="mono" style={{ fontSize: 21, fontWeight: 700, marginTop: 2 }}>v{pub ? pub.version : '—'}</div>
          </div>
          <Pill tone={c} dot>{CHANNEL[ch].label}</Pill>
        </div>

        {/* staged rollout */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 9 }}>
            <label className="field-label" style={{ margin: 0 }}>Mở rộng dần</label>
            <span className="mono" style={{ fontSize: 12, fontWeight: 700, color: c }}>{rollPct}% fleet</span>
          </div>
          <Seg options={[{ id: 10, label: '10%' }, { id: 25, label: '25%' }, { id: 50, label: '50%' }, { id: 100, label: '100%' }]} value={rollPct} onChange={v => setPct(p => ({ ...p, [ch]: v }))} accent={c} />
        </div>

        {/* adoption */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 9 }}>
            <label className="field-label" style={{ margin: 0 }}>Đã áp dụng</label>
            <span className="mono" style={{ fontSize: 12, color: 'var(--tx-mute)' }}>{updated}/{elig} thiết bị</span>
          </div>
          <div className="progress" style={{ height: 9 }}><i style={{ width: (updated / elig * 100) + '%', background: c }} /></div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginTop: 11 }}>
            {[['Đã cập nhật', updated, '#7BE88E'], ['Đang chờ', pending, '#FFD166'], ['Chưa mở', held, '#5C6680']].map(([l, n, cc]) => (
              <div key={l} style={{ padding: '9px 11px', borderRadius: 11, background: 'var(--bg-2)', border: '1px solid var(--hairline)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span className="cdot" style={{ background: cc }} /><span className="mono" style={{ fontSize: 16, fontWeight: 700 }}>{n}</span></div>
                <div style={{ fontSize: 10.5, color: 'var(--tx-faint)', marginTop: 3 }}>{l}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 9, padding: '11px 13px', borderRadius: 12, background: 'var(--bg-2)', border: '1px solid var(--hairline)' }}>
          <Icon name="info" size={15} color="var(--tx-faint)" style={{ flexShrink: 0, marginTop: 1 }} />
          <span style={{ fontSize: 11.5, color: 'var(--tx-mute)', lineHeight: 1.5 }}>Robot tự tải & cài khi <b style={{ color: 'var(--tx-soft)' }}>đang sạc và rảnh</b>. Bản nhỏ giọt cho {rollPct}% trước để theo dõi an toàn.</span>
        </div>

        <button className="btn" style={{ width: '100%', height: 44 }} disabled={!pending || nudging} onClick={nudge}>
          {nudging ? <Spinner size={16} /> : <Icon name="refresh" size={16} color={pending ? 'var(--acc)' : 'var(--tx-faint)'} />}
          {pending ? `Nhắc ${pending} thiết bị kiểm tra ngay` : 'Tất cả đã cập nhật'}
        </button>
      </div>
    </div>
  );
}

Object.assign(window, { AdminFirmware, UploadDialog, ReleasePanel });
