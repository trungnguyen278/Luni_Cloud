/* ============================================================
   api/client.ts — typed fetch wrapper for the Luni Cloud API.
   - access token held in memory; refresh token in a cookie (so the
     server console layout can do a cheap presence check on reload)
   - single-flight auto-refresh on 401, then one retry
   - apiUpload() for multipart (no Content-Type → browser sets boundary)
   ============================================================ */
'use client';

import { getApiBase } from '@/lib/env';

export class ApiError extends Error {
  status: number;
  detail: string;
  constructor(status: number, detail: string) {
    super(detail);
    this.name = 'ApiError';
    this.status = status;
    this.detail = detail;
  }
}

/* ---- token storage ---- */
let accessToken: string | null = null;
export function setAccessToken(t: string | null): void {
  accessToken = t;
}
export function getAccessToken(): string | null {
  return accessToken;
}

const RT_COOKIE = 'luni_rt';
const RT_MAX_AGE = 60 * 60 * 24 * 30; // 30 days (matches refresh token TTL)

export function setRefreshToken(rt: string): void {
  if (typeof document === 'undefined') return;
  const secure = location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${RT_COOKIE}=${encodeURIComponent(rt)}; path=/; max-age=${RT_MAX_AGE}; SameSite=Lax${secure}`;
}
export function getRefreshToken(): string | null {
  if (typeof document === 'undefined') return null;
  const m = document.cookie.match(new RegExp('(?:^|; )' + RT_COOKIE + '=([^;]*)'));
  return m ? decodeURIComponent(m[1]) : null;
}
export function clearTokens(): void {
  accessToken = null;
  if (typeof document !== 'undefined') document.cookie = `${RT_COOKIE}=; path=/; max-age=0; SameSite=Lax`;
}

/* ---- url + refresh ---- */
function apiUrl(path: string): string {
  return `${getApiBase()}/v1${path}`;
}

const AUTH_SKIP = ['/auth/login', '/auth/refresh', '/auth/register', '/auth/forgot-password'];

let refreshPromise: Promise<string> | null = null;
async function doRefresh(): Promise<string> {
  const rt = getRefreshToken();
  if (!rt) throw new ApiError(401, 'no_refresh_token');
  const res = await fetch(apiUrl('/auth/refresh'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: rt }),
  });
  if (!res.ok) throw new ApiError(res.status, 'refresh_failed');
  const data = (await res.json()) as { access_token: string };
  accessToken = data.access_token;
  return data.access_token;
}
function refreshAccessToken(): Promise<string> {
  if (!refreshPromise) refreshPromise = doRefresh().finally(() => (refreshPromise = null));
  return refreshPromise;
}

/** Public single-flight refresh — used by the WebSocket hook on auth-close. */
export function refreshToken(): Promise<string> {
  return refreshAccessToken();
}

async function parseError(res: Response): Promise<string> {
  try {
    const j = await res.json();
    if (typeof j.detail === 'string') return j.detail;
    if (j.detail) return JSON.stringify(j.detail);
    return res.statusText;
  } catch {
    return res.statusText;
  }
}

async function rawFetch(path: string, init: RequestInit, token: string | null): Promise<Response> {
  const headers = new Headers(init.headers);
  if (token) headers.set('Authorization', `Bearer ${token}`);
  return fetch(apiUrl(path), { ...init, headers });
}

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const skip = AUTH_SKIP.some((p) => path.startsWith(p));
  let res = await rawFetch(path, init, skip ? null : accessToken);
  if (res.status === 401 && !skip) {
    try {
      const t = await refreshAccessToken();
      res = await rawFetch(path, init, t);
    } catch {
      clearTokens();
      throw new ApiError(401, 'unauthorized');
    }
  }
  if (!res.ok) throw new ApiError(res.status, await parseError(res));
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

/** JSON request helper. */
export function apiJson<T>(path: string, method: string, body?: unknown): Promise<T> {
  return apiFetch<T>(path, {
    method,
    headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

/** multipart upload — does NOT set Content-Type so the browser adds the boundary. */
export function apiUpload<T>(path: string, form: FormData): Promise<T> {
  return apiFetch<T>(path, { method: 'POST', body: form });
}
