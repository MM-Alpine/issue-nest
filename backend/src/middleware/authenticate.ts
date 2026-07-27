import type { NextFunction, Request, Response } from 'express';
import { unauthorized } from '../lib/errors';
import { verifyAccessToken } from '../lib/jwt';
import { prisma } from '../lib/prisma';

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
}

declare module 'express-serve-static-core' {
  interface Request {
    user?: AuthenticatedUser;
  }
}

/**
 * Verifies the bearer token and loads the user fresh from the database.
 * Every failure mode (missing header, malformed header, bad signature, expired
 * token, deleted user) returns the same 401 envelope — docs/02 §5.
 */
export async function authenticate(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      throw unauthorized();
    }

    const token = header.slice('Bearer '.length).trim();
    if (!token) throw unauthorized();

    let sub: string;
    try {
      ({ sub } = verifyAccessToken(token));
    } catch {
      throw unauthorized('Invalid or expired token');
    }

    const user = await prisma.user.findUnique({
      where: { id: sub },
      select: { id: true, email: true, name: true },
    });
    if (!user) throw unauthorized('Invalid or expired token');

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
}

/** Narrowing helper: routes behind `authenticate` always have a user. */
export function currentUser(req: Request): AuthenticatedUser {
  if (!req.user) throw unauthorized();
  return req.user;
}
