import type { IssuePriority, IssueStatus, Role } from '../../types/api';
import { PRIORITY_META, ROLE_LABEL, STATUS_META } from '../../utils/labels';

export function StatusBadge({ status }: { status: IssueStatus }) {
  const { label, className } = STATUS_META[status];
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-medium transition-colors ${className}`}
    >
      {label}
    </span>
  );
}

export function StatusDot({ status }: { status: IssueStatus }) {
  const dotClassName =
    status === 'IN_PROGRESS'
      ? 'bg-blue-500'
      : status === 'RESOLVED'
        ? 'bg-emerald-500'
        : status === 'CLOSED'
          ? 'bg-slate-400'
          : 'bg-slate-500';

  return <span className={`h-2 w-2 shrink-0 rounded-full ${dotClassName}`} aria-hidden="true" />;
}

/** Coloured dot PLUS the word, so priority reads without colour (docs/03 §3). */
export function PriorityBadge({ priority }: { priority: IssuePriority }) {
  const { label, dotClassName } = PRIORITY_META[priority];
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-xs font-medium text-slate-700">
      <span className={`h-2 w-2 shrink-0 rounded-full ${dotClassName}`} aria-hidden="true" />
      {label}
    </span>
  );
}

export function RoleChip({ role }: { role: Role }) {
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-medium ${
        role === 'MAINTAINER'
          ? 'border-indigo-200 bg-indigo-50 text-indigo-700'
          : 'border-slate-200 bg-slate-100 text-slate-600'
      }`}
    >
      {ROLE_LABEL[role]}
    </span>
  );
}

export function Avatar({ name }: { name: string }) {
  return (
    <span
      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-[11px] font-semibold text-indigo-700 ring-1 ring-indigo-200"
      aria-hidden="true"
    >
      {name}
    </span>
  );
}
