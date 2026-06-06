'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { ApiError } from '@/lib/api/client';
import { clearInteractions, interact as interactApi } from '@/lib/api/interactions';
import { useInteractions } from '@/lib/hooks/useDevices';
import type { Interaction } from '@/lib/api/types';
import type { StudioDevice } from '@/lib/types';
import { Icon } from '@/components/brand/Icon';
import { LuniFace } from '@/components/brand/LuniFace';
import { EmptyState, PanelHead, Pill, Spinner, luniToast } from '@/components/base/ui';
import { DemoNote } from './parts';

interface Bubble {
  me: boolean;
  t: string;
  emo?: string;
}

function rowsToBubbles(rows: Interaction[]): Bubble[] {
  const out: Bubble[] = [];
  [...rows]
    .sort((a, b) => a.created_at.localeCompare(b.created_at))
    .forEach((r) => {
      if (r.input_text) out.push({ me: true, t: r.input_text });
      if (r.output_text) out.push({ me: false, t: r.output_text, emo: r.emotion || 'happy' });
    });
  return out;
}

const SESSIONS = [
  { t: 'Thời tiết & báo thức', sub: 'hôm nay 09:14', on: true },
  { t: 'Kể chuyện trước khi ngủ', sub: 'hôm qua 21:30' },
  { t: 'Hỏi về tuần trăng', sub: '3 ngày trước' },
  { t: 'Nhắc lịch họp', sub: '5 ngày trước' },
];

export function UserChat({ device }: { device: StudioDevice }) {
  const qc = useQueryClient();
  const { data: rows, isLoading } = useInteractions(device.id);
  const history = rowsToBubbles(rows ?? []);
  const [extra, setExtra] = useState<Bubble[]>([]);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const msgs = [...history, ...extra];
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [msgs.length]);

  const send = async () => {
    const t = draft.trim();
    if (!t || busy) return;
    setDraft('');
    setExtra((e) => [...e, { me: true, t }]);
    setBusy(true);
    try {
      const res = await interactApi(device.id, t);
      setExtra((e) => [...e, { me: false, t: res.output, emo: res.emotion }]);
    } catch (e) {
      const off = e instanceof ApiError && e.status === 503;
      setExtra((x) => [...x, { me: false, t: off ? 'Robot ngoại tuyến — chưa gửi được.' : 'Có lỗi khi gửi tin nhắn.', emo: 'sad' }]);
    } finally {
      setBusy(false);
    }
  };

  const clear = async () => {
    try {
      await clearInteractions(device.id);
      setExtra([]);
      qc.invalidateQueries({ queryKey: ['interactions', device.id] });
      luniToast('Đã xoá lịch sử', 'acc', 'trash');
    } catch {
      luniToast('Không xoá được lịch sử', 'red', 'alert');
    }
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '270px 1fr', gap: 18, height: 'calc(100vh - 150px)' }}>
      <div className="panel" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <PanelHead icon="chat" title="Hội thoại" right={<DemoNote text="demo" />} />
        <div className="scrolly" style={{ flex: 1, padding: 8 }}>
          {SESSIONS.map((s, i) => (
            <button
              key={i}
              className="press"
              style={{ display: 'block', width: '100%', textAlign: 'left', padding: '11px 12px', borderRadius: 11, marginBottom: 2, background: s.on ? 'var(--acc-12)' : 'transparent', border: `1px solid ${s.on ? 'var(--acc-20)' : 'transparent'}` }}
            >
              <div style={{ fontSize: 13, fontWeight: 700, color: s.on ? 'var(--acc)' : 'var(--tx-soft)' }}>{s.t}</div>
              <div style={{ fontSize: 11, color: 'var(--tx-faint)', marginTop: 2 }}>{s.sub}</div>
            </button>
          ))}
        </div>
      </div>
      <div className="panel" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <PanelHead
          title={device.name}
          sub="Trò chuyện thoại + chữ"
          right={
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button className="btn btn-sm" onClick={clear} title="Xoá lịch sử">
                <Icon name="trash" size={15} color="var(--tx-mute)" />
              </button>
              <Pill tone={device.online ? '#7BE88E' : '#5C6680'} dot>
                {device.online ? 'Trực tuyến' : 'Ngoại tuyến'}
              </Pill>
            </div>
          }
        />
        <div ref={scrollRef} className="scrolly" style={{ flex: 1, padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {isLoading && (
            <div style={{ display: 'grid', placeItems: 'center', flex: 1 }}>
              <Spinner />
            </div>
          )}
          {!isLoading && msgs.length === 0 && <EmptyState icon="chat" text="Chưa có hội thoại nào." sub="Nhắn cho Luni để bắt đầu." />}
          {msgs.map((m, i) => (
            <div key={i} style={{ display: 'flex', gap: 10, alignSelf: m.me ? 'flex-end' : 'flex-start', maxWidth: '74%', flexDirection: m.me ? 'row-reverse' : 'row' }}>
              {!m.me && (
                <span style={{ flex: 'none' }}>
                  <LuniFace emotion={m.emo || 'happy'} size={34} state="idle" noPhase />
                </span>
              )}
              <div
                style={{
                  padding: '11px 15px',
                  borderRadius: m.me ? '15px 15px 4px 15px' : '15px 15px 15px 4px',
                  fontSize: 13.5,
                  lineHeight: 1.5,
                  background: m.me ? 'var(--acc)' : 'var(--bg-2)',
                  color: m.me ? 'var(--acc-ink)' : 'var(--tx-soft)',
                  border: m.me ? 'none' : '1px solid var(--hairline)',
                  fontWeight: m.me ? 600 : 400,
                }}
              >
                {m.t}
              </div>
            </div>
          ))}
        </div>
        <div style={{ padding: '14px 18px', borderTop: '1px solid var(--hairline)', display: 'flex', gap: 10 }}>
          <input className="winput" placeholder="Nhắn cho Luni…" value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && send()} />
          <button className="btn btn-icon" onClick={() => luniToast('Đang nghe… (giữ để nói)', 'acc', 'mic')}>
            <Icon name="mic" size={18} color="var(--tx-mute)" />
          </button>
          <button className="btn btn-acc btn-icon" onClick={send} disabled={busy}>
            <Icon name="send" size={18} color="var(--acc-ink)" />
          </button>
        </div>
      </div>
    </div>
  );
}
