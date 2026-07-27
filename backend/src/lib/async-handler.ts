import type { NextFunction, Request, RequestHandler, Response } from 'express';

/**
 * Express 5 forwards rejected promises to the error middleware on its own, but only
 * for handlers it recognises as returning a promise. Wrapping keeps that explicit and
 * uniform across every route — see docs/02 §8.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function asyncHandler<T extends RequestHandler<any, any, any, any>>(handler: T): T {
  const wrapped = (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve((handler as RequestHandler)(req, res, next)).catch(next);
  };
  return wrapped as unknown as T;
}
