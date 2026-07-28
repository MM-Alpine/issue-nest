import type { Prisma } from '@prisma/client';
import type { IssueListQuery } from './issues.schema';

export type IssueFilters = Pick<IssueListQuery, 'q' | 'status' | 'priority' | 'assignee' | 'mine'>;

/** Filters AND-combine; `assignee=unassigned` means `assigneeId IS NULL` (docs/04 §10). */
export function buildIssueWhere(
  projectId: string,
  filters: IssueFilters,
  currentUserId?: string,
): Prisma.IssueWhereInput {
  const where: Prisma.IssueWhereInput = { projectId };

  if (filters.q) where.title = { contains: filters.q, mode: 'insensitive' };
  if (filters.status) where.status = filters.status;
  if (filters.priority) where.priority = filters.priority;
  if (filters.assignee) {
    where.assigneeId = filters.assignee === 'unassigned' ? null : filters.assignee;
  }
  if (filters.mine && currentUserId) {
    where.OR = [{ assigneeId: currentUserId }, { reporterId: currentUserId }];
  }

  return where;
}

/**
 * Sorting by `priority`/`status` is SEMANTIC, not alphabetical: PostgreSQL orders enum
 * columns by declaration order, so `sort=priority&order=desc` yields CRITICAL first.
 * The `id` tiebreaker keeps pagination stable across rows with equal sort values.
 */
export function buildIssueOrderBy(
  sort: IssueListQuery['sort'],
  order: IssueListQuery['order'],
): Prisma.IssueOrderByWithRelationInput[] {
  return [{ [sort]: order }, { id: 'desc' }];
}
