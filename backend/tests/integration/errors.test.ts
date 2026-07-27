import express from 'express';
import request from 'supertest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildApp } from '../../src/app';
import { prisma } from '../../src/lib/prisma';
import { errorHandler } from '../../src/middleware/error-handler';
import { bearer } from '../helpers/auth';
import { addMember, createIssue, createProjectWith, createUser } from '../helpers/factories';
import { Role } from '@prisma/client';

const app = buildApp();

/** Every failure the API can produce must use the same envelope. */
const expectEnvelope = (body: unknown): void => {
  expect(body).toMatchObject({ error: { code: expect.any(String), message: expect.any(String) } });
  expect(Object.keys((body as { error: object }).error).sort()).toEqual(
    expect.arrayContaining(['code', 'message']),
  );
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe('the error envelope is uniform across every status', () => {
  it('400 — invalid body carries a details map', async () => {
    const res = await request(app)
      .post('/api/auth/signup')
      .send({ name: 'x', email: 'bad', password: 'short' });

    expect(res.status).toBe(400);
    expectEnvelope(res.body);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details).toBeTypeOf('object');
  });

  it('400 — a missing required field', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'a@b.com' });

    expect(res.status).toBe(400);
    expect(res.body.error.details.password).toBeDefined();
  });

  it('400 — a malformed path id short-circuits before the membership lookup', async () => {
    const user = await createUser();

    const malformed = await request(app)
      .get('/api/projects/12345/members')
      .set('Authorization', bearer(user.id));
    // A well-formed id DOES reach the database, and comes back 404. The contrast is
    // what shows the malformed case never got that far.
    const wellFormedButAbsent = await request(app)
      .get('/api/projects/cxxxxxxxxxxxxxxxxxxxxxxxx/members')
      .set('Authorization', bearer(user.id));

    expect(malformed.status).toBe(400);
    expectEnvelope(malformed.body);
    expect(malformed.body.error.details.projectId).toBeDefined();
    expect(wellFormedButAbsent.status).toBe(404);
  });

  it('400 — malformed JSON', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .set('Content-Type', 'application/json')
      .send('{"email": ');

    expect(res.status).toBe(400);
    expectEnvelope(res.body);
  });

  it('401 — unauthenticated', async () => {
    const res = await request(app).get('/api/projects');

    expect(res.status).toBe(401);
    expectEnvelope(res.body);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('401 — authentication is checked BEFORE validation, so anonymous bad requests leak nothing', async () => {
    const res = await request(app).post('/api/projects').send({ nonsense: true });

    expect(res.status).toBe(401);
    expect(res.body.error.details).toBeUndefined();
  });

  it('403 — a member without the required role', async () => {
    const owner = await createUser();
    const member = await createUser();
    await createUser({ email: 'someone@example.com' });
    const project = await createProjectWith(owner.id);
    await addMember(project.id, member.id, Role.MEMBER);

    const res = await request(app)
      .post(`/api/projects/${project.id}/members`)
      .set('Authorization', bearer(member.id))
      .send({ email: 'someone@example.com' });

    expect(res.status).toBe(403);
    expectEnvelope(res.body);
  });

  it('404 — a resource that does not exist', async () => {
    const user = await createUser();

    const res = await request(app)
      .get('/api/projects/cxxxxxxxxxxxxxxxxxxxxxxxx')
      .set('Authorization', bearer(user.id));

    expect(res.status).toBe(404);
    expectEnvelope(res.body);
  });

  it('404 — an unknown route', async () => {
    const res = await request(app).post('/api/not-a-route');

    expect(res.status).toBe(404);
    expectEnvelope(res.body);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('409 — a duplicate value', async () => {
    await createUser({ email: 'dup@example.com' });

    const res = await request(app)
      .post('/api/auth/signup')
      .send({ name: 'Dup', email: 'dup@example.com', password: 'password123' });

    expect(res.status).toBe(409);
    expectEnvelope(res.body);
  });

  it('422 — a semantically invalid reference', async () => {
    const owner = await createUser();
    const stranger = await createUser();
    const project = await createProjectWith(owner.id);
    const issue = await createIssue(project.id, owner.id);

    const res = await request(app)
      .patch(`/api/issues/${issue.id}`)
      .set('Authorization', bearer(owner.id))
      .send({ assigneeId: stranger.id });

    expect(res.status).toBe(422);
    expectEnvelope(res.body);
  });
});

describe('unexpected failures', () => {
  it('returns 500 with a fixed message — no stack, no Prisma text, no SQL', async () => {
    const user = await createUser();
    vi.spyOn(prisma.user, 'findUnique').mockRejectedValue(
      new Error('Invalid `prisma.user.findUnique()` invocation at /Users/secret/path/app.ts:42'),
    );

    const res = await request(app).get('/api/me').set('Authorization', bearer(user.id));

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: { code: 'INTERNAL_ERROR', message: 'Something went wrong' } });

    const serialised = JSON.stringify(res.body);
    expect(serialised).not.toMatch(/prisma/i);
    expect(serialised).not.toMatch(/at .*\.ts:\d+/);
    expect(serialised).not.toMatch(/SELECT|INSERT|UPDATE/i);
  });

  it('never leaks a thrown Error message through the handler', async () => {
    const bare = express();
    bare.get('/boom', () => {
      throw new Error('DATABASE_URL=postgresql://user:hunter2@localhost/db');
    });
    bare.use(errorHandler);

    const res = await request(bare).get('/boom');

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: { code: 'INTERNAL_ERROR', message: 'Something went wrong' } });
    expect(JSON.stringify(res.body)).not.toMatch(/hunter2/);
  });
});
