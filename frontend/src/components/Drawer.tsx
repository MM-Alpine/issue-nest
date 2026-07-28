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
    <div className="overlay issuehub-drawer-overlay">
      <button type="button" className="issuehub-overlay-button" onClick={onClose} aria-label="Close panel" />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="detail-panel issuehub-drawer-panel"
      >
        <header className="modal-header">
          <div className="modal-header-copy">
            <h2 id={titleId}>{title}</h2>
            <p>Project access and collaboration.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close panel"
            className="icon-button"
          >
            <CloseIcon />
          </button>
        </header>
        <div className="detail-body">{children}</div>
      </div>
    </div>
  );
}
