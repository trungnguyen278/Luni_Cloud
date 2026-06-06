/* ============================================================
   CostDashboard — AI usage + spend. Conversation counts (per day /
   device / total) are REAL from /admin/ai/usage; the VND cost is a
   transparent estimate (unit price × conversations) until token-level
   billing exists, so it's marked "ước tính". Ported from web-cost.jsx.
   ============================================================ */
'use client';

import { useState, type CSSProperties } from 'react';
import { hexA2 } from '@/lib/format';
import { useAiUsage } from '@/lib/hooks/useAdmin';
import type { AiUsage } from '@/lib/api/types';
import { Icon } from '@/components/brand/Icon';
import { LuniFace } from '@/components/brand/LuniFace';
import { BarChart, EmptyState, Field, KPI, Modal, PageHead, PanelHead, Pill, Seg, Spinner, luniToast } from '@/components/base/ui';
import { DemoNote } from '@/components/user/parts';
import { fmtNum, fmtVnd } from './data';

const WD = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
function dayLabels(n: number): string[] {
  if (n > 10) return Array.from({ length: n }, (_, i) => (i % 5 === 0 ? String(i + 1) : ''));
  return Array.from({ length: n }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (n - 1 - i));
    return WD[d.getDay()];
  });
}

function BudgetRing({ used, budget, projected }: { used: number; budget: number; projected: number }) {
  const pct = budget ? Math.min(100, Math.round((used / budget) * 100)) : 0;
  const projPct = budget ? Math.min(100, Math.round((projected / budget) * 100)) : 0;
  const R = 58;
  const C = 2 * Math.PI * R;
  const over = projected > budget;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
      <div style={{ position: 'relative', width: 148, height: 148, flex: 'none' }}>
        <svg width="148" height="148" viewBox="0 0 148 148" style={{ transform: 'rotate(-90deg)' }}>
          <circle cx="74" cy="74" r={R} fill="none" stroke="var(--bg-3)" strokeWidth="11" />
          <circle cx="74" cy="74" r={R} fill="none" stroke={over ? 'var(--red)' : 'var(--acc)'} strokeOpacity="0.25" strokeWidth="11" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C - (projPct / 100) * C} />
          <circle
            cx="74"
            cy="74"
            r={R}
            fill="none"
            stroke="var(--acc)"
            strokeWidth="11"
            strokeLinecap="round"
            strokeDasharray={C}
            strokeDashoffset={C}
            style={{ ['--dash-end']: C - (pct / 100) * C, animation: 'ringDraw 1s var(--ease) forwards' } as CSSProperties}
          />
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', textAlign: 'center' }}>
          <div>
            <div style={{ fontSize: 27, fontWeight: 800, letterSpacing: '-.03em', lineHeight: 1 }}>{pct}%</div>
            <div style={{ fontSize: 10.5, color: 'var(--tx-faint)', marginTop: 3, fontWeight: 600 }}>đã dùng</div>
          </div>
        </div>
      </div>
      <div style={{ flex: 1, minWidth: 0, display: 'grid', gap: 12 }}>
        {(
          [
            ['Đã dùng', fmtVnd(used), 'var(--acc)', true],
            ['Ngân sách tháng', fmtVnd(budget), 'var(--tx-soft)', false],
            ['Dự kiến cuối tháng', fmtVnd(projected), over ? 'var(--red)' : 'var(--green)', false],
          ] as [string, string, string, boolean][]
        ).map(([l, v, c, dot]) => (
          <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            {dot ? <span className="cdot" style={{ background: c, boxShadow: `0 0 7px ${c}` }} /> : <span style={{ width: 7, flex: 'none' }} />}
            <span style={{ fontSize: 12.5, color: 'var(--tx-mute)', flex: 1 }}>{l}</span>
            <span className="mono" style={{ fontSize: 13.5, fontWeight: 700, color: c }}>
              {v}
            </span>
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

export function CostDashboard() {
  const [period, setPeriod] = useState('7d');
  const [exp, setExp] = useState(false);
  const days = period === '30d' ? 30 : 7;
  const { data: usage, isLoading, isError } = useAiUsage(days);

  if (isLoading) {
    return (
      <div style={{ display: 'grid', placeItems: 'center', minHeight: '50vh' }}>
        <Spinner size={30} />
      </div>
    );
  }
  if (isError || !usage) {
    return (
      <div>
        <PageHead title="Chi phí AI" sub="Chi phí mô hình AI toàn fleet" />
        <div className="panel panel-pad">
          <EmptyState icon="alert" text="Không tải được dữ liệu chi phí" sub="Thử lại sau." />
        </div>
      </div>
    );
  }

  const dailyK = usage.daily.map((v) => Math.round(v / 1000));
  const labels = dayLabels(dailyK.length);
  const avg = dailyK.length ? Math.round(dailyK.reduce((a, b) => a + b, 0) / dailyK.length) : 0;

  return (
    <>
      <PageHead title="Chi phí AI" sub="Đếm hội thoại thật · chi phí ước tính theo bảng giá">
        <DemoNote text="chi phí: ước tính" />
        <Seg
          options={[
            { id: '7d', label: '7 ngày' },
            { id: '30d', label: '30 ngày' },
          ]}
          value={period}
          onChange={setPeriod}
        />
        <button className="btn" onClick={() => setExp(true)}>
          <Icon name="download" size={16} color="var(--tx-mute)" />
          Xuất hoá đơn
        </button>
      </PageHead>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 18 }}>
        <KPI icon="bolt" label="Chi phí kỳ này" value={fmtVnd(usage.total, false) + '₫'} sub={`/ ${fmtVnd(usage.budget, false)}₫ ngân sách`} tone="var(--acc)" />
        <KPI icon="chip" label="Tokens (ước tính)" value={fmtNum(usage.tokens_est)} sub={`${fmtNum(usage.conversations)} hội thoại`} tone="#76B8FF" />
        <KPI icon="chat" label="Chi phí / hội thoại" value={usage.per_conversation + '₫'} sub="đơn giá ước tính" tone="#7BE88E" />
        <KPI icon="chart" label="Dự kiến cuối tháng" value={fmtVnd(usage.projected, false) + '₫'} sub="theo nhịp hiện tại" tone="#FFD166" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 18, alignItems: 'start' }}>
        <div className="panel">
          <PanelHead icon="chart" title="Chi phí theo ngày" sub={`Đơn vị: nghìn ₫ · trung bình ${avg}K₫/ngày`} right={<Pill tone="var(--acc)" dot>cao nhất {Math.max(...dailyK, 0)}K₫</Pill>} />
          <div className="panel-pad">{dailyK.length ? <BarChart data={dailyK} labels={labels} accent="var(--acc)" height={186} unit="K" /> : <EmptyState text="Chưa có dữ liệu." />}</div>
        </div>
        <div className="panel">
          <PanelHead icon="bolt" title="Ngân sách" sub="Tháng này" />
          <div className="panel-pad">
            <BudgetRing used={usage.total} budget={usage.budget} projected={usage.projected} />
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18, marginTop: 18, alignItems: 'start' }}>
        <div className="panel">
          <PanelHead icon="sliders" title="Chi phí theo dịch vụ" sub="Lắng nghe → suy nghĩ → cất lời" />
          <div className="panel-pad" style={{ display: 'grid', gap: 14 }}>
            {usage.services.map((s) => (
              <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 13 }}>
                <span style={{ width: 38, height: 38, borderRadius: 11, display: 'grid', placeItems: 'center', background: hexA2(s.c, 0.14), flex: 'none' }}>
                  <Icon name={s.icon} size={18} color={s.c} />
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                    <span style={{ fontSize: 13.5, fontWeight: 700 }}>{s.label}</span>
                    <span className="mono" style={{ fontSize: 13, fontWeight: 700, color: s.c }}>
                      {fmtVnd(s.cost)}
                    </span>
                  </div>
                  <div style={{ height: 7, borderRadius: 99, background: 'var(--bg-2)', overflow: 'hidden', margin: '7px 0 4px' }}>
                    <div style={{ width: s.share + '%', height: '100%', borderRadius: 99, background: s.c, boxShadow: `0 0 10px ${hexA2(s.c, 0.5)}`, animation: 'barGrow .6s var(--spring) both', transformOrigin: 'left' }} />
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--tx-faint)' }}>{s.share}%</div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="panel" style={{ overflow: 'hidden' }}>
          <PanelHead icon="cpu" title="Thiết bị tốn nhiều nhất" sub="Top 5 theo số hội thoại" />
          <div style={{ padding: 8 }}>
            {usage.devices.length === 0 && <EmptyState text="Chưa có dữ liệu." />}
            {usage.devices.map((d, i) => {
              const max = usage.devices[0]?.cost || 1;
              return (
                <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 12 }}>
                  <span className="mono" style={{ fontSize: 12, fontWeight: 700, color: 'var(--tx-faint)', width: 16, flex: 'none' }}>
                    {i + 1}
                  </span>
                  <span style={{ width: 34, height: 34, borderRadius: 9, display: 'grid', placeItems: 'center', background: 'var(--bg-2)', flex: 'none' }}>
                    <LuniFace emotion="idle" size={26} state="idle" noPhase />
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--tx)' }}>
                      {d.name} <span style={{ fontWeight: 400, color: 'var(--tx-faint)' }}>· {d.owner}</span>
                    </div>
                    <div style={{ height: 5, borderRadius: 99, background: 'var(--bg-2)', overflow: 'hidden', marginTop: 6 }}>
                      <div style={{ width: (d.cost / max) * 100 + '%', height: '100%', borderRadius: 99, background: 'var(--acc)', animation: 'barGrow .6s var(--spring) both', transformOrigin: 'left' }} />
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flex: 'none' }}>
                    <div className="mono" style={{ fontSize: 13, fontWeight: 700 }}>
                      {fmtVnd(d.cost)}
                    </div>
                    <div style={{ fontSize: 10.5, color: 'var(--tx-faint)', marginTop: 1 }}>{fmtNum(d.conv)} lượt</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="panel panel-pad" style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 18, color: 'var(--tx-mute)', fontSize: 13 }}>
        <Icon name="info" size={17} color="var(--tx-faint)" />
        Số lượt hội thoại là dữ liệu thật; chi phí VND được ước tính theo đơn giá <b style={{ color: 'var(--tx-soft)', fontWeight: 700 }}>{usage.per_conversation}₫/lượt</b> (chỉnh trong cấu hình server) cho tới khi có billing theo token.
      </div>

      {exp && <CostExportModal usage={usage} onClose={() => setExp(false)} />}
    </>
  );
}

function CostExportModal({ usage, onClose }: { usage: AiUsage; onClose: () => void }) {
  const [fmt, setFmt] = useState('json');
  const run = () => {
    const stamp = new Date().toISOString().slice(0, 10);
    if (fmt === 'csv') {
      const lines = ['dịch vụ,chi phí (VND),tỉ lệ %', ...usage.services.map((s) => `${s.label},${s.cost},${s.share}`)];
      lines.push('', `Tổng,${usage.total},100`);
      const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `luni-ai-cost-${stamp}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } else {
      const blob = new Blob([JSON.stringify(usage, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `luni-ai-cost-${stamp}.json`;
      a.click();
      URL.revokeObjectURL(url);
    }
    luniToast('Đã xuất hoá đơn', 'green', 'download');
    onClose();
  };
  return (
    <Modal title="Xuất hoá đơn chi phí AI" sub="Ước tính · toàn fleet" icon="download" onClose={onClose} width={440}>
      <div style={{ padding: 22, display: 'grid', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 15px', borderRadius: 12, background: 'var(--bg-2)', border: '1px solid var(--hairline)' }}>
          <span style={{ fontSize: 13, color: 'var(--tx-mute)' }}>Tổng chi phí (ước tính)</span>
          <span className="mono" style={{ fontSize: 16, fontWeight: 800, color: 'var(--acc)' }}>
            {fmtVnd(usage.total)}
          </span>
        </div>
        <Field label="Định dạng">
          <Seg
            options={[
              { id: 'json', label: 'JSON' },
              { id: 'csv', label: 'CSV' },
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
