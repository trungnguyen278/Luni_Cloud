/* ============================================================
   base/ui.tsx — shared desktop primitives for the Luni console.
   Ported from web-base.jsx. Depends on Icon, hexA2, React.
   ============================================================ */
'use client';

import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { hexA2 } from '@/lib/format';
import { Icon } from '@/components/brand/Icon';

/* ---------- spinner ---------- */
export function Spinner({ size = 22, color = 'var(--acc)' }: { size?: number; color?: string }) {
  return (
    <span
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        border: `2.5px solid rgba(255,255,255,.12)`,
        borderTopColor: color,
        display: 'inline-block',
        animation: 'spin .7s linear infinite',
      }}
    />
  );
}

/* ---------- toast bus ---------- */
export type ToastTone = 'acc' | 'green' | 'red' | 'amber' | 'blue';

interface ToastItem {
  text: string;
  tone: ToastTone | string;
  icon: string;
  id: number;
}

export function luniToast(text: string, tone: ToastTone | string = 'acc', icon = 'check'): void {
  if (typeof window === 'undefined') return; // SSR guard
  window.dispatchEvent(new CustomEvent('luni-toast', { detail: { text, tone, icon, id: Math.random() } }));
}

const TONE: Record<string, string> = {
  acc: 'var(--acc)',
  green: 'var(--green)',
  red: 'var(--red)',
  amber: 'var(--warm)',
  blue: 'var(--blue)',
};

export function ToastHost() {
  const [list, setList] = useState<ToastItem[]>([]);
  useEffect(() => {
    const on = (e: Event) => {
      const t = (e as CustomEvent<ToastItem>).detail;
      setList((l) => [...l, t]);
      setTimeout(() => setList((l) => l.filter((x) => x.id !== t.id)), 3000);
    };
    window.addEventListener('luni-toast', on);
    return () => window.removeEventListener('luni-toast', on);
  }, []);
  return (
    <div
      style={{
        position: 'fixed',
        bottom: 26,
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        flexDirection: 'column',
        gap: 9,
        zIndex: 90,
        alignItems: 'center',
      }}
    >
      {list.map((t) => (
        <div
          key={t.id}
          className="glass pop"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '12px 18px',
            borderRadius: 13,
            border: '1px solid var(--hairline-2)',
            boxShadow: 'var(--shadow-pop)',
            whiteSpace: 'nowrap',
          }}
        >
          <Icon name={t.icon} size={17} color={TONE[t.tone] || TONE.acc} strokeWidth={2.3} />
          <span style={{ fontSize: 13.5, fontWeight: 600 }}>{t.text}</span>
        </div>
      ))}
    </div>
  );
}

/* ---------- avatar ---------- */
export function Avatar({ name = '', size = 34, accent }: { name?: string; size?: number; accent?: string }) {
  const initials =
    name
      .split(' ')
      .filter(Boolean)
      .slice(-2)
      .map((s) => s[0])
      .join('')
      .toUpperCase() || '?';
  const c = accent || 'var(--acc)';
  return (
    <span
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.32,
        flex: 'none',
        display: 'grid',
        placeItems: 'center',
        background: `color-mix(in oklch, ${c} 16%, transparent)`,
        color: c,
        fontSize: size * 0.36,
        fontWeight: 800,
        letterSpacing: '-.02em',
        border: `1px solid color-mix(in oklch, ${c} 24%, transparent)`,
      }}
    >
      {initials}
    </span>
  );
}

/* ---------- status pill ---------- */
export function Pill({
  tone = '#8592AB',
  children,
  dot = false,
  solid = false,
  style,
}: {
  tone?: string;
  children?: ReactNode;
  dot?: boolean;
  solid?: boolean;
  style?: CSSProperties;
}) {
  const c = tone;
  return (
    <span className="spill" style={{ background: solid ? c : hexA2(c, 0.14), color: solid ? '#06121a' : c, ...style }}>
      {dot && <span className="cdot" style={{ background: solid ? '#06121a' : c, boxShadow: solid ? 'none' : `0 0 7px ${hexA2(c, 0.8)}` }} />}
      {children}
    </span>
  );
}

/* ---------- KPI card ---------- */
export function KPI({
  icon,
  label,
  value,
  sub,
  tone = 'var(--acc)',
  trend,
}: {
  icon: string;
  label: ReactNode;
  value: ReactNode;
  sub?: ReactNode;
  tone?: string;
  trend?: number | null;
}) {
  return (
    <div className="kpi-card fadein">
      <div
        style={{
          position: 'absolute',
          right: -18,
          top: -18,
          width: 90,
          height: 90,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${hexA2(tone, 0.16)}, transparent 70%)`,
          pointerEvents: 'none',
        }}
      />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ width: 38, height: 38, borderRadius: 11, display: 'grid', placeItems: 'center', background: hexA2(tone, 0.14) }}>
          <Icon name={icon} size={19} color={tone} strokeWidth={2} />
        </span>
        {trend != null && (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 3,
              fontSize: 12,
              fontWeight: 700,
              color: trend >= 0 ? 'var(--green)' : 'var(--red)',
            }}
          >
            <Icon name="chart" size={13} color={trend >= 0 ? 'var(--green)' : 'var(--red)'} />
            {trend >= 0 ? '+' : ''}
            {trend}%
          </span>
        )}
      </div>
      <div style={{ fontSize: 30, fontWeight: 800, letterSpacing: '-.03em', marginTop: 14, lineHeight: 1, color: 'var(--tx)' }}>{value}</div>
      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--tx-mute)', marginTop: 7 }}>{label}</div>
      {sub && <div style={{ fontSize: 11.5, color: 'var(--tx-faint)', marginTop: 3 }}>{sub}</div>}
    </div>
  );
}

/* ---------- panel header ---------- */
export function PanelHead({ title, sub, right, icon }: { title: ReactNode; sub?: ReactNode; right?: ReactNode; icon?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 20px', borderBottom: '1px solid var(--hairline)' }}>
      {icon && (
        <span style={{ width: 32, height: 32, borderRadius: 9, display: 'grid', placeItems: 'center', background: 'var(--acc-12)', flex: 'none' }}>
          <Icon name={icon} size={17} color="var(--acc)" />
        </span>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: '-.01em' }}>{title}</div>
        {sub && <div style={{ fontSize: 12, color: 'var(--tx-faint)', marginTop: 2 }}>{sub}</div>}
      </div>
      {right}
    </div>
  );
}

/* ---------- segmented control ---------- */
export type SegOption = string | { id: string; label?: ReactNode; badge?: ReactNode };

export function Seg({
  options,
  value,
  onChange,
  accent = 'var(--acc)',
}: {
  options: SegOption[];
  value: string;
  onChange: (v: string) => void;
  accent?: string;
}) {
  return (
    <div style={{ display: 'inline-flex', gap: 3, padding: 3, background: 'var(--bg-2)', borderRadius: 11, border: '1px solid var(--hairline)' }}>
      {options.map((o) => {
        const v = typeof o === 'object' ? o.id : o;
        const lab = typeof o === 'object' ? o.label ?? o.id : o;
        const badge = typeof o === 'object' ? o.badge : undefined;
        const on = v === value;
        return (
          <button
            key={v}
            className="press"
            onClick={() => onChange(v)}
            style={{
              height: 30,
              padding: '0 13px',
              borderRadius: 8,
              fontSize: 12.5,
              fontWeight: 700,
              whiteSpace: 'nowrap',
              background: on ? hexA2(accent, 0.16) : 'transparent',
              color: on ? accent : 'var(--tx-mute)',
            }}
          >
            {lab}
            {badge != null && <span style={{ marginLeft: 6, fontSize: 10.5, opacity: 0.8 }}>{badge}</span>}
          </button>
        );
      })}
    </div>
  );
}

/* ---------- bar chart (7-day) ---------- */
export function BarChart({
  data,
  labels,
  height = 150,
  accent = 'var(--acc)',
  unit = '',
}: {
  data: number[];
  labels: string[];
  height?: number;
  accent?: string;
  unit?: string;
}) {
  const max = Math.max(...data, 1);
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, height }}>
        {data.map((v, i) => (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, height: '100%', justifyContent: 'flex-end' }}>
            <span className="mono" style={{ fontSize: 10.5, color: 'var(--tx-faint)' }}>
              {v}
              {unit}
            </span>
            <div
              className="barcol"
              style={{ height: `${Math.max(4, (v / max) * 100)}%`, ['--bar']: accent, animationDelay: `${i * 60}ms` } as CSSProperties}
              title={`${v}${unit}`}
            />
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 10, marginTop: 9 }}>
        {labels.map((l, i) => (
          <span key={i} style={{ flex: 1, textAlign: 'center', fontSize: 11, color: 'var(--tx-faint)', fontWeight: 600 }}>
            {l}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ---------- horizontal distribution bars ---------- */
export interface HBarRow {
  label: ReactNode;
  v: number;
  c: string;
  unit?: string;
}

export function HBars({ rows }: { rows: HBarRow[] }) {
  const max = Math.max(...rows.map((r) => r.v), 1);
  return (
    <div style={{ display: 'grid', gap: 13 }}>
      {rows.map((r, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ width: 96, flex: 'none', fontSize: 12.5, color: 'var(--tx-soft)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="cdot" style={{ background: r.c, boxShadow: `0 0 7px ${hexA2(r.c, 0.7)}` }} />
            {r.label}
          </span>
          <div style={{ flex: 1, height: 9, borderRadius: 99, background: 'var(--bg-2)', overflow: 'hidden' }}>
            <div
              style={{
                width: `${(r.v / max) * 100}%`,
                height: '100%',
                borderRadius: 99,
                background: r.c,
                animation: 'barGrow .6s var(--spring) both',
                animationDelay: `${i * 50}ms`,
                transformOrigin: 'left',
                boxShadow: `0 0 10px ${hexA2(r.c, 0.4)}`,
              }}
            />
          </div>
          <span className="mono" style={{ width: 40, textAlign: 'right', fontSize: 12, color: 'var(--tx-mute)', fontWeight: 700 }}>
            {r.v}
            {r.unit || ''}
          </span>
        </div>
      ))}
    </div>
  );
}

/* ---------- empty / loading / error states ---------- */
export function EmptyState({ icon = 'info', text = 'Chưa có dữ liệu.', sub }: { icon?: string; text?: ReactNode; sub?: ReactNode }) {
  return (
    <div style={{ textAlign: 'center', padding: '54px 0', color: 'var(--tx-faint)' }}>
      <span style={{ width: 48, height: 48, borderRadius: 14, display: 'inline-grid', placeItems: 'center', background: 'var(--bg-2)', marginBottom: 14 }}>
        <Icon name={icon} size={22} color="var(--tx-faint)" />
      </span>
      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--tx-mute)' }}>{text}</div>
      {sub && <div style={{ fontSize: 12.5, marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

/* ---------- modal shell ---------- */
export function Modal({
  title,
  sub,
  icon,
  onClose,
  children,
  width = 540,
}: {
  title: ReactNode;
  sub?: ReactNode;
  icon?: string;
  onClose: () => void;
  children?: ReactNode;
  width?: number;
}) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [onClose]);
  return (
    <div className="scrim" onMouseDown={onClose}>
      <div className="modal" style={{ maxWidth: width }} onMouseDown={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '18px 20px', borderBottom: '1px solid var(--hairline)' }}>
          {icon && (
            <span style={{ width: 36, height: 36, borderRadius: 10, display: 'grid', placeItems: 'center', background: 'var(--acc-12)', flex: 'none' }}>
              <Icon name={icon} size={18} color="var(--acc)" />
            </span>
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 16, fontWeight: 800, letterSpacing: '-.01em' }}>{title}</div>
            {sub && <div style={{ fontSize: 12.5, color: 'var(--tx-faint)', marginTop: 2 }}>{sub}</div>}
          </div>
          <button className="btn btn-icon" onClick={onClose}>
            <Icon name="close" size={18} color="var(--tx-mute)" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

/* ---------- page header (inside content) ---------- */
export function PageHead({ title, sub, children }: { title: ReactNode; sub?: ReactNode; children?: ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 16, marginBottom: 22, flexWrap: 'wrap' }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <h1 style={{ fontSize: 23, fontWeight: 800, letterSpacing: '-.025em', margin: 0 }}>{title}</h1>
        {sub && <p style={{ fontSize: 13.5, color: 'var(--tx-mute)', margin: '5px 0 0' }}>{sub}</p>}
      </div>
      {children}
    </div>
  );
}

/* ---------- reusable confirm dialog ---------- */
export function Confirm({
  title,
  sub,
  body,
  icon = 'alert',
  cta = 'Xác nhận',
  danger = false,
  onClose,
  onOk,
}: {
  title: ReactNode;
  sub?: ReactNode;
  body?: ReactNode;
  icon?: string;
  cta?: ReactNode;
  danger?: boolean;
  onClose: () => void;
  onOk?: () => void;
}) {
  return (
    <Modal title={title} sub={sub} icon={icon} onClose={onClose} width={430}>
      <div style={{ padding: 20 }}>
        {body && <p style={{ fontSize: 13.5, color: 'var(--tx-soft)', lineHeight: 1.6, margin: '0 0 18px' }}>{body}</p>}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button className="btn" onClick={onClose}>
            Huỷ
          </button>
          <button
            className={'btn' + (danger ? ' btn-danger' : ' btn-acc')}
            style={danger ? { background: 'rgba(255,91,110,.12)', borderColor: 'rgba(255,91,110,.32)' } : undefined}
            onClick={() => {
              onOk && onOk();
              onClose();
            }}
          >
            <Icon name={danger ? 'alert' : 'check'} size={15} color={danger ? 'var(--red)' : 'var(--acc-ink)'} strokeWidth={2.2} />
            {cta}
          </button>
        </div>
      </div>
    </Modal>
  );
}

/* ---------- labelled field for modals ---------- */
export function Field({ label, required, children }: { label: ReactNode; required?: boolean; children?: ReactNode }) {
  return (
    <div>
      <label className="field-label">
        {label}
        {required && <span style={{ color: 'var(--red)' }}> *</span>}
      </label>
      {children}
    </div>
  );
}
