import { beforeEach } from 'vitest';
import { prisma } from '../../src/lib/prisma';

// Belt-and-braces: vitest.config.ts already pins DATABASE_URL to TEST_DATABASE_URL,
// but a suite that silently truncated issuehub_dev would be unforgivable.
const url = process.env.DATABASE_URL ?? '';
if (!url.includes('issuehub_test')) {
  throw new Error(`Test suite refuses to run against "${url}" — expected the issuehub_test database.`);
}

/**
 * Truncate BEFORE each test (not after) so a failed test leaves its rows behind
 * for inspection. One statement, CASCADE, identities restarted — docs/02 §12.
 */
beforeEach(async () => {
  await prisma.$executeRawUnsafe(
    'TRUNCATE TABLE "Comment", "Issue", "ProjectMember", "Project", "User" RESTART IDENTITY CASCADE',
  );
});
