import { signAccessToken } from '../../src/lib/jwt';

/**
 * Signs a token directly rather than round-tripping through /login: the login path
 * has its own tests, and bcrypt in every setup step would dominate suite time.
 */
export function bearer(userId: string, expiresIn?: string): string {
  return `Bearer ${signAccessToken(userId, expiresIn)}`;
}

/** Recursively asserts a response body never carries a password hash. */
export function assertNoPasswordHash(value: unknown): void {
  const serialised = JSON.stringify(value ?? {});
  if (/passwordHash|\$2[aby]\$/i.test(serialised)) {
    throw new Error(`Response leaked a password hash: ${serialised}`);
  }
}
