import type { Request } from 'express';

/**
 * Express types `req.query` as `ParsedQs` (strings all the way down), but `validate()`
 * has already replaced it with a parsed, coerced object — `page` is a real number.
 * The two cannot be reconciled through Express's generics, so the cast lives here,
 * once, instead of in every controller.
 *
 * Safe by construction: only routes that ran `validate({ query })` call this.
 */
export function validatedQuery<T>(req: Request): T {
  return req.query as unknown as T;
}
