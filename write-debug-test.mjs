import { test, expect } from '@playwright/test';

test('debug select options', async ({ page }) => {
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
  
  const select = page.locator('.receivable-form select');
  const options = await select.locator('option').all();
  console.log('OPTIONS COUNT:', options.length);
  for (const opt of options) {
    const text = await opt.textContent();
    const value = await opt.getAttribute('value');
    console.log('OPTION:', text, '=', value);
  }
  
  const accounts = await page.evaluate(() => {
    return (window.__snapshot?.accounts?.items || []).map(a => ({ id: a.id, name: a.name }));
  });
  console.log('ACCOUNTS:', accounts);
});
