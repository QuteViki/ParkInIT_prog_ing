import { test, expect } from '@playwright/test';

const APP_URL = process.env.E2E_BASE_URL || 'https://parkinit.online';

async function createTestUser(request) {
  const uniqueId = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  const email = `e2e.parking.${uniqueId}@parkinit.test`;
  const password = 'E2eTest123!';

  const response = await request.post(`${APP_URL}/api/auth/register`, {
    data: {
      firstName: 'E2E',
      lastName: 'Parking',
      personalId: uniqueId.slice(-11).padStart(11, '0'),
      phone: `09${uniqueId.slice(-8)}`,
      email,
      password,
    },
  });

  expect(response.status()).toBe(201);

  return { email, password };
}

test('ulogirani korisnik prolazi odabir parkinga i vremena', async ({ page, request }) => {
  const user = await createTestUser(request);

  await page.goto(`${APP_URL}/login`);
  await page.getByPlaceholder('Email').fill(user.email);
  await page.getByPlaceholder(/Lozinka|Password/).fill(user.password);
  await page.getByRole('button', { name: /Prijava|Sign In/ }).click();

  await expect(page).toHaveURL(/\/(?:#\/)?parking(?:\?|$)/);
  await expect(page.getByRole('heading', { name: /Odaberite parking|Select parking/ })).toBeVisible();

  const parkingResponsePromise = page.waitForResponse(
    (response) => response.url().endsWith('/api/parking') && response.request().method() === 'GET',
  );

  await page.reload();

  const parkingResponse = await parkingResponsePromise;
  expect(parkingResponse.ok()).toBe(true);

  const parkingCards = page.locator('.parking-card');
  await expect(parkingCards.first()).toBeVisible();

  const selectedParkingName = (await parkingCards.first().locator('.card-title').innerText()).trim();
  await parkingCards.first().click();

  await expect(page.getByRole('heading', { name: /Odaberite vremenski period|Select time/ })).toBeVisible();
  await expect(page.getByText(selectedParkingName)).toBeVisible();

  const spacesResponsePromise = page.waitForResponse(
    (response) =>
      /\/api\/parking\/\d+\/spaces/.test(response.url()) &&
      response.request().method() === 'GET',
  );

  await page.getByRole('button', { name: 'Dalje' }).click();

  const spacesResponse = await spacesResponsePromise;
  expect(spacesResponse.ok()).toBe(true);

  await expect(page.getByText(selectedParkingName)).toBeVisible();
  await expect(page.getByText(/Slobodno|Available/)).toBeVisible();
  await expect(page.getByText(/Zauzeto|Occupied/)).toBeVisible();
  await expect(page.getByText(/Invalidska|Disabled/)).toBeVisible();
});
