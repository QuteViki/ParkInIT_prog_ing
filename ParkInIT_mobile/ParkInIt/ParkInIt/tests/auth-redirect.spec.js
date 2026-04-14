import { test, expect } from '@playwright/test';

const APP_URL = process.env.E2E_BASE_URL || 'https://parkinit.online';

test('preusmjerava neulogiranog korisnika na login', async ({ page }) => {
  await page.goto(`${APP_URL}/parking`);

  await expect(page.getByPlaceholder('Email')).toBeVisible();
  await expect(page.getByPlaceholder(/Lozinka|Password/)).toBeVisible();
  await expect(page.getByRole('button', { name: /Prijava|Sign In/ })).toBeVisible();
});
