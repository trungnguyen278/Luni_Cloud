/* ============================================================
   api/stats.ts — per-device usage stats.
   ============================================================ */
'use client';

import { apiJson } from './client';
import type { DeviceStats } from './types';

export const getStats = (id: string, days = 7) => apiJson<DeviceStats>(`/devices/${id}/stats?days=${days}`, 'GET');
