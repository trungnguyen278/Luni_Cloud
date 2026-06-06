/* ============================================================
   api/admin.ts — admin fleet + analytics endpoints.
   ============================================================ */
'use client';

import { apiJson } from './client';
import type { AdminOverviewData, AiUsage, EmotionStat, RolloutResult } from './types';
import type { FleetDevice } from '@/lib/types';

export const getAdminDevices = () => apiJson<FleetDevice[]>('/admin/devices', 'GET');

export const getAdminOverview = () => apiJson<AdminOverviewData>('/admin/overview', 'GET');

export const getEmotionStats = (days = 7) => apiJson<EmotionStat[]>(`/admin/stats/emotions?days=${days}`, 'GET');

export const getAiUsage = (days = 30) => apiJson<AiUsage>(`/admin/ai/usage?days=${days}`, 'GET');

export const otaRollout = (firmwareId: string, percent = 100) =>
  apiJson<RolloutResult>('/admin/ota/rollout', 'POST', { firmware_id: firmwareId, percent });
