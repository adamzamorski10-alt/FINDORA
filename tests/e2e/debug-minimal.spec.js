import { test, expect } from '@playwright/test';

test('debug minimal', async ({ page }) => {
  console.log('START');
  await page.goto('http://localhost:3002/ui/app.html');
  console.log('GOTO DONE');
  await page.waitForTimeout(1000);
  console.log('WAIT DONE');
  await page.click('[data-tab="receivables"]');
  console.log('CLICK DONE');
  await page.waitForTimeout(1000);
  console.log('ALL DONE');
});
