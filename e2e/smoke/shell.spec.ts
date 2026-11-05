import { expect, test } from '@playwright/test';

import { signIn, signInAndWait, skipSwipeHint, tab, USERS } from './helpers';

const SECTIONS = [
  { label: 'Inicio', path: '/' },
  { label: 'Vender', path: '/vender' },
  { label: 'Historial', path: '/historial' },
  { label: 'Por cobrar', path: '/por-cobrar' },
  { label: 'Inventario', path: '/inventario' },
  { label: 'Perfil', path: '/perfil' },
] as const;

test.describe('app shell (F3)', () => {
  test.beforeEach(async ({ page }) => {
    await skipSwipeHint(page);
  });

  test('admin signs in, visits the six sections and signs out', async ({ page }) => {
    await signInAndWait(page, USERS.admin);
    await expect(page.getByRole('heading', { level: 1, name: 'Mi Negocio' })).toBeVisible();

    for (const section of SECTIONS) {
      await tab(page, section.label).click();
      await expect(page).toHaveURL(section.path);
      await expect(tab(page, section.label)).toHaveAttribute('aria-current', 'page');
      await expect(page.locator('header')).toContainText(section.label);
    }

    // Swiping (scrolling the track) changes the route too.
    await page.locator('main').evaluate((track) => {
      track.scrollTo({ left: track.clientWidth * 2, behavior: 'instant' });
    });
    await expect(page).toHaveURL('/historial');

    // Sign out asks first, then returns to the sign-in screen.
    await tab(page, 'Perfil').click();
    await page.getByRole('button', { name: 'Cerrar sesión' }).click();
    const dialog = page.getByRole('alertdialog', { name: '¿Cerrar sesión?' });
    await dialog.getByRole('button', { name: 'Cerrar sesión' }).click();
    await expect(page.getByRole('button', { name: 'Entrar' })).toBeVisible();
  });

  test('the phone back button closes a sheet instead of leaving', async ({ page }) => {
    await signInAndWait(page, USERS.admin);
    await tab(page, 'Perfil').click();
    await page.getByRole('button', { name: 'Acerca de la app' }).click();
    await expect(page.getByRole('dialog', { name: 'Acerca de la app' })).toBeVisible();
    await expect(page).toHaveURL('/perfil?acerca=1');

    await page.goBack();
    await expect(page.getByRole('dialog', { name: 'Acerca de la app' })).toBeHidden();
    await expect(page).toHaveURL('/perfil');
  });

  test('the seller does not see cost data; the admin does', async ({ page }) => {
    await signInAndWait(page, USERS.seller);
    await expect(page.getByTestId('profit-card')).toHaveCount(0);

    await page.evaluate(() => {
      localStorage.clear();
    });
    await page.context().clearCookies();
    await skipSwipeHint(page);
    await signInAndWait(page, USERS.admin);
    await expect(page.getByTestId('profit-card')).toBeVisible();
  });

  test('a wrong password says so plainly', async ({ page }) => {
    await signIn(page, USERS.admin, 'not-the-password');
    await expect(page.getByRole('alert')).toContainText('Usuario o clave incorrectos.');
  });

  test('an empty email is pointed out on the field', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Entrar' }).click();
    await expect(page.getByText('Escribe tu correo.')).toBeVisible();
    await expect(page.getByLabel('Correo')).toBeFocused();
  });
});

test('first visit on a phone shows the swipe hint once', async ({ page }) => {
  await signInAndWait(page, USERS.admin);
  await page.getByRole('button', { name: 'Entendido' }).click();
  await page.reload();
  await expect(page.getByRole('navigation', { name: 'Secciones' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Entendido' })).toHaveCount(0);
});
