import { IssuePriority, IssueStatus } from '@prisma/client';
import { z } from 'zod';
import { cuidSchema } from '../../shared/schemas';

const title = z
  .string()
  .trim()
  .min(1, 'Title is required')
  .max(200, 'Title must be at most 200 characters');

const description = z
  .string()
  .trim()
  .max(5000, 'Description must be at most 5000 characters')
  .nullish();

const priority = z.nativeEnum(IssuePriority, {
  errorMap: () => ({ message: 'Expected one of LOW, MEDIUM, HIGH, CRITICAL' }),
});

const status = z.nativeEnum(IssueStatus, {
  errorMap: () => ({ message: 'Expected one of OPEN, IN_PROGRESS, RESOLVED, CLOSED' }),
});

export const CreateIssueBody = z
  .object({
    title,
    description,
    priority: priority.default(IssuePriority.MEDIUM),
    // Maintainer-only, enforced in the service — including at creation (docs/01 A15).
    assigneeId: cuidSchema.nullish(),
  })
  .strict();
export type CreateIssueBody = z.infer<typeof CreateIssueBody>;

export const UpdateIssueBody = z
  .object({
    title: title.optional(),
    description,
    priority: priority.optional(),
    status: status.optional(),
    assigneeId: cuidSchema.nullish(),
  })
  .strict()
  .refine((patch) => Object.keys(patch).length > 0, {
    message: 'No fields to update',
    path: [],
  });
export type UpdateIssueBody = z.infer<typeof UpdateIssueBody>;

/**
 * Query schemas are deliberately NOT strict: unknown parameters are ignored so a stale
 * bookmarked URL still works. Nothing is silently clamped — bad values are 400s (docs/01 A14).
 */
export const IssueListQuery = z.object({
  q: z.string().trim().max(200, 'Search must be at most 200 characters').optional(),
  status: status.optional(),
  priority: priority.optional(),
  assignee: z.union([z.literal('unassigned'), cuidSchema]).optional(),
  sort: z
    .enum(['createdAt', 'priority', 'status'], {
      errorMap: () => ({ message: 'Expected one of createdAt, priority, status' }),
    })
    .default('createdAt'),
  order: z
    .enum(['asc', 'desc'], { errorMap: () => ({ message: 'Expected one of asc, desc' }) })
    .default('desc'),
  page: z.coerce.number().int().min(1, 'page must be 1 or greater').default(1),
  pageSize: z.coerce
    .number()
    .int()
    .min(1, 'pageSize must be between 1 and 100')
    .max(100, 'pageSize must be between 1 and 100')
    .default(20),
});
export type IssueListQuery = z.infer<typeof IssueListQuery>;
