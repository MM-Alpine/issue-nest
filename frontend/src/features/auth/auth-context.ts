import { createContext, useContext } from 'react';
import type { CurrentUser } from '../../types/api';

export interface AuthApi {
  user: CurrentUser | null;
  /** True only while the stored token is being confirmed against GET /api/me. */
  isRestoring: boolean;
  signIn: (token: string, user: CurrentUser) => void;
  signOut: (options?: { expired?: boolean }) => void;
}

export const AuthContext = createContext<AuthApi | null>(null);

export function useAuth(): AuthApi {
  const api = useContext(AuthContext);
  if (!api) throw new Error('useAuth must be used inside <AuthProvider>');
  return api;
}
