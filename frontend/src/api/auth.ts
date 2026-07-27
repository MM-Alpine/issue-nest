import type { AuthResponse, CurrentUser } from '../types/api';
import { apiFetch } from './client';

export const signup = (body: { name: string; email: string; password: string }) =>
  apiFetch<AuthResponse>('/api/auth/signup', { method: 'POST', body, skipAuthRedirect: true });

export const login = (body: { email: string; password: string }) =>
  apiFetch<AuthResponse>('/api/auth/login', { method: 'POST', body, skipAuthRedirect: true });

/** Fire-and-forget: a stateless bearer token has nothing to revoke server-side. */
export const logout = () =>
  apiFetch<void>('/api/auth/logout', { method: 'POST', skipAuthRedirect: true }).catch(() => undefined);

export const getMe = () => apiFetch<{ user: CurrentUser }>('/api/me');
