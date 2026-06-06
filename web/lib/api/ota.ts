/* ============================================================
   api/ota.ts — OTA check + trigger.
   ============================================================ */
'use client';

import { apiJson } from './client';
import type { OtaCheck } from './types';

export const otaCheck = (id: string, currentVersion = '') =>
  apiJson<OtaCheck>(`/ota/check?device_id=${encodeURIComponent(id)}&current_version=${encodeURIComponent(currentVersion)}`, 'GET');

export const otaTrigger = (id: string, firmwareId: string) =>
  apiJson<{ status: string; sent: boolean; firmware_id: string }>(`/devices/${id}/ota`, 'POST', { firmware_id: firmwareId });
