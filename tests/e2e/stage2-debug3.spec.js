import { test, expect } from '@playwright/test';

test('debug modal form', async ({ page }) => {
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
  await page.waitForSelector('.modal', { state: 'visible', timeout: 5000 });
  
  const modalHTML = await page.locator('.modal').innerHTML();
  console.log('MODAL HTML:', modalHTML.slice(0, 1000));
  
  const inputCount = await page.locator('.receivable-form input').count();
  console.log('INPUT COUNT:', inputCount);
  
  const allInputs = await page.locator('.receivable-form input').all();
  for (const input of allInputs) {
    const type = await input.getAttribute('type');
    console.log('INPUT TYPE:', type);
  }
});
