import { test, expect } from '@playwright/test';

const APP_URL = process.env.E2E_BASE_URL || 'https://parkinit.online';

async function createTestUser(request) {
  const uniqueId = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  const email = `e2e.password.${uniqueId}@parkinit.test`;
  const password = 'E2eTest123!';

  const response = await request.post(`${APP_URL}/api/auth/register`, {
    data: {
      firstName: 'E2E',
      lastName: 'Lozinka',
      personalId: uniqueId.slice(-11).padStart(11, '0'),
      phone: `09${uniqueId.slice(-8)}`,
      email,
      password,
    },
  });

  expect(response.status()).toBe(201);

  return { email, password };
}

test('ulogirani korisnik mijenja lozinku i prijavljuje se novom lozinkom', async ({
  page,
  request,
}) => {
  const user = await createTestUser(request);
  const newPassword = 'NovaE2eLozinka123!';

  await page.goto(`${APP_URL}/login`);
  await page.getByPlaceholder('Email').fill(user.email);
  await page.getByPlaceholder(/Lozinka|Password/).fill(user.password);
  await page.getByRole('button', { name: /Prijava|Sign In/ }).click();

  await expect(page).toHaveURL(/\/(?:#\/)?parking(?:\?|$)/);

  await page.goto(`${APP_URL}/#/profile`);
  await expect(page.getByText(user.email)).toBeVisible();

  await page.getByRole('button', { name: /Promijeni lozinku|Change password/ }).click();

  await page.getByLabel(/Trenutna lozinka|Current password/).fill(user.password);
  await page.getByLabel(/Nova lozinka|New password/).fill(newPassword);
  await page.getByLabel(/Potvrda lozinke|Confirm password/).fill(newPassword);

  const changePasswordResponsePromise = page.waitForResponse(
    (response) =>
      response.url().includes('/api/user/change-password') &&
      response.request().method() === 'POST',
  );

  await page.getByRole('button', { name: /^Promijeni$|^Change$/ }).click();

  const changePasswordResponse = await changePasswordResponsePromise;
  expect(changePasswordResponse.ok()).toBe(true);

  await page.evaluate(() => localStorage.clear());
  await page.goto(`${APP_URL}/login`);
  await page.getByPlaceholder('Email').fill(user.email);
  await page.getByPlaceholder(/Lozinka|Password/).fill(newPassword);
  await page.getByRole('button', { name: /Prijava|Sign In/ }).click();

  await expect(page).toHaveURL(/\/(?:#\/)?parking(?:\?|$)/);
});
