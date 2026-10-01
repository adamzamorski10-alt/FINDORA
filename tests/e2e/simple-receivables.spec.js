import { test, expect } from '@playwright/test';

test('debug receivables click', async ({ page }) => {
  page.on('console', msg => {
    console.log('CONSOLE [' + msg.type() + ']:', msg.text());
  });
  page.on('pageerror', err => {
    console.log('PAGE ERROR:', err.message);
  });
  await page.goto('http://localhost:3002/ui/app.html');
  await page.waitForTimeout(2000);
  
  console.log('CLICKING RECEIVABLES TAB');
  await page.click('[data-tab="receivables"]');
  console.log('CLICKED');
  
  await page.waitForTimeout(2000);
  
  const count = await page.locator('.receivables-view').count();
  console.log('RECEIVABLES VIEW COUNT:', count);
  
  const addBtnCount = await page.locator('.receivables-add-btn').count();
  console.log('ADD BTN COUNT:', addBtnCount);
});
