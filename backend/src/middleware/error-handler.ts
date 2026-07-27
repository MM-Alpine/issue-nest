import { Prisma } from '@prisma/client';
import type { NextFunction, Request, Response } from 'express';
import { AppError, isAppError } from '../lib/errors';
import { logger } from '../lib/logger';

/**
 * The one place an error becomes a response. Envelope: `{ error: { code, message, details? } }`.
 * AppErrors are intentional and safe to expose. Everything else is a bug: the stack is
 * logged server-side and the client sees a fixed message — never Prisma text or SQL.
 */
function translate(error: unknown): AppError {
  if (isAppError(error)) return error;

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    // Reachable only where a race beat an explicit check; the specific mappings live
    // in the services that know which constraint they raced with.
    if (error.code === 'P2002') return new AppError(409, 'CONFLICT', 'That value is already taken');
    if (error.code === 'P2025') return new AppError(404, 'NOT_FOUND', 'Resource not found');
  }

  if (error instanceof SyntaxError && 'body' in error) {
    return new AppError(400, 'VALIDATION_ERROR', 'Malformed JSON body');
  }

  return new AppError(500, 'INTERNAL_ERROR', 'Something went wrong');
}

export function errorHandler(
  error: unknown,
  _req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (res.headersSent) {
    next(error);
    return;
  }

  const appError = translate(error);

  if (appError.status >= 500) {
    logger.error('Unhandled error', error instanceof Error ? error.stack : error);
  }

  res.status(appError.status).json({
    error: {
      code: appError.code,
      message: appError.message,
      ...(appError.details ? { details: appError.details } : {}),
    },
  });
}
