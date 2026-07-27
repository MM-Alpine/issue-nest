import { Role } from '@prisma/client';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { buildApp } from '../../src/app';
import { prisma } from '../../src/lib/prisma';
import { assertNoPasswordHash, bearer } from '../helpers/auth';
import { addMember, createIssue, createProjectWith, createUser } from '../helpers/factories';

const app = buildApp();

describe('POST /api/projects', () => {
  it('creates a project for any authenticated user', async () => {
    const user = await createUser();

    const res = await request(app)
      .post('/api/projects')
      .set('Authorization', bearer(user.id))
      .send({ name: 'Website Redesign', key: 'WEB', description: 'Marketing site rebuild' });

    expect(res.status).toBe(201);
    expect(res.body.project).toMatchObject({
      name: 'Website Redesign',
      key: 'WEB',
      description: 'Marketing site rebuild',
      role: 'MAINTAINER',
      issueCount: 0,
    });
    expect(res.body.project.id).toEqual(expect.any(String));
  });

  it('makes the creator a MAINTAINER atomically', async () => {
    const user = await createUser();

    const res = await request(app)
      .post('/api/projects')
      .set('Authorization', bearer(user.id))
      .send({ name: 'Public API', key: 'API' });

    const membership = await prisma.projectMember.findUniqueOrThrow({
      where: { projectId_userId: { projectId: res.body.project.id, userId: user.id } },
    });
    expect(membership.role).toBe(Role.MAINTAINER);
  });

  it('upper-cases the key before validating it', async () => {
    const user = await createUser();

    const res = await request(app)
      .post('/api/projects')
      .set('Authorization', bearer(user.id))
      .send({ name: 'Mobile', key: 'mob' });

    expect(res.status).toBe(201);
    expect(res.body.project.key).toBe('MOB');
  });

  it('rejects a duplicate key with 409 PROJECT_KEY_TAKEN', async () => {
    const owner = await createUser();
    await createProjectWith(owner.id, { key: 'DUP' });
    const other = await createUser();

    const res = await request(app)
      .post('/api/projects')
      .set('Authorization', bearer(other.id))
      .send({ name: 'Clashing', key: 'DUP' });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('PROJECT_KEY_TAKEN');
  });

  it('leaves no orphan project when the key collides', async () => {
    const owner = await createUser();
    await createProjectWith(owner.id, { key: 'ONCE' });
    const other = await createUser();

    await request(app)
      .post('/api/projects')
      .set('Authorization', bearer(other.id))
      .send({ name: 'Second', key: 'ONCE' });

    expect(await prisma.project.count({ where: { key: 'ONCE' } })).toBe(1);
  });

  it('rejects an invalid key shape with 400', async () => {
    const user = await createUser();

    const res = await request(app)
      .post('/api/projects')
      .set('Authorization', bearer(user.id))
      .send({ name: 'Bad key', key: '1BAD!' });

    expect(res.status).toBe(400);
    expect(res.body.error.details.key).toBeDefined();
  });

  it('rejects unknown body keys with 400', async () => {
    const user = await createUser();

    const res = await request(app)
      .post('/api/projects')
      .set('Authorization', bearer(user.id))
      .send({ name: 'Sneaky', key: 'SNK', isAdmin: true });

    expect(res.status).toBe(400);
  });

  it('requires authentication', async () => {
    const res = await request(app).post('/api/projects').send({ name: 'Nope', key: 'NOP' });

    expect(res.status).toBe(401);
  });
});

describe('GET /api/projects', () => {
  it('returns only the projects the caller is a member of, newest first', async () => {
    const asha = await createUser();
    const stranger = await createUser();
    const older = await createProjectWith(asha.id, { name: 'Older', key: 'OLD' });
    await createProjectWith(asha.id, { name: 'Newer', key: 'NEW' });
    await createProjectWith(stranger.id, { name: 'Private', key: 'PRV' });
    await createIssue(older.id, asha.id);

    const res = await request(app).get('/api/projects').set('Authorization', bearer(asha.id));

    expect(res.status).toBe(200);
    expect(res.body.projects.map((p: { key: string }) => p.key)).toEqual(['NEW', 'OLD']);
    expect(res.body.projects.find((p: { key: string }) => p.key === 'OLD').issueCount).toBe(1);
    expect(res.body.projects.every((p: { role: string }) => p.role === 'MAINTAINER')).toBe(true);
  });

  it('returns an empty list for a user with no memberships', async () => {
    const user = await createUser();

    const res = await request(app).get('/api/projects').set('Authorization', bearer(user.id));

    expect(res.status).toBe(200);
    expect(res.body.projects).toEqual([]);
  });
});

describe('GET /api/projects/:projectId', () => {
  it('returns detail with the caller role and counts for a member', async () => {
    const owner = await createUser();
    const member = await createUser();
    const project = await createProjectWith(owner.id, { name: 'Website', key: 'WEBD' });
    await addMember(project.id, member.id, Role.MEMBER);
    await createIssue(project.id, owner.id);

    const res = await request(app)
      .get(`/api/projects/${project.id}`)
      .set('Authorization', bearer(member.id));

    expect(res.status).toBe(200);
    expect(res.body.project).toMatchObject({
      id: project.id,
      key: 'WEBD',
      role: 'MEMBER',
      memberCount: 2,
      issueCount: 1,
    });
  });

  it('returns 404 for a non-member, never revealing that the project exists', async () => {
    const owner = await createUser();
    const stranger = await createUser();
    const project = await createProjectWith(owner.id);

    const res = await request(app)
      .get(`/api/projects/${project.id}`)
      .set('Authorization', bearer(stranger.id));

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('returns 400 for a malformed id without touching the database', async () => {
    const user = await createUser();

    const res = await request(app)
      .get('/api/projects/not-a-cuid')
      .set('Authorization', bearer(user.id));

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});

describe('GET /api/projects/:projectId/members', () => {
  it('lists members maintainers-first, then by name, without password hashes', async () => {
    const asha = await createUser({ name: 'Asha Kumar' });
    const ravi = await createUser({ name: 'Ravi Menon' });
    const bala = await createUser({ name: 'Bala Iyer' });
    const project = await createProjectWith(asha.id);
    await addMember(project.id, ravi.id, Role.MEMBER);
    await addMember(project.id, bala.id, Role.MEMBER);

    const res = await request(app)
      .get(`/api/projects/${project.id}/members`)
      .set('Authorization', bearer(ravi.id));

    expect(res.status).toBe(200);
    expect(res.body.members.map((m: { name: string }) => m.name)).toEqual([
      'Asha Kumar',
      'Bala Iyer',
      'Ravi Menon',
    ]);
    expect(res.body.members[0]).toMatchObject({ userId: asha.id, role: 'MAINTAINER' });
    assertNoPasswordHash(res.body);
  });

  it('returns 404 for a non-member', async () => {
    const owner = await createUser();
    const stranger = await createUser();
    const project = await createProjectWith(owner.id);

    const res = await request(app)
      .get(`/api/projects/${project.id}/members`)
      .set('Authorization', bearer(stranger.id));

    expect(res.status).toBe(404);
  });
});

describe('POST /api/projects/:projectId/members', () => {
  it('lets a maintainer add an existing user by email', async () => {
    const owner = await createUser();
    const invitee = await createUser({ name: 'Ravi Menon', email: 'ravi@example.com' });
    const project = await createProjectWith(owner.id);

    const res = await request(app)
      .post(`/api/projects/${project.id}/members`)
      .set('Authorization', bearer(owner.id))
      .send({ email: 'RAVI@example.com', role: 'MEMBER' });

    expect(res.status).toBe(201);
    expect(res.body.member).toMatchObject({
      userId: invitee.id,
      name: 'Ravi Menon',
      email: 'ravi@example.com',
      role: 'MEMBER',
    });
    assertNoPasswordHash(res.body);
  });

  it('defaults the role to MEMBER when omitted', async () => {
    const owner = await createUser();
    await createUser({ email: 'norole@example.com' });
    const project = await createProjectWith(owner.id);

    const res = await request(app)
      .post(`/api/projects/${project.id}/members`)
      .set('Authorization', bearer(owner.id))
      .send({ email: 'norole@example.com' });

    expect(res.status).toBe(201);
    expect(res.body.member.role).toBe('MEMBER');
  });

  it('can add another MAINTAINER', async () => {
    const owner = await createUser();
    await createUser({ email: 'comaint@example.com' });
    const project = await createProjectWith(owner.id);

    const res = await request(app)
      .post(`/api/projects/${project.id}/members`)
      .set('Authorization', bearer(owner.id))
      .send({ email: 'comaint@example.com', role: 'MAINTAINER' });

    expect(res.status).toBe(201);
    expect(res.body.member.role).toBe('MAINTAINER');
  });

  it('rejects a duplicate membership with 409 ALREADY_MEMBER', async () => {
    const owner = await createUser();
    const member = await createUser({ email: 'dupe@example.com' });
    const project = await createProjectWith(owner.id);
    await addMember(project.id, member.id, Role.MEMBER);

    const res = await request(app)
      .post(`/api/projects/${project.id}/members`)
      .set('Authorization', bearer(owner.id))
      .send({ email: 'dupe@example.com' });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('ALREADY_MEMBER');
  });

  it('returns 404 USER_NOT_FOUND when no account has that email', async () => {
    const owner = await createUser();
    const project = await createProjectWith(owner.id);

    const res = await request(app)
      .post(`/api/projects/${project.id}/members`)
      .set('Authorization', bearer(owner.id))
      .send({ email: 'ghost@example.com' });

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('USER_NOT_FOUND');
  });

  it('rejects a MEMBER trying to add a member with 403', async () => {
    const owner = await createUser();
    const member = await createUser();
    await createUser({ email: 'target@example.com' });
    const project = await createProjectWith(owner.id);
    await addMember(project.id, member.id, Role.MEMBER);

    const res = await request(app)
      .post(`/api/projects/${project.id}/members`)
      .set('Authorization', bearer(member.id))
      .send({ email: 'target@example.com' });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('returns 404 (not 403) for a non-member trying to add a member', async () => {
    const owner = await createUser();
    const stranger = await createUser();
    await createUser({ email: 'target2@example.com' });
    const project = await createProjectWith(owner.id);

    const res = await request(app)
      .post(`/api/projects/${project.id}/members`)
      .set('Authorization', bearer(stranger.id))
      .send({ email: 'target2@example.com' });

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('rejects an invalid role with 400', async () => {
    const owner = await createUser();
    await createUser({ email: 'role@example.com' });
    const project = await createProjectWith(owner.id);

    const res = await request(app)
      .post(`/api/projects/${project.id}/members`)
      .set('Authorization', bearer(owner.id))
      .send({ email: 'role@example.com', role: 'ADMIN' });

    expect(res.status).toBe(400);
    expect(res.body.error.details.role).toBeDefined();
  });
});
