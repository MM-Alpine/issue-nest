import type { NextFunction, Request, Response } from 'express';
import { notFound } from '../lib/errors';

/** Unmatched route → the same envelope as every other error (docs/06 §2). */
export function notFoundHandler(req: Request, _res: Response, next: NextFunction): void {
  next(notFound(`Cannot ${req.method} ${req.path}`));
}
