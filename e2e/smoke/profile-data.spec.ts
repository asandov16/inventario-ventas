import { readFile } from 'node:fs/promises';

import { expect, test, type Locator, type Page } from '@playwright/test';

import { signInAndWait, skipSwipeHint, tab, USERS } from './helpers';

// Perfil → Datos (CU-15, F7-T09, F7-T12) and the narrow-phone layout check.
// Selene Matarrita (seed, 1230-0010) is used by no other spec, so the balance loaded
// here changes nothing the later specs count.
const CUSTOMER = 'Selene Matarrita';

function toast(page: Page) {
  return page.locator('[role="status"][aria-live="polite"]');
}

/** A calendar day in Costa Rica (UTC−6 all year), `days` from today. */
function costaRicaDate(days: number): string {
  const now = new Date(Date.now() - 6 * 3_600_000 + days * 86_400_000);
  return now.toISOString().slice(0, 10);
}

async function openData(page: Page) {
  await tab(page, 'Perfil').click();
  await expect(page).toHaveURL('/perfil');
  const profile = page.getByRole('region', { name: 'Perfil' });
  await profile.getByRole('tab', { name: 'Datos' }).click();
  return profile;
}

/** Nothing sticks out to the right: no sideways scroll, every field inside the screen. */
async function expectNoOverflow(page: Page, area: Locator) {
  const width = page.viewportSize()?.width ?? 0;
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
    width,
  );
  for (const field of await area.locator('input, select, textarea, button').all()) {
    if (!(await field.isVisible())) continue;
    const box = await field.boundingBox();
    if (box)
      expect(
        box.x + box.width,
        await field.evaluate((e) => e.outerHTML.slice(0, 80)),
      ).toBeLessThanOrEqual(width + 0.5);
  }
}

test.describe('Perfil → Datos (CU-15, F7-T09, F7-T12)', () => {
  test.beforeEach(async ({ page }) => {
    await skipSwipeHint(page);
  });

  test('a seller has no "Datos"', async ({ page }) => {
    await signInAndWait(page, USERS.seller);
    await tab(page, 'Perfil').click();
    const profile = page.getByRole('region', { name: 'Perfil' });
    await expect(profile.getByText('Mis ventas (30 días)')).toBeVisible();
    await expect(profile.getByRole('tab', { name: 'Datos' })).toHaveCount(0);
  });

  test('F7-T09: "Descargar respaldo" saves an Excel file named with the date', async ({ page }) => {
    await signInAndWait(page, USERS.admin);
    const profile = await openData(page);
    await expect(profile.getByText(/no lo compartas/)).toBeVisible();

    const download = page.waitForEvent('download');
    await profile.getByRole('button', { name: 'Descargar respaldo' }).click();
    const file = await download;
    expect(file.suggestedFilename()).toBe(`respaldo-${costaRicaDate(0)}.xlsx`);
    await expect(toast(page)).toContainText(
      /Respaldo descargado · respaldo-.+\.xlsx · \d+ ventas$/,
    );

    // An .xlsx is a zip: it starts with "PK" and names the sheets in Spanish.
    const bytes = await readFile(await file.path());
    expect(bytes.subarray(0, 2).toString()).toBe('PK');
    expect(bytes.includes(Buffer.from('xl/worksheets/sheet7.xml'))).toBe(true);
  });

  test('F7-T12: loading a notebook balance with its preview, then "Cargar otro"', async ({
    page,
  }) => {
    await signInAndWait(page, USERS.admin);
    const profile = await openData(page);
    const form = profile.getByRole('form', { name: 'Cargar saldo anterior' });
    // The seed already carries one notebook balance (Leonor Villalta, ₡50 000).
    await expect(form.getByTestId('legacy-summary')).toHaveText(/^Saldos cargados: 1 · ₡50.000$/);

    // Errors say what to do.
    await form.getByRole('button', { name: 'Cargar saldo' }).click();
    await expect(form.getByText('Elige el cliente.')).toBeVisible();
    await expect(form.getByText('Escribe qué se llevó.')).toBeVisible();

    await form.getByRole('searchbox', { name: 'Buscar cliente' }).fill('selene');
    await form.getByRole('button', { name: `Elegir a ${CUSTOMER}` }).click();
    await form.getByLabel('Fecha de la compra').fill(costaRicaDate(-40));
    await form.getByLabel('Qué se llevó').fill('Perfume y aretes');
    await form.getByLabel('Total de la compra').fill('50000');
    await form.getByLabel('Ya pagó').fill('30000');
    await form.getByRole('radio', { name: '2 cuotas' }).click();
    await form.getByLabel('Primera cuota vence el').fill(costaRicaDate(10));

    // The preview: what is left, split from the first due date.
    await expect(form.getByText('Le queda por pagar')).toBeVisible();
    await expect(form.locator('li', { hasText: /^Cuota \d/ })).toHaveCount(2);
    await expect(form.locator('li', { hasText: 'Cuota 1' })).toContainText(/₡10.000/);

    await form.getByRole('button', { name: 'Cargar saldo' }).click();
    await expect(toast(page)).toContainText(
      new RegExp(`Saldo anterior de ${CUSTOMER} cargado · ₡20.000 en 2 cuotas$`),
    );
    await expect(profile.getByText(`Saldo de ${CUSTOMER} cargado`)).toBeVisible();
    await expect(profile.getByText(/^Saldos cargados: 2 · ₡100.000$/)).toBeVisible();

    // "Cargar otro" gives an empty form.
    await profile.getByRole('button', { name: 'Cargar otro' }).click();
    await expect(form.getByLabel('Qué se llevó')).toHaveValue('');

    // It is owed like any installment sale.
    await tab(page, 'Por cobrar').click();
    const receivables = page.getByRole('region', { name: 'Por cobrar' });
    await expect(
      receivables.getByRole('button', { name: new RegExp(`^Cuenta de ${CUSTOMER}, venta #\\d+$`) }),
    ).toBeVisible();
  });
});

test.describe('Narrow phones (360 px): no field sticks out', () => {
  test.use({ viewport: { width: 360, height: 740 } });

  test.beforeEach(async ({ page }) => {
    await skipSwipeHint(page);
    await signInAndWait(page, USERS.admin);
  });

  test('Agregar stock, both kinds', async ({ page }) => {
    await tab(page, 'Inventario').click();
    const inventory = page.getByRole('region', { name: 'Inventario' });
    await inventory.getByRole('tab', { name: '＋ Agregar stock' }).click();
    await expect(inventory.getByLabel('Costo unitario')).toBeVisible();
    await expectNoOverflow(page, inventory);
    await inventory.getByRole('radio', { name: /Producto nuevo/ }).click();
    await expectNoOverflow(page, inventory);
  });

  test('Perfil → Datos and Negocio', async ({ page }) => {
    const profile = await openData(page);
    await expect(profile.getByLabel('Total de la compra')).toBeVisible();
    await expectNoOverflow(page, profile);
    await profile.getByRole('tab', { name: 'Negocio' }).click();
    await expect(profile.getByText('Categorías')).toBeVisible();
    await expectNoOverflow(page, profile);
  });
});
