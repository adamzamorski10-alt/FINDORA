import { test, expect } from '@playwright/test';

test('debug form submit', async ({ page }) => {
  console.log('TEST STARTED');
  page.on('console', msg => {
    console.log('CONSOLE [' + msg.type() + ']:', msg.text());
  });
  page.on('pageerror', err => {
    console.log('PAGE ERROR:', err.message);
  });
  await page.goto('http://localhost:3002/ui/app.html', { timeout: 30000 });
  await page.waitForTimeout(2000);
  
  await page.click('[data-tab="receivables"]');
  await page.waitForSelector('.receivables-view', { state: 'visible', timeout: 10000 });
  
  await page.click('.receivables-add-btn');
  await page.waitForSelector('.receivable-form', { state: 'visible', timeout: 5000 });
  
  await page.fill('.receivable-form input[type="text"]', 'Jan Kowalski');
  await page.click('.receivable-form button[type="submit"]');
  await page.waitForSelector('.receivables-person-item', { state: 'visible', timeout: 5000 });
  
  const personItem = page.locator('.receivables-person-item').first();
  await personItem.click();
  await page.waitForSelector('.receivables-detail', { state: 'visible', timeout: 5000 });
  
  await page.click('.receivables-detail .btn-primary:has-text("Dodaj należność")');
  await page.waitForSelector('.receivable-form', { state: 'visible', timeout: 5000 });
  
  await page.fill('.receivable-form input[type="number"]', '200');
  await page.fill('.receivable-form input[type="text"]', 'Pożyczka na remont');
  await page.selectOption('.receivable-form select', { index: 1 });
  
  await page.click('.receivable-form button[type="submit"]');
  await page.waitForTimeout(5000);
  
  const html = await page.locator('.receivables-view').innerHTML();
  console.log('HTML:', html);
  
  await page.screenshot({ path: 'F:/Projects/finanse/debug-screenshot.png' });
});
