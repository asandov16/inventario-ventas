import { defineConfig, devices } from '@playwright/test';

/**
 * Smoke E2E (ADR-039): the production build of web/ against local Supabase with
 * the seed (test users and fictional data). Phone viewport, Chromium.
 * Locally it uses the installed Chrome; CI installs Playwright's Chromium.
 * E2E_WEBKIT=1 adds an iPhone (WebKit) project for the nightly run (F7-T11).
 */
const PORT = 4173;
const isCI = Boolean(process.env.CI);
const withWebKit = process.env.E2E_WEBKIT === '1';

export default defineConfig({
  testDir: './smoke',
  fullyParallel: false,
  workers: 1,
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  reporter: isCI ? [['list'], ['github']] : 'list',
  timeout: 30_000,
  use: {
    baseURL: `http://localhost:${String(PORT)}`,
    locale: 'es-CR',
    timezoneId: 'America/Costa_Rica',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'phone-chromium',
      use: { ...devices['Pixel 7'], ...(isCI ? {} : { channel: 'chrome' }) },
    },
    ...(withWebKit ? [{ name: 'phone-webkit', use: { ...devices['iPhone 14'] } }] : []),
  ],
  webServer: {
    command: `pnpm --filter web exec vite preview --port ${String(PORT)} --strictPort`,
    url: `http://localhost:${String(PORT)}`,
    reuseExistingServer: !isCI,
    timeout: 60_000,
  },
});
