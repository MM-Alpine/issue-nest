import { describe, expect, it } from 'vitest';
import { hashPassword, verifyPassword } from '../../src/lib/password';

describe('password hashing', () => {
  it('round-trips: a hashed password verifies against its plaintext', async () => {
    const hash = await hashPassword('correct-horse-battery');

    expect(hash).not.toBe('correct-horse-battery');
    await expect(verifyPassword('correct-horse-battery', hash)).resolves.toBe(true);
  });

  it('rejects a wrong plaintext', async () => {
    const hash = await hashPassword('correct-horse-battery');

    await expect(verifyPassword('wrong-horse-battery', hash)).resolves.toBe(false);
  });

  it('produces a different hash each time (salted)', async () => {
    const [a, b] = await Promise.all([hashPassword('same-input'), hashPassword('same-input')]);

    expect(a).not.toBe(b);
    await expect(verifyPassword('same-input', a)).resolves.toBe(true);
    await expect(verifyPassword('same-input', b)).resolves.toBe(true);
  });
});
