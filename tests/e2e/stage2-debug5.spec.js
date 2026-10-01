import { test, expect } from '@playwright/test';

test('debug person creation', async ({ page }) => {
  page.on('console', msg => {
    console.log('CONSOLE [' + msg.type() + ']:', msg.text());
  });
  page.on('pageerror', err => {
    console.log('PAGE ERROR:', err.message);
  });
  await page.goto('http://localhost:3002/ui/app.html');
  await page.waitForTimeout(3000);
  
  await page.click('[data-tab="receivables"]');
  await page.waitForSelector('.receivables-view', { state: 'visible', timeout: 10000 });
  
  const peopleCountBefore = await page.locator('.person-list-item').count();
  console.log('PEOPLE COUNT BEFORE:', peopleCountBefore);
  
  await page.click('.receivables-add-btn');
  await page.waitForSelector('.receivable-form', { state: 'visible', timeout: 5000 });
  
  const input = page.locator('.receivable-form input[type="text"]').first();
  await input.fill('Jan Kowalski');
  
  await page.click('.receivable-form button[type="submit"]');
  await page.waitForTimeout(2000);
  
  const peopleCountAfter = await page.locator('.person-list-item').count();
  console.log('PEOPLE COUNT AFTER:', peopleCountAfter);
  
  const bodyContent = await page.locator('.receivables-view').innerHTML();
  console.log('RECEIVABLES VIEW HTML:', bodyContent.slice(0, 1500));
});
