import { describe, expect, it } from 'vitest';
import { prisma } from '../../src/lib/prisma';

/**
 * The test database is built by `prisma migrate deploy` in globalSetup, from committed
 * migration files only. These assertions therefore prove the committed chain produces
 * the schema the application expects — including the enum value ORDER, which is what
 * makes `sort=priority&order=desc` return CRITICAL first (INVARIANTS #11/#12).
 */
async function enumValues(typeName: string): Promise<string[]> {
  const rows = await prisma.$queryRawUnsafe<{ enumlabel: string }[]>(
    `SELECT e.enumlabel
       FROM pg_enum e
       JOIN pg_type t ON t.oid = e.enumtypid
      WHERE t.typname = $1
      ORDER BY e.enumsortorder`,
    typeName,
  );
  return rows.map((r) => r.enumlabel);
}

describe('committed migrations build the expected schema', () => {
  it('creates all five tables', async () => {
    const rows = await prisma.$queryRaw<{ table_name: string }[]>`
      SELECT table_name FROM information_schema.tables
       WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
       ORDER BY table_name`;

    expect(rows.map((r) => r.table_name)).toEqual(
      expect.arrayContaining(['Comment', 'Issue', 'Project', 'ProjectMember', 'User']),
    );
  });

  it('creates the Role enum in declaration order (MAINTAINER first)', async () => {
    expect(await enumValues('Role')).toEqual(['MAINTAINER', 'MEMBER']);
  });

  it('creates IssueStatus in lifecycle order', async () => {
    expect(await enumValues('IssueStatus')).toEqual([
      'OPEN',
      'IN_PROGRESS',
      'RESOLVED',
      'CLOSED',
    ]);
  });

  it('creates IssuePriority in ascending severity order', async () => {
    expect(await enumValues('IssuePriority')).toEqual(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']);
  });

  it('gives ProjectMember a composite primary key on (projectId, userId)', async () => {
    const rows = await prisma.$queryRaw<{ column_name: string }[]>`
      SELECT kcu.column_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
          ON kcu.constraint_name = tc.constraint_name
       WHERE tc.table_name = 'ProjectMember' AND tc.constraint_type = 'PRIMARY KEY'
       ORDER BY kcu.ordinal_position`;

    expect(rows.map((r) => r.column_name)).toEqual(['projectId', 'userId']);
  });

  it('creates the issue-list indexes the query plan depends on', async () => {
    const rows = await prisma.$queryRaw<{ indexname: string }[]>`
      SELECT indexname FROM pg_indexes WHERE tablename = 'Issue'`;

    expect(rows.map((r) => r.indexname)).toEqual(
      expect.arrayContaining([
        'Issue_projectId_createdAt_idx',
        'Issue_projectId_status_idx',
        'Issue_projectId_priority_idx',
        'Issue_projectId_assigneeId_idx',
      ]),
    );
  });

  it('enforces unique email and project key', async () => {
    const rows = await prisma.$queryRaw<{ indexname: string }[]>`
      SELECT indexname FROM pg_indexes WHERE tablename IN ('User', 'Project')`;

    expect(rows.map((r) => r.indexname)).toEqual(
      expect.arrayContaining(['User_email_key', 'Project_key_key']),
    );
  });
});
