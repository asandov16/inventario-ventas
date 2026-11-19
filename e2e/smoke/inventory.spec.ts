import { expect, test, type Page, type Response } from '@playwright/test';

import { signInAndWait, skipSwipeHint, tab, USERS } from './helpers';

// Seed (supabase/seed.sql after its sample sales): Rosa Imperial 5 left and sold once,
// Ámbar Nocturno 1 left (low), Pulsera tejida 0 (sold out).
const ROSA = 'Rosa Imperial EDP 100 ml';
const AMBAR = 'Ámbar Nocturno EDP 50 ml';
const PULSERA = 'Pulsera tejida con dije';

/** Every API response body the page receives, to prove what reached the browser (F6 DoD). */
function recordApiBodies(page: Page): () => Promise<string[]> {
  const pending: Promise<string>[] = [];
  page.on('response', (response: Response) => {
    if (response.url().includes('/rest/v1/')) {
      pending.push(response.text().catch(() => ''));
    }
  });
  return () => Promise.all(pending);
}

async function openInventory(page: Page) {
  await tab(page, 'Inventario').click();
  await expect(page).toHaveURL('/inventario');
  return page.getByRole('region', { name: 'Inventario' });
}

function productRow(section: ReturnType<Page['getByRole']>, name: string) {
  return section.getByRole('button', { name: new RegExp(`^${name}: `) });
}

test.describe('Inventario: list and product detail (CU-08, F6-T01/T02)', () => {
  test.beforeEach(async ({ page }) => {
    await skipSwipeHint(page);
  });

  test('a seller sees stock, filters and movements, and never receives a cost', async ({
    page,
  }) => {
    const apiBodies = recordApiBodies(page);
    await signInAndWait(page, USERS.seller);
    const inventory = await openInventory(page);

    await expect(inventory.getByText('Unidades')).toBeVisible();
    await expect(inventory.getByText('Valor a precio de venta')).toBeVisible();
    await expect(inventory.getByText('Valor a costo')).toHaveCount(0);

    // RN-10 labels and the "Stock bajo" chip.
    await expect(productRow(inventory, PULSERA)).toContainText('Agotado');
    await expect(productRow(inventory, AMBAR)).toContainText('Bajo');
    await inventory.getByRole('button', { name: '⚠️ Stock bajo' }).click();
    await expect(productRow(inventory, ROSA)).toHaveCount(0);
    await expect(productRow(inventory, AMBAR)).toBeVisible();
    await inventory.getByRole('button', { name: '⚠️ Stock bajo' }).click();

    // Search by code, without accents.
    await inventory.getByRole('searchbox', { name: 'Buscar en el inventario' }).fill('per-001');
    await expect(inventory.getByRole('button', { name: /: \d+ en stock/ })).toHaveCount(1);

    // Detail: units sold and movements with who and when (F6 DoD).
    await productRow(inventory, ROSA).click();
    const sheet = page.getByRole('dialog', { name: ROSA });
    await expect(sheet).toBeVisible();
    await expect(page).toHaveURL(/\/inventario\?producto=/);
    await expect(sheet.getByText('Vendidos')).toBeVisible();
    await expect(sheet.getByText('Inventario inicial')).toBeVisible();
    await expect(sheet.getByText(/^Venta #\d+$/)).toBeVisible();
    await expect(sheet.getByText(/por Ximena Ledezma/).first()).toBeVisible();
    await expect(sheet.getByText(/^Costo /)).toHaveCount(0);

    // The sheet survives a reload: it lives in the URL (ADR-037).
    await page.reload();
    await expect(page.getByRole('dialog', { name: ROSA })).toBeVisible();

    // No response the seller received carries a cost with a value.
    const bodies = await apiBodies();
    expect(bodies.length).toBeGreaterThan(0);
    for (const body of bodies) {
      expect(body).not.toMatch(/"(unit_cost|value_at_cost)":\s*\d/);
    }
  });

  test('"Vender" from the detail puts the product in the cart', async ({ page }) => {
    await signInAndWait(page, USERS.seller);
    const inventory = await openInventory(page);
    await productRow(inventory, ROSA).click();
    await page
      .getByRole('dialog', { name: ROSA })
      .getByRole('button', { name: /Vender/ })
      .click();

    await expect(page).toHaveURL('/vender');
    await expect(page.getByRole('status').filter({ hasText: 'agregado a la venta' })).toContainText(
      `${ROSA} agregado a la venta`,
    );
    await expect(
      page.getByRole('region', { name: 'Vender' }).getByText('1 artículo'),
    ).toBeVisible();
  });

  test('a sold-out product cannot be sent to Vender', async ({ page }) => {
    await signInAndWait(page, USERS.seller);
    const inventory = await openInventory(page);
    await productRow(inventory, PULSERA).click();
    const sheet = page.getByRole('dialog', { name: PULSERA });
    await expect(sheet.getByRole('button', { name: /Vender/ })).toBeDisabled();
    await expect(sheet.getByText('No hay unidades para vender.')).toBeVisible();
  });

  test('an admin sees the value at cost and the unit cost', async ({ page }) => {
    await signInAndWait(page, USERS.admin);
    const inventory = await openInventory(page);
    await expect(inventory.getByText('Valor a costo')).toBeVisible();

    await productRow(inventory, ROSA).click();
    const sheet = page.getByRole('dialog', { name: ROSA });
    await expect(sheet.getByText(/^Costo ₡/)).toBeVisible();
    await expect(sheet.getByText(/Ganancia ₡.* por unidad \(50%\)/)).toBeVisible();
  });
});
