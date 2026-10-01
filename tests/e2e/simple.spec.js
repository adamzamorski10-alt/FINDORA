import { test, expect } from '@playwright/test';

test('simple test', async ({ page }) => {
  await page.goto('http://localhost:3002/ui/app.html');
  await page.waitForTimeout(1000);
  const title = await page.title();
  console.log('TITLE:', title);
  expect(title).toBe('FINDORA');
});
