import { test, expect } from '@playwright/test';

const APP_URL = process.env.E2E_BASE_URL || 'https://parkinit.online';

async function createTestUser(request) {
  const uniqueId = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  const email = `e2e.logout.${uniqueId}@parkinit.test`;
  const password = 'E2eTest123!';

  const response = await request.post(`${APP_URL}/api/auth/register`, {
    data: {
      firstName: 'E2E',
      lastName: 'Odjava',
      personalId: uniqueId.slice(-11).padStart(11, '0'),
      phone: `09${uniqueId.slice(-8)}`,
      email,
      password,
    },
  });

  expect(response.status()).toBe(201);

  return { email, password };
}

test('korisnik se odjavljuje i vise ne moze otvoriti zasticenu stranicu', async ({
  page,
  request,
}) => {
  const user = await createTestUser(request);

  await page.goto(`${APP_URL}/login`);
  await page.getByPlaceholder('Email').fill(user.email);
  await page.getByPlaceholder(/Lozinka|Password/).fill(user.password);
  await page.getByRole('button', { name: /Prijava|Sign In/ }).click();

  await expect(page).toHaveURL(/\/(?:#\/)?parking(?:\?|$)/);

  await page.getByLabel('Izbornik').click();
  await page.getByText(/Odjava|Logout/).click();

  await expect(page.getByPlaceholder('Email')).toBeVisible();

  const session = await page.evaluate(() => ({
    token: localStorage.getItem('auth_token'),
    user: localStorage.getItem('auth_user'),
  }));

  expect(session.token).toBeNull();
  expect(session.user).toBeNull();

  await page.goto(`${APP_URL}/#/profile`);

  await expect(page.getByPlaceholder('Email')).toBeVisible();
  await expect(page.getByRole('button', { name: /Prijava|Sign In/ })).toBeVisible();
});
