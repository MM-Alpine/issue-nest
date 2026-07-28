import { Prisma, Role } from '@prisma/client';
import { conflict, forbidden, notFound } from '../../lib/errors';
import { prisma } from '../../lib/prisma';
import { requireMaintainer, requireMembership } from '../../shared/permissions';
import { publicUserSelect } from '../../shared/selectors';
import type { AddMemberBody, CreateProjectBody } from './projects.schema';

export interface ProjectSummary {
  id: string;
  name: string;
  key: string;
  description: string | null;
  role: Role;
  issueCount: number;
  createdAt: Date;
}

type MemberRecord = {
  role: Role;
  createdAt: Date;
  user: { id: string; name: string; email: string };
};

function toMember(member: MemberRecord) {
  return {
    userId: member.user.id,
    name: member.user.name,
    email: member.user.email,
    role: member.role,
    createdAt: member.createdAt,
  };
}

/**
 * Project + the creator's MAINTAINER membership must both land, or neither:
 * a project without a maintainer would be permanently unmanageable (docs/05 §2.8).
 */
export async function createProject(
  userId: string,
  input: CreateProjectBody,
): Promise<ProjectSummary> {
  try {
    const project = await prisma.$transaction(async (tx) => {
      const created = await tx.project.create({
        data: { name: input.name, key: input.key, description: input.description ?? null },
      });
      await tx.projectMember.create({
        data: { projectId: created.id, userId, role: Role.MAINTAINER },
      });
      return created;
    });

    return {
      id: project.id,
      name: project.name,
      key: project.key,
      description: project.description,
      role: Role.MAINTAINER,
      issueCount: 0,
      createdAt: project.createdAt,
    };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw conflict('That project key is already taken', 'PROJECT_KEY_TAKEN');
    }
    throw error;
  }
}

/** Scoped by membership at the query level — a non-member's project is never loaded. */
export async function listProjects(userId: string): Promise<ProjectSummary[]> {
  const memberships = await prisma.projectMember.findMany({
    where: { userId },
    include: { project: { include: { _count: { select: { issues: true } } } } },
    // The id tiebreaker keeps the order deterministic for projects created in the
    // same millisecond (the seed creates two back to back).
    orderBy: [{ project: { createdAt: 'desc' } }, { project: { id: 'desc' } }],
  });

  return memberships.map(({ project, role }) => ({
    id: project.id,
    name: project.name,
    key: project.key,
    description: project.description,
    role,
    issueCount: project._count.issues,
    createdAt: project.createdAt,
  }));
}

export async function getProject(projectId: string, userId: string) {
  const membership = await requireMembership(projectId, userId);

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { _count: { select: { issues: true, members: true } } },
  });
  if (!project) throw notFound('Project not found');

  return {
    id: project.id,
    name: project.name,
    key: project.key,
    description: project.description,
    role: membership.role,
    memberCount: project._count.members,
    issueCount: project._count.issues,
    createdAt: project.createdAt,
  };
}

/** MAINTAINER first (Role declaration order), then name ascending — docs/04 §8. */
export async function listMembers(projectId: string, userId: string) {
  await requireMembership(projectId, userId);

  const members = await prisma.projectMember.findMany({
    where: { projectId },
    include: { user: { select: publicUserSelect } },
    orderBy: [{ role: 'asc' }, { user: { name: 'asc' } }],
  });

  return members.map(toMember);
}

/** Users from projects the caller maintains who are not already in this project. */
export async function listMemberCandidates(projectId: string, userId: string) {
  await requireMaintainer(projectId, userId, 'add members');

  const maintainedMemberships = await prisma.projectMember.findMany({
    where: { userId, role: Role.MAINTAINER },
    select: { projectId: true },
  });
  const maintainedProjectIds = maintainedMemberships.map((m) => m.projectId);

  return prisma.user.findMany({
    where: {
      memberships: {
        some: { projectId: { in: maintainedProjectIds } },
        none: { projectId },
      },
    },
    select: publicUserSelect,
    orderBy: [{ name: 'asc' }, { email: 'asc' }],
  });
}

export async function addMember(projectId: string, callerId: string, input: AddMemberBody) {
  await requireMaintainer(projectId, callerId, 'add members');

  const user = input.userId
    ? await prisma.user.findUnique({
        where: { id: input.userId },
        select: publicUserSelect,
      })
    : await prisma.user.findUnique({
        where: { email: input.email },
        select: publicUserSelect,
      });
  if (!user) {
    throw notFound('No account exists for that user', 'USER_NOT_FOUND');
  }

  try {
    const membership = await prisma.projectMember.create({
      data: { projectId, userId: user.id, role: input.role },
    });
    return toMember({ role: membership.role, createdAt: membership.createdAt, user });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw conflict('That user is already a member of this project', 'ALREADY_MEMBER');
    }
    throw error;
  }
}

async function getProjectMember(projectId: string, userId: string) {
  const member = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId } },
    include: { user: { select: publicUserSelect } },
  });
  if (!member) throw notFound('Member not found');
  return member;
}

async function assertCanLoseMaintainer(projectId: string, member: { role: Role }) {
  if (member.role !== Role.MAINTAINER) return;

  const maintainerCount = await prisma.projectMember.count({
    where: { projectId, role: Role.MAINTAINER },
  });
  if (maintainerCount <= 1) {
    throw forbidden('A project must have at least one maintainer', 'LAST_MAINTAINER');
  }
}

export async function updateMemberRole(
  projectId: string,
  callerId: string,
  targetUserId: string,
  role: Role,
) {
  await requireMaintainer(projectId, callerId, 'manage members');

  const existing = await getProjectMember(projectId, targetUserId);
  if (existing.role === role) return toMember(existing);

  if (role !== Role.MAINTAINER) {
    await assertCanLoseMaintainer(projectId, existing);
  }

  const updated = await prisma.projectMember.update({
    where: { projectId_userId: { projectId, userId: targetUserId } },
    data: { role },
    include: { user: { select: publicUserSelect } },
  });
  return toMember(updated);
}

export async function removeMember(projectId: string, callerId: string, targetUserId: string) {
  await requireMaintainer(projectId, callerId, 'manage members');

  const existing = await getProjectMember(projectId, targetUserId);
  await assertCanLoseMaintainer(projectId, existing);

  await prisma.$transaction(async (tx) => {
    await tx.issue.updateMany({
      where: { projectId, assigneeId: targetUserId },
      data: { assigneeId: null },
    });
    await tx.projectMember.delete({
      where: { projectId_userId: { projectId, userId: targetUserId } },
    });
  });
}
