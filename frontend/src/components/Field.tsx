import type { ReactNode } from 'react';

interface FieldProps {
  id: string;
  label: string;
  /** Errors REPLACE helper text; the two never show at once (docs/03 §6). */
  error?: string;
  hint?: string;
  children: ReactNode;
}

export function Field({ id, label, error, hint, children }: FieldProps) {
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-[13px] font-medium text-slate-700">
        {label}
      </label>
      {/* Children read aria-describedby/aria-invalid from the props we pass them. */}
      <div data-describedby={describedBy}>{children}</div>
      {error ? (
        <p id={`${id}-error`} className="text-xs text-red-600">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-xs text-slate-500">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
