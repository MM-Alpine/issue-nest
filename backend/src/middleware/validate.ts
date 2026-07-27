import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { ZodError, type ZodTypeAny } from 'zod';
import { badRequest, type ErrorDetails } from '../lib/errors';

export interface ValidationTargets {
  body?: ZodTypeAny;
  params?: ZodTypeAny;
  query?: ZodTypeAny;
}

/** Zod issues → `{ field: [messages] }`. Root-level issues land under `_`. */
export function toDetails(error: ZodError): ErrorDetails {
  const details: ErrorDetails = {};
  for (const issue of error.issues) {
    const key = issue.path.length > 0 ? issue.path.join('.') : '_';
    (details[key] ??= []).push(issue.message);
  }
  return details;
}

const MESSAGES = {
  body: 'Invalid request body',
  params: 'Invalid path parameters',
  query: 'Invalid query parameters',
} as const;

/**
 * Parses and REPLACES `req.body` / `req.params` / `req.query` with the parsed result,
 * so controllers receive typed, coerced data (docs/02 §7). Runs after `authenticate`,
 * before the controller — an unauthenticated malformed request is still a 401.
 */
export function validate(targets: ValidationTargets): RequestHandler {
  const entries = Object.entries(targets) as [keyof ValidationTargets, ZodTypeAny][];

  return (req: Request, _res: Response, next: NextFunction): void => {
    for (const [key, schema] of entries) {
      const result = schema.safeParse(req[key]);
      if (!result.success) {
        next(badRequest(MESSAGES[key], toDetails(result.error)));
        return;
      }
      // Express 5 exposes `req.query` through a getter with no setter, so a plain
      // assignment would throw. defineProperty works uniformly for all three.
      Object.defineProperty(req, key, {
        value: result.data,
        writable: true,
        enumerable: true,
        configurable: true,
      });
    }
    next();
  };
}
