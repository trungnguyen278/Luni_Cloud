/* ============================================================
   toStudioDevice — map a REST Device (+ optional live status) into the
   view-model the studio/user components render. Telemetry (battery,
   rssi, emotion) is best-effort from status.last_state / config and is
   refined live over WebSocket (M7); identity/online/fw are authoritative.
   ============================================================ */

import type { Device, DeviceStatus } from '@/lib/api/types';
import type { MyDevice } from '@/lib/types';

function num(v: unknown, fallback = 0): number {
  const n = typeof v === 'string' ? parseFloat(v) : (v as number);
  return Number.isFinite(n) ? (n as number) : fallback;
}

export function toStudioDevice(d: Device, status?: DeviceStatus | null): MyDevice {
  const st = (status?.last_state || {}) as Record<string, unknown>;
  const cfg = (d.config || {}) as Record<string, unknown>;
  const battObj = st.battery as Record<string, unknown> | number | undefined;

  const battery =
    typeof battObj === 'object' && battObj !== null ? num(battObj.percent) : num(battObj ?? st.battery_percent);
  const charging =
    typeof battObj === 'object' && battObj !== null ? Boolean(battObj.charging) : Boolean(st.charging);

  return {
    id: d.id,
    name: d.name,
    model: d.model,
    online: d.is_online ?? status?.is_online ?? false,
    battery,
    charging,
    rssi: num(st.rssi ?? st.signal),
    fw: d.fw_version || '—',
    emotion: String(st.emotion ?? cfg.emotion ?? 'idle'),
    scene: String(cfg.scene ?? 'weather'),
    location: d.location || '',
    city: d.city || '',
    volume: num(cfg.volume, 60),
    brightness: num(cfg.brightness, 80),
    autoOta: Boolean(cfg.autoOta),
  };
}
