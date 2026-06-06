/* ============================================================
   emotions.ts — turn raw emotion counts (from the API) into chart rows
   (% share + label + tone) using the brand emotion table.
   ============================================================ */

import type { EmotionStat } from '@/lib/api/types';
import type { HBarRow } from '@/components/base/ui';
import { LUNI_EMOTIONS } from '@/components/brand/emotions';

export function emotionDistRows(stats: EmotionStat[]): HBarRow[] {
  const total = stats.reduce((s, e) => s + e.count, 0) || 1;
  return stats.map((e) => {
    const m = LUNI_EMOTIONS[e.emotion] || { label: e.emotion, color: '#8592AB' };
    return { label: m.label, v: Math.round((e.count / total) * 100), c: m.color, unit: '%' };
  });
}
