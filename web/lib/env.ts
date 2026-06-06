/* ============================================================
   env.ts — runtime resolution of API + WebSocket base URLs.

   The app is served same-origin behind nginx (/api → api:8000,
   /ws → api:8000), so we derive both from the current origin at
   runtime. This sidesteps the NEXT_PUBLIC_* build-vs-runtime problem
   (those are inlined at build, but compose supplies them at runtime
   and NEXT_PUBLIC_WS_URL contains an unresolved ${DOMAIN}). When a
   fully-resolved env value is present we still honor it.
   ============================================================ */

/** REST base — e.g. "/api" (same-origin, nginx proxies to FastAPI). */
export function getApiBase(): string {
  return process.env.NEXT_PUBLIC_API_URL || '/api';
}

/** WebSocket base — e.g. "wss://lunirobot.io.vn/ws". */
export function getWsBase(): string {
  const env = process.env.NEXT_PUBLIC_WS_URL;
  if (env && !env.includes('${')) return env; // honor only when fully resolved
  if (typeof window !== 'undefined') {
    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${proto}//${window.location.host}/ws`;
  }
  return '/ws';
}
