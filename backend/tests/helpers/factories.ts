import { IssuePriority, IssueStatus, Role } from '@prisma/client';
import { hashPassword } from '../../src/lib/password';
import { prisma } from '../../src/lib/prisma';

// Duplicated from tests/setup/test-setup.ts on purpose: this module is imported by every
// integration test, so the guard holds even if the suite is started WITHOUT
// vitest.config.ts (e.g. `npx vitest` from the repo root), where nothing would otherwise
// pin DATABASE_URL to the test database or truncate between tests.
if (!(process.env.DATABASE_URL ?? '').includes('issuehub_test')) {
  throw new Error(
    'Test factories refuse to run outside issuehub_test. Run `npm test` from backend/ so vitest.config.ts applies.',
  );
}

export const DEFAULT_PASSWORD = 'password123';

let sequence = 0;
const next = (): number => ++sequence;

export interface CreatedUser {
  id: string;
  name: string;
  email: string;
  password: string;
}

export async function createUser(
  overrides: { name?: string; email?: string; password?: string } = {},
): Promise<CreatedUser> {
  const n = next();
  const password = overrides.password ?? DEFAULT_PASSWORD;
  const user = await prisma.user.create({
    data: {
      name: overrides.name ?? `Test User ${n}`,
      email: (overrides.email ?? `user${n}@example.com`).toLowerCase(),
      passwordHash: await hashPassword(password),
    },
    select: { id: true, name: true, email: true },
  });
  return { ...user, password };
}

/** Creates a project with the given user as MAINTAINER, mirroring the service's behaviour. */
export async function createProjectWith(
  ownerId: string,
  overrides: { name?: string; key?: string; description?: string | null } = {},
): Promise<{ id: string; name: string; key: string }> {
  const n = next();
  const project = await prisma.project.create({
    data: {
      name: overrides.name ?? `Project ${n}`,
      key: overrides.key ?? `P${n}`,
      description: overrides.description ?? null,
      members: { create: { userId: ownerId, role: Role.MAINTAINER } },
    },
    select: { id: true, name: true, key: true },
  });
  return project;
}

export async function addMember(
  projectId: string,
  userId: string,
  role: Role = Role.MEMBER,
): Promise<void> {
  await prisma.projectMember.create({ data: { projectId, userId, role } });
}

export async function createIssue(
  projectId: string,
  reporterId: string,
  overrides: {
    title?: string;
    description?: string | null;
    status?: IssueStatus;
    priority?: IssuePriority;
    assigneeId?: string | null;
    createdAt?: Date;
  } = {},
): Promise<{ id: string; title: string }> {
  const n = next();
  return prisma.issue.create({
    data: {
      projectId,
      reporterId,
      title: overrides.title ?? `Issue ${n}`,
      description: overrides.description ?? null,
      status: overrides.status ?? IssueStatus.OPEN,
      priority: overrides.priority ?? IssuePriority.MEDIUM,
      assigneeId: overrides.assigneeId ?? null,
      ...(overrides.createdAt ? { createdAt: overrides.createdAt } : {}),
    },
    select: { id: true, title: true },
  });
}

export async function createComment(
  issueId: string,
  authorId: string,
  body = 'A comment',
  createdAt?: Date,
): Promise<{ id: string }> {
  return prisma.comment.create({
    data: { issueId, authorId, body, ...(createdAt ? { createdAt } : {}) },
    select: { id: true },
  });
}
