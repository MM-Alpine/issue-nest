import { IssuePriority, IssueStatus, Role } from '@prisma/client';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { buildApp } from '../../src/app';
import { prisma } from '../../src/lib/prisma';
import { assertNoPasswordHash, bearer } from '../helpers/auth';
import { addMember, createComment, createIssue, createProjectWith, createUser } from '../helpers/factories';

const app = buildApp();

/** maintainer (project owner) + member + reporter-member + a non-member stranger. */
async function scenario() {
  const maintainer = await createUser({ name: 'Asha Kumar' });
  const reporter = await createUser({ name: 'Ravi Menon' });
  const otherMember = await createUser({ name: 'Mei Chen' });
  const stranger = await createUser({ name: 'Outsider' });
  const project = await createProjectWith(maintainer.id);
  await addMember(project.id, reporter.id, Role.MEMBER);
  await addMember(project.id, otherMember.id, Role.MEMBER);
  return { maintainer, reporter, otherMember, stranger, project };
}

describe('POST /api/projects/:projectId/issues', () => {
  it('lets any project member create an issue, defaulting to OPEN', async () => {
    const { reporter, project } = await scenario();

    const res = await request(app)
      .post(`/api/projects/${project.id}/issues`)
      .set('Authorization', bearer(reporter.id))
      .send({ title: 'Footer links 404', description: 'All footer links…', priority: 'LOW' });

    expect(res.status).toBe(201);
    expect(res.body.issue).toMatchObject({
      title: 'Footer links 404',
      description: 'All footer links…',
      status: 'OPEN',
      priority: 'LOW',
      assignee: null,
      commentCount: 0,
    });
    expect(res.body.issue.reporter).toEqual({
      id: reporter.id,
      name: 'Ravi Menon',
      email: reporter.email,
    });
    assertNoPasswordHash(res.body);
  });

  it('defaults priority to MEDIUM', async () => {
    const { reporter, project } = await scenario();

    const res = await request(app)
      .post(`/api/projects/${project.id}/issues`)
      .set('Authorization', bearer(reporter.id))
      .send({ title: 'No priority given' });

    expect(res.status).toBe(201);
    expect(res.body.issue.priority).toBe('MEDIUM');
  });

  it('returns 404 for a non-member, never revealing the project exists', async () => {
    const { stranger, project } = await scenario();

    const res = await request(app)
      .post(`/api/projects/${project.id}/issues`)
      .set('Authorization', bearer(stranger.id))
      .send({ title: 'Should not land' });

    expect(res.status).toBe(404);
    expect(await prisma.issue.count()).toBe(0);
  });

  it('lets a maintainer set the assignee at creation', async () => {
    const { maintainer, reporter, project } = await scenario();

    const res = await request(app)
      .post(`/api/projects/${project.id}/issues`)
      .set('Authorization', bearer(maintainer.id))
      .send({ title: 'Assigned at birth', assigneeId: reporter.id });

    expect(res.status).toBe(201);
    expect(res.body.issue.assignee).toMatchObject({ id: reporter.id });
  });

  it('rejects a MEMBER supplying assigneeId at creation with 403', async () => {
    const { reporter, otherMember, project } = await scenario();

    const res = await request(app)
      .post(`/api/projects/${project.id}/issues`)
      .set('Authorization', bearer(reporter.id))
      .send({ title: 'Sneaky assignment', assigneeId: otherMember.id });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
    expect(await prisma.issue.count()).toBe(0);
  });

  it('rejects an assignee who is not a project member with 422 ASSIGNEE_NOT_MEMBER', async () => {
    const { maintainer, stranger, project } = await scenario();

    const res = await request(app)
      .post(`/api/projects/${project.id}/issues`)
      .set('Authorization', bearer(maintainer.id))
      .send({ title: 'Outsider assignment', assigneeId: stranger.id });

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('ASSIGNEE_NOT_MEMBER');
  });

  it('rejects a missing title with 400 and details', async () => {
    const { reporter, project } = await scenario();

    const res = await request(app)
      .post(`/api/projects/${project.id}/issues`)
      .set('Authorization', bearer(reporter.id))
      .send({ description: 'no title' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details.title).toBeDefined();
  });

  it('rejects an invalid priority enum with 400', async () => {
    const { reporter, project } = await scenario();

    const res = await request(app)
      .post(`/api/projects/${project.id}/issues`)
      .set('Authorization', bearer(reporter.id))
      .send({ title: 'Bad priority', priority: 'URGENT' });

    expect(res.status).toBe(400);
    expect(res.body.error.details.priority).toBeDefined();
  });
});

describe('GET /api/issues/:issueId', () => {
  it('returns the issue with project, reporter, assignee and the caller viewerRole', async () => {
    const { maintainer, reporter, project } = await scenario();
    const issue = await createIssue(project.id, reporter.id, { assigneeId: maintainer.id });

    const res = await request(app)
      .get(`/api/issues/${issue.id}`)
      .set('Authorization', bearer(reporter.id));

    expect(res.status).toBe(200);
    expect(res.body.issue).toMatchObject({ id: issue.id, status: 'OPEN' });
    expect(res.body.issue.project).toMatchObject({ id: project.id, key: project.key });
    expect(res.body.issue.reporter.id).toBe(reporter.id);
    expect(res.body.issue.assignee.id).toBe(maintainer.id);
    expect(res.body.viewerRole).toBe('MEMBER');
    assertNoPasswordHash(res.body);
  });

  it('reports MAINTAINER as the viewerRole for a maintainer', async () => {
    const { maintainer, reporter, project } = await scenario();
    const issue = await createIssue(project.id, reporter.id);

    const res = await request(app)
      .get(`/api/issues/${issue.id}`)
      .set('Authorization', bearer(maintainer.id));

    expect(res.body.viewerRole).toBe('MAINTAINER');
  });

  it('returns 404 for a non-member', async () => {
    const { reporter, stranger, project } = await scenario();
    const issue = await createIssue(project.id, reporter.id);

    const res = await request(app)
      .get(`/api/issues/${issue.id}`)
      .set('Authorization', bearer(stranger.id));

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('returns a structured 404 for an issue that does not exist', async () => {
    const user = await createUser();

    const res = await request(app)
      .get('/api/issues/cxxxxxxxxxxxxxxxxxxxxxxxx')
      .set('Authorization', bearer(user.id));

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: { code: 'NOT_FOUND', message: expect.any(String) } });
  });
});

describe('PATCH /api/issues/:issueId', () => {
  it('lets the reporter update title, description and priority of their own issue', async () => {
    const { reporter, project } = await scenario();
    const issue = await createIssue(project.id, reporter.id, { title: 'Before' });

    const res = await request(app)
      .patch(`/api/issues/${issue.id}`)
      .set('Authorization', bearer(reporter.id))
      .send({ title: 'After', description: 'Now with detail', priority: 'HIGH' });

    expect(res.status).toBe(200);
    expect(res.body.issue).toMatchObject({
      title: 'After',
      description: 'Now with detail',
      priority: 'HIGH',
    });
  });

  it('rejects a MEMBER updating an issue reported by someone else with 403', async () => {
    const { reporter, otherMember, project } = await scenario();
    const issue = await createIssue(project.id, reporter.id);

    const res = await request(app)
      .patch(`/api/issues/${issue.id}`)
      .set('Authorization', bearer(otherMember.id))
      .send({ title: 'Not mine' });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('lets a maintainer update any issue in the project', async () => {
    const { maintainer, reporter, project } = await scenario();
    const issue = await createIssue(project.id, reporter.id);

    const res = await request(app)
      .patch(`/api/issues/${issue.id}`)
      .set('Authorization', bearer(maintainer.id))
      .send({ title: 'Triaged by lead' });

    expect(res.status).toBe(200);
    expect(res.body.issue.title).toBe('Triaged by lead');
  });

  it('lets only a maintainer change status', async () => {
    const { maintainer, reporter, project } = await scenario();
    const issue = await createIssue(project.id, reporter.id);

    const allowed = await request(app)
      .patch(`/api/issues/${issue.id}`)
      .set('Authorization', bearer(maintainer.id))
      .send({ status: 'IN_PROGRESS' });

    expect(allowed.status).toBe(200);
    expect(allowed.body.issue.status).toBe('IN_PROGRESS');
  });

  it('rejects the reporter changing status on their OWN issue with 403', async () => {
    const { reporter, project } = await scenario();
    const issue = await createIssue(project.id, reporter.id);

    const res = await request(app)
      .patch(`/api/issues/${issue.id}`)
      .set('Authorization', bearer(reporter.id))
      .send({ status: 'RESOLVED' });

    expect(res.status).toBe(403);
    const unchanged = await prisma.issue.findUniqueOrThrow({ where: { id: issue.id } });
    expect(unchanged.status).toBe(IssueStatus.OPEN);
  });

  it('rejects the reporter changing assigneeId on their OWN issue with 403', async () => {
    const { reporter, otherMember, project } = await scenario();
    const issue = await createIssue(project.id, reporter.id);

    const res = await request(app)
      .patch(`/api/issues/${issue.id}`)
      .set('Authorization', bearer(reporter.id))
      .send({ assigneeId: otherMember.id });

    expect(res.status).toBe(403);
  });

  it('lets a maintainer assign a project member', async () => {
    const { maintainer, reporter, otherMember, project } = await scenario();
    const issue = await createIssue(project.id, reporter.id);

    const res = await request(app)
      .patch(`/api/issues/${issue.id}`)
      .set('Authorization', bearer(maintainer.id))
      .send({ assigneeId: otherMember.id });

    expect(res.status).toBe(200);
    expect(res.body.issue.assignee).toMatchObject({ id: otherMember.id });
  });

  it('rejects assigning a user who is not a project member with 422', async () => {
    const { maintainer, reporter, stranger, project } = await scenario();
    const issue = await createIssue(project.id, reporter.id);

    const res = await request(app)
      .patch(`/api/issues/${issue.id}`)
      .set('Authorization', bearer(maintainer.id))
      .send({ assigneeId: stranger.id });

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('ASSIGNEE_NOT_MEMBER');
  });

  it('clears the assignment when assigneeId is null', async () => {
    const { maintainer, reporter, project } = await scenario();
    const issue = await createIssue(project.id, reporter.id, { assigneeId: maintainer.id });

    const res = await request(app)
      .patch(`/api/issues/${issue.id}`)
      .set('Authorization', bearer(maintainer.id))
      .send({ assigneeId: null });

    expect(res.status).toBe(200);
    expect(res.body.issue.assignee).toBeNull();
  });

  it('rejects an empty patch with 400 and a "_" detail', async () => {
    const { reporter, project } = await scenario();
    const issue = await createIssue(project.id, reporter.id);

    const res = await request(app)
      .patch(`/api/issues/${issue.id}`)
      .set('Authorization', bearer(reporter.id))
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details._).toEqual(['No fields to update']);
  });

  it('returns 404 for a non-member', async () => {
    const { reporter, stranger, project } = await scenario();
    const issue = await createIssue(project.id, reporter.id);

    const res = await request(app)
      .patch(`/api/issues/${issue.id}`)
      .set('Authorization', bearer(stranger.id))
      .send({ title: 'Not yours' });

    expect(res.status).toBe(404);
  });

  it('refreshes updatedAt', async () => {
    const { maintainer, reporter, project } = await scenario();
    const issue = await createIssue(project.id, reporter.id);
    const before = await prisma.issue.findUniqueOrThrow({ where: { id: issue.id } });

    const res = await request(app)
      .patch(`/api/issues/${issue.id}`)
      .set('Authorization', bearer(maintainer.id))
      .send({ priority: 'CRITICAL' });

    expect(new Date(res.body.issue.updatedAt).getTime()).toBeGreaterThanOrEqual(
      before.updatedAt.getTime(),
    );
    expect(res.body.issue.priority).toBe(IssuePriority.CRITICAL);
  });
});

describe('DELETE /api/issues/:issueId', () => {
  it('lets a maintainer delete an issue and cascades its comments', async () => {
    const { maintainer, reporter, project } = await scenario();
    const issue = await createIssue(project.id, reporter.id);
    await createComment(issue.id, reporter.id, 'will vanish');

    const res = await request(app)
      .delete(`/api/issues/${issue.id}`)
      .set('Authorization', bearer(maintainer.id));

    expect(res.status).toBe(204);
    expect(await prisma.issue.findUnique({ where: { id: issue.id } })).toBeNull();
    expect(await prisma.comment.count({ where: { issueId: issue.id } })).toBe(0);
  });

  it('rejects a MEMBER deleting an issue with 403', async () => {
    const { reporter, otherMember, project } = await scenario();
    const issue = await createIssue(project.id, reporter.id);

    const res = await request(app)
      .delete(`/api/issues/${issue.id}`)
      .set('Authorization', bearer(otherMember.id));

    expect(res.status).toBe(403);
    expect(await prisma.issue.count()).toBe(1);
  });

  it('rejects the reporter deleting their OWN issue with 403', async () => {
    const { reporter, project } = await scenario();
    const issue = await createIssue(project.id, reporter.id);

    const res = await request(app)
      .delete(`/api/issues/${issue.id}`)
      .set('Authorization', bearer(reporter.id));

    expect(res.status).toBe(403);
  });

  it('returns 404 for a non-member', async () => {
    const { reporter, stranger, project } = await scenario();
    const issue = await createIssue(project.id, reporter.id);

    const res = await request(app)
      .delete(`/api/issues/${issue.id}`)
      .set('Authorization', bearer(stranger.id));

    expect(res.status).toBe(404);
    expect(await prisma.issue.count()).toBe(1);
  });
});
