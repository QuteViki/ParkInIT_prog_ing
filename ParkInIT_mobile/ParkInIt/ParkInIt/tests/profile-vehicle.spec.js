import { test, expect } from '@playwright/test';

const APP_URL = process.env.E2E_BASE_URL || 'https://parkinit.online';

async function createTestUser(request) {
  const uniqueId = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  const email = `e2e.vehicle.${uniqueId}@parkinit.test`;
  const password = 'E2eTest123!';

  const response = await request.post(`${APP_URL}/api/auth/register`, {
    data: {
      firstName: 'E2E',
      lastName: 'Vozilo',
      personalId: uniqueId.slice(-11).padStart(11, '0'),
      phone: `09${uniqueId.slice(-8)}`,
      email,
      password,
    },
  });

  expect(response.status()).toBe(201);

  return { email, password, uniqueId };
}

test('ulogirani korisnik dodaje vozilo na profilu', async ({ page, request }) => {
  const user = await createTestUser(request);
  const registration = `E2E-${user.uniqueId.slice(-6)}`;

  await page.goto(`${APP_URL}/login`);
  await page.getByPlaceholder('Email').fill(user.email);
  await page.getByPlaceholder(/Lozinka|Password/).fill(user.password);
  await page.getByRole('button', { name: /Prijava|Sign In/ }).click();

  await expect(page).toHaveURL(/\/(?:#\/)?parking(?:\?|$)/);

  await page.goto(`${APP_URL}/#/profile`);
  await expect(page.getByText(user.email)).toBeVisible();

  await page.locator('.q-card:has-text("Moja vozila") button').click();

  await page.getByLabel('Registracija').fill(registration);
  await page.getByLabel('Marka vozila').fill('Toyota');
  await page.getByLabel(/Tip vozila/).fill('Yaris');

  const addVehicleResponsePromise = page.waitForResponse(
    (response) =>
      response.url().includes('/api/user/vehicles') && response.request().method() === 'POST',
  );

  await page.getByRole('button', { name: /Spremi|Save/ }).click();

  const addVehicleResponse = await addVehicleResponsePromise;
  expect(addVehicleResponse.ok()).toBe(true);

  await expect(page.getByText(registration)).toBeVisible();
  await expect(page.getByText(/Toyota/)).toBeVisible();
});
