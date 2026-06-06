/* ============================================================
   api/auth.ts — auth endpoint wrappers (/api/v1/auth/*).
   ============================================================ */
'use client';

import { apiJson, clearTokens, getRefreshToken, setAccessToken, setRefreshToken } from './client';
import type { TokenResponse, User } from './types';

export async function login(email: string, password: string): Promise<User> {
  const data = await apiJson<TokenResponse>('/auth/login', 'POST', { email, password });
  setAccessToken(data.access_token);
  setRefreshToken(data.refresh_token);
  return data.user;
}

export function fetchMe(): Promise<User> {
  return apiJson<User>('/auth/me', 'GET');
}

export async function logout(): Promise<void> {
  const rt = getRefreshToken();
  try {
    if (rt) await apiJson('/auth/logout', 'POST', { refresh_token: rt });
  } catch {
    // best-effort revoke; clear locally regardless
  }
  clearTokens();
}

export function changePassword(current_password: string, new_password: string): Promise<void> {
  return apiJson<void>('/auth/change-password', 'POST', { current_password, new_password });
}

export function updateProfile(body: { name?: string; avatar_url?: string }): Promise<User> {
  return apiJson<User>('/auth/me', 'PATCH', body);
}
