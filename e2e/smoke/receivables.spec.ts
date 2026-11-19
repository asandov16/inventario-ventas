import { expect, test, type Page } from '@playwright/test';

import { signInAndWait, skipSwipeHint, tab, USERS } from './helpers';

// Seed accounts (supabase/seed.sql), business "Mi Negocio":
// - Danae Zeledón: ₡38 000, ₡8 000 down, three installments of ₡10 000, the first overdue.
//   Later specs (Vender CU-02) rely on it staying overdue, so here it is only read and reminded.
// - Marisol Ugalde: ₡38 500, ₡10 000 down, three installments of ₡9 500, the first paid:
//   balance ₡19 000, nothing overdue. This spec pays it off.

async function openReceivables(page: Page) {
  await tab(page, 'Por cobrar').click();
  await expect(page).toHaveURL('/por-cobrar');
  return page.getByRole('region', { name: 'Por cobrar' });
}

function accountRow(section: ReturnType<Page['getByRole']>, customer: string) {
  return section.getByRole('button', { name: new RegExp(`^Cuenta de ${customer}, venta #\\d+$`) });
}

function toast(page: Page) {
  return page.locator('[role="status"][aria-live="polite"]');
}

test.describe('Por cobrar (CU-06, CU-07, F5-T05 to T07)', () => {
  test.beforeEach(async ({ page }) => {
    await skipSwipeHint(page);
    await signInAndWait(page, USERS.seller);
  });

  test('CU-06: over the balance is refused, a partial payment, a repeat asks, then paid off', async ({
    page,
  }) => {
    const receivables = await openReceivables(page);
    await expect(receivables.getByText('Total por cobrar')).toBeVisible();
    // Overdue accounts come first, in red.
    await expect(
      receivables.getByRole('button', { name: /^Cuenta de / }).first(),
    ).toHaveAccessibleName(/^Cuenta de Danae Zeledón/);
    await expect(accountRow(receivables, 'Danae Zeledón')).toContainText('Vencida desde');

    await accountRow(receivables, 'Marisol Ugalde').click();
    const sheet = page.getByRole('dialog', { name: 'Marisol Ugalde' });
    await expect(page).toHaveURL(/\/por-cobrar\?cuenta=/);
    // Suggested amount: nothing overdue, so the next installment.
    await expect(sheet.getByLabel('Monto recibido')).toHaveValue('9500');

    await sheet.getByLabel('Monto recibido').fill('40000');
    await sheet.getByRole('button', { name: '✓ Guardar abono' }).click();
    await expect(
      sheet.getByText(/El monto es mayor que el saldo\. El saldo es ₡19.000\./),
    ).toBeVisible();

    // The quick amounts fill the field; a partial payment is typed. (₡9 500 is avoided on
    // purpose: the seed's own ₡9 500 payment is minutes old and would ask first.)
    await sheet.getByRole('button', { name: /^Cuota ₡9.500$/ }).click();
    await expect(sheet.getByLabel('Monto recibido')).toHaveValue('9500');
    await sheet.getByLabel('Monto recibido').fill('5000');
    await sheet.getByRole('radio', { name: 'Efectivo' }).click();
    await sheet.getByRole('button', { name: '✓ Guardar abono' }).click();
    await expect(toast(page)).toContainText(/Abono de ₡5.000 guardado · Saldo ₡14.000/);
    await expect(sheet.getByText(/^Abono de ₡5.000 guardado$/)).toBeVisible();
    await expect(sheet.locator('li', { hasText: /^Cuota 2/ })).toContainText('Parcial');
    await expect(sheet.getByText('Nuevo', { exact: true })).toBeVisible();

    // The same amount minutes later asks first (RN-18).
    await sheet.getByRole('button', { name: '＋ Registrar otro abono' }).click();
    await sheet.getByLabel('Monto recibido').fill('5000');
    await sheet.getByRole('button', { name: '✓ Guardar abono' }).click();
    const dialog = page.getByRole('alertdialog', { name: '¿Registrar otro abono igual?' });
    await expect(dialog).toContainText('para Marisol Ugalde');
    await dialog.getByRole('button', { name: 'Sí, es otro abono' }).click();
    await expect(toast(page)).toContainText(/Saldo ₡9.000/);

    // "Todo" pays it off (RN-08).
    await sheet.getByRole('button', { name: '＋ Registrar otro abono' }).click();
    await sheet.getByRole('button', { name: /^Todo ₡9.000$/ }).click();
    await sheet.getByRole('button', { name: '✓ Guardar abono' }).click();
    await expect(toast(page)).toContainText('Cuenta liquidada · Marisol Ugalde');
    await expect(sheet.getByText('Cuenta liquidada', { exact: true })).toBeVisible();
    await expect(sheet.getByRole('button', { name: '✓ Guardar abono' })).toHaveCount(0);

    await page.goBack();
    await receivables.getByRole('tab', { name: /^Liquidadas/ }).click();
    await expect(accountRow(receivables, 'Marisol Ugalde')).toContainText('Liquidada');
  });

  test('CU-07: the WhatsApp reminder link, "Copiar mensaje" and the confirmation', async ({
    page,
    context,
  }) => {
    // wa.me is never contacted from the test: the new tab gets an empty page.
    await context.route('https://wa.me/**', (route) => route.fulfill({ body: 'ok' }));
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);

    const receivables = await openReceivables(page);
    await accountRow(receivables, 'Danae Zeledón').click();
    const sheet = page.getByRole('dialog', { name: 'Danae Zeledón' });

    const link = sheet.getByRole('link', { name: /^💬 Enviar por WhatsApp a 8000-0003$/ });
    const href = (await link.getAttribute('href')) ?? '';
    expect(href).toMatch(/^https:\/\/wa\.me\/50680000003\?text=/);
    const text = decodeURIComponent(href.split('?text=')[1] ?? '');
    expect(text).toMatch(
      /^Hola Danae Zeledón, le saluda Mi Negocio\. Le recordamos su cuota de ₡10.000 con fecha .+\. Saldo pendiente: ₡30.000\. ¡Muchas gracias!$/,
    );

    // "Copiar mensaje" puts the same text on the clipboard.
    await sheet.getByRole('button', { name: 'Copiar mensaje' }).click();
    await expect(toast(page)).toContainText('Mensaje copiado. Pégalo en WhatsApp.');
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(text);

    // "No lo envié" records nothing; opening it again and "Sí, lo envié" records it.
    let popup = page.waitForEvent('popup');
    await link.click();
    await (await popup).close();
    await sheet.getByRole('button', { name: 'No lo envié' }).click();
    await expect(sheet.getByText('Último recordatorio')).toHaveCount(0);

    popup = page.waitForEvent('popup');
    await link.click();
    await (await popup).close();
    await expect(sheet.getByText('¿Enviaste el recordatorio?')).toBeVisible();
    await sheet.getByRole('button', { name: 'Sí, lo envié' }).click();
    await expect(toast(page)).toContainText('Recordatorio enviado hoy');
    await expect(sheet.getByText('Se le recordó hoy a Danae Zeledón.')).toBeVisible();

    await page.goBack();
    await expect(accountRow(receivables, 'Danae Zeledón')).toContainText('💬');
  });

  test('the sale sheet links to its account', async ({ page }) => {
    await tab(page, 'Historial').click();
    const history = page.getByRole('region', { name: 'Historial' });
    await history.getByRole('button', { name: /^Venta #\d+ a Danae Zeledón$/ }).click();
    await page
      .getByRole('dialog', { name: /^Venta #\d+$/ })
      .getByRole('button', { name: 'Registrar abono' })
      .click();
    await expect(page.getByRole('dialog', { name: 'Danae Zeledón' })).toBeVisible();
    await expect(page).toHaveURL(/cuenta=/);
  });
});
