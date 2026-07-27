import type { ReactNode } from 'react';

/**
 * Form-level error, shown above the submit button when the failure cannot be
 * attributed to a single field (docs/03 §6).
 */
export function Alert({ children }: { children: ReactNode }) {
  return (
    <div
      role="alert"
      className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
    >
      <span aria-hidden="true">⚠</span>
      <span>{children}</span>
    </div>
  );
}
