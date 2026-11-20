import { expect, test, type Page } from '@playwright/test';

import { bumpProductVersion, productCostRowsVisibleTo, stockOf } from './db';
import { signInAndWait, skipSwipeHint, tab, USERS } from './helpers';

// Seed products (supabase/seed.sql): Aretes argolla dorada BIS-001, Collar perla cultivada
// BIS-002 (cost ₡6 000), Rosa Imperial PER-001. Specs run one at a time on a fresh reset.
const ARETES = 'Aretes argolla dorada';
const COLLAR = 'Collar perla cultivada';
const ROSA = 'Rosa Imperial EDP 100 ml';

async function openInventory(page: Page) {
  await tab(page, 'Inventario').click();
  await expect(page).toHaveURL('/inventario');
  return page.getByRole('region', { name: 'Inventario' });
}

async function openAddStock(page: Page) {
  const inventory = await openInventory(page);
  await inventory.getByRole('tab', { name: '＋ Agregar stock' }).click();
  return inventory;
}

/** The toast area (shared/ui/ToastViewport); a form's own success banner is a separate status. */
function toast(page: Page) {
  return page.locator('[role="status"][aria-live="polite"]');
}

test.describe('Inventario: seller limits (F6-T05)', () => {
  test('a seller has no "Agregar stock", no edit form and no cost rows', async ({ page }) => {
    await skipSwipeHint(page);
    await signInAndWait(page, USERS.seller);
    const inventory = await openInventory(page);
    await expect(inventory.getByRole('tab', { name: '＋ Agregar stock' })).toHaveCount(0);

    await inventory.getByRole('button', { name: new RegExp(`^${COLLAR}: `) }).click();
    const sheet = page.getByRole('dialog', { name: COLLAR });
    await expect(sheet.getByText('Vendidos')).toBeVisible();
    await expect(sheet.getByRole('button', { name: 'Guardar cambios' })).toHaveCount(0);
    await expect(sheet.getByRole('button', { name: '📦 Ingresar stock' })).toHaveCount(0);

    expect(await productCostRowsVisibleTo(USERS.seller)).toBe(0);
  });
});

test.describe('Inventario: stock and products (CU-09 to CU-11)', () => {
  test.beforeEach(async ({ page }) => {
    await skipSwipeHint(page);
    await signInAndWait(page, USERS.admin);
  });

  test('CU-09: restock an existing product, then a same restock asks first', async ({ page }) => {
    const before = await stockOf('BIS-001');
    const inventory = await openAddStock(page);

    await inventory.getByRole('button', { name: '✓ Guardar ingreso' }).click();
    await expect(inventory.getByText('Elige un producto.')).toBeVisible();

    await inventory
      .getByLabel('Producto', { exact: true })
      .selectOption({ label: `${ARETES} (hay ${String(before)})` });
    await inventory.getByLabel('Cantidad').fill('12');
    await inventory.getByRole('button', { name: '✓ Guardar ingreso' }).click();

    const saved = `Ingreso guardado · ${ARETES}: ${String(before)} → ${String(before + 12)} unidades`;
    await expect(toast(page)).toContainText(saved);
    await expect(inventory.getByText(`Ingreso de 12 × ${ARETES}`).first()).toBeVisible();
    await expect(inventory.getByText('Nuevo', { exact: true })).toBeVisible();
    expect(await stockOf('BIS-001')).toBe(before + 12);

    // RN-18: same product and quantity within 10 minutes.
    await inventory
      .getByLabel('Producto', { exact: true })
      .selectOption({ label: `${ARETES} (hay ${String(before + 12)})` });
    await inventory.getByLabel('Cantidad').fill('12');
    await inventory.getByRole('button', { name: '✓ Guardar ingreso' }).click();
    const dialog = page.getByRole('alertdialog', { name: '¿Registrar otro ingreso igual?' });
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: 'No, cancelar' }).click();
    expect(await stockOf('BIS-001')).toBe(before + 12);
  });

  test('CU-10: create a product; a similar name offers the existing one', async ({ page }) => {
    const inventory = await openAddStock(page);
    await inventory.getByRole('radio', { name: /Producto nuevo/ }).click();

    await inventory.getByRole('button', { name: '✓ Guardar ingreso' }).click();
    await expect(inventory.getByText('Escribe el nombre del producto.')).toBeVisible();

    await inventory.getByLabel('Nombre del producto').fill('Perfume Jazmín 50 ml');
    await inventory.getByRole('radio', { name: 'Perfumes' }).click();
    await inventory.getByLabel('Precio de venta').fill('24 000');
    await inventory.getByLabel('Cantidad inicial').fill('12');
    await inventory.getByRole('button', { name: '✓ Guardar ingreso' }).click();
    await expect(toast(page)).toContainText(
      /Producto creado · Perfume Jazmín 50 ml \(PER-\d{3}\), 12 unidades/,
    );
    await expect(inventory.getByRole('button', { name: 'Ver producto' })).toBeVisible();

    // A name very close to an existing product (CU-10 "Si algo cambia").
    await inventory.getByRole('button', { name: 'Agregar otro' }).click();
    await inventory.getByLabel('Nombre del producto').fill('rosa imperial edp 100ml');
    await inventory.getByRole('radio', { name: 'Perfumes' }).click();
    await inventory.getByLabel('Precio de venta').fill('38000');
    await inventory.getByLabel('Cantidad inicial').fill('2');
    await inventory.getByRole('button', { name: '✓ Guardar ingreso' }).click();
    await expect(inventory.getByText('¿Ya existe este producto?')).toBeVisible();
    await inventory.getByRole('button', { name: new RegExp(`^Sumar a ${ROSA}`) }).click();

    // The units go to the existing product: same form, "Producto existente".
    await expect(inventory.getByRole('radio', { name: /Producto existente/ })).toBeChecked();
    await expect(inventory.getByLabel('Producto', { exact: true })).toHaveValue(/.+/);
    await expect(inventory.getByLabel('Cantidad')).toHaveValue('2');
  });

  test('CU-11: edit, count adjustment, price below cost and a stale save', async ({ page }) => {
    const inventory = await openInventory(page);
    await inventory.getByRole('button', { name: new RegExp(`^${COLLAR}: `) }).click();
    const sheet = page.getByRole('dialog', { name: COLLAR });
    const save = sheet.getByRole('button', { name: 'Guardar cambios' });
    await expect(save).toBeDisabled();
    await expect(sheet.getByText('Cambia algún dato para poder guardar.')).toBeVisible();
    await expect(sheet.getByText(/^Margen: \d+% · ganancia ₡/)).toBeVisible();

    // Physical count: recorded as an adjustment with who and when (RN-12, F6 DoD).
    const stock = await stockOf('BIS-002');
    await sheet.getByLabel('Stock (conteo físico)').fill(String(stock - 1));
    await save.click();
    await expect(toast(page)).toContainText(
      `Cambios guardados · stock ajustado ${String(stock)} → ${String(stock - 1)}`,
    );
    // .first(): on a retry the earlier attempt's adjustment is listed too.
    await expect(sheet.getByText('Ajuste de conteo').first()).toBeVisible();
    await expect(sheet.getByText(/por Ximena Ledezma/).first()).toBeVisible();

    // Price below cost: a warning that does not block.
    await sheet.getByLabel('Precio de venta').fill('1000');
    await sheet.getByRole('button', { name: 'Guardar cambios' }).click();
    const warning = page.getByRole('alertdialog', { name: 'El precio es menor que el costo' });
    await expect(warning).toContainText('pérdida de ₡5 000 por unidad');
    await warning.getByRole('button', { name: 'Corregir precio' }).click();

    // Someone else saves first: the form reloads with their data.
    await bumpProductVersion('BIS-002');
    await sheet.getByLabel('Stock mínimo').fill('2');
    await sheet.getByRole('button', { name: 'Guardar cambios' }).click();
    await expect(warning).toBeVisible();
    await warning.getByRole('button', { name: 'Guardar de todos modos' }).click();
    await expect(sheet.getByText(/Este producto cambió mientras editabas/)).toBeVisible();
    await expect(sheet.getByLabel('Precio de venta')).toHaveValue('14500');
  });

  test('"Ingresar stock" from the detail, and deactivating a product', async ({ page }) => {
    const inventory = await openInventory(page);
    await inventory.getByRole('button', { name: new RegExp(`^${ROSA}: `) }).click();
    await page
      .getByRole('dialog', { name: ROSA })
      .getByRole('button', { name: '📦 Ingresar stock' })
      .click();
    await expect(inventory.getByRole('tab', { name: '＋ Agregar stock' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    await expect(inventory.getByLabel('Producto', { exact: true })).not.toHaveValue('');

    // RF-INV-05: deactivate the product created in CU-10; it leaves the list.
    await inventory.getByRole('tab', { name: 'Inventario actual' }).click();
    await inventory.getByRole('button', { name: /^Perfume Jazmín 50 ml: / }).click();
    const sheet = page.getByRole('dialog', { name: 'Perfume Jazmín 50 ml' });
    await sheet.getByRole('button', { name: 'Desactivar producto' }).click();
    await page
      .getByRole('alertdialog', { name: '¿Desactivar este producto?' })
      .getByRole('button', { name: 'Sí, desactivar' })
      .click();
    await expect(toast(page)).toContainText('Producto desactivado · Perfume Jazmín 50 ml');
    await expect(inventory.getByRole('button', { name: /^Perfume Jazmín 50 ml: / })).toHaveCount(0);
  });
});
