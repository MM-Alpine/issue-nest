import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import * as authApi from '../../api/auth';
import { tokenStorage, UNAUTHORIZED_EVENT } from '../../api/client';
import { useToast } from '../../components/toast-context';
import type { CurrentUser } from '../../types/api';
import { AuthContext } from './auth-context';

/**
 * Auth is the only client state worth a context; everything else is server state in
 * TanStack Query (docs/02 §1). On mount a stored token is confirmed with GET /api/me,
 * so a revoked or expired token never renders a half-logged-in UI (docs/04 §4).
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [isRestoring, setIsRestoring] = useState<boolean>(() => tokenStorage.get() !== null);

  const signIn = useCallback((token: string, nextUser: CurrentUser) => {
    tokenStorage.set(token);
    setUser(nextUser);
  }, []);

  const signOut = useCallback(
    (options?: { expired?: boolean }) => {
      tokenStorage.clear();
      setUser(null);
      queryClient.clear();
      if (options?.expired) toast.error('Your session expired. Please log in again.');
    },
    [queryClient, toast],
  );

  useEffect(() => {
    if (!tokenStorage.get()) {
      setIsRestoring(false);
      return;
    }

    let cancelled = false;
    authApi
      .getMe()
      .then(({ user: restored }) => {
        if (!cancelled) setUser(restored);
      })
      .catch(() => {
        // apiFetch already cleared the token and emitted the unauthorized event.
        if (!cancelled) setUser(null);
      })
      .finally(() => {
        if (!cancelled) setIsRestoring(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // A 401 from ANY request logs out once, centrally, instead of per component.
  useEffect(() => {
    const onUnauthorized = () => {
      setUser((current) => {
        if (current) {
          queryClient.clear();
          toast.error('Your session expired. Please log in again.');
        }
        return null;
      });
    };

    window.addEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
  }, [queryClient, toast]);

  const value = useMemo(
    () => ({ user, isRestoring, signIn, signOut }),
    [user, isRestoring, signIn, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
