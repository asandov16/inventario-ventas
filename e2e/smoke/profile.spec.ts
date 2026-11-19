import { expect, test, type Page } from '@playwright/test';

import { signIn, signInAndWait, skipSwipeHint, tab, USERS } from './helpers';

// Seed users (supabase/seed.sql): Ximena Ledezma (admin), Bruno Arrieta (seller), password
// "devpassword-local". Later specs sign in with that password and expect "Mi Negocio", so
// every test here puts back what it changes.
const SEED_PASSWORD = 'devpassword-local';

async function openProfile(page: Page) {
  await tab(page, 'Perfil').click();
  await expect(page).toHaveURL('/perfil');
  return page.getByRole('region', { name: 'Perfil' });
}

function toast(page: Page) {
  return page.locator('[role="status"][aria-live="polite"]');
}

async function changePassword(profile: ReturnType<Page['getByRole']>, password: string) {
  await profile.getByLabel('Contraseña nueva').fill(password);
  await profile.getByLabel('Repite la contraseña').fill(password);
  await profile.getByRole('button', { name: 'Cambiar contraseña' }).click();
}

test.describe('Perfil (CU-14, CU-15, F7-T07/T08/T10)', () => {
  test.beforeEach(async ({ page }) => {
    await skipSwipeHint(page);
  });

  test('CU-14: a seller sees what they can do and their sales, without settings', async ({
    page,
  }) => {
    await signInAndWait(page, USERS.seller);
    const profile = await openProfile(page);
    await expect(profile.getByText('Bruno Arrieta')).toBeVisible();
    await expect(profile.getByText('Mis ventas (30 días)')).toBeVisible();
    await expect(profile.getByText('Registrar abonos')).toBeVisible();
    await expect(profile.getByText('Anular ventas')).toHaveCount(0);
    await expect(
      profile.getByText('Los costos y las ganancias no se muestran en tu cuenta.'),
    ).toBeVisible();
    // A seller has only "Mi cuenta".
    await expect(profile.getByRole('tab', { name: 'Negocio' })).toHaveCount(0);
  });

  test('CU-14: changing the password; the new one works on the next sign-in', async ({ page }) => {
    // The second seed admin: no other spec signs in with it, so a failure here cannot
    // lock the others out.
    const email = 'admin2@test.local';
    await signInAndWait(page, email);
    const profile = await openProfile(page);

    // Errors beside the fields.
    await profile.getByLabel('Contraseña nueva').fill('corta');
    await profile.getByRole('button', { name: 'Cambiar contraseña' }).click();
    await expect(profile.getByText('Usa al menos 10 caracteres.')).toBeVisible();
    await profile.getByLabel('Contraseña nueva').fill('una-clave-nueva-1');
    await profile.getByLabel('Repite la contraseña').fill('otra-clave-nueva');
    await profile.getByRole('button', { name: 'Cambiar contraseña' }).click();
    await expect(profile.getByText(/Las dos contraseñas no coinciden/)).toBeVisible();

    // The new password works on the next sign-in; then the seed password goes back.
    await changePassword(profile, 'una-clave-nueva-1');
    await expect(toast(page)).toContainText('Contraseña cambiada');
    await profile.getByRole('button', { name: 'Cerrar sesión' }).click();
    await page
      .getByRole('alertdialog', { name: '¿Cerrar sesión?' })
      .getByRole('button', { name: 'Cerrar sesión' })
      .click();
    // Wait until the session is really gone before signing in again.
    await expect(page.getByRole('button', { name: 'Entrar' })).toBeVisible();
    await signIn(page, email, 'una-clave-nueva-1');
    await expect(page.getByRole('navigation', { name: 'Secciones' })).toBeVisible();
    await changePassword(await openProfile(page), SEED_PASSWORD);
    await expect(toast(page)).toContainText('Contraseña cambiada');
  });

  test('CU-15: an admin renames the business and edits categories and payment methods', async ({
    page,
  }) => {
    await signInAndWait(page, USERS.admin);
    const profile = await openProfile(page);
    await profile.getByRole('tab', { name: 'Negocio' }).click();

    // D-19: the name changes in the header right away.
    await profile.getByRole('textbox', { name: 'Nombre del negocio' }).fill('Tienda de Prueba');
    await profile.getByRole('button', { name: 'Guardar nombre' }).click();
    await expect(toast(page)).toContainText('Nombre guardado · Tienda de Prueba');
    await expect(page.getByRole('heading', { level: 1, name: 'Tienda de Prueba' })).toBeVisible();
    await profile.getByRole('textbox', { name: 'Nombre del negocio' }).fill('Mi Negocio');
    await profile.getByRole('button', { name: 'Guardar nombre' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Mi Negocio' })).toBeVisible();

    // A category needs a valid prefix.
    const categories = profile.getByRole('form', { name: 'Agregar categoría' });
    await categories.getByLabel('Nombre').fill('Relojes');
    await categories.getByLabel('Prefijo del código').fill('r');
    await categories.getByRole('button', { name: 'Agregar categoría' }).click();
    await expect(categories.getByText('Usa de 2 a 5 letras, sin números.')).toBeVisible();
    await categories.getByLabel('Prefijo del código').fill('rel');
    await expect(categories.getByLabel('Prefijo del código')).toHaveValue('REL');
    await categories.getByRole('button', { name: 'Agregar categoría' }).click();
    await expect(toast(page)).toContainText('Categoría agregada · Relojes');
    await expect(profile.getByRole('button', { name: 'Desactivar: Relojes' })).toBeVisible();

    // A payment method is added, then turned off (nothing is deleted, RN-12).
    const methods = profile.getByRole('form', { name: 'Agregar método de pago' });
    await methods.getByLabel('Nombre').fill('Transferencia');
    await methods.getByRole('button', { name: 'Agregar método de pago' }).click();
    await expect(toast(page)).toContainText('Método de pago agregado · Transferencia');
    await profile.getByRole('button', { name: 'Desactivar: Transferencia' }).click();
    await expect(toast(page)).toContainText('Desactivado · Transferencia');
    await expect(profile.getByRole('button', { name: 'Activar: Transferencia' })).toBeVisible();
  });

  test('F7-T10: an admin sees the people who use the app, read-only', async ({ page }) => {
    await signInAndWait(page, USERS.admin);
    const profile = await openProfile(page);
    await profile.getByRole('tab', { name: 'Usuarios' }).click();
    await expect(profile.getByText('Ximena Ledezma')).toBeVisible();
    await expect(profile.getByText('Bruno Arrieta')).toBeVisible();
    await expect(profile.getByText(/contacta a soporte/)).toBeVisible();
    await expect(profile.getByRole('button', { name: /Agregar/ })).toHaveCount(0);
  });
});
