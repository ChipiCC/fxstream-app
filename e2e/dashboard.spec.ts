import { expect, test } from '@playwright/test';

test('streams rates, charts a pair, and requests a quote', async ({ page }) => {
  const pageErrors: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));

  await page.goto('/');

  await expect(page.getByRole('heading', { name: 'FXStream dashboard' })).toBeVisible();
  await expect(page.getByTestId('connection-badge')).toContainText('Live', { timeout: 15_000 });
  await expect(page.getByTestId('rate-row-EUR-USD')).toContainText('EUR/USD');
  await expect(page.getByTestId('rate-row-BTC-USDT')).toContainText('BTC/USDT');
  await expect(page.getByTestId('pair-chart').locator('canvas').first()).toBeVisible();

  const price = page.getByTestId('price-EUR-USD');
  const initialPrice = await price.innerText();
  await expect.poll(() => price.innerText(), { timeout: 8_000 }).not.toBe(initialPrice);

  await page.getByTestId('quote-submit').click();
  await expect(page.getByTestId('quote-card')).toBeVisible();
  await expect(page.getByTestId('quote-countdown')).toContainText(/\d:\d{2}|Expired/);
  await expect(page.getByRole('heading', { name: 'Active quote' })).toBeVisible();

  expect(pageErrors).toEqual([]);
});

test('deep links to a configured pair', async ({ page }) => {
  await page.goto('/pair/BTC/USDT');

  await expect(page.getByRole('heading', { name: /BTC\/USDT/ })).toBeVisible();
  await expect(page.getByTestId('rate-row-BTC-USDT')).toContainText('selected');
  await expect(page.getByLabel('Pair')).toHaveValue('BTC/USDT');
  await expect(page.getByTestId('pair-chart')).toBeVisible();
});

test('rejects an unknown pair without crashing', async ({ page }) => {
  await page.goto('/pair/DOGE/USDT');

  await expect(page.getByText('Unknown pair')).toBeVisible();
  await page.getByRole('link', { name: 'Back to dashboard' }).click();
  await expect(page.getByRole('heading', { name: 'FXStream dashboard' })).toBeVisible();
});
