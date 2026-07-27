import jwt from 'jsonwebtoken';
import { env } from '../config/env';

/**
 * HS256 access tokens carrying only `sub`, `iat` and `exp` (docs/02 §5).
 * Roles are never in the token — they are read from the database per request, so a
 * token issued before a role change can never carry stale permissions.
 */
export interface AccessTokenClaims {
  sub: string;
  iat: number;
  exp: number;
}

export function signAccessToken(userId: string, expiresIn = env.JWT_EXPIRES_IN): string {
  return jwt.sign({}, env.JWT_SECRET, {
    algorithm: 'HS256',
    subject: userId,
    expiresIn: expiresIn as jwt.SignOptions['expiresIn'],
  });
}

/** Throws jsonwebtoken errors (TokenExpiredError / JsonWebTokenError) on failure. */
export function verifyAccessToken(token: string): AccessTokenClaims {
  const decoded = jwt.verify(token, env.JWT_SECRET, { algorithms: ['HS256'] });
  if (typeof decoded === 'string' || typeof decoded.sub !== 'string') {
    throw new jwt.JsonWebTokenError('Malformed token payload');
  }
  return { sub: decoded.sub, iat: decoded.iat as number, exp: decoded.exp as number };
}
