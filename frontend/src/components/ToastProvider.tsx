import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react';
import { ToastContext, type Toast, type ToastTone } from './toast-context';

const DISMISS_AFTER_MS = 3000;

/**
 * ~60 lines instead of a toast dependency (docs/02 §1). Success toasts announce
 * politely; error toasts use role="alert" so they interrupt (docs/03 §9).
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(0);

  const push = useCallback((tone: ToastTone, message: string) => {
    const id = nextId.current++;
    setToasts((current) => [...current, { id, tone, message }]);
    window.setTimeout(() => {
      setToasts((current) => current.filter((t) => t.id !== id));
    }, DISMISS_AFTER_MS);
  }, []);

  const api = useMemo(
    () => ({
      success: (message: string) => push('success', message),
      error: (message: string) => push('error', message),
    }),
    [push],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        className="toast-region pointer-events-none"
        role="status"
        aria-live="polite"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            {...(toast.tone === 'error' ? { role: 'alert' } : {})}
            className={`toast pointer-events-auto ${toast.tone === 'error' ? 'error' : ''}`}
          >
            <span className="toast-icon" aria-hidden="true">✓</span>
            <span className="toast-copy">
              <strong>{toast.tone === 'success' ? 'Done' : 'Issue'}</strong>
              <span>{toast.message}</span>
            </span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
