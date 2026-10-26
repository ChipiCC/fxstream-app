import { expect, test } from '@playwright/test';

test('shows stale rates and disables quoting', async ({ page }) => {
  await page.goto('/?scenario=stale');

  await expect(page.getByTestId('rate-row-EUR-USD')).toContainText('Stale');
  await expect(page.getByTestId('quote-submit')).toBeDisabled();
  await expect(page.getByText('Quoting is disabled while this rate is stale.')).toBeVisible();
});

test('surfaces a server quote rejection in plain language', async ({ page }) => {
  await page.goto('/?scenario=quote-rejected');
  await expect(page.getByTestId('connection-badge')).toContainText('Live', { timeout: 15_000 });
  await expect(page.getByTestId('quote-submit')).toBeEnabled();

  await page.getByTestId('quote-submit').click();

  await expect(page.getByRole('alert')).toContainText('stale');
  await expect(page.getByRole('alert')).toContainText('request a new quote');
});

test('expires a quote and offers a new one', async ({ page }) => {
  await page.goto('/?scenario=fast-expiry');
  await expect(page.getByTestId('quote-submit')).toBeEnabled();

  await page.getByTestId('quote-submit').click();
  await expect(page.getByTestId('quote-card')).toBeVisible();
  await expect(page.getByTestId('quote-countdown')).toContainText(/\d:\d{2}/);

  await expect(page.getByTestId('quote-countdown')).toHaveText('Expired', { timeout: 10_000 });
  await expect(page.getByTestId('quote-submit')).toHaveText('Request new quote');
  await expect(page.getByTestId('quote-submit')).toBeEnabled();
});

test('shows offline state and keeps last known values visible', async ({ page }) => {
  await page.goto('/?scenario=offline');

  await expect(page.getByTestId('connection-badge')).toHaveText('Offline', { timeout: 15_000 });
  await expect(page.getByTestId('offline-banner')).toContainText('Live updates are paused');
  await expect(page.getByTestId('rate-row-EUR-USD')).toContainText('EUR/USD');
  await expect(page.getByTestId('quote-submit')).toBeDisabled();
});

test('shows provider health degraded in the header and status page', async ({ page }) => {
  await page.goto('/?scenario=degraded');

  await expect(page.getByTestId('provider-health')).toContainText('degraded', {
    timeout: 15_000,
  });

  await page.getByRole('link', { name: 'Status' }).click();
  await expect(page.getByRole('heading', { name: 'Status & diagnostics' })).toBeVisible();
  await expect(page.getByTestId('provider-binance')).toContainText('Degraded');
  await expect(page.getByTestId('provider-frankfurter')).toContainText('Degraded');
});
