/* ============================================================
   api/logs.ts — admin device + server logs.
   ============================================================ */
'use client';

import { apiJson } from './client';
import type { DeviceLog, ServerLog } from './types';

export interface LogFilter {
  device_id?: string;
  level?: string;
  tag?: string;
  limit?: number;
  offset?: number;
}

function qs(params: Record<string, string | number | undefined>): string {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== '' && v !== 'all') sp.set(k, String(v));
  });
  const s = sp.toString();
  return s ? `?${s}` : '';
}

export const getDeviceLogs = (f: LogFilter = {}) =>
  apiJson<DeviceLog[]>(`/admin/logs/devices${qs({ device_id: f.device_id, level: f.level, tag: f.tag, limit: f.limit ?? 100, offset: f.offset })}`, 'GET');

export const getServerLogs = (f: LogFilter = {}) =>
  apiJson<ServerLog[]>(`/admin/logs/server${qs({ level: f.level, limit: f.limit ?? 100, offset: f.offset })}`, 'GET');

export const setLogLevel = (level: string) => apiJson<{ status: string; level: string }>('/admin/logs/config', 'POST', { level });
