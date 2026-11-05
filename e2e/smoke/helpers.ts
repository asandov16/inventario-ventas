import { expect, type Page } from '@playwright/test';

/**
 * Local seed users (supabase/seed.sql, ADR-033). The password is public by
 * design and only exists in the local and CI databases, never in staging.
 */
export const USERS = {
  admin: 'admin@test.local',
  seller: 'vendedor@test.local',
} as const;
const LOCAL_PASSWORD = 'devpassword-local';

/** Skips the first-time swipe hint so it does not cover the screen. */
export async function skipSwipeHint(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem('swipe-hint-seen', '1');
  });
}

export async function signIn(page: Page, email: string, password = LOCAL_PASSWORD) {
  await page.goto('/');
  await page.getByLabel('Correo').fill(email);
  await page.getByLabel('Contraseña').fill(password);
  await page.getByRole('button', { name: 'Entrar' }).click();
}

export async function signInAndWait(page: Page, email: string) {
  await signIn(page, email);
  await expect(page.getByRole('navigation', { name: 'Secciones' })).toBeVisible();
}

export function tab(page: Page, label: string) {
  return page.getByRole('navigation', { name: 'Secciones' }).getByRole('button', { name: label });
}
