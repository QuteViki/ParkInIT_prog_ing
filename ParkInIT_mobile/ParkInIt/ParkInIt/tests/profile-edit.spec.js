import { test, expect } from '@playwright/test';

const APP_URL = process.env.E2E_BASE_URL || 'https://parkinit.online';

async function createTestUser(request) {
  const uniqueId = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  const email = `e2e.profile.${uniqueId}@parkinit.test`;
  const password = 'E2eTest123!';

  const response = await request.post(`${APP_URL}/api/auth/register`, {
    data: {
      firstName: 'E2E',
      lastName: 'Profil',
      personalId: uniqueId.slice(-11).padStart(11, '0'),
      phone: `09${uniqueId.slice(-8)}`,
      email,
      password,
    },
  });

  expect(response.status()).toBe(201);

  return { email, password, uniqueId };
}

test('ulogirani korisnik uredjuje podatke profila', async ({ page, request }) => {
  const user = await createTestUser(request);
  const updatedFirstName = 'Testirano';
  const updatedLastName = 'Profil';
  const updatedPhone = `091${user.uniqueId.slice(-7)}`;

  await page.goto(`${APP_URL}/login`);
  await page.getByPlaceholder('Email').fill(user.email);
  await page.getByPlaceholder(/Lozinka|Password/).fill(user.password);
  await page.getByRole('button', { name: /Prijava|Sign In/ }).click();

  await expect(page).toHaveURL(/\/(?:#\/)?parking(?:\?|$)/);

  await page.goto(`${APP_URL}/#/profile`);
  await expect(page.getByText(user.email)).toBeVisible();

  await page.getByRole('button', { name: /Uredi profil|Edit Profile/ }).click();

  await page.getByLabel('Ime', { exact: true }).fill(updatedFirstName);
  await page.getByLabel('Prezime').fill(updatedLastName);
  await page.getByLabel(/E-mail|Email/).fill(user.email);
  await page.getByLabel(/Telefonski broj|Phone/).fill(updatedPhone);

  const updateProfileResponsePromise = page.waitForResponse(
    (response) =>
      response.url().includes('/api/user/profile') && response.request().method() === 'PUT',
  );

  await page.getByRole('button', { name: /Spremi|Save/ }).click();

  const updateProfileResponse = await updateProfileResponsePromise;
  expect(updateProfileResponse.ok()).toBe(true);

  await expect(page.getByText(`${updatedFirstName} ${updatedLastName}`)).toBeVisible();
  await expect(page.getByText(updatedPhone)).toBeVisible();
});
