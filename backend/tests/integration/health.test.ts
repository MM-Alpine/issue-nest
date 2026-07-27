import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { buildApp } from '../../src/app';

const app = buildApp();

describe('GET /api/health', () => {
  it('reports the API and the database as reachable', async () => {
    const res = await request(app).get('/api/health');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok', database: 'up' });
  });
});

describe('unknown routes', () => {
  it('returns the standard 404 envelope', async () => {
    const res = await request(app).get('/api/does-not-exist');

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
    expect(typeof res.body.error.message).toBe('string');
  });
});
