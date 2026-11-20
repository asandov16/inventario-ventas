import { expect, test, type Page } from '@playwright/test';

import { registerCashSaleAs } from './db';
import { signInAndWait, skipSwipeHint, tab, USERS } from './helpers';

// Seed (supabase/seed.sql): Danae Zeledón has an overdue installment; Pulsera tejida is sold
// out and Ámbar Nocturno is low. Seller: Bruno Arrieta. Admin: Ximena Ledezma.

function home(page: Page) {
  return page.getByRole('region', { name: 'Inicio' });
}

test.describe('Inicio (CU-12, CU-13, F7-T01 to T05)', () => {
  test.beforeEach(async ({ page }) => {
    await skipSwipeHint(page);
  });

  test('CU-12: greeting, numbers, activity, status and the red counters', async ({ page }) => {
    await signInAndWait(page, USERS.seller);
    const inicio = home(page);
    await expect(
      inicio.getByRole('heading', { name: /^Buen(os días|as tardes|as noches), Bruno$/ }),
    ).toBeVisible();
    await expect(inicio.getByRole('button', { name: /^Ventas de hoy/ })).toBeVisible();
    await expect(inicio.getByRole('button', { name: /^Stock bajo/ })).toBeVisible();

    // Red counters: an overdue account and stock alerts (RF-UX-04).
    await expect(tab(page, 'Por cobrar')).toContainText(/\d/);
    await expect(tab(page, 'Inventario')).toContainText(/\d/);

    // Actividad: the log, written as sentences; a sale opens its sheet.
    await expect(inicio.getByText(/^Venta #\d+ a Tamara Odio$/)).toBeVisible();
    await inicio.getByText(/^Venta #\d+ a Tamara Odio$/).click();
    await expect(page.getByRole('dialog', { name: /^Venta #\d+$/ })).toBeVisible();
    await page.goBack();

    // Estado: urgent first; an overdue account opens Por cobrar with its sheet.
    await inicio.getByRole('tab', { name: 'Estado' }).click();
    await expect(inicio.getByText(/^Danae Zeledón tiene ₡10.000 vencido$/)).toBeVisible();
    await expect(inicio.getByText('Pulsera tejida con dije está agotado')).toBeVisible();
    await inicio.getByText(/^Danae Zeledón tiene/).click();
    await expect(page).toHaveURL(/\/por-cobrar\?cuenta=/);
    await expect(page.getByRole('dialog', { name: 'Danae Zeledón' })).toBeVisible();
  });

  test('CU-13: Análisis for 7 and 30 days; profit only for the admin', async ({ page }) => {
    await signInAndWait(page, USERS.seller);
    const inicio = home(page);
    await inicio.getByRole('tab', { name: 'Análisis' }).click();
    await expect(inicio.getByText('Vendido', { exact: true })).toBeVisible();
    await expect(
      inicio.getByRole('img', { name: 'Ventas por día, contado y a pagos' }),
    ).toBeVisible();
    await expect(inicio.getByText('Productos más vendidos')).toBeVisible();
    await expect(inicio.getByTestId('profit-card')).toHaveCount(0);

    // "Últimos 30 días" opens the 30-day analysis.
    await inicio.getByRole('tab', { name: 'Actividad' }).click();
    await inicio.getByRole('button', { name: /^Últimos 30 días/ }).click();
    await expect(inicio.getByRole('tab', { name: '30 días' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
  });
});

test('a sale on another phone shows on Inicio in under 3 seconds (RNF-04, F7-T06)', async ({
  page,
}) => {
  await skipSwipeHint(page);
  await signInAndWait(page, USERS.admin);
  const inicio = home(page);
  await expect(inicio.getByText(/^Venta #\d+ a Tamara Odio$/)).toBeVisible();
  // Give the Realtime channel a moment to subscribe before the other phone sells.
  await page.waitForTimeout(1500);

  const folio = await registerCashSaleAs(USERS.seller, 'BIS-004', '+50612300009');
  await expect(inicio.getByText(`Venta #${String(folio)} a Ruth Alfaro`)).toBeVisible({
    timeout: 3_000,
  });
});
