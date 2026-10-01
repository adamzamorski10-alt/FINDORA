import { test, expect } from '@playwright/test';

test('debug receivables tab', async ({ page }) => {
  page.on('console', msg => {
    const text = msg.text();
    if (msg.type() === 'error') {
      console.log('BROWSER ERROR:', text);
    }
  });
  await page.goto('http://localhost:3002/ui/app.html');
  await page.waitForTimeout(5000);
  
  const tabs = await page.locator('[data-tab]').all();
  console.log('FOUND TABS:', tabs.length);
  for (const tab of tabs) {
    const tabName = await tab.getAttribute('data-tab');
    console.log('TAB:', tabName);
  }
  
  const receivablesTab = page.locator('[data-tab="receivables"]');
  console.log('RECEIVABLES TAB COUNT:', await receivablesTab.count());
  
  if (await receivablesTab.count() > 0) {
    await receivablesTab.click();
    await page.waitForTimeout(2000);
    
    const view = await page.locator('.receivables-view').count();
    console.log('RECEIVABLES VIEW COUNT:', view);
    
    const addBtn = await page.locator('.add-person-btn').count();
    console.log('ADD PERSON BTN COUNT:', addBtn);
  }
});
