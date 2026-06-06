/* ============================================================
   cost/data.ts — AI cost dashboard demo data + VND formatters.
   There are NO cost endpoints in the backend, so this whole section
   is illustrative (gated by NEXT_PUBLIC_MOCK_COST). Ported from web-cost.jsx.
   ============================================================ */

import { STAT_LABELS } from '@/lib/mock/data';

/** compact đồng: 14_280_000 → "14,28Tr ₫" (VN comma decimal). */
export function fmtVnd(n: number, sym = true): string {
  const s = sym ? ' ₫' : '';
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(2).replace('.', ',') + 'Tr' + s;
  if (n >= 1_000) return Math.round(n / 1_000) + 'K' + s;
  return Math.round(n) + s;
}
export function fmtNum(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace('.', ',') + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace('.', ',') + 'K';
  return String(n);
}

export interface AiService {
  id: string;
  label: string;
  icon: string;
  c: string;
  cost: number;
  share: number;
  note: string;
}
export const AI_SERVICES: AiService[] = [
  { id: 'llm', label: 'Trò chuyện (LLM)', icon: 'chat', c: '#5BE9FF', cost: 8_280_000, share: 58, note: 'Sinh câu trả lời, tính cách Luni' },
  { id: 'stt', label: 'Nhận giọng nói (STT)', icon: 'mic', c: '#76B8FF', cost: 3_140_000, share: 22, note: 'Chuyển lời nói của bé thành văn bản' },
  { id: 'tts', label: 'Giọng nói Luni (TTS)', icon: 'volume', c: '#FFD166', cost: 2_000_000, share: 14, note: 'Đọc câu trả lời bằng giọng thân thiện' },
  { id: 'mem', label: 'Trí nhớ (Embeddings)', icon: 'sparkle', c: '#B48CFF', cost: 860_000, share: 6, note: 'Ghi nhớ sở thích & ngữ cảnh lâu dài' },
];

export interface AiModel {
  model: string;
  kind: string;
  svc: string;
  reqs: number;
  unit: string;
  price: string;
  cost: number;
}
export const AI_MODELS: AiModel[] = [
  { model: 'gpt-4o-mini', kind: 'Chat', svc: '#5BE9FF', reqs: 38_400, unit: '41,2M tokens', price: 'in 5K₫ · out 20K₫ / 1M', cost: 8_280_000 },
  { model: 'whisper-1', kind: 'STT', svc: '#76B8FF', reqs: 38_400, unit: '6.240 phút', price: '146₫ / phút', cost: 3_140_000 },
  { model: 'tts-1', kind: 'TTS', svc: '#FFD166', reqs: 36_100, unit: '4,8M ký tự', price: '366₫ / 1K ký tự', cost: 2_000_000 },
  { model: 'text-embedding-3-small', kind: 'Embeddings', svc: '#B48CFF', reqs: 12_200, unit: '9,6M tokens', price: '0,5K₫ / 1M', cost: 860_000 },
];

export const COST_7D = [398, 472, 451, 560, 528, 642, 705];
export const COST_30D = [330, 360, 345, 410, 388, 455, 470, 442, 505, 488, 530, 512, 575, 548, 602, 588, 540, 610, 595, 560, 648, 622, 590, 660, 638, 612, 680, 665, 642, 705];
export const COST_LABELS_7 = STAT_LABELS;

export interface CostDevice {
  name: string;
  owner: string;
  city: string;
  emotion: string;
  conv: number;
  cost: number;
}
export const COST_DEVICES: CostDevice[] = [
  { name: 'Luni #0142', owner: 'Nguyễn Mai', city: 'Hà Nội', emotion: 'happy', conv: 1842, cost: 642_000 },
  { name: 'Luni #0533', owner: 'Đỗ Quân', city: 'Huế', emotion: 'happy', conv: 1688, cost: 588_000 },
  { name: 'Luni #0098', owner: 'Trần Hùng', city: 'Hồ Chí Minh', emotion: 'sleepy', conv: 1495, cost: 521_000 },
  { name: 'Luni #0420', owner: 'Võ Linh', city: 'Cần Thơ', emotion: 'calm', conv: 1430, cost: 498_000 },
  { name: 'Luni #0311', owner: 'Phạm Đức', city: 'Hải Phòng', emotion: 'curious', conv: 1276, cost: 445_000 },
];

export const COST_TOTAL = 14_280_000;
export const COST_BUDGET = 25_000_000;
export const COST_PROJECTED = 19_400_000;
export const COST_TOKENS = 52_400_000;
export const COST_CONV = 38_400;
export const COST_PER_CONV = Math.round(COST_TOTAL / COST_CONV);
