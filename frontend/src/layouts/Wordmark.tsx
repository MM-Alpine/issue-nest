import { BugIcon } from '../components/icons';

/** Inline bug glyph + "IssueHub" — the entire brand (docs/03 §11). */
export function Wordmark({ className = '' }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 font-semibold ${className}`}>
      <span className="text-indigo-600">
        <BugIcon />
      </span>
      <span>
        <span className="text-indigo-600">Issue</span>
        <span className="text-slate-900">Hub</span>
      </span>
    </span>
  );
}
