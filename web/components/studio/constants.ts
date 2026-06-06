/* ============================================================
   studio/constants.ts — emotion + scene options for the Live Studio.
   Ported from web-preview.jsx.
   ============================================================ */

import { LUNI_EMOTIONS } from '@/components/brand/emotions';

export interface StudioEmotion {
  id: string;
  label: string;
  color: string;
}

export const STUDIO_EMOTIONS: StudioEmotion[] = Object.entries(LUNI_EMOTIONS)
  .filter(([k, v]) => v.settable && k !== 'idle')
  .map(([k, v]) => ({ id: k, label: v.label, color: v.color }));

export interface Scene {
  id: string;
  label: string;
  icon: string;
}

export const SCENES: Scene[] = [
  { id: 'weather', label: 'Thời tiết', icon: 'sun' },
  { id: 'moon', label: 'Tuần trăng', icon: 'moon' },
  { id: 'clock', label: 'Đồng hồ', icon: 'clock' },
  { id: 'network', label: 'Mạng', icon: 'wifi' },
  { id: 'sleep', label: 'Ngủ', icon: 'power' },
];
