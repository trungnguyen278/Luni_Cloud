/* ============================================================
   api/users.ts — admin user management.
   ============================================================ */
'use client';

import { apiJson } from './client';
import type { AdminUser } from './types';

export const listUsers = () => apiJson<AdminUser[]>('/admin/users', 'GET');

export const updateUser = (id: string, body: { role?: string; is_active?: boolean }) =>
  apiJson<AdminUser>(`/admin/users/${id}`, 'PATCH', body);

export const deactivateUser = (id: string) => apiJson<{ status: string }>(`/admin/users/${id}`, 'DELETE');

export interface CreateUserBody {
  email: string;
  name: string;
  role: string;
}
export interface CreatedUser extends AdminUser {
  temp_password?: string | null;
}
export const createUser = (body: CreateUserBody) => apiJson<CreatedUser>('/admin/users', 'POST', body);
