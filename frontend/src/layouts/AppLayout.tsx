import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import * as authApi from '../api/auth';
import { Button } from '../components/Button';
import { useAuth } from '../features/auth/auth-context';
import { initials } from '../utils/format';
import { Wordmark } from './Wordmark';

export function AppLayout() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    void authApi.logout();
    signOut();
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-white focus:px-3 focus:py-2 focus:text-sm focus:shadow"
      >
        Skip to content
      </a>

      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-14 max-w-[1280px] items-center gap-6 px-4 sm:px-6">
          <Link to="/projects" className="rounded-md" aria-label="IssueHub home">
            <Wordmark />
          </Link>

          <nav className="flex-1">
            <NavLink
              to="/projects"
              className={({ isActive }) =>
                `rounded-md px-2 py-1 text-sm transition-colors ${
                  isActive ? 'font-medium text-slate-900' : 'text-slate-600 hover:text-slate-900'
                }`
              }
            >
              Projects
            </NavLink>
          </nav>

          {user && (
            <div className="flex items-center gap-3">
              <span className="hidden text-sm text-slate-600 sm:inline">{user.name}</span>
              <span
                className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-100 text-[11px] font-semibold text-indigo-700 sm:hidden"
                title={user.name}
              >
                {initials(user.name)}
              </span>
              <Button variant="ghost" onClick={handleLogout}>
                Log out
              </Button>
            </div>
          )}
        </div>
      </header>

      <main id="main-content" className="mx-auto max-w-[1280px] px-4 py-6 sm:px-6 sm:py-8">
        <Outlet />
      </main>
    </div>
  );
}
