import { expect, test } from '@playwright/test';

/**
 * Installability checks (ADR-041). Lighthouse no longer audits PWAs, so the
 * manifest and the service worker are verified here; the real install on
 * Android and iPhone is part of the stage review.
 */
interface Manifest {
  name: string;
  short_name: string;
  start_url: string;
  display: string;
  icons: { src: string; sizes: string; purpose?: string }[];
}

test('the manifest makes the app installable', async ({ page, request }) => {
  await page.goto('/');
  const href = await page.locator('link[rel="manifest"]').getAttribute('href');
  expect(href).toBeTruthy();

  const manifest = (await (await request.get(href ?? '')).json()) as Manifest;
  expect(manifest.name).not.toBe('');
  expect(manifest.short_name.length).toBeLessThanOrEqual(12);
  expect(manifest.start_url).toBe('/');
  expect(manifest.display).toBe('standalone');
  expect(manifest.icons.map((icon) => icon.sizes)).toEqual(
    expect.arrayContaining(['192x192', '512x512']),
  );
  expect(manifest.icons.some((icon) => icon.purpose === 'maskable')).toBe(true);

  for (const icon of manifest.icons) {
    const response = await request.get(icon.src);
    expect(response.headers()['content-type']).toContain('image/png');
  }
});

test('a service worker controls the app so it opens without network', async ({ page }) => {
  await page.goto('/');
  // `ready` resolves while the worker may still be activating; wait for the final state.
  await expect
    .poll(() =>
      page.evaluate(async () => {
        const registration = await navigator.serviceWorker.ready;
        return registration.active?.state;
      }),
    )
    .toBe('activated');
});
