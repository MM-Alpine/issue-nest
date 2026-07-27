import { Role } from '@prisma/client';
import { forbidden, notFound } from '../lib/errors';
import { prisma } from '../lib/prisma';

/**
 * ALL membership/role logic lives here and nowhere else (INVARIANTS #2).
 *
 * Two rules explain the whole permission matrix (docs/05 §1.7):
 *   1. Not a member          → 404, so a private project's existence is never confirmed.
 *   2. Member, wrong role/ownership → 403, with a message naming the requirement.
 */
export interface Membership {
  projectId: string;
  userId: string;
  role: Role;
}

export function getMembership(projectId: string, userId: string): Promise<Membership | null> {
  return prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId } },
    select: { projectId: true, userId: true, role: true },
  });
}

export async function requireMembership(
  projectId: string,
  userId: string,
  resource = 'Project',
): Promise<Membership> {
  const membership = await getMembership(projectId, userId);
  if (!membership) throw notFound(`${resource} not found`);
  return membership;
}

export async function requireMaintainer(
  projectId: string,
  userId: string,
  action: string,
  resource = 'Project',
): Promise<Membership> {
  const membership = await requireMembership(projectId, userId, resource);
  if (membership.role !== Role.MAINTAINER) {
    throw forbidden(`Only project maintainers can ${action}`);
  }
  return membership;
}

/** Fields a reporting MEMBER may change on their own issue (docs/01 A5). */
export const MEMBER_EDITABLE_ISSUE_FIELDS = ['title', 'description', 'priority'] as const;

const FIELD_LABELS: Record<string, string> = {
  status: 'issue status',
  assigneeId: 'the assignee',
};

/**
 * The one non-trivial authorization rule, kept pure so it is unit-testable across
 * every role × field × ownership combination (docs/02 §6).
 *
 *  MAINTAINER              → any field
 *  MEMBER + reporter       → title / description / priority only
 *  MEMBER + not reporter   → nothing
 */
export function assertCanUpdateIssue(
  issue: { reporterId: string },
  membership: Pick<Membership, 'userId' | 'role'>,
  fields: string[],
): void {
  if (membership.role === Role.MAINTAINER) return;

  if (issue.reporterId !== membership.userId) {
    throw forbidden('You can only update issues you reported');
  }

  const restricted = fields.filter(
    (field) => !(MEMBER_EDITABLE_ISSUE_FIELDS as readonly string[]).includes(field),
  );
  if (restricted.length > 0) {
    const label = restricted.map((f) => FIELD_LABELS[f] ?? f).join(' and ');
    throw forbidden(`Only project maintainers can change ${label}`);
  }
}
