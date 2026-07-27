import { defineConfig } from 'vitest/config';

// DB-free unit suite used by ./scripts/verify.sh (the fast inner loop).
// No globalSetup / setupFiles here, so it never needs Docker or Postgres.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/unit/**/*.test.ts'],
  },
});
