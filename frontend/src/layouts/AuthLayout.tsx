import { Outlet } from 'react-router-dom';
import { Wordmark } from './Wordmark';

/** Centred card, no header (docs/03 §4). */
export function AuthLayout() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <div className="w-full max-w-[420px]">
        <div className="flex flex-col items-center gap-1 pb-6 text-center">
          <Wordmark className="text-lg" />
          <p className="text-xs text-slate-500">Track bugs, not paperwork</p>
        </div>
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 bg-slate-50/70 px-6 py-4 sm:px-7">
            <p className="text-xs font-medium tracking-wide text-slate-500 uppercase">Secure workspace</p>
          </div>
          <div className="p-6 sm:p-7">
          <Outlet />
          </div>
        </div>
      </div>
    </main>
  );
}
