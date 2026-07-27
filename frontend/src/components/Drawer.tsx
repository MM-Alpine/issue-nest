import { useId, type ReactNode } from 'react';
import { CloseIcon } from './icons';
import { useDialog } from './useDialog';

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

/** Right-side panel; full width on mobile. */
export function Drawer({ open, onClose, title, children }: DrawerProps) {
  const titleId = useId();
  const panelRef = useDialog(open, onClose);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div
        className="animate-fade-in absolute inset-0 bg-slate-900/40"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="animate-drawer-in motion-scale relative flex h-full w-full max-w-md flex-col bg-white shadow-lg sm:border-l sm:border-slate-200"
      >
        <header className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <h2 id={titleId} className="text-base font-semibold text-slate-900">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close panel"
            className="rounded-md p-1 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
          >
            <CloseIcon />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto px-4 py-4">{children}</div>
      </div>
    </div>
  );
}
