/** Sized to the real content so nothing shifts when data arrives (docs/03 §7). */
export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-slate-200 ${className}`} />;
}

export function SkeletonCards({ count = 3 }: { count?: number }) {
  return (
    <div
      className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
      role="status"
      aria-busy="true"
      aria-label="Loading projects"
    >
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <Skeleton className="h-3 w-12" />
          <Skeleton className="mt-3 h-4 w-40" />
          <Skeleton className="mt-2 h-3 w-full" />
          <Skeleton className="mt-4 h-3 w-28" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonRows({ count = 5 }: { count?: number }) {
  return (
    <div
      className="divide-y divide-slate-200"
      role="status"
      aria-busy="true"
      aria-label="Loading issues"
    >
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="flex items-center gap-4 px-4 py-3.5">
          <Skeleton className="h-4 flex-1" />
          <Skeleton className="hidden h-4 w-24 sm:block" />
          <Skeleton className="hidden h-4 w-16 sm:block" />
          <Skeleton className="hidden h-4 w-10 lg:block" />
        </div>
      ))}
    </div>
  );
}
