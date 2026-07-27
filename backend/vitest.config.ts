import 'dotenv/config';
import { defineConfig } from 'vitest/config';

const testDatabaseUrl =
  process.env.TEST_DATABASE_URL ??
  'postgresql://issuehub:issuehub@localhost:5432/issuehub_test?schema=public';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    // Workers are forked processes, so env must be injected here rather than mutated
    // in globalSetup. DATABASE_URL is pinned to the TEST database for every worker.
    env: {
      NODE_ENV: 'test',
      DATABASE_URL: testDatabaseUrl,
      TEST_DATABASE_URL: testDatabaseUrl,
      JWT_SECRET: process.env.JWT_SECRET ?? 'test-secret-value-at-least-32-characters-long',
      JWT_EXPIRES_IN: '1d',
    },
    // Schema for issuehub_test comes from committed migrations (`prisma migrate deploy`).
    globalSetup: ['tests/setup/global-setup.ts'],
    // Truncate every table before each test — deterministic isolation.
    setupFiles: ['tests/setup/test-setup.ts'],
    // Integration files share one database, so they must not run in parallel.
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 120_000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: ['src/**/*.ts'],
      // Excluded: process bootstrap and config-only modules with no branching logic.
      exclude: ['src/server.ts', 'src/config/env.ts', 'src/lib/prisma.ts'],
    },
  },
});
