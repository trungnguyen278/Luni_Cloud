/* ============================================================
   api/firmware.ts — admin firmware management.
   ============================================================ */
'use client';

import { apiJson, apiUpload } from './client';
import type { FirmwareBuild } from './types';

export const listFirmware = () => apiJson<FirmwareBuild[]>('/admin/firmware', 'GET');

export interface FirmwareUpload {
  file: File;
  version: string;
  model: string;
  channel: 'stable' | 'beta';
  changelog?: string;
}

export function uploadFirmware(u: FirmwareUpload): Promise<FirmwareBuild> {
  const form = new FormData();
  form.append('file', u.file);
  form.append('version', u.version);
  form.append('model', u.model);
  form.append('channel', u.channel);
  form.append('changelog', u.changelog || '');
  return apiUpload<FirmwareBuild>('/admin/firmware', form);
}

export const deleteFirmware = (id: string) => apiJson<{ status: string }>(`/admin/firmware/${id}`, 'DELETE');
