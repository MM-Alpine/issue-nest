export function Spinner({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className}`} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth={4} className="opacity-25" />
      <path
        d="M12 2a10 10 0 0 1 10 10"
        stroke="currentColor"
        strokeWidth={4}
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Full-page spinner used while the session is being restored. */
export function PageSpinner({ label = 'Loading' }: { label?: string }) {
  return (
    <div
      className="flex min-h-[60vh] items-center justify-center text-slate-400"
      role="status"
      aria-busy="true"
    >
      <Spinner className="h-7 w-7" />
      <span className="sr-only">{label}</span>
    </div>
  );
}
