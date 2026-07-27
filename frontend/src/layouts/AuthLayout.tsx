import { Outlet } from 'react-router-dom';
import { Wordmark } from './Wordmark';

/** Centred card, no header (docs/03 §4). */
export function AuthLayout() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12">
      <div className="w-full max-w-[420px]">
        <div className="flex flex-col items-center gap-1 pb-6 text-center">
          <Wordmark className="text-lg" />
          <p className="text-xs text-slate-500">Track bugs, not paperwork</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
          <Outlet />
        </div>
      </div>
    </main>
  );
}
