/* ============================================================
   hooks/useDevices.ts — React Query wrappers for device data.
   ============================================================ */
'use client';

import { useQueries, useQuery } from '@tanstack/react-query';
import * as devicesApi from '@/lib/api/devices';
import * as interactionsApi from '@/lib/api/interactions';
import * as otaApi from '@/lib/api/ota';
import * as statsApi from '@/lib/api/stats';
import type { DeviceStatus } from '@/lib/api/types';

export function useDevices() {
  return useQuery({ queryKey: ['devices'], queryFn: devicesApi.listDevices });
}

export function useDeviceStatus(id?: string) {
  return useQuery({
    queryKey: ['device-status', id],
    queryFn: () => devicesApi.getDeviceStatus(id as string),
    enabled: !!id,
    refetchInterval: 20_000,
  });
}

export function useInteractions(id?: string) {
  return useQuery({
    queryKey: ['interactions', id],
    queryFn: () => interactionsApi.getInteractions(id as string),
    enabled: !!id,
  });
}

export function useStats(id?: string, days = 7) {
  return useQuery({
    queryKey: ['stats', id, days],
    queryFn: () => statsApi.getStats(id as string, days),
    enabled: !!id,
  });
}

export function useOtaCheck(id?: string, currentVersion = '') {
  return useQuery({
    queryKey: ['ota-check', id, currentVersion],
    queryFn: () => otaApi.otaCheck(id as string, currentVersion),
    enabled: !!id,
  });
}

/** Fetch live status for many devices at once → { id: status }. */
export function useDeviceStatuses(ids: string[]): Record<string, DeviceStatus | undefined> {
  const results = useQueries({
    queries: ids.map((id) => ({
      queryKey: ['device-status', id],
      queryFn: () => devicesApi.getDeviceStatus(id),
      refetchInterval: 20_000,
    })),
  });
  const map: Record<string, DeviceStatus | undefined> = {};
  ids.forEach((id, i) => {
    map[id] = results[i]?.data;
  });
  return map;
}
