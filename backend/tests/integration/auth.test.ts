import request from 'supertest';
import { beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from '../../src/app';
import { verifyPassword } from '../../src/lib/password';
import { prisma } from '../../src/lib/prisma';
import { assertNoPasswordHash, bearer } from '../helpers/auth';
import { createUser, DEFAULT_PASSWORD } from '../helpers/factories';

const app = buildApp();

let appRef: ReturnType<typeof buildApp>;
beforeAll(() => {
  appRef = app;
});

describe('POST /api/auth/signup', () => {
  it('creates an account and returns the user plus an access token', async () => {
    const res = await request(appRef)
      .post('/api/auth/signup')
      .send({ name: 'Asha Kumar', email: 'Asha@Example.com', password: 'correct-horse' });

    expect(res.status).toBe(201);
    expect(res.body.user).toMatchObject({ name: 'Asha Kumar', email: 'asha@example.com' });
    expect(res.body.user.id).toEqual(expect.any(String));
    expect(res.body.user.createdAt).toEqual(expect.any(String));
    expect(typeof res.body.accessToken).toBe('string');
    assertNoPasswordHash(res.body);
  });

  it('rejects a duplicate email with 409 EMAIL_ALREADY_EXISTS', async () => {
    await createUser({ email: 'taken@example.com' });

    const res = await request(appRef)
      .post('/api/auth/signup')
      .send({ name: 'Someone', email: 'taken@example.com', password: 'password123' });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('EMAIL_ALREADY_EXISTS');
  });

  it('persists the password only as a bcrypt hash that verifies', async () => {
    await request(appRef)
      .post('/api/auth/signup')
      .send({ name: 'Hash Check', email: 'hash@example.com', password: 'super-secret-1' });

    const stored = await prisma.user.findUniqueOrThrow({ where: { email: 'hash@example.com' } });

    expect(stored.passwordHash).not.toBe('super-secret-1');
    expect(stored.passwordHash.startsWith('$2')).toBe(true);
    await expect(verifyPassword('super-secret-1', stored.passwordHash)).resolves.toBe(true);
    await expect(verifyPassword('wrong-password', stored.passwordHash)).resolves.toBe(false);
  });

  it('rejects a short password, a malformed email and an empty name with 400 + details', async () => {
    const res = await request(appRef)
      .post('/api/auth/signup')
      .send({ name: '', email: 'not-an-email', password: 'short' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(Object.keys(res.body.error.details).sort()).toEqual(['email', 'name', 'password']);
  });
});

describe('POST /api/auth/login', () => {
  it('returns a token for correct credentials', async () => {
    const user = await createUser({ email: 'login@example.com' });

    const res = await request(appRef)
      .post('/api/auth/login')
      .send({ email: 'login@example.com', password: DEFAULT_PASSWORD });

    expect(res.status).toBe(200);
    expect(res.body.user).toMatchObject({ id: user.id, email: 'login@example.com' });
    expect(typeof res.body.accessToken).toBe('string');
    assertNoPasswordHash(res.body);
  });

  it('rejects a wrong password with 401 INVALID_CREDENTIALS', async () => {
    await createUser({ email: 'login2@example.com' });

    const res = await request(appRef)
      .post('/api/auth/login')
      .send({ email: 'login2@example.com', password: 'not-the-password' });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
  });

  it('returns an identical response for an unknown email, so accounts cannot be enumerated', async () => {
    await createUser({ email: 'known@example.com' });

    const unknown = await request(appRef)
      .post('/api/auth/login')
      .send({ email: 'nobody@example.com', password: DEFAULT_PASSWORD });
    const wrongPassword = await request(appRef)
      .post('/api/auth/login')
      .send({ email: 'known@example.com', password: 'nope-nope-nope' });

    expect(unknown.status).toBe(401);
    expect(unknown.body).toEqual(wrongPassword.body);
  });
});

describe('POST /api/auth/logout', () => {
  it('returns 204 for an authenticated caller', async () => {
    const user = await createUser();

    const res = await request(appRef).post('/api/auth/logout').set('Authorization', bearer(user.id));

    expect(res.status).toBe(204);
    expect(res.body).toEqual({});
  });
});

describe('GET /api/me — protected route behaviour', () => {
  it('returns the authenticated user without a password hash', async () => {
    const user = await createUser({ name: 'Mei Chen' });

    const res = await request(appRef).get('/api/me').set('Authorization', bearer(user.id));

    expect(res.status).toBe(200);
    expect(res.body.user).toMatchObject({ id: user.id, name: 'Mei Chen', email: user.email });
    expect(res.body.user.createdAt).toEqual(expect.any(String));
    assertNoPasswordHash(res.body);
  });

  it('rejects a missing token with 401', async () => {
    const res = await request(appRef).get('/api/me');

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('rejects a malformed Authorization header with 401', async () => {
    const res = await request(appRef).get('/api/me').set('Authorization', 'Token abc.def.ghi');

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('rejects a tampered token with 401', async () => {
    const user = await createUser();
    const tampered = `${bearer(user.id)}tampered`;

    const res = await request(appRef).get('/api/me').set('Authorization', tampered);

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('rejects an expired token with 401', async () => {
    const user = await createUser();

    const res = await request(appRef).get('/api/me').set('Authorization', bearer(user.id, '-1s'));

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('rejects a valid token whose user no longer exists with 401', async () => {
    const user = await createUser();
    const token = bearer(user.id);
    await prisma.user.delete({ where: { id: user.id } });

    const res = await request(appRef).get('/api/me').set('Authorization', token);

    expect(res.status).toBe(401);
  });
});
