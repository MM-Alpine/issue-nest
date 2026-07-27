import { notFound } from '../../lib/errors';
import { prisma } from '../../lib/prisma';
import { requireMembership } from '../../shared/permissions';
import { publicUserSelect } from '../../shared/selectors';
import type { CreateCommentBody } from './comments.schema';

const commentInclude = { author: { select: publicUserSelect } } as const;

/**
 * Comments inherit the parent issue's project membership: any member may read and
 * write, and maintainer status is irrelevant here (docs/04 §15).
 */
async function requireIssueAccess(issueId: string, userId: string): Promise<string> {
  const issue = await prisma.issue.findUnique({
    where: { id: issueId },
    select: { id: true, projectId: true },
  });
  if (!issue) throw notFound('Issue not found');

  await requireMembership(issue.projectId, userId, 'Issue');
  return issue.id;
}

/** Oldest first — a conversation reads top to bottom (docs/05 §2.5). */
export async function listComments(issueId: string, userId: string) {
  await requireIssueAccess(issueId, userId);

  return prisma.comment.findMany({
    where: { issueId },
    include: commentInclude,
    orderBy: { createdAt: 'asc' },
  });
}

export async function createComment(
  issueId: string,
  userId: string,
  input: CreateCommentBody,
) {
  await requireIssueAccess(issueId, userId);

  return prisma.comment.create({
    data: { issueId, authorId: userId, body: input.body },
    include: commentInclude,
  });
}
