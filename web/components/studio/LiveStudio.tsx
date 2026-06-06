/* ============================================================
   LiveStudio — robot ⇄ app dual preview with shared controls.
   Ported from web-preview.jsx; the emotion/scene/speak controls now
   send real commands via POST /devices/{id}/command. The preview
   updates optimistically; offline devices just preview locally.
   ============================================================ */
'use client';

import { useState } from 'react';
import { hexA2 } from '@/lib/format';
import { ApiError } from '@/lib/api/client';
import { sendCommand } from '@/lib/api/devices';
import type { StudioDevice } from '@/lib/types';
import { Icon } from '@/components/brand/Icon';
import { PanelHead, luniToast } from '@/components/base/ui';
import { SCENES, STUDIO_EMOTIONS } from './constants';
import { RobotStage } from './RobotStage';
import { AppMirror } from './AppMirror';

type FaceState = 'idle' | 'listening' | 'speaking' | 'thinking';

export interface LiveStudioProps {
  device: StudioDevice;
  accent?: string;
  defaultEmotion?: string;
}

export function LiveStudio({ device, accent = 'var(--acc)', defaultEmotion }: LiveStudioProps) {
  const [emotion, setEmotion] = useState(defaultEmotion || device.emotion || 'happy');
  const [scene, setScene] = useState(device.scene || 'weather');
  const [state, setState] = useState<FaceState>('idle');

  // fire a command at the real device (no-op network if offline)
  const runCmd = async (type: string, payload: Record<string, unknown>, okMsg: string, okIcon: string) => {
    if (!device.online) {
      luniToast('Robot ngoại tuyến — chỉ xem trước', 'amber', 'power');
      return;
    }
    try {
      await sendCommand(device.id, type, payload);
      luniToast(okMsg, 'acc', okIcon);
    } catch (e) {
      const offline = e instanceof ApiError && e.status === 503;
      luniToast(offline ? 'Robot ngoại tuyến' : 'Gửi lệnh thất bại', 'red', 'alert');
    }
  };

  const speak = () => {
    setState('speaking');
    void runCmd('tts_play', { text: 'Xin chào, mình là Luni!' }, 'WS say → robot đang đọc', 'volume');
    setTimeout(() => setState('idle'), 2600);
  };
  const toggleListen = () => setState((s) => (s === 'listening' ? 'idle' : 'listening'));

  const pickEmotion = (id: string) => {
    setEmotion(id);
    void runCmd('set_emotion', { emotion: id }, 'SET_EMOTION ' + id, 'check');
  };
  const pickScene = (s: { id: string; label: string; icon: string }) => {
    setScene(s.id);
    void runCmd('set_scene', { scene: s.id }, 'Cảnh → ' + s.label, s.icon);
  };

  return (
    <div className="panel fadein" style={{ overflow: 'hidden' }}>
      <PanelHead
        icon="sparkle"
        title="Phòng xem trực tiếp"
        sub="Gương đôi robot ⇄ app — điều khiển bên dưới áp dụng cho cả hai"
        right={
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-sm" onClick={toggleListen} style={state === 'listening' ? { color: accent, borderColor: 'var(--acc-32)', background: 'var(--acc-12)' } : undefined}>
              <Icon name="mic" size={15} color={state === 'listening' ? accent : 'var(--tx-mute)'} />
              Nghe
            </button>
            <button className="btn btn-sm btn-acc" onClick={speak}>
              <Icon name="volume" size={15} color="var(--acc-ink)" />
              Cho Luni đọc
            </button>
          </div>
        }
      />

      {/* dual preview */}
      <div
        style={{ display: 'flex', gap: 26, alignItems: 'center', padding: '22px 24px', background: 'radial-gradient(120% 120% at 30% 0%, var(--acc-12), transparent 60%)', flexWrap: 'wrap', justifyContent: 'center' }}
      >
        <RobotStage emotion={emotion} state={state} device={device} accent={accent} />
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          <span className="t-over" style={{ margin: 0 }}>
            Bản xem trên app
          </span>
          <AppMirror emotion={emotion} scene={scene} state={state} device={device} accent={accent} />
        </div>
      </div>

      <div className="hr" />

      {/* shared controls */}
      <div style={{ padding: '16px 24px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <span className="t-cap">
            Biểu cảm <span style={{ color: 'var(--tx-faint)' }}>· SET_EMOTION</span>
          </span>
          <span className="mono" style={{ fontSize: 11, color: 'var(--tx-faint)' }}>
            {STUDIO_EMOTIONS.length} điều khiển được
          </span>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {STUDIO_EMOTIONS.map((e) => {
            const on = e.id === emotion;
            return (
              <button
                key={e.id}
                className="press"
                onClick={() => pickEmotion(e.id)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 7,
                  height: 34,
                  padding: '0 12px',
                  borderRadius: 99,
                  background: on ? hexA2(e.color, 0.16) : 'var(--bg-2)',
                  color: on ? e.color : 'var(--tx-mute)',
                  border: `1px solid ${on ? hexA2(e.color, 0.42) : 'var(--hairline)'}`,
                  fontSize: 12.5,
                  fontWeight: 700,
                }}
              >
                <span className="cdot" style={{ background: e.color, boxShadow: on ? `0 0 7px ${hexA2(e.color, 0.8)}` : 'none' }} />
                {e.label}
              </button>
            );
          })}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '18px 0 10px' }}>
          <span className="t-cap">
            Cảnh hiển thị <span style={{ color: 'var(--tx-faint)' }}>· 320×240</span>
          </span>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {SCENES.map((s) => {
            const on = s.id === scene;
            return (
              <button
                key={s.id}
                className="press"
                onClick={() => pickScene(s)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  height: 38,
                  padding: '0 14px',
                  borderRadius: 11,
                  background: on ? 'var(--acc-12)' : 'var(--bg-2)',
                  color: on ? accent : 'var(--tx-mute)',
                  border: `1px solid ${on ? 'var(--acc-32)' : 'var(--hairline)'}`,
                  fontSize: 13,
                  fontWeight: 700,
                }}
              >
                <Icon name={s.icon} size={16} color={on ? accent : 'var(--tx-faint)'} />
                {s.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
