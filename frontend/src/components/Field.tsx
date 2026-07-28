import type { ReactNode } from 'react';

interface FieldProps {
  id: string;
  label: string;
  /** Errors REPLACE helper text; the two never show at once (docs/03 §6). */
  error?: string;
  hint?: string;
  full?: boolean;
  children: ReactNode;
}

export function Field({ id, label, error, hint, full = false, children }: FieldProps) {
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;

  return (
    <div className={`field ${full ? 'full' : ''} ${error ? 'invalid' : ''}`}>
      <label htmlFor={id}>
        {label}
      </label>
      {/* Children read aria-describedby/aria-invalid from the props we pass them. */}
      <div data-describedby={describedBy}>{children}</div>
      {error ? (
        <p id={`${id}-error`} className="field-error">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="helper">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
