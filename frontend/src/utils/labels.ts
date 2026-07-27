import type { IssuePriority, IssueStatus, Role } from '../types/api';

/** Colour never carries meaning alone — every badge also renders its label (docs/03 §3). */
export const STATUS_META: Record<IssueStatus, { label: string; className: string }> = {
  OPEN: { label: 'Open', className: 'bg-slate-100 text-slate-700 border-slate-200' },
  IN_PROGRESS: { label: 'In progress', className: 'bg-blue-50 text-blue-700 border-blue-200' },
  RESOLVED: { label: 'Resolved', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  CLOSED: { label: 'Closed', className: 'bg-slate-100 text-slate-500 border-slate-200' },
};

export const PRIORITY_META: Record<IssuePriority, { label: string; dotClassName: string }> = {
  LOW: { label: 'Low', dotClassName: 'bg-slate-400' },
  MEDIUM: { label: 'Medium', dotClassName: 'bg-amber-500' },
  HIGH: { label: 'High', dotClassName: 'bg-orange-500' },
  CRITICAL: { label: 'Critical', dotClassName: 'bg-red-600' },
};

export const ROLE_LABEL: Record<Role, string> = {
  MAINTAINER: 'Maintainer',
  MEMBER: 'Member',
};

/** One select combining sort field + direction (docs/03 §5.4). */
export const SORT_OPTIONS = [
  { value: 'createdAt:desc', label: 'Newest first' },
  { value: 'createdAt:asc', label: 'Oldest first' },
  { value: 'priority:desc', label: 'Priority (high to low)' },
  { value: 'priority:asc', label: 'Priority (low to high)' },
  { value: 'status:asc', label: 'Status (open first)' },
] as const;
