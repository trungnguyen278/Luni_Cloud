/* ============================================================
   api/devices.ts — device + command endpoints.
   ============================================================ */
'use client';

import { apiJson } from './client';
import type { Device, DeviceStatus } from './types';

export const listDevices = () => apiJson<Device[]>('/devices', 'GET');
export const getDevice = (id: string) => apiJson<Device>(`/devices/${id}`, 'GET');
export const getDeviceStatus = (id: string) => apiJson<DeviceStatus>(`/devices/${id}/status`, 'GET');

export const sendCommand = (id: string, type: string, payload: Record<string, unknown> = {}) =>
  apiJson<{ status: string; message_id: string }>(`/devices/${id}/command`, 'POST', { type, payload });

export const updateDevice = (
  id: string,
  body: { name?: string; location?: string; city?: string; config?: Record<string, unknown> },
) => apiJson<Device>(`/devices/${id}`, 'PATCH', body);
