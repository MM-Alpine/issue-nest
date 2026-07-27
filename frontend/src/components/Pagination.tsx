import { Button } from './Button';

interface PaginationProps {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
}

/** Hidden entirely when there is nothing to page through (docs/03 §5.4). */
export function Pagination({ page, totalPages, onChange }: PaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <nav
      aria-label="Issue list pagination"
      className="flex items-center justify-end gap-3 border-t border-slate-200 px-4 py-3"
    >
      <Button variant="secondary" disabled={page <= 1} onClick={() => onChange(page - 1)}>
        ‹ Prev
      </Button>
      <span className="text-xs text-slate-500" aria-live="polite">
        Page {page} of {totalPages}
      </span>
      <Button variant="secondary" disabled={page >= totalPages} onClick={() => onChange(page + 1)}>
        Next ›
      </Button>
    </nav>
  );
}
