import { expect, test, type Page } from '@playwright/test';

import { countSalesOf, setStock, stockOf } from './db';
import { signInAndWait, skipSwipeHint, tab, USERS } from './helpers';

/**
 * CU-01, CU-02 and CU-03 end to end (F4-T07). Runs in order against the seed
 * reset before the suite; each test uses its own customer so they do not
 * trip the duplicate check of another test.
 */
test.describe.configure({ mode: 'serial' });

async function openVender(page: Page) {
  await skipSwipeHint(page);
  await signInAndWait(page, USERS.seller);
  await tab(page, 'Vender').click();
  return page.getByRole('region', { name: 'Vender' });
}

async function addAndCharge(page: Page, productName: string, times = 1) {
  const sell = page.getByRole('region', { name: 'Vender' });
  for (let i = 0; i < times; i++) {
    await sell.getByRole('button', { name: `Agregar ${productName}` }).click();
  }
  await sell.getByRole('button', { name: 'Cobrar →' }).click();
  const sheet = page.getByRole('dialog', { name: 'Confirmar venta' });
  await expect(sheet).toBeVisible();
  return sheet;
}

async function chooseCustomer(page: Page, search: string, fullName: string) {
  const sheet = page.getByRole('dialog', { name: 'Confirmar venta' });
  await sheet.getByRole('searchbox', { name: 'Buscar cliente' }).fill(search);
  await sheet.getByRole('button', { name: `Elegir a ${fullName}` }).click();
  await expect(sheet.getByText(fullName)).toBeVisible();
}

test('CU-01: cash sale with an existing customer, in under a minute', async ({ page }) => {
  const started = Date.now();
  await openVender(page);
  const sheet = await addAndCharge(page, 'Citrus Brisa EDT 100 ml');
  await chooseCustomer(page, 'barquero', 'Ana Celia Barquero');

  await sheet.getByRole('radio', { name: 'SINPE Móvil' }).click();
  await sheet.getByRole('button', { name: '✓ Registrar venta' }).click();

  await expect(page.getByRole('status').filter({ hasText: 'registrada · ₡22 000' })).toBeVisible();
  const done = page.getByRole('dialog', { name: /^Venta #\d+$/ });
  await expect(done).toContainText('₡22 000 · SINPE Móvil · Ana Celia Barquero');
  expect(Date.now() - started).toBeLessThan(60_000);

  // The cart emptied and the stock went down by one (RN-11).
  await done.getByRole('button', { name: 'Nueva venta' }).click();
  await expect(page).toHaveURL('/vender');
  await expect(
    page
      .getByRole('region', { name: 'Vender' })
      .getByRole('button', { name: 'Agregar Citrus Brisa EDT 100 ml' }),
  ).toContainText('Quedan 8');
  expect(await stockOf('PER-003')).toBe(8);
});

test('CU-02: installment sale shows the plan and saves the database plan', async ({ page }) => {
  await openVender(page);
  // Not the seed's own sale (Rosa Imperial for Danae): that one would correctly trip RN-18.
  const sheet = await addAndCharge(page, 'Vainilla & Sándalo 75 ml');
  await sheet.getByRole('radio', { name: /A pagos/ }).click();

  // Danae has an overdue installment in the seed: warning, but the sale is allowed (D-06).
  await chooseCustomer(page, 'danae', 'Danae Zeledón');
  await expect(sheet.getByText(/Este cliente tiene ₡.* vencido/)).toBeVisible();

  await sheet.getByLabel('Prima / abono inicial').fill('1000');
  await expect(sheet.getByText('Saldo a financiar')).toBeVisible();
  await expect(sheet.locator('li', { hasText: /^Cuota \d/ })).toHaveCount(3);
  await expect(sheet.locator('li', { hasText: 'Cuota 1' })).toContainText('₡10 000');

  await sheet.getByRole('radio', { name: 'Efectivo' }).click();
  await sheet.getByRole('button', { name: '✓ Registrar venta' }).click();

  await expect(
    page.getByRole('status').filter({ hasText: 'a 3 meses registrada · primera cuota ₡10 000' }),
  ).toBeVisible();
  const done = page.getByRole('dialog', { name: /^Venta #\d+$/ });
  await expect(done.locator('li', { hasText: /^Cuota \d/ })).toHaveCount(3);
});

test('CU-02: a down payment that covers the total suggests a cash sale', async ({ page }) => {
  await openVender(page);
  const sheet = await addAndCharge(page, 'Aretes argolla dorada');
  await sheet.getByRole('radio', { name: /A pagos/ }).click();
  await chooseCustomer(page, 'kenia', 'Kenia Brizuela');
  await sheet.getByLabel('Prima / abono inicial').fill('6500');

  await expect(
    sheet.getByText('La prima cubre todo el total. Regístrala como venta de contado.'),
  ).toBeVisible();
  await expect(sheet.getByRole('button', { name: '✓ Registrar venta' })).toBeDisabled();
  await sheet.getByRole('button', { name: 'Registrar como contado' }).click();
  await expect(sheet.getByRole('radio', { name: /De contado/ })).toHaveAttribute(
    'aria-checked',
    'true',
  );
});

test('CU-03: new customer inside the sale, and a repeated phone', async ({ page }) => {
  await openVender(page);
  const sheet = await addAndCharge(page, 'Set anillos minimalistas (3)');

  await sheet.getByRole('searchbox', { name: 'Buscar cliente' }).fill('Zoila Prueba');
  await expect(sheet.getByText('No encontramos a “Zoila Prueba”')).toBeVisible();
  await sheet.getByRole('button', { name: '＋ Nuevo cliente' }).click();
  await expect(sheet.getByLabel('Nombre completo')).toHaveValue('Zoila Prueba');

  // A phone without 8 digits is pointed out on the field.
  await sheet.getByLabel('Teléfono (8 números)').fill('8000-009');
  await sheet.getByRole('button', { name: 'Guardar cliente' }).click();
  await expect(sheet.getByText('El teléfono debe tener 8 números')).toBeVisible();

  await sheet.getByLabel('Teléfono (8 números)').fill('80000099');
  await sheet.getByRole('button', { name: 'Guardar cliente' }).click();
  await expect(
    page.getByRole('status').filter({ hasText: 'Cliente Zoila Prueba guardado' }),
  ).toBeVisible();
  await expect(sheet.getByRole('button', { name: 'Cambiar' })).toBeVisible();

  // Same phone as an existing customer: "¿Es la misma persona?"
  await sheet.getByRole('button', { name: 'Cambiar' }).click();
  await sheet.getByRole('button', { name: '＋ Nuevo cliente' }).click();
  await sheet.getByLabel('Nombre completo').fill('Tamara O.');
  await sheet.getByLabel('Teléfono (8 números)').fill('80000001');
  await sheet.getByRole('button', { name: 'Guardar cliente' }).click();
  const dialog = page.getByRole('alertdialog', { name: 'Ese teléfono ya está registrado' });
  await expect(dialog).toContainText('Pertenece a Tamara Odio. ¿Es la misma persona?');
  await dialog.getByRole('button', { name: 'Sí, usar ese cliente' }).click();
  await expect(sheet.getByText('Tamara Odio')).toBeVisible();
});

test('a double tap registers one sale; repeating it asks first (RN-18)', async ({ page }) => {
  const customer = 'Graciela Sibaja';
  const before = await countSalesOf(customer);
  await openVender(page);
  let sheet = await addAndCharge(page, 'Splash Coco Fresh 250 ml');
  await chooseCustomer(page, 'graciela', customer);
  await sheet.getByRole('button', { name: '✓ Registrar venta' }).dblclick();
  const done = page.getByRole('dialog', { name: /^Venta #\d+$/ });
  await expect(done).toBeVisible();
  expect(await countSalesOf(customer)).toBe(before + 1);

  // Same customer, same products, minutes later: confirm before saving another.
  await done.getByRole('button', { name: 'Nueva venta' }).click();
  sheet = await addAndCharge(page, 'Splash Coco Fresh 250 ml');
  await chooseCustomer(page, 'graciela', customer);
  await sheet.getByRole('button', { name: '✓ Registrar venta' }).click();
  const dialog = page.getByRole('alertdialog', { name: '¿Registrar otra venta igual?' });
  await expect(dialog).toContainText(`a ${customer} con los mismos productos`);
  await dialog.getByRole('button', { name: 'No, cancelar' }).click();
  await expect(sheet).toBeVisible();
  expect(await countSalesOf(customer)).toBe(before + 1);
});

test('stock sold elsewhere meanwhile: says how many are left', async ({ page }) => {
  await openVender(page);
  const sheet = await addAndCharge(page, 'Tobillera plata 925', 2);
  await chooseCustomer(page, 'priscila', 'Priscila Obando');

  await setStock('BIS-005', 1);
  await sheet.getByRole('button', { name: '✓ Registrar venta' }).click();
  await expect(sheet.getByRole('alert')).toContainText(
    'Solo quedan 1 de Tobillera plata 925; ajusta la cantidad.',
  );
  // The catalog refreshed and the cart was capped to the new stock.
  await expect(sheet.locator('li', { hasText: 'Tobillera plata 925' })).toContainText('1');
});
