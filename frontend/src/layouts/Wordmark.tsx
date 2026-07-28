import { BugIcon } from '../components/icons';

/** Inline bug glyph + "IssueHub" — the entire brand (docs/03 §11). */
export function Wordmark({ className = '' }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <span className="brand-logo">
        <BugIcon className="h-5 w-5" />
      </span>
      <span className="brand-name">IssueHub</span>
    </span>
  );
}
