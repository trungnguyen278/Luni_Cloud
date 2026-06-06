/* ============================================================
   api/interactions.ts — chat history + AI interact.
   ============================================================ */
'use client';

import { apiJson } from './client';
import type { InteractResult, Interaction } from './types';

export const getInteractions = (id: string, limit = 50, offset = 0) =>
  apiJson<Interaction[]>(`/devices/${id}/interactions?limit=${limit}&offset=${offset}`, 'GET');

export const interact = (id: string, text: string, source = 'web') =>
  apiJson<InteractResult>(`/devices/${id}/interact`, 'POST', { text, source });

export const clearInteractions = (id: string) => apiJson<{ status: string }>(`/devices/${id}/interactions`, 'DELETE');
