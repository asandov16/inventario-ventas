import { defineConfig } from 'vitest/config';

// Database concurrency tests: real parallel transactions against local Supabase (`pnpm test:db`).
export default defineConfig({
  test: {
    include: ['supabase/tests/concurrency/**/*.test.ts'],
    environment: 'node',
    testTimeout: 30_000,
    fileParallelism: false,
  },
});
