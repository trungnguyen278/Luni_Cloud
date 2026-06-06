/* ============================================================
   format.ts — small pure formatting/color helpers shared across
   the console. Ported from web-base.jsx (hexA2), luni-face.jsx (hexA),
   web-data.jsx (fmtSize) and web-cost.jsx (fmtVnd, fmtNum).
   ============================================================ */

/** hex (#rrggbb) → rgba(...) with the given alpha. */
export function hexA(hex: string, a: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

/** alpha helper tolerant of var()/named colors — falls back to color-mix. */
export function hexA2(c: string, a: number): string {
  if (typeof c === 'string' && c[0] === '#') return hexA(c, a);
  return `color-mix(in oklch, ${c} ${Math.round(a * 100)}%, transparent)`;
}

/** bytes → human MB string, e.g. "1.20 MB". */
export function fmtSize(bytes: number): string {
  return (bytes / 1048576).toFixed(2) + ' MB';
}

/** compact VND, e.g. 14_280_000 → "14.28Tr ₫", 10_500 → "10.5K ₫". */
export function fmtVnd(n: number, sym = '₫'): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(2) + 'Tr ' + sym;
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K ' + sym;
  return Math.round(n) + ' ' + sym;
}

/** compact number, e.g. 1_200_000 → "1.2M", 52_400 → "52.4K". */
export function fmtNum(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return String(Math.round(n));
}
