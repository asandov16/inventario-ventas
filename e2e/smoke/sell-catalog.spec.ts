import { expect, test } from '@playwright/test';

import { signInAndWait, skipSwipeHint, tab, USERS } from './helpers';

// Seed stock (supabase/seed.sql after its sample sales): Ámbar Nocturno 1, Pulsera tejida 0.
const AMBAR = 'Ámbar Nocturno EDP 50 ml';

test.describe('Vender: catalog and cart (F4-T01 to T03)', () => {
  test.beforeEach(async ({ page }) => {
    await skipSwipeHint(page);
    await signInAndWait(page, USERS.seller);
    await tab(page, 'Vender').click();
    await expect(page).toHaveURL('/vender');
  });

  test('search, categories and sold-out products', async ({ page }) => {
    const sell = page.getByRole('region', { name: 'Vender' });
    await sell.getByRole('searchbox', { name: 'Buscar producto' }).fill('ambar');
    await expect(sell.getByRole('button', { name: /^Agregar / })).toHaveCount(1);
    await expect(sell.getByRole('button', { name: `Agregar ${AMBAR}` })).toBeVisible();

    await sell.getByRole('searchbox', { name: 'Buscar producto' }).fill('no existe');
    await expect(sell.getByText('No hay productos que coincidan')).toBeVisible();
    await sell.getByRole('button', { name: 'Limpiar filtros' }).click();

    await sell.getByRole('button', { name: 'Bisutería' }).click();
    await expect(sell.getByRole('button', { name: 'Agregar Aretes argolla dorada' })).toBeVisible();
    await expect(
      sell.getByRole('button', { name: 'Agregar Rosa Imperial EDP 100 ml' }),
    ).toHaveCount(0);
    await expect(
      sell.getByRole('button', { name: 'Agregar Pulsera tejida con dije' }),
    ).toBeDisabled();
  });

  test('the cart never goes over the stock and survives a reload', async ({ page }) => {
    const sell = page.getByRole('region', { name: 'Vender' });
    const ambar = sell.getByRole('button', { name: `Agregar ${AMBAR}` });

    await ambar.click();
    await expect(ambar).toContainText('Quedan 0');
    await ambar.click();
    await expect(page.getByRole('alert')).toContainText(`No hay más unidades de ${AMBAR}`);
    await expect(sell.getByText('1 artículo')).toBeVisible();

    await page.reload();
    await expect(
      page.getByRole('region', { name: 'Vender' }).getByText('1 artículo'),
    ).toBeVisible();
  });

  test('the checkout sheet adjusts quantities and opens by URL', async ({ page }) => {
    const sell = page.getByRole('region', { name: 'Vender' });
    await sell.getByRole('button', { name: 'Agregar Aretes argolla dorada' }).click();
    await sell.getByRole('button', { name: 'Cobrar →' }).click();

    const sheet = page.getByRole('dialog', { name: 'Confirmar venta' });
    await expect(sheet).toBeVisible();
    await expect(page).toHaveURL('/vender?cobrar=1');

    await sheet.getByRole('button', { name: 'Uno más de Aretes argolla dorada' }).click();
    await expect(sheet.getByText('₡13 000').first()).toBeVisible();
    await expect(sheet.getByRole('radio', { name: /De contado/ })).toHaveAttribute(
      'aria-checked',
      'true',
    );

    // Without a customer the sale cannot be registered (RN-01).
    await expect(sheet.getByRole('button', { name: '✓ Registrar venta' })).toBeDisabled();

    await sheet.getByRole('button', { name: 'Uno menos de Aretes argolla dorada' }).click();
    await sheet.getByRole('button', { name: 'Uno menos de Aretes argolla dorada' }).click();
    await expect(
      sheet.getByText('El carrito está vacío. Agrega productos para cobrar.'),
    ).toBeVisible();
  });
});
