import { useId, type ReactNode } from 'react';
import { CloseIcon } from './icons';
import { useDialog } from './useDialog';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'lg';
}

/** Full-screen sheet below 640px, centred card above (docs/03 §8). */
export function Modal({ open, onClose, title, children, footer, size = 'sm' }: ModalProps) {
  const titleId = useId();
  const panelRef = useDialog(open, onClose);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <div
        className="animate-fade-in absolute inset-0 bg-slate-900/45"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={`animate-panel-in motion-scale relative flex max-h-full w-full flex-col overflow-hidden bg-white shadow-lg sm:rounded-lg sm:border sm:border-slate-200 ${
          size === 'lg' ? 'sm:max-w-2xl' : 'sm:max-w-lg'
        }`}
      >
        <header className="flex items-center justify-between border-b border-slate-200 px-4 py-3 sm:px-6">
          <h2 id={titleId} className="text-base font-semibold text-slate-900">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="rounded-md p-1 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
          >
            <CloseIcon />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6">{children}</div>

        {footer && (
          <footer className="flex flex-col-reverse gap-2 border-t border-slate-200 bg-slate-50 px-4 py-3 sm:flex-row sm:justify-end sm:px-6">
            {footer}
          </footer>
        )}
      </div>
    </div>
  );
}
