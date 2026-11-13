import { fileURLToPath, URL } from 'node:url';

import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./web/src', import.meta.url)),
    },
  },
  test: {
    include: [
      'web/src/**/*.test.{ts,tsx}',
      'shared/**/*.test.ts',
      'scripts/**/*.test.ts',
      'workers/**/*.test.ts',
    ],
    environment: 'node',
  },
});
