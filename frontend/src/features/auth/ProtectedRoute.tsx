import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { PageSpinner } from '../../components/Spinner';
import { useAuth } from './auth-context';

/**
 * Spinner while the session is being restored (prevents a login-screen flash), the
 * route once it resolves, /login when it fails. Purely a usability control — the API
 * enforces access on every request.
 */
export function ProtectedRoute() {
  const { user, isRestoring } = useAuth();
  const location = useLocation();

  if (isRestoring) return <PageSpinner label="Restoring your session" />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;

  return <Outlet />;
}

/** Keeps a signed-in user off /login and /signup. */
export function PublicOnlyRoute() {
  const { user, isRestoring } = useAuth();

  if (isRestoring) return <PageSpinner label="Restoring your session" />;
  if (user) return <Navigate to="/projects" replace />;

  return <Outlet />;
}
