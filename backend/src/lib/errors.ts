/**
 * The single error vocabulary for the API (docs/02 §8, docs/05 §2.7).
 * Anything thrown that is not an AppError is treated as a bug: logged with its
 * stack server-side and returned as a fixed 500 with no internal detail.
 */
export type ErrorDetails = Record<string, string[]>;

export class AppError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: ErrorDetails;

  constructor(status: number, code: string, message: string, details?: ErrorDetails) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.code = code;
    this.details = details;
    Error.captureStackTrace?.(this, AppError);
  }
}

export const isAppError = (e: unknown): e is AppError => e instanceof AppError;

export const badRequest = (message: string, details?: ErrorDetails, code = 'VALIDATION_ERROR') =>
  new AppError(400, code, message, details);

export const unauthorized = (message = 'Authentication required', code = 'UNAUTHORIZED') =>
  new AppError(401, code, message);

export const forbidden = (message: string, code = 'FORBIDDEN') => new AppError(403, code, message);

export const notFound = (message: string, code = 'NOT_FOUND') => new AppError(404, code, message);

export const conflict = (message: string, code = 'CONFLICT') => new AppError(409, code, message);

export const unprocessable = (message: string, code = 'UNPROCESSABLE') =>
  new AppError(422, code, message);

export const serviceUnavailable = (message: string, code = 'SERVICE_UNAVAILABLE') =>
  new AppError(503, code, message);
