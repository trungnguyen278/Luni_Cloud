/* ============================================================
   hooks/useAdmin.ts — React Query wrappers for admin data.
   ============================================================ */
'use client';

import { useQuery } from '@tanstack/react-query';
import { getAdminDevices, getAdminOverview, getAiUsage, getEmotionStats } from '@/lib/api/admin';
import { getDeviceLogs, getServerLogs, type LogFilter } from '@/lib/api/logs';
import { listFirmware } from '@/lib/api/firmware';
import { listUsers } from '@/lib/api/users';

export function useFirmware() {
  return useQuery({ queryKey: ['firmware'], queryFn: listFirmware });
}

export function useUsers() {
  return useQuery({ queryKey: ['admin-users'], queryFn: listUsers });
}

export function useAdminDevices() {
  return useQuery({ queryKey: ['admin-devices'], queryFn: getAdminDevices, refetchInterval: 20_000 });
}

export function useAdminOverview() {
  return useQuery({ queryKey: ['admin-overview'], queryFn: getAdminOverview, refetchInterval: 30_000 });
}

export function useEmotionStats(days = 7) {
  return useQuery({ queryKey: ['emotion-stats', days], queryFn: () => getEmotionStats(days) });
}

export function useAiUsage(days = 30) {
  return useQuery({ queryKey: ['ai-usage', days], queryFn: () => getAiUsage(days) });
}

export function useDeviceLogs(filter: LogFilter, enabled = true) {
  return useQuery({
    queryKey: ['logs-devices', filter],
    queryFn: () => getDeviceLogs(filter),
    enabled,
    refetchInterval: 15_000,
  });
}

export function useServerLogs(filter: LogFilter, enabled = true) {
  return useQuery({
    queryKey: ['logs-server', filter],
    queryFn: () => getServerLogs(filter),
    enabled,
    refetchInterval: 15_000,
  });
}
