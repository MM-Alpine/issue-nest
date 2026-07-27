import type { ReactNode } from 'react';
import { AlertIcon, InboxIcon } from './icons';
import { Button } from './Button';

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-slate-200 bg-white px-6 py-12 text-center shadow-sm">
      <span className="text-slate-300">
        <InboxIcon />
      </span>
      <h3 className="text-base font-semibold text-slate-900">{title}</h3>
      <p className="max-w-sm text-sm text-slate-500">{description}</p>
      {action}
    </div>
  );
}

export function ErrorState({
  title = "Couldn't load this",
  message,
  onRetry,
}: {
  title?: string;
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center gap-3 rounded-lg border border-slate-200 bg-white px-6 py-12 text-center shadow-sm"
    >
      <span className="text-red-500">
        <AlertIcon />
      </span>
      <h3 className="text-base font-semibold text-slate-900">{title}</h3>
      {message && <p className="max-w-sm text-sm text-slate-500">{message}</p>}
      {onRetry && (
        <Button variant="secondary" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}
