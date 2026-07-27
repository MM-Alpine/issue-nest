import { IssuePriority, IssueStatus, Role } from '@prisma/client';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { buildApp } from '../../src/app';
import { bearer } from '../helpers/auth';
import { addMember, createIssue, createProjectWith, createUser } from '../helpers/factories';

const app = buildApp();

const at = (day: number): Date => new Date(Date.UTC(2026, 0, day, 12, 0, 0));

/**
 * A fixed, meaningful dataset: 5 issues covering every status, every priority,
 * two assignees plus unassigned, with staggered createdAt values.
 */
async function dataset() {
  const maintainer = await createUser({ name: 'Asha' });
  const member = await createUser({ name: 'Ravi' });
  const stranger = await createUser({ name: 'Outsider' });
  const project = await createProjectWith(maintainer.id);
  await addMember(project.id, member.id, Role.MEMBER);

  const issues = {
    loginLow: await createIssue(project.id, member.id, {
      title: 'Login button unresponsive',
      status: IssueStatus.OPEN,
      priority: IssuePriority.LOW,
      assigneeId: maintainer.id,
      createdAt: at(1),
    }),
    footerCritical: await createIssue(project.id, member.id, {
      title: 'Footer links 404',
      status: IssueStatus.IN_PROGRESS,
      priority: IssuePriority.CRITICAL,
      assigneeId: null,
      createdAt: at(2),
    }),
    loginHigh: await createIssue(project.id, maintainer.id, {
      title: 'LOGIN form throws on submit',
      status: IssueStatus.RESOLVED,
      priority: IssuePriority.HIGH,
      assigneeId: member.id,
      createdAt: at(3),
    }),
    cacheMedium: await createIssue(project.id, maintainer.id, {
      title: 'Cache never invalidates',
      status: IssueStatus.CLOSED,
      priority: IssuePriority.MEDIUM,
      assigneeId: null,
      createdAt: at(4),
    }),
    searchHigh: await createIssue(project.id, member.id, {
      title: 'Search returns duplicates',
      status: IssueStatus.OPEN,
      priority: IssuePriority.HIGH,
      assigneeId: maintainer.id,
      createdAt: at(5),
    }),
  };

  return { maintainer, member, stranger, project, issues };
}

const titles = (body: { issues: { title: string }[] }): string[] =>
  body.issues.map((i) => i.title);

describe('GET /api/projects/:projectId/issues — access', () => {
  it('lets a member list the project issues with pagination metadata', async () => {
    const { member, project } = await dataset();

    const res = await request(app)
      .get(`/api/projects/${project.id}/issues`)
      .set('Authorization', bearer(member.id));

    expect(res.status).toBe(200);
    expect(res.body.issues).toHaveLength(5);
    expect(res.body.meta).toEqual({ page: 1, pageSize: 20, total: 5, totalPages: 1 });
    expect(res.body.issues[0]).toHaveProperty('commentCount');
    expect(res.body.issues[0]).toHaveProperty('reporter.name');
  });

  it('returns 404 for a non-member', async () => {
    const { stranger, project } = await dataset();

    const res = await request(app)
      .get(`/api/projects/${project.id}/issues`)
      .set('Authorization', bearer(stranger.id));

    expect(res.status).toBe(404);
  });
});

describe('search', () => {
  it('matches a title substring case-insensitively', async () => {
    const { member, project } = await dataset();

    const res = await request(app)
      .get(`/api/projects/${project.id}/issues`)
      .query({ q: 'login' })
      .set('Authorization', bearer(member.id));

    expect(res.status).toBe(200);
    expect(titles(res.body).sort()).toEqual([
      'LOGIN form throws on submit',
      'Login button unresponsive',
    ]);
  });

  it('does not search descriptions', async () => {
    const { member, project } = await dataset();
    await createIssue(project.id, member.id, {
      title: 'Unrelated title',
      description: 'mentions login in the body only',
    });

    const res = await request(app)
      .get(`/api/projects/${project.id}/issues`)
      .query({ q: 'login' })
      .set('Authorization', bearer(member.id));

    expect(titles(res.body)).not.toContain('Unrelated title');
  });
});

describe('filters', () => {
  it('filters by status', async () => {
    const { member, project } = await dataset();

    const res = await request(app)
      .get(`/api/projects/${project.id}/issues`)
      .query({ status: 'OPEN' })
      .set('Authorization', bearer(member.id));

    expect(res.body.issues).toHaveLength(2);
    expect(res.body.issues.every((i: { status: string }) => i.status === 'OPEN')).toBe(true);
  });

  it('filters by priority', async () => {
    const { member, project } = await dataset();

    const res = await request(app)
      .get(`/api/projects/${project.id}/issues`)
      .query({ priority: 'HIGH' })
      .set('Authorization', bearer(member.id));

    expect(res.body.issues).toHaveLength(2);
    expect(res.body.issues.every((i: { priority: string }) => i.priority === 'HIGH')).toBe(true);
  });

  it('filters by assignee id', async () => {
    const { member, maintainer, project } = await dataset();

    const res = await request(app)
      .get(`/api/projects/${project.id}/issues`)
      .query({ assignee: maintainer.id })
      .set('Authorization', bearer(member.id));

    expect(res.body.issues).toHaveLength(2);
    expect(
      res.body.issues.every((i: { assignee: { id: string } }) => i.assignee.id === maintainer.id),
    ).toBe(true);
  });

  it('filters unassigned issues with assignee=unassigned', async () => {
    const { member, project } = await dataset();

    const res = await request(app)
      .get(`/api/projects/${project.id}/issues`)
      .query({ assignee: 'unassigned' })
      .set('Authorization', bearer(member.id));

    expect(res.body.issues).toHaveLength(2);
    expect(res.body.issues.every((i: { assignee: null }) => i.assignee === null)).toBe(true);
  });

  it('combines two filters with AND', async () => {
    const { member, project } = await dataset();

    const res = await request(app)
      .get(`/api/projects/${project.id}/issues`)
      .query({ status: 'OPEN', priority: 'HIGH' })
      .set('Authorization', bearer(member.id));

    expect(titles(res.body)).toEqual(['Search returns duplicates']);
  });

  it('combines search with a filter', async () => {
    const { member, project } = await dataset();

    const res = await request(app)
      .get(`/api/projects/${project.id}/issues`)
      .query({ q: 'login', status: 'RESOLVED' })
      .set('Authorization', bearer(member.id));

    expect(titles(res.body)).toEqual(['LOGIN form throws on submit']);
  });

  it('ignores unknown query parameters so stale bookmarks still work', async () => {
    const { member, project } = await dataset();

    const res = await request(app)
      .get(`/api/projects/${project.id}/issues`)
      .query({ label: 'legacy', status: 'OPEN' })
      .set('Authorization', bearer(member.id));

    expect(res.status).toBe(200);
    expect(res.body.issues).toHaveLength(2);
  });
});

describe('sorting', () => {
  it('defaults to createdAt descending (newest first)', async () => {
    const { member, project } = await dataset();

    const res = await request(app)
      .get(`/api/projects/${project.id}/issues`)
      .set('Authorization', bearer(member.id));

    expect(titles(res.body)).toEqual([
      'Search returns duplicates',
      'Cache never invalidates',
      'LOGIN form throws on submit',
      'Footer links 404',
      'Login button unresponsive',
    ]);
  });

  it('sorts by createdAt ascending', async () => {
    const { member, project } = await dataset();

    const res = await request(app)
      .get(`/api/projects/${project.id}/issues`)
      .query({ sort: 'createdAt', order: 'asc' })
      .set('Authorization', bearer(member.id));

    expect(titles(res.body)[0]).toBe('Login button unresponsive');
    expect(titles(res.body).at(-1)).toBe('Search returns duplicates');
  });

  it('sorts by priority descending SEMANTICALLY — CRITICAL first, not alphabetically', async () => {
    const { member, project } = await dataset();

    const res = await request(app)
      .get(`/api/projects/${project.id}/issues`)
      .query({ sort: 'priority', order: 'desc' })
      .set('Authorization', bearer(member.id));

    expect(res.body.issues.map((i: { priority: string }) => i.priority)).toEqual([
      'CRITICAL',
      'HIGH',
      'HIGH',
      'MEDIUM',
      'LOW',
    ]);
  });

  it('sorts by priority ascending — LOW first', async () => {
    const { member, project } = await dataset();

    const res = await request(app)
      .get(`/api/projects/${project.id}/issues`)
      .query({ sort: 'priority', order: 'asc' })
      .set('Authorization', bearer(member.id));

    expect(res.body.issues.map((i: { priority: string }) => i.priority)).toEqual([
      'LOW',
      'MEDIUM',
      'HIGH',
      'HIGH',
      'CRITICAL',
    ]);
  });

  it('sorts by status ascending in lifecycle order — OPEN first', async () => {
    const { member, project } = await dataset();

    const res = await request(app)
      .get(`/api/projects/${project.id}/issues`)
      .query({ sort: 'status', order: 'asc' })
      .set('Authorization', bearer(member.id));

    expect(res.body.issues.map((i: { status: string }) => i.status)).toEqual([
      'OPEN',
      'OPEN',
      'IN_PROGRESS',
      'RESOLVED',
      'CLOSED',
    ]);
  });
});

describe('pagination', () => {
  it('reports accurate meta on page 1 and page 2', async () => {
    const { member, project } = await dataset();

    const first = await request(app)
      .get(`/api/projects/${project.id}/issues`)
      .query({ pageSize: 2, page: 1, sort: 'createdAt', order: 'asc' })
      .set('Authorization', bearer(member.id));
    const second = await request(app)
      .get(`/api/projects/${project.id}/issues`)
      .query({ pageSize: 2, page: 2, sort: 'createdAt', order: 'asc' })
      .set('Authorization', bearer(member.id));

    expect(first.body.meta).toEqual({ page: 1, pageSize: 2, total: 5, totalPages: 3 });
    expect(second.body.meta).toEqual({ page: 2, pageSize: 2, total: 5, totalPages: 3 });
    expect(first.body.issues).toHaveLength(2);
    expect(second.body.issues).toHaveLength(2);
    expect(titles(first.body)).not.toEqual(expect.arrayContaining(titles(second.body)));
  });

  it('returns an empty page with honest meta past the end', async () => {
    const { member, project } = await dataset();

    const res = await request(app)
      .get(`/api/projects/${project.id}/issues`)
      .query({ page: 9, pageSize: 2 })
      .set('Authorization', bearer(member.id));

    expect(res.status).toBe(200);
    expect(res.body.issues).toEqual([]);
    expect(res.body.meta).toEqual({ page: 9, pageSize: 2, total: 5, totalPages: 3 });
  });

  it('counts only the filtered rows', async () => {
    const { member, project } = await dataset();

    const res = await request(app)
      .get(`/api/projects/${project.id}/issues`)
      .query({ status: 'OPEN', pageSize: 1 })
      .set('Authorization', bearer(member.id));

    expect(res.body.meta).toEqual({ page: 1, pageSize: 1, total: 2, totalPages: 2 });
  });
});

describe('invalid query parameters are rejected, never clamped', () => {
  const cases: [string, Record<string, string | number>][] = [
    ['page=0', { page: 0 }],
    ['page=-1', { page: -1 }],
    ['page=abc', { page: 'abc' }],
    ['pageSize=0', { pageSize: 0 }],
    ['pageSize=101', { pageSize: 101 }],
    ['sort=title', { sort: 'title' }],
    ['order=sideways', { order: 'sideways' }],
    ['status=NOPE', { status: 'NOPE' }],
    ['priority=URGENT', { priority: 'URGENT' }],
    ['assignee=garbage', { assignee: 'garbage' }],
  ];

  for (const [label, query] of cases) {
    it(`rejects ${label} with 400 VALIDATION_ERROR`, async () => {
      const { member, project } = await dataset();

      const res = await request(app)
        .get(`/api/projects/${project.id}/issues`)
        .query(query)
        .set('Authorization', bearer(member.id));

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(Object.keys(res.body.error.details).length).toBeGreaterThan(0);
    });
  }

  it('rejects a repeated parameter', async () => {
    const { member, project } = await dataset();

    const res = await request(app)
      .get(`/api/projects/${project.id}/issues?status=OPEN&status=CLOSED`)
      .set('Authorization', bearer(member.id));

    expect(res.status).toBe(400);
  });
});
