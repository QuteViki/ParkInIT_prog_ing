import { test, expect } from '@playwright/test';

const APP_URL = process.env.E2E_BASE_URL || 'https://parkinit.online';

test('prikazuje formu za registraciju', async ({ page }) => {
  await page.goto(`${APP_URL}/login`);

  await page.getByRole('button', { name: 'Registracija' }).click();

  await expect(page.getByPlaceholder('Ime', { exact: true })).toBeVisible();
  await expect(page.getByPlaceholder('Prezime')).toBeVisible();
  await expect(page.getByPlaceholder('OIB')).toBeVisible();
  await expect(page.getByPlaceholder('Broj telefona')).toBeVisible();
  await expect(page.getByPlaceholder('Email adresa')).toBeVisible();
  await expect(page.getByPlaceholder('Lozinka')).toBeVisible();
  await expect(page.getByRole('button', { name: /Kreiraj ra/ })).toBeVisible();
});
