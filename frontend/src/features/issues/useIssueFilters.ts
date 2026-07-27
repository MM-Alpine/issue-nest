import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  asOneOf,
  ISSUE_PRIORITIES,
  ISSUE_SORTS,
  ISSUE_STATUSES,
  SORT_ORDERS,
  type IssueListParams,
} from '../../types/api';

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
    const page = Number.parseInt(searchParams.get('page') ?? '1', 10);

    return {
      q: searchParams.get('q')?.slice(0, 200) || undefined,
      status: asOneOf(searchParams.get('status'), ISSUE_STATUSES),
      priority: asOneOf(searchParams.get('priority'), ISSUE_PRIORITIES),
      assignee: searchParams.get('assignee') || undefined,
      sort: asOneOf(searchParams.get('sort'), ISSUE_SORTS) ?? 'createdAt',
      order: asOneOf(searchParams.get('order'), SORT_ORDERS) ?? 'desc',
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
