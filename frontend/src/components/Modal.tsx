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
    <div className="overlay">
      <button type="button" className="issuehub-overlay-button" onClick={onClose} aria-label="Close dialog" />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={`modal ${size === 'lg' ? '' : 'narrow'}`}
      >
        <header className="modal-header">
          <div className="modal-header-copy">
            <h2 id={titleId}>{title}</h2>
            <p>Complete the form below.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="icon-button"
          >
            <CloseIcon />
          </button>
        </header>

        <div className="modal-body">{children}</div>

        {footer && (
          <footer className="modal-footer">{footer}</footer>
        )}
      </div>
    </div>
  );
}
