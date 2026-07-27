import { Role } from '@prisma/client';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { buildApp } from '../../src/app';
import { prisma } from '../../src/lib/prisma';
import { assertNoPasswordHash, bearer } from '../helpers/auth';
import { addMember, createComment, createIssue, createProjectWith, createUser } from '../helpers/factories';

const app = buildApp();

async function scenario() {
  const maintainer = await createUser({ name: 'Asha Kumar' });
  const member = await createUser({ name: 'Ravi Menon' });
  const stranger = await createUser({ name: 'Outsider' });
  const project = await createProjectWith(maintainer.id);
  await addMember(project.id, member.id, Role.MEMBER);
  const issue = await createIssue(project.id, member.id);
  return { maintainer, member, stranger, project, issue };
}

describe('POST /api/issues/:issueId/comments', () => {
  it('lets any project member add a comment', async () => {
    const { member, issue } = await scenario();

    const res = await request(app)
      .post(`/api/issues/${issue.id}/comments`)
      .set('Authorization', bearer(member.id))
      .send({ body: 'Reproduced on iOS 17.4.' });

    expect(res.status).toBe(201);
    expect(res.body.comment).toMatchObject({ body: 'Reproduced on iOS 17.4.' });
    expect(res.body.comment.author).toEqual({
      id: member.id,
      name: 'Ravi Menon',
      email: member.email,
    });
    expect(res.body.comment.createdAt).toEqual(expect.any(String));
    assertNoPasswordHash(res.body);
  });

  it('lets a maintainer comment too — role is irrelevant here', async () => {
    const { maintainer, issue } = await scenario();

    const res = await request(app)
      .post(`/api/issues/${issue.id}/comments`)
      .set('Authorization', bearer(maintainer.id))
      .send({ body: 'Fix is in review.' });

    expect(res.status).toBe(201);
  });

  it('trims the stored body', async () => {
    const { member, issue } = await scenario();

    const res = await request(app)
      .post(`/api/issues/${issue.id}/comments`)
      .set('Authorization', bearer(member.id))
      .send({ body: '  padded  ' });

    expect(res.status).toBe(201);
    expect(res.body.comment.body).toBe('padded');
  });

  it('rejects an empty body with 400', async () => {
    const { member, issue } = await scenario();

    const res = await request(app)
      .post(`/api/issues/${issue.id}/comments`)
      .set('Authorization', bearer(member.id))
      .send({ body: '' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details.body).toBeDefined();
  });

  it('rejects a whitespace-only body with 400', async () => {
    const { member, issue } = await scenario();

    const res = await request(app)
      .post(`/api/issues/${issue.id}/comments`)
      .set('Authorization', bearer(member.id))
      .send({ body: '   ' });

    expect(res.status).toBe(400);
    expect(await prisma.comment.count()).toBe(0);
  });

  it('rejects a body over 5000 characters with 400', async () => {
    const { member, issue } = await scenario();

    const res = await request(app)
      .post(`/api/issues/${issue.id}/comments`)
      .set('Authorization', bearer(member.id))
      .send({ body: 'x'.repeat(5001) });

    expect(res.status).toBe(400);
  });

  it('returns 404 for a non-member', async () => {
    const { stranger, issue } = await scenario();

    const res = await request(app)
      .post(`/api/issues/${issue.id}/comments`)
      .set('Authorization', bearer(stranger.id))
      .send({ body: 'Let me in' });

    expect(res.status).toBe(404);
    expect(await prisma.comment.count()).toBe(0);
  });

  it('returns 404 for an issue that does not exist', async () => {
    const user = await createUser();

    const res = await request(app)
      .post('/api/issues/cxxxxxxxxxxxxxxxxxxxxxxxx/comments')
      .set('Authorization', bearer(user.id))
      .send({ body: 'Into the void' });

    expect(res.status).toBe(404);
  });

  it('requires authentication', async () => {
    const { issue } = await scenario();

    const res = await request(app).post(`/api/issues/${issue.id}/comments`).send({ body: 'hi' });

    expect(res.status).toBe(401);
  });
});

describe('GET /api/issues/:issueId/comments', () => {
  it('returns comments oldest first, with a safe author payload', async () => {
    const { maintainer, member, issue } = await scenario();
    await createComment(issue.id, maintainer.id, 'second', new Date('2026-02-02T10:00:00Z'));
    await createComment(issue.id, member.id, 'first', new Date('2026-02-01T10:00:00Z'));
    await createComment(issue.id, member.id, 'third', new Date('2026-02-03T10:00:00Z'));

    const res = await request(app)
      .get(`/api/issues/${issue.id}/comments`)
      .set('Authorization', bearer(member.id));

    expect(res.status).toBe(200);
    expect(res.body.comments.map((c: { body: string }) => c.body)).toEqual([
      'first',
      'second',
      'third',
    ]);
    expect(Object.keys(res.body.comments[0].author).sort()).toEqual(['email', 'id', 'name']);
    assertNoPasswordHash(res.body);
  });

  it('returns an empty array for an issue with no comments', async () => {
    const { member, issue } = await scenario();

    const res = await request(app)
      .get(`/api/issues/${issue.id}/comments`)
      .set('Authorization', bearer(member.id));

    expect(res.status).toBe(200);
    expect(res.body.comments).toEqual([]);
  });

  it('returns 404 for a non-member', async () => {
    const { member, stranger, issue } = await scenario();
    await createComment(issue.id, member.id, 'secret');

    const res = await request(app)
      .get(`/api/issues/${issue.id}/comments`)
      .set('Authorization', bearer(stranger.id));

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('returns 400 for a malformed issue id', async () => {
    const user = await createUser();

    const res = await request(app)
      .get('/api/issues/nope/comments')
      .set('Authorization', bearer(user.id));

    expect(res.status).toBe(400);
  });
});
