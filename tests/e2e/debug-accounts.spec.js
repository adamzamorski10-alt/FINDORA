import { test, expect } from '@playwright/test';

test('debug accounts state', async ({ page }) => {
  page.on('console', msg => {
    console.log('CONSOLE [' + msg.type() + ']:', msg.text());
  });
  await page.goto('http://localhost:3002/ui/app.html');
  await page.waitForTimeout(2000);
  
  await page.click('[data-tab="accounts"]');
  await page.waitForSelector('.accounts-view', { state: 'visible', timeout: 10000 });
  
  await page.click('.accounts-view .btn-primary');
  await page.waitForSelector('.account-form', { state: 'visible', timeout: 5000 });;
  
  await page.fill('.account-form input[type="text"]', 'Bank');
  await page.selectOption('.account-form select', { value: 'bank' });
  await page.fill('.account-form input[type="number"]', '1000');
  await page.click('.account-form button[type="submit"]');
  await page.waitForSelector('.account-list-item', { state: 'visible', timeout: 5000 });
  
  const accountsHtml = await page.locator('.accounts-view').innerHTML();
  console.log('ACCOUNTS HTML:', accountsHtml.slice(0, 1000));
  
  const state = await page.evaluate(() => {
    return window.__snapshot?.accounts?.items?.map(a => a.name) || [];
  });
  console.log('STATE ACCOUNTS:', state);
});

