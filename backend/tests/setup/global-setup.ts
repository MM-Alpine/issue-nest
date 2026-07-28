import { execFileSync } from 'node:child_process';
import path from 'node:path';

const backendRoot = path.resolve(__dirname, '../..');

/**
 * Builds the test schema from COMMITTED MIGRATIONS ONLY (`prisma migrate deploy`).
 * No `db push`, no hand-written DDL — docs/02 §12, INVARIANTS #11/#15.
 */
export default function setup(): void {
  const url = process.env.TEST_DATABASE_URL;

  if (!url) {
    throw new Error('TEST_DATABASE_URL is not set — copy .env.example to .env and run tests through npm');
  }
  if (!url.includes('issuehub_test')) {
    throw new Error(
      `Refusing to run the suite against "${url}". TEST_DATABASE_URL must point at issuehub_test.`,
    );
  }

  execFileSync('npx', ['prisma', 'migrate', 'deploy'], {
    cwd: backendRoot,
    env: { ...process.env, DATABASE_URL: url },
    stdio: 'inherit',
  });
}
