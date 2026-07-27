import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  ISSUE_PRIORITIES,
  ISSUE_STATUSES,
  type IssueListParams,
  type IssuePriority,
  type IssueSort,
  type IssueStatus,
  type SortOrder,
} from '../../types/api';

const SORTS: IssueSort[] = ['createdAt', 'priority', 'status'];
const ORDERS: SortOrder[] = ['asc', 'desc'];

export const PAGE_SIZE = 20;

/**
 * Filter state lives in the URL, not in component state (docs/02 §4): a filtered list
 * is shareable, survives reload, and the query string doubles as the cache key.
 *
 * Unknown values are dropped rather than forwarded, so a stale bookmark degrades to a
 * working list instead of a 400.
 */
export function useIssueFilters() {
  const [searchParams, setSearchParams] = useSearchParams();

  const params = useMemo<IssueListParams>(() => {
    const oneOf = <T extends string>(value: string | null, allowed: T[]): T | undefined =>
      value && (allowed as string[]).includes(value) ? (value as T) : undefined;

    const page = Number.parseInt(searchParams.get('page') ?? '1', 10);

    return {
      q: searchParams.get('q')?.slice(0, 200) || undefined,
      status: oneOf<IssueStatus>(searchParams.get('status'), ISSUE_STATUSES),
      priority: oneOf<IssuePriority>(searchParams.get('priority'), ISSUE_PRIORITIES),
      assignee: searchParams.get('assignee') || undefined,
      sort: oneOf<IssueSort>(searchParams.get('sort'), SORTS) ?? 'createdAt',
      order: oneOf<SortOrder>(searchParams.get('order'), ORDERS) ?? 'desc',
      page: Number.isFinite(page) && page >= 1 ? page : 1,
      pageSize: PAGE_SIZE,
    };
  }, [searchParams]);

  /** Any filter change resets to page 1; only an explicit `page` keeps its value. */
  const setFilters = useCallback(
    (patch: Partial<IssueListParams>) => {
      setSearchParams(
        (current) => {
          const next = new URLSearchParams(current);
          for (const [key, value] of Object.entries(patch)) {
            if (value === undefined || value === '' || key === 'pageSize') next.delete(key);
            else next.set(key, String(value));
          }
          if (!('page' in patch)) next.delete('page');
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  const clearFilters = useCallback(() => setSearchParams({}, { replace: true }), [setSearchParams]);

  const hasActiveFilters = Boolean(
    params.q || params.status || params.priority || params.assignee,
  );

  return { params, setFilters, clearFilters, hasActiveFilters };
}
