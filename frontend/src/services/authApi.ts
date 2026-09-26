/* Drop this in src/services/authApi.ts */
import { http, setAuthToken } from './http';
import type { UserRole } from '../types/erp';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  department: string;
}

export interface LoginResponse {
  token: string;
  user: AuthUser;
}

/** POST /api/v1/auth/login */
export async function login(email: string, password: string): Promise<AuthUser> {
  const result = await http<LoginResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password })
  });
  setAuthToken(result.token);
  return result.user;
}

export function logout() {
  setAuthToken(null);
}

/** GET /api/v1/auth/me — call on app load to restore a session from a stored token. */
export async function fetchCurrentUser(): Promise<AuthUser> {
  return http<AuthUser>('/auth/me');
}
