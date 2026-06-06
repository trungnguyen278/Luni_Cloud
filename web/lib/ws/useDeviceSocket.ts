/* ============================================================
   ws/useDeviceSocket.ts — subscribe to a device's live events over
   WS /ws/app/{id}?token=<jwt>. Surfaces battery / emotion / rssi /
   ota_progress / errors and a connection flag. Pings to keep alive,
   reconnects with backoff, and refreshes the token on auth-close (4001).
   ============================================================ */
'use client';

import { useEffect, useRef, useState } from 'react';
import { getAccessToken, refreshToken } from '@/lib/api/client';
import { getWsBase } from '@/lib/env';

export interface DeviceLive {
  connected: boolean;
  battery?: { percent: number; charging: boolean };
  emotion?: string;
  rssi?: number;
  ota?: { percent: number; phase: string } | null;
  error?: { code: string; message: string } | null;
}

interface WSEnvelope {
  type: string;
  id?: string;
  ts?: number;
  payload?: Record<string, unknown>;
}

export function useDeviceSocket(deviceId?: string): DeviceLive {
  const [live, setLive] = useState<DeviceLive>({ connected: false, ota: null, error: null });
  const wsRef = useRef<WebSocket | null>(null);
  const pingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const retryRef = useRef(0);
  const closedRef = useRef(false);

  useEffect(() => {
    if (!deviceId) return;
    closedRef.current = false;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

    const apply = (msg: WSEnvelope) => {
      const p = (msg.payload || {}) as Record<string, unknown>;
      switch (msg.type) {
        case 'battery':
          setLive((s) => ({ ...s, battery: { percent: Number(p.percent ?? 0), charging: Boolean(p.charging) } }));
          break;
        case 'ota_progress':
          setLive((s) => ({ ...s, ota: { percent: Number(p.percent ?? 0), phase: String(p.phase ?? 'download') } }));
          break;
        case 'state_update':
          if (p.category === 'emotion' && p.emotion) setLive((s) => ({ ...s, emotion: String(p.emotion) }));
          break;
        case 'device_info':
        case 'current_state':
          setLive((s) => ({
            ...s,
            emotion: p.emotion ? String(p.emotion) : s.emotion,
            rssi: p.rssi != null ? Number(p.rssi) : s.rssi,
          }));
          break;
        case 'error':
          setLive((s) => ({ ...s, error: { code: String(p.code ?? ''), message: String(p.message ?? '') } }));
          break;
        default:
          break;
      }
    };

    const connect = async () => {
      if (closedRef.current) return;
      let token = getAccessToken();
      if (!token) {
        try {
          token = await refreshToken();
        } catch {
          return; // not authed — give up quietly
        }
      }
      const url = `${getWsBase()}/app/${deviceId}?token=${encodeURIComponent(token)}`;
      let ws: WebSocket;
      try {
        ws = new WebSocket(url);
      } catch {
        scheduleReconnect();
        return;
      }
      wsRef.current = ws;

      ws.onopen = () => {
        retryRef.current = 0;
        setLive((s) => ({ ...s, connected: true }));
        pingRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: 'ping' }));
        }, 25_000);
      };
      ws.onmessage = (ev) => {
        try {
          apply(JSON.parse(ev.data) as WSEnvelope);
        } catch {
          /* ignore non-JSON */
        }
      };
      ws.onclose = async (ev) => {
        setLive((s) => ({ ...s, connected: false }));
        if (pingRef.current) clearInterval(pingRef.current);
        if (closedRef.current) return;
        if (ev.code === 4001) {
          // invalid/expired token — refresh once, then reconnect
          try {
            await refreshToken();
          } catch {
            return;
          }
        }
        scheduleReconnect();
      };
      ws.onerror = () => ws.close();
    };

    const scheduleReconnect = () => {
      if (closedRef.current) return;
      const delay = Math.min(15_000, 1000 * 2 ** retryRef.current);
      retryRef.current += 1;
      reconnectTimer = setTimeout(connect, delay);
    };

    void connect();

    return () => {
      closedRef.current = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (pingRef.current) clearInterval(pingRef.current);
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [deviceId]);

  return live;
}
