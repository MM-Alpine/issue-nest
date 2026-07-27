import { IssueStatus, Prisma, Role } from '@prisma/client';
import { forbidden, notFound, unprocessable } from '../../lib/errors';
import { prisma } from '../../lib/prisma';
import { buildMeta, toSkipTake } from '../../shared/pagination';
import {
  assertCanUpdateIssue,
  getMembership,
  requireMaintainer,
  requireMembership,
} from '../../shared/permissions';
import { publicUserSelect } from '../../shared/selectors';
import { buildIssueOrderBy, buildIssueWhere } from './issues.query';
import type { CreateIssueBody, IssueListQuery, UpdateIssueBody } from './issues.schema';

const rowInclude = {
  reporter: { select: publicUserSelect },
  assignee: { select: publicUserSelect },
  _count: { select: { comments: true } },
} as const;

const detailInclude = {
  reporter: { select: publicUserSelect },
  assignee: { select: publicUserSelect },
  project: { select: { id: true, key: true, name: true } },
} as const;

/** `assigneeId` must belong to the project, or the reference is semantically invalid. */
async function assertAssigneeIsMember(projectId: string, assigneeId: string): Promise<void> {
  const membership = await getMembership(projectId, assigneeId);
  if (!membership) {
    throw unprocessable('The assignee must be a member of this project', 'ASSIGNEE_NOT_MEMBER');
  }
}

export async function listIssues(projectId: string, userId: string, query: IssueListQuery) {
  await requireMembership(projectId, userId);

  const where = buildIssueWhere(projectId, query);
  const orderBy = buildIssueOrderBy(query.sort, query.order);
  const { skip, take } = toSkipTake(query.page, query.pageSize);

  // One snapshot for both reads, so `meta.total` can never disagree with the page
  // (docs/05 §2.8). The isolation level is explicit and load-bearing: under Postgres's
  // default READ COMMITTED each statement takes its own snapshot, so a concurrent
  // insert between the findMany and the count would produce inconsistent meta.
  const [issues, total] = await prisma.$transaction(
    [
      prisma.issue.findMany({ where, orderBy, skip, take, include: rowInclude }),
      prisma.issue.count({ where }),
    ],
    { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
  );

  return {
    issues: issues.map(({ _count, ...issue }) => ({ ...issue, commentCount: _count.comments })),
    meta: buildMeta(query.page, query.pageSize, total),
  };
}

export async function createIssue(projectId: string, userId: string, input: CreateIssueBody) {
  const membership = await requireMembership(projectId, userId);

  // Presence, not truthiness: supplying the field at all is the maintainer-only act.
  if ('assigneeId' in input && membership.role !== Role.MAINTAINER) {
    throw forbidden('Only project maintainers can change the assignee');
  }

  if (input.assigneeId) {
    await assertAssigneeIsMember(projectId, input.assigneeId);
  }

  const { _count, ...issue } = await prisma.issue.create({
    data: {
      projectId,
      reporterId: userId,
      title: input.title,
      description: input.description ?? null,
      priority: input.priority,
      status: IssueStatus.OPEN,
      assigneeId: input.assigneeId ?? null,
    },
    include: rowInclude,
  });

  return { ...issue, commentCount: _count.comments };
}

export async function getIssue(issueId: string, userId: string) {
  const issue = await prisma.issue.findUnique({ where: { id: issueId }, include: detailInclude });
  if (!issue) throw notFound('Issue not found');

  // Membership is checked AFTER the load but before anything is returned, so a
  // non-member still cannot tell an existing issue from a missing one.
  const membership = await requireMembership(issue.projectId, userId, 'Issue');

  return { issue, viewerRole: membership.role };
}

export async function updateIssue(issueId: string, userId: string, patch: UpdateIssueBody) {
  const existing = await prisma.issue.findUnique({
    where: { id: issueId },
    select: { id: true, projectId: true, reporterId: true },
  });
  if (!existing) throw notFound('Issue not found');

  const membership = await requireMembership(existing.projectId, userId, 'Issue');
  assertCanUpdateIssue(existing, membership, Object.keys(patch));

  if (patch.assigneeId) {
    await assertAssigneeIsMember(existing.projectId, patch.assigneeId);
  }

  const issue = await prisma.issue.update({
    where: { id: issueId },
    data: {
      ...(patch.title !== undefined ? { title: patch.title } : {}),
      ...('description' in patch ? { description: patch.description ?? null } : {}),
      ...(patch.priority !== undefined ? { priority: patch.priority } : {}),
      ...(patch.status !== undefined ? { status: patch.status } : {}),
      ...('assigneeId' in patch ? { assigneeId: patch.assigneeId ?? null } : {}),
    },
    include: detailInclude,
  });

  return issue;
}

export async function deleteIssue(issueId: string, userId: string): Promise<void> {
  const existing = await prisma.issue.findUnique({
    where: { id: issueId },
    select: { id: true, projectId: true },
  });
  if (!existing) throw notFound('Issue not found');

  // Non-member → 404, MEMBER (even the reporter) → 403 (docs/01 A4/A6).
  await requireMaintainer(existing.projectId, userId, 'delete issues', 'Issue');

  await prisma.issue.delete({ where: { id: issueId } });
}
