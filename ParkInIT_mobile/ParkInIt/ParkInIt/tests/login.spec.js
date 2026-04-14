import { test, expect } from '@playwright/test';

const APP_URL = process.env.E2E_BASE_URL || 'https://parkinit.online';

async function createTestUser(request) {
  const uniqueId = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  const email = `e2e.${uniqueId}@parkinit.test`;
  const password = 'E2eTest123!';

  const registerResponse = await request.post(`${APP_URL}/api/auth/register`, {
    data: {
      firstName: 'E2E',
      lastName: 'Test',
      personalId: uniqueId.slice(-11).padStart(11, '0'),
      phone: `09${uniqueId.slice(-8)}`,
      email,
      password,
    },
  });

  expect(registerResponse.status()).toBe(201);

  return { email, password };
}

test('prikazuje gresku za krivu lozinku', async ({ page }) => {
  await page.goto(`${APP_URL}/login`);

  await page.getByPlaceholder('Email').fill('test@test.com');
  await page.getByPlaceholder(/Lozinka|Password/).fill('kriva-lozinka');

  const loginResponsePromise = page.waitForResponse(
    (response) =>
      response.url().includes('/api/auth/login') && response.request().method() === 'POST',
  );

  await page.getByRole('button', { name: /Prijava|Sign In/ }).click();

  const loginResponse = await loginResponsePromise;
  expect(loginResponse.ok()).toBe(false);

  const responseBody = await loginResponse.json();
  const errorMessage = responseBody.error || responseBody.message;

  await expect(page.getByText(errorMessage)).toBeVisible();
});

test('uspjesno prijavljuje korisnika', async ({ page, request }) => {
  const credentials =
    process.env.E2E_LOGIN_EMAIL && process.env.E2E_LOGIN_PASSWORD
      ? {
          email: process.env.E2E_LOGIN_EMAIL,
          password: process.env.E2E_LOGIN_PASSWORD,
        }
      : await createTestUser(request);

  await page.goto(`${APP_URL}/login`);

  await page.getByPlaceholder('Email').fill(credentials.email);
  await page.getByPlaceholder(/Lozinka|Password/).fill(credentials.password);

  const loginResponsePromise = page.waitForResponse(
    (response) =>
      response.url().includes('/api/auth/login') && response.request().method() === 'POST',
  );

  await page.getByRole('button', { name: /Prijava|Sign In/ }).click();

  const loginResponse = await loginResponsePromise;
  expect(loginResponse.ok()).toBe(true);

  const responseBody = await loginResponse.json();
  expect(responseBody.token).toEqual(expect.any(String));
  expect(responseBody.user.email).toBe(credentials.email.toLowerCase());

  await expect(page).toHaveURL(/\/(?:#\/)?parking(?:\?|$)/);

  const storedSession = await page.evaluate(() => ({
    token: localStorage.getItem('auth_token'),
    user: JSON.parse(localStorage.getItem('auth_user') || 'null'),
  }));

  expect(storedSession.token).toBe(responseBody.token);
  expect(storedSession.user.email).toBe(responseBody.user.email);
});
