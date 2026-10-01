import { test, expect } from '@playwright/test';

test('debug fill form', async ({ page }) => {
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('BROWSER ERROR:', msg.text());
    }
  });
  await page.goto('http://localhost:3002/ui/app.html');
  await page.waitForTimeout(3000);
  
  await page.click('[data-tab="receivables"]');
  await page.waitForSelector('.receivables-view', { state: 'visible', timeout: 10000 });
  
  await page.click('.receivables-add-btn');
  await page.waitForSelector('.receivable-form', { state: 'visible', timeout: 5000 });
  
  const input = page.locator('.receivable-form input[type="text"]').first();
  await input.scrollIntoViewIfNeeded();
  await input.fill('Jan Kowalski');
  console.log('FILLED INPUT');
  
  await page.click('.receivable-form button[type="submit"]');
  await page.waitForSelector('.person-list-item', { state: 'visible', timeout: 5000 });
  console.log('PERSON CREATED');
});
