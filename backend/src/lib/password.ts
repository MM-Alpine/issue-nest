import bcrypt from 'bcrypt';
import { isTest } from '../config/env';

/**
 * Cost 10 in real environments; 4 under NODE_ENV=test so the integration suite
 * isn't dominated by KDF time (docs/02 §5).
 */
export const BCRYPT_COST = isTest ? 4 : 10;

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_COST);
}

export function verifyPassword(plain: string, passwordHash: string): Promise<boolean> {
  return bcrypt.compare(plain, passwordHash);
}
