import { Prisma, Role } from '@prisma/client';
import { conflict, notFound } from '../../lib/errors';
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
    orderBy: { project: { createdAt: 'desc' } },
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

  return members.map((m) => ({
    userId: m.user.id,
    name: m.user.name,
    email: m.user.email,
    role: m.role,
    createdAt: m.createdAt,
  }));
}

export async function addMember(projectId: string, callerId: string, input: AddMemberBody) {
  await requireMaintainer(projectId, callerId, 'add members');

  const user = await prisma.user.findUnique({
    where: { email: input.email },
    select: publicUserSelect,
  });
  if (!user) {
    throw notFound('No account exists with that email address', 'USER_NOT_FOUND');
  }

  try {
    const membership = await prisma.projectMember.create({
      data: { projectId, userId: user.id, role: input.role },
    });
    return {
      userId: user.id,
      name: user.name,
      email: user.email,
      role: membership.role,
      createdAt: membership.createdAt,
    };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw conflict('That user is already a member of this project', 'ALREADY_MEMBER');
    }
    throw error;
  }
}
