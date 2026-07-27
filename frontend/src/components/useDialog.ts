import { useEffect, useRef } from 'react';

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
const PREFERRED_FOCUSABLE =
  '[data-autofocus], input[autofocus], select[autofocus], textarea[autofocus]';

/**
 * Shared dialog behaviour for the modal and the drawer (docs/03 §9):
 * Escape closes · focus moves in on open and returns to the trigger on close ·
 * Tab is trapped inside the panel · background scroll is locked.
 */
export function useDialog(open: boolean, onClose: () => void) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  // Callers pass an inline arrow, so `onClose` has a new identity every render. Keeping
  // it in a ref means the effect below depends ONLY on `open` — otherwise any unrelated
  // parent re-render (e.g. a mutation invalidating a query while the drawer is open)
  // would tear the effect down and re-run it, yanking focus out of the panel and back.
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;

    previouslyFocused.current = document.activeElement as HTMLElement | null;

    const panel = panelRef.current;
    const focusFrame = window.requestAnimationFrame(() => {
      const preferred = panel?.querySelector<HTMLElement>(PREFERRED_FOCUSABLE);
      const first = panel?.querySelector<HTMLElement>(FOCUSABLE);
      (preferred ?? first ?? panel)?.focus();
    });

    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (event.key !== 'Tab' || !panelRef.current) return;

      const focusable = Array.from(panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (focusable.length === 0) return;

      const firstEl = focusable[0] as HTMLElement;
      const lastEl = focusable.at(-1) as HTMLElement;

      if (!event.shiftKey && document.activeElement === lastEl) {
        event.preventDefault();
        firstEl.focus();
      } else if (event.shiftKey && document.activeElement === firstEl) {
        event.preventDefault();
        lastEl.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      window.cancelAnimationFrame(focusFrame);
      document.body.style.overflow = overflow;
      previouslyFocused.current?.focus();
    };
  }, [open]);

  return panelRef;
}
