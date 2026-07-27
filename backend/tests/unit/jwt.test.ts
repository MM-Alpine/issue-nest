import jwt from 'jsonwebtoken';
import { describe, expect, it } from 'vitest';
import { signAccessToken, verifyAccessToken } from '../../src/lib/jwt';

describe('access tokens', () => {
  it('signs and verifies a token carrying only sub / iat / exp', () => {
    const token = signAccessToken('cabcdefghijklmnopqrstuvwx');

    const claims = verifyAccessToken(token);

    expect(claims.sub).toBe('cabcdefghijklmnopqrstuvwx');
    expect(claims.iat).toEqual(expect.any(Number));
    expect(claims.exp).toBeGreaterThan(claims.iat);

    const decoded = jwt.decode(token) as Record<string, unknown>;
    expect(Object.keys(decoded).sort()).toEqual(['exp', 'iat', 'sub']);
  });

  it('rejects an expired token', () => {
    const token = signAccessToken('cabcdefghijklmnopqrstuvwx', '-1s');

    expect(() => verifyAccessToken(token)).toThrow(jwt.TokenExpiredError);
  });

  it('rejects a token signed with a different secret', () => {
    const foreign = jwt.sign({}, 'a-completely-different-secret-value-32+', {
      subject: 'cabcdefghijklmnopqrstuvwx',
      expiresIn: '1d',
    });

    expect(() => verifyAccessToken(foreign)).toThrow(jwt.JsonWebTokenError);
  });

  it('rejects a tampered token', () => {
    const token = signAccessToken('cabcdefghijklmnopqrstuvwx');

    expect(() => verifyAccessToken(`${token}x`)).toThrow(jwt.JsonWebTokenError);
  });
});
