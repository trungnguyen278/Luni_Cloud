/* ============================================================
   web-cost.jsx — ADMIN role: "Chi phí AI". Tracks the AI pipeline
   spend across the whole fleet — Luni listens (STT), thinks (LLM),
   and speaks (TTS), so every conversation burns tokens. This page
   makes that cost legible: by day, by service, by model, by device.
   Currency: VND (₫). Figures mirror a ~50-device fleet, tháng 5/2026.
   ============================================================ */

/* ---- format đồng compactly: 14_280_000 → "14,28Tr ₫" ---- */
function fmtVnd(n, sym = true) {
  const s = sym ? ' ₫' : '';
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(2).replace('.', ',') + 'Tr' + s;
  if (n >= 1_000) return Math.round(n / 1_000) + 'K' + s;
  return Math.round(n) + s;
}
function fmtNum(n) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace('.', ',') + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace('.', ',') + 'K';
  return String(n);
}

/* ---- the AI pipeline: every turn = listen → think → speak (+ remember) ---- */
const AI_SERVICES = [
  { id: 'llm',  label: 'Trò chuyện (LLM)',     icon: 'chat',    c: '#5BE9FF', cost: 8_280_000, share: 58, note: 'Sinh câu trả lời, tính cách Luni' },
  { id: 'stt',  label: 'Nhận giọng nói (STT)', icon: 'mic',     c: '#76B8FF', cost: 3_140_000, share: 22, note: 'Chuyển lời nói của bé thành văn bản' },
  { id: 'tts',  label: 'Giọng nói Luni (TTS)', icon: 'volume',  c: '#FFD166', cost: 2_000_000, share: 14, note: 'Đọc câu trả lời bằng giọng thân thiện' },
  { id: 'mem',  label: 'Trí nhớ (Embeddings)', icon: 'sparkle', c: '#B48CFF', cost:   860_000, share:  6, note: 'Ghi nhớ sở thích & ngữ cảnh lâu dài' },
];

/* ---- by model — the actual API line items ---- */
const AI_MODELS = [
  { model: 'gpt-4o-mini',            kind: 'Chat',       svc: '#5BE9FF', reqs: 38_400, unit: '41,2M tokens', price: 'in 5K₫ · out 20K₫ / 1M', cost: 8_280_000 },
  { model: 'whisper-1',              kind: 'STT',        svc: '#76B8FF', reqs: 38_400, unit: '6.240 phút',    price: '146₫ / phút',           cost: 3_140_000 },
  { model: 'tts-1',                  kind: 'TTS',        svc: '#FFD166', reqs: 36_100, unit: '4,8M ký tự',    price: '366₫ / 1K ký tự',       cost: 2_000_000 },
  { model: 'text-embedding-3-small', kind: 'Embeddings', svc: '#B48CFF', reqs: 12_200, unit: '9,6M tokens',   price: '0,5K₫ / 1M',            cost:   860_000 },
];

/* ---- daily spend, last 7 days (nghìn ₫) ---- */
const COST_7D = [398, 472, 451, 560, 528, 642, 705];
const COST_30D = [330, 360, 345, 410, 388, 455, 470, 442, 505, 488, 530, 512, 575,
                  548, 602, 588, 540, 610, 595, 560, 648, 622, 590, 660, 638, 612,
                  680, 665, 642, 705];
const COST_LABELS_7 = STAT_LABELS;            // T2..CN (from web-data)

/* ---- top devices by spend (đ this month) ---- */
const COST_DEVICES = [
  { name: 'Luni #0142', owner: 'Nguyễn Mai',  city: 'Hà Nội',      emotion: 'happy',   conv: 1842, cost: 642_000 },
  { name: 'Luni #0533', owner: 'Đỗ Quân',     city: 'Huế',         emotion: 'happy',   conv: 1688, cost: 588_000 },
  { name: 'Luni #0098', owner: 'Trần Hùng',   city: 'Hồ Chí Minh', emotion: 'sleepy',  conv: 1495, cost: 521_000 },
  { name: 'Luni #0420', owner: 'Võ Linh',     city: 'Cần Thơ',     emotion: 'calm',    conv: 1430, cost: 498_000 },
  { name: 'Luni #0311', owner: 'Phạm Đức',    city: 'Hải Phòng',   emotion: 'curious', conv: 1276, cost: 445_000 },
];

const COST_TOTAL = 14_280_000;     // tháng này tới nay
const COST_BUDGET = 25_000_000;    // ngân sách tháng
const COST_PROJECTED = 19_400_000; // dự kiến cuối tháng
const COST_TOKENS = 52_400_000;    // tổng tokens
const COST_CONV = 38_400;          // số hội thoại
const COST_PER_CONV = Math.round(COST_TOTAL / COST_CONV); // ≈372₫

/* ---------------- Budget ring ---------------- */
function BudgetRing({ used, budget, projected }) {
  const pct = Math.min(100, Math.round((used / budget) * 100));
  const projPct = Math.min(100, Math.round((projected / budget) * 100));
  const R = 58, C = 2 * Math.PI * R;
  const over = projected > budget;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
      <div style={{ position: 'relative', width: 148, height: 148, flex: 'none' }}>
        <svg width="148" height="148" viewBox="0 0 148 148" style={{ transform: 'rotate(-90deg)' }}>
          <circle cx="74" cy="74" r={R} fill="none" stroke="var(--bg-3)" strokeWidth="11" />
          {/* projected (faint) */}
          <circle cx="74" cy="74" r={R} fill="none" stroke={over ? 'var(--red)' : 'var(--acc)'} strokeOpacity="0.25" strokeWidth="11" strokeLinecap="round"
            strokeDasharray={C} strokeDashoffset={C - (projPct / 100) * C} />
          {/* used (solid) */}
          <circle cx="74" cy="74" r={R} fill="none" stroke="var(--acc)" strokeWidth="11" strokeLinecap="round"
            strokeDasharray={C} strokeDashoffset={C} style={{ ['--dash-end']: C - (pct / 100) * C, animation: 'ringDraw 1s var(--ease) forwards' }} />
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', textAlign: 'center' }}>
          <div>
            <div style={{ fontSize: 27, fontWeight: 800, letterSpacing: '-.03em', lineHeight: 1 }}>{pct}%</div>
            <div style={{ fontSize: 10.5, color: 'var(--tx-faint)', marginTop: 3, fontWeight: 600 }}>đã dùng</div>
          </div>
        </div>
      </div>
      <div style={{ flex: 1, minWidth: 0, display: 'grid', gap: 12 }}>
        {[['Đã dùng', fmtVnd(used), 'var(--acc)', true],
          ['Ngân sách tháng', fmtVnd(budget), 'var(--tx-soft)', false],
          ['Dự kiến cuối tháng', fmtVnd(projected), over ? 'var(--red)' : 'var(--green)', false]].map(([l, v, c, dot]) => (
          <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            {dot ? <span className="cdot" style={{ background: c, boxShadow: `0 0 7px ${c}` }} /> : <span style={{ width: 7, flex: 'none' }} />}
            <span style={{ fontSize: 12.5, color: 'var(--tx-mute)', flex: 1 }}>{l}</span>
            <span className="mono" style={{ fontSize: 13.5, fontWeight: 700, color: c }}>{v}</span>
          </div>
        ))}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 11px', borderRadius: 11, background: over ? 'rgba(255,91,110,.1)' : 'rgba(123,232,142,.1)', border: `1px solid ${over ? 'rgba(255,91,110,.28)' : 'rgba(123,232,142,.28)'}` }}>
          <Icon name={over ? 'alert' : 'check'} size={15} color={over ? 'var(--red)' : 'var(--green)'} />
          <span style={{ fontSize: 12, color: 'var(--tx-soft)', fontWeight: 600 }}>{over ? 'Dự kiến vượt ngân sách' : 'Trong ngân sách tháng'}</span>
        </div>
      </div>
    </div>
  );
}

/* ---------------- the dashboard ---------------- */
function CostDashboard() {
  const [period, setPeriod] = useS('7d');
  const [exp, setExp] = useS(false);
  const data = period === '30d' ? COST_30D : COST_7D;
  const labels = period === '30d' ? COST_30D.map((_, i) => (i % 5 === 0 ? String(i + 1) : '')) : COST_LABELS_7;
  const avg = Math.round(data.reduce((a, b) => a + b, 0) / data.length);

  return (
    <>
      <PageHead title="Chi phí AI" sub="Mỗi câu trò chuyện đều tốn token — đây là toàn cảnh chi phí mô hình AI · tháng 5/2026">
        <Seg options={[{ id: '7d', label: '7 ngày' }, { id: '30d', label: '30 ngày' }]} value={period} onChange={setPeriod} />
        <button className="btn" onClick={() => setExp(true)}><Icon name="download" size={16} color="var(--tx-mute)" />Xuất hoá đơn</button>
      </PageHead>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 18 }}>
        <KPI icon="bolt" label="Chi phí tháng này" value={fmtVnd(COST_TOTAL, false) + '₫'} sub={`/ ${fmtVnd(COST_BUDGET, false)}₫ ngân sách`} tone="var(--acc)" trend={11} />
        <KPI icon="chip" label="Tokens đã dùng" value={fmtNum(COST_TOKENS)} sub={`${fmtNum(COST_CONV)} hội thoại`} tone="#76B8FF" trend={8} />
        <KPI icon="chat" label="Chi phí / hội thoại" value={COST_PER_CONV + '₫'} sub="trung bình mỗi lượt" tone="#7BE88E" trend={-4} />
        <KPI icon="chart" label="Dự kiến cuối tháng" value={fmtVnd(COST_PROJECTED, false) + '₫'} sub="theo nhịp hiện tại" tone="#FFD166" />
      </div>

      {/* daily spend + budget */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 18, alignItems: 'start' }}>
        <div className="panel">
          <PanelHead icon="chart" title="Chi phí theo ngày" sub={`Đơn vị: nghìn ₫ · trung bình ${avg}K₫/ngày`}
            right={<Pill tone="var(--acc)" dot>cao nhất {Math.max(...data)}K₫</Pill>} />
          <div className="panel-pad"><BarChart data={data} labels={labels} accent="var(--acc)" height={186} unit="K" /></div>
        </div>
        <div className="panel">
          <PanelHead icon="bolt" title="Ngân sách" sub="Tháng 5/2026" />
          <div className="panel-pad"><BudgetRing used={COST_TOTAL} budget={COST_BUDGET} projected={COST_PROJECTED} /></div>
        </div>
      </div>

      {/* service split + top devices */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18, marginTop: 18, alignItems: 'start' }}>
        <div className="panel">
          <PanelHead icon="sliders" title="Chi phí theo dịch vụ" sub="Lắng nghe → suy nghĩ → cất lời" />
          <div className="panel-pad" style={{ display: 'grid', gap: 14 }}>
            {AI_SERVICES.map(s => (
              <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 13 }}>
                <span style={{ width: 38, height: 38, borderRadius: 11, display: 'grid', placeItems: 'center', background: hexA2(s.c, .14), flex: 'none' }}><Icon name={s.icon} size={18} color={s.c} /></span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                    <span style={{ fontSize: 13.5, fontWeight: 700 }}>{s.label}</span>
                    <span className="mono" style={{ fontSize: 13, fontWeight: 700, color: s.c }}>{fmtVnd(s.cost)}</span>
                  </div>
                  <div style={{ height: 7, borderRadius: 99, background: 'var(--bg-2)', overflow: 'hidden', margin: '7px 0 4px' }}>
                    <div style={{ width: s.share + '%', height: '100%', borderRadius: 99, background: s.c, boxShadow: `0 0 10px ${hexA2(s.c, .5)}`, animation: 'barGrow .6s var(--spring) both', transformOrigin: 'left' }} />
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--tx-faint)' }}>{s.share}% · {s.note}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="panel" style={{ overflow: 'hidden' }}>
          <PanelHead icon="cpu" title="Thiết bị tốn nhiều nhất" sub="Top 5 theo chi phí AI tháng này"
            right={<span className="mono" style={{ fontSize: 11, color: 'var(--tx-faint)' }}>{COST_DEVICES.length} / {FLEET.length}</span>} />
          <div style={{ padding: 8 }}>
            {COST_DEVICES.map((d, i) => {
              const max = COST_DEVICES[0].cost;
              return (
                <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 12 }}>
                  <span className="mono" style={{ fontSize: 12, fontWeight: 700, color: 'var(--tx-faint)', width: 16, flex: 'none' }}>{i + 1}</span>
                  <span style={{ width: 34, height: 34, borderRadius: 9, display: 'grid', placeItems: 'center', background: 'var(--bg-2)', flex: 'none' }}><LuniFace emotion={d.emotion} size={26} state="idle" noPhase /></span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--tx)' }}>{d.name} <span style={{ fontWeight: 400, color: 'var(--tx-faint)' }}>· {d.owner}</span></div>
                    <div style={{ height: 5, borderRadius: 99, background: 'var(--bg-2)', overflow: 'hidden', marginTop: 6 }}>
                      <div style={{ width: (d.cost / max) * 100 + '%', height: '100%', borderRadius: 99, background: 'var(--acc)', animation: 'barGrow .6s var(--spring) both', transformOrigin: 'left' }} />
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flex: 'none' }}>
                    <div className="mono" style={{ fontSize: 13, fontWeight: 700 }}>{fmtVnd(d.cost)}</div>
                    <div style={{ fontSize: 10.5, color: 'var(--tx-faint)', marginTop: 1 }}>{fmtNum(d.conv)} lượt</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* by model table */}
      <div className="panel" style={{ overflow: 'hidden', marginTop: 18 }}>
        <PanelHead icon="chip" title="Chi phí theo mô hình" sub="Từng dòng API · GET /admin/ai/usage"
          right={<button className="btn btn-sm" onClick={() => luniToast('Mở bảng giá nhà cung cấp AI', 'acc', 'link')}><Icon name="link" size={14} color="var(--tx-mute)" />Bảng giá</button>} />
        <table className="wtable">
          <thead><tr><th>Mô hình</th><th>Loại</th><th>Yêu cầu</th><th>Khối lượng</th><th>Đơn giá</th><th style={{ textAlign: 'right' }}>Chi phí</th><th style={{ textAlign: 'right' }}>%</th></tr></thead>
          <tbody>
            {AI_MODELS.map(m => (
              <tr key={m.model}>
                <td><div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><span className="cdot" style={{ background: m.svc, boxShadow: `0 0 7px ${m.svc}` }} /><span className="mono" style={{ fontWeight: 700, color: 'var(--tx)' }}>{m.model}</span></div></td>
                <td><span className="spill" style={{ height: 20, fontSize: 10.5, background: hexA2(m.svc, .14), color: m.svc }}>{m.kind}</span></td>
                <td className="mono">{fmtNum(m.reqs)}</td>
                <td className="mono" style={{ color: 'var(--tx-mute)' }}>{m.unit}</td>
                <td className="mono" style={{ fontSize: 12, color: 'var(--tx-faint)' }}>{m.price}</td>
                <td className="mono" style={{ textAlign: 'right', fontWeight: 700, color: 'var(--tx)' }}>{fmtVnd(m.cost)}</td>
                <td className="mono" style={{ textAlign: 'right', color: 'var(--tx-mute)' }}>{Math.round(m.cost / COST_TOTAL * 100)}%</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr style={{ borderTop: '1px solid var(--hairline-2)' }}>
              <td colSpan={5} style={{ padding: '13px 16px', fontSize: 13, fontWeight: 700, color: 'var(--tx-soft)' }}>Tổng cộng · tháng 5/2026</td>
              <td className="mono" style={{ padding: '13px 16px', textAlign: 'right', fontSize: 14, fontWeight: 800, color: 'var(--acc)' }}>{fmtVnd(COST_TOTAL)}</td>
              <td className="mono" style={{ padding: '13px 16px', textAlign: 'right', color: 'var(--tx-mute)' }}>100%</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* footnote */}
      <div className="panel panel-pad" style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 18, color: 'var(--tx-mute)', fontSize: 13 }}>
        <Icon name="info" size={17} color="var(--tx-faint)" />
        Chi phí gộp theo thời gian thực từ nhà cung cấp AI. Đặt cảnh báo khi vượt 80% ngân sách trong <b style={{ color: 'var(--tx-soft)', fontWeight: 700 }}>Cài đặt → Ngân sách</b>.
      </div>

      {exp && <CostExportModal onClose={() => setExp(false)} />}
    </>
  );
}

function CostExportModal({ onClose }) {
  const [fmt, setFmt] = useS('pdf');
  const [busy, setBusy] = useS(false);
  const run = () => { setBusy(true); setTimeout(() => { setBusy(false); luniToast('Đã xuất hoá đơn tháng 5 (.' + fmt + ')', 'green', 'download'); onClose(); }, 900); };
  return (
    <Modal title="Xuất hoá đơn chi phí AI" sub="Tháng 5/2026 · toàn fleet" icon="download" onClose={onClose} width={440}>
      <div style={{ padding: 22, display: 'grid', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 15px', borderRadius: 12, background: 'var(--bg-2)', border: '1px solid var(--hairline)' }}>
          <span style={{ fontSize: 13, color: 'var(--tx-mute)' }}>Tổng chi phí</span>
          <span className="mono" style={{ fontSize: 16, fontWeight: 800, color: 'var(--acc)' }}>{fmtVnd(COST_TOTAL)}</span>
        </div>
        <Field label="Định dạng">
          <Seg options={[{ id: 'pdf', label: 'PDF' }, { id: 'csv', label: 'CSV' }, { id: 'xlsx', label: 'Excel' }]} value={fmt} onChange={setFmt} />
        </Field>
      </div>
      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', padding: '14px 22px', borderTop: '1px solid var(--hairline)' }}>
        <button className="btn" onClick={onClose} disabled={busy}>Huỷ</button>
        <button className="btn btn-acc" onClick={run} disabled={busy}>{busy ? <><Spinner size={16} color="var(--acc-ink)" />Đang xuất…</> : <><Icon name="download" size={15} color="var(--acc-ink)" />Tải về</>}</button>
      </div>
    </Modal>
  );
}

Object.assign(window, { CostDashboard, fmtVnd, fmtNum });
