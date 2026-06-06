/* ============================================================
   emotions.ts — Luni's emotion table (ported from luni-face.jsx).
   `face` = eye-shape archetype; `color` follows the 9-tone palette.
   settable:true = controllable via WS SET_EMOTION; others are
   display-only (the robot expresses them autonomously).
   ============================================================ */

export interface Emotion {
  color: string;
  label: string;
  face: string;
  settable?: boolean;
}

export const LUNI_EMOTIONS: Record<string, Emotion> = {
  neutral: { color: '#5BE9FF', label: 'Bình thường', face: 'idle', settable: true },
  idle: { color: '#5BE9FF', label: 'Bình thường', face: 'idle' },
  happy: { color: '#FFD166', label: 'Vui vẻ', face: 'arc', settable: true },
  excited: { color: '#FFD166', label: 'Phấn khích', face: 'wide', settable: true },
  curious: { color: '#FF9D5B', label: 'Tò mò', face: 'curious', settable: true },
  confused: { color: '#FF9D5B', label: 'Bối rối', face: 'curious', settable: true },
  annoyed: { color: '#FF9D5B', label: 'Khó chịu', face: 'angry', settable: true },
  nervous: { color: '#FF9D5B', label: 'Lo lắng', face: 'curious', settable: true },
  calm: { color: '#76B8FF', label: 'Thư giãn', face: 'oval', settable: true },
  cool: { color: '#5BE9FF', label: 'Ngầu', face: 'oval', settable: true },
  thinking: { color: '#5BE9FF', label: 'Đang nghĩ', face: 'idle', settable: true },
  sad: { color: '#76B8FF', label: 'Buồn', face: 'sad', settable: true },
  angry: { color: '#FF5B6E', label: 'Giận', face: 'angry', settable: true },
  disgusted: { color: '#7BE88E', label: 'Ghê', face: 'sad', settable: true },
  // display-only (robot expresses these on its own; not on SET_EMOTION map)
  love: { color: '#FF6B9D', label: 'Yêu thích', face: 'arc' },
  sleepy: { color: '#B48CFF', label: 'Buồn ngủ', face: 'sleepy' },
  alert: { color: '#FF5B6E', label: 'Cảnh báo', face: 'wide' },
};
