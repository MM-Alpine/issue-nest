import { Outlet } from 'react-router-dom';
import { Wordmark } from './Wordmark';

/** Jira-style centered auth shell with no application chrome. */
export function AuthLayout() {
  return (
    <main className="auth-shell">
      <div className="auth-art auth-art-left" aria-hidden="true" />
      <div className="auth-art auth-art-right" aria-hidden="true" />
      <section className="auth-panel">
        <div className="auth-card-shell">
          <Wordmark className="auth-logo" />
          <Outlet />
        </div>
      </section>
    </main>
  );
}
