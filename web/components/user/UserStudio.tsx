'use client';

import { useDeviceSocket } from '@/lib/ws/useDeviceSocket';
import type { MyDevice, StudioDevice } from '@/lib/types';
import { LiveStudio } from '@/components/studio/LiveStudio';
import { DeviceSwitch, MiniStat } from './parts';

export function UserStudio({
  device,
  devices,
  sel,
  setSel,
}: {
  device: MyDevice;
  devices: StudioDevice[];
  sel: string | null;
  setSel: (id: string) => void;
}) {
  // live telemetry merged over the REST snapshot (battery/rssi/online)
  const live = useDeviceSocket(device.id);
  const liveDevice: MyDevice = {
    ...device,
    online: device.online || live.connected,
    battery: live.battery?.percent ?? device.battery,
    charging: live.battery?.charging ?? device.charging,
    rssi: live.rssi ?? device.rssi,
  };
  return (
    <>
      <div style={{ marginBottom: 18 }}>
        <DeviceSwitch devices={devices} sel={sel} onSel={setSel} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 18 }}>
        <LiveStudio device={liveDevice} key={device.id} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
          <MiniStat icon="battery" label={liveDevice.charging ? 'Đang sạc' : 'Pin'} value={liveDevice.battery + '%'} tone="#7BE88E" />
          <MiniStat icon="signal" label="Sóng Wi-Fi" value={liveDevice.rssi + ' dBm'} tone="#76B8FF" />
          <MiniStat icon="cpu" label="Firmware" value={'v' + device.fw} tone="var(--acc)" />
          <MiniStat icon="location" label="Vị trí" value={device.city || '—'} tone="#FFD166" />
        </div>
      </div>
    </>
  );
}
