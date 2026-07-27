import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import * as authApi from '../api/auth';
import { ChevronDownIcon, LogoutIcon } from '../components/icons';
import { useAuth } from '../features/auth/auth-context';
import { initials } from '../utils/format';
import { Wordmark } from './Wordmark';

export function AppLayout() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [accountOpen, setAccountOpen] = useState(false);
  const accountRef = useRef<HTMLDivElement | null>(null);
  const firstMenuItemRef = useRef<HTMLAnchorElement | null>(null);

  useEffect(() => {
    if (!accountOpen) return;

    const onPointerDown = (event: PointerEvent) => {
      if (!accountRef.current?.contains(event.target as Node)) setAccountOpen(false);
    };
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') setAccountOpen(false);
    };

    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [accountOpen]);

  const handleLogout = () => {
    setAccountOpen(false);
    void authApi.logout();
    signOut();
    navigate('/login', { replace: true });
  };

  const handleAccountKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>) => {
    if (event.key !== 'ArrowDown' && event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    setAccountOpen(true);
    window.requestAnimationFrame(() => firstMenuItemRef.current?.focus());
  };

  return (
    <div className="min-h-screen">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-white focus:px-3 focus:py-2 focus:text-sm focus:shadow"
      >
        Skip to content
      </a>

      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 shadow-[0_1px_0_rgba(15,23,42,0.03)] backdrop-blur">
        <div className="mx-auto flex h-16 max-w-[1280px] items-center gap-3 px-3 sm:gap-6 sm:px-6">
          <Link to="/projects" className="shrink-0 rounded-md" aria-label="IssueHub home">
            <Wordmark />
          </Link>

          <nav className="min-w-0 flex-1">
            <NavLink
              to="/projects"
              className={({ isActive }) =>
                `inline-flex h-9 items-center rounded-md px-3 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-slate-100 text-slate-900'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`
              }
            >
              Projects
            </NavLink>
          </nav>

          {user && (
            <div ref={accountRef} className="relative shrink-0">
              <button
                type="button"
                aria-haspopup="menu"
                aria-expanded={accountOpen}
                onClick={() => setAccountOpen((open) => !open)}
                onKeyDown={handleAccountKeyDown}
                className="inline-flex h-10 items-center gap-2 rounded-full border border-slate-200 bg-white py-1 pr-2 pl-1 shadow-sm transition-[background-color,border-color,box-shadow] hover:border-slate-300 hover:bg-slate-50"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-xs font-semibold text-indigo-700 ring-1 ring-indigo-200">
                  {initials(user.name)}
                </span>
                <span className="hidden max-w-36 truncate text-sm font-medium text-slate-700 sm:inline">
                  {user.name}
                </span>
                <span className="text-slate-400">
                  <ChevronDownIcon className="h-4 w-4" />
                </span>
              </button>

              {accountOpen && (
                <div
                  role="menu"
                  aria-label="Account menu"
                  className="animate-panel-in absolute right-0 mt-2 w-72 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg"
                >
                  <div className="flex items-center gap-3 border-b border-slate-200 px-4 py-4">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-sm font-semibold text-indigo-700 ring-1 ring-indigo-200">
                      {initials(user.name)}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900">{user.name}</p>
                      <p className="truncate text-xs text-slate-500">{user.email}</p>
                    </div>
                  </div>

                  <div className="p-1.5">
                    <Link
                      to="/projects"
                      role="menuitem"
                      ref={firstMenuItemRef}
                      onClick={() => setAccountOpen(false)}
                      className="flex rounded-md px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-900 focus:bg-slate-50"
                    >
                      Projects
                    </Link>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={handleLogout}
                      className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
                    >
                      <LogoutIcon />
                      Log out
                    </button>
                  </div>
                </div>
              )}
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
