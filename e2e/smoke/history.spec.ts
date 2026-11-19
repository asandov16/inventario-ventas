import { expect, test, type Page } from '@playwright/test';

import { stockOf } from './db';
import { signInAndWait, skipSwipeHint, tab, USERS } from './helpers';

// Seed sales (supabase/seed.sql): Tamara Odio cash today, Ana Celia Barquero cash yesterday
// (1 × Splash Coco Fresh, ₡9 500), Danae Zeledón overdue installments, Marisol Ugalde partly
// paid, Leonor Villalta a notebook balance, Rodolfo Esquivel voided.

async function openHistory(page: Page) {
  await tab(page, 'Historial').click();
  await expect(page).toHaveURL('/historial');
  return page.getByRole('region', { name: 'Historial' });
}

function row(section: ReturnType<Page['getByRole']>, customer: string) {
  return section.getByRole('button', { name: new RegExp(`^Venta #\\d+ a ${customer}$`) });
}

test.describe('Historial (CU-04, F5-T01/T02/T04)', () => {
  test.beforeEach(async ({ page }) => {
    await skipSwipeHint(page);
  });

  test('a seller sees sales by day, filters them and opens the detail', async ({ page }) => {
    await signInAndWait(page, USERS.seller);
    const history = await openHistory(page);

    await expect(history.getByRole('heading', { name: /^Hoy · ₡/ })).toBeVisible();
    await expect(history.getByRole('heading', { name: /^Ayer · ₡/ })).toBeVisible();
    await expect(row(history, 'Leonor Villalta')).toContainText('Saldo anterior');
    await expect(row(history, 'Danae Zeledón')).toContainText('Vencida');
    // "Todas" leaves voided sales out; "Anuladas" shows only them.
    await expect(row(history, 'Rodolfo Esquivel')).toHaveCount(0);
    await history.getByRole('button', { name: 'Anuladas' }).click();
    await expect(row(history, 'Rodolfo Esquivel')).toContainText('Anulada');
    await expect(history.getByRole('button', { name: /^Venta #/ })).toHaveCount(1);
    await history.getByRole('button', { name: 'Todas' }).click();

    // Search by name, without accents, and by folio.
    await history.getByRole('searchbox', { name: 'Buscar en el historial' }).fill('danae zeledon');
    await expect(history.getByRole('button', { name: /^Venta #/ })).toHaveCount(1);
    const label = await row(history, 'Danae Zeledón').getAttribute('aria-label');
    const folio = /#(\d+)/.exec(label ?? '')?.[1] ?? '';
    await history.getByRole('searchbox', { name: 'Buscar en el historial' }).fill(`#${folio}`);
    await expect(row(history, 'Danae Zeledón')).toBeVisible();

    // The detail: plan with statuses, payments, customer total; no void for a seller.
    await row(history, 'Danae Zeledón').click();
    const sheet = page.getByRole('dialog', { name: `Venta #${folio}` });
    await expect(page).toHaveURL(/\/historial\?venta=[\w-]+$/);
    await expect(sheet.getByText('Plan de pagos')).toBeVisible();
    await expect(sheet.locator('li', { hasText: /^Cuota 1/ })).toContainText('Vencida');
    await expect(sheet.getByText('Pagos recibidos')).toBeVisible();
    await expect(sheet.getByText(/^Debe ₡30.000 en total/)).toBeVisible();
    await expect(sheet.getByText(/vendió Ximena Ledezma/)).toBeVisible();
    await expect(sheet.getByRole('button', { name: 'Anular venta' })).toHaveCount(0);

    // The sheet lives in the URL: a reload keeps it open (ADR-037).
    await page.reload();
    await expect(page.getByRole('dialog', { name: `Venta #${folio}` })).toBeVisible();
  });

  test('the date filter keeps only the chosen days', async ({ page }) => {
    await signInAndWait(page, USERS.admin);
    const history = await openHistory(page);
    await history.getByRole('button', { name: 'Más filtros' }).click();
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Costa_Rica' }).format(
      new Date(),
    );
    await history.getByLabel('Desde').fill(today);
    await expect(history.getByRole('heading', { name: /^Ayer · / })).toHaveCount(0);
    await expect(row(history, 'Tamara Odio')).toBeVisible();
    await expect(history.getByLabel('Vendedor')).toBeVisible();
  });
});

test.describe('Anular venta (CU-05, F5-T03)', () => {
  test('an admin voids a sale with a reason; the stock returns', async ({ page }) => {
    await skipSwipeHint(page);
    await signInAndWait(page, USERS.admin);
    const before = await stockOf('PER-005');
    const history = await openHistory(page);

    await row(history, 'Ana Celia Barquero').first().click();
    const sheet = page.getByRole('dialog', { name: /^Venta #\d+$/ });
    await sheet.getByRole('button', { name: 'Anular venta' }).click();
    await expect(sheet.getByText(/1 producto regresará al inventario/)).toBeVisible();
    await expect(sheet.getByText('Ya se recibieron ₡9 500')).toBeVisible();

    await sheet.getByRole('button', { name: 'Sí, anular' }).click();
    await expect(sheet.getByText('Indica el motivo de la anulación.')).toBeVisible();
    await sheet.getByRole('radio', { name: 'Devolución' }).click();
    await sheet.getByRole('button', { name: 'Sí, anular' }).click();

    await expect(page.locator('[role="status"][aria-live="polite"]')).toContainText(
      /Venta #\d+ anulada · 1 producto regresó al inventario/,
    );
    await expect(sheet.getByText(/^Anulada por Ximena Ledezma/)).toBeVisible();
    await expect(sheet.getByText('Motivo: Devolución')).toBeVisible();
    await expect(sheet.getByRole('button', { name: 'Anular venta' })).toHaveCount(0);
    expect(await stockOf('PER-005')).toBe(before + 1);

    await page.goBack();
    await history.getByRole('button', { name: 'Anuladas' }).click();
    await expect(row(history, 'Ana Celia Barquero')).toContainText('Anulada');
  });
});
