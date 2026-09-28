import { test, expect } from '@playwright/test';

test('debug accounts desktop render', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('http://localhost:3006/');
  await page.waitForTimeout(3000);

  const menuBtn = page.locator('.top-bar-menu-btn');
  if (await menuBtn.count() > 0 && await menuBtn.isVisible().catch(() => false)) {
    await menuBtn.click();
    await page.waitForTimeout(300);
  }

  await page.click('.sidebar-link[data-tab="accounts"]');
  await page.waitForTimeout(3000);

  const html = await page.innerHTML('main');
  console.log('MAIN HTML LENGTH:', html.length);
  console.log('MAIN HTML:', html.slice(0, 800));

  const accountsView = await page.locator('.accounts-view').count();
  console.log('ACCOUNTS VIEW COUNT:', accountsView);

  const headerTitle = await page.locator('.accounts-header-title').count();
  console.log('HEADER TITLE COUNT:', headerTitle);

  if (headerTitle > 0) {
    const text = await page.locator('.accounts-header-title').textContent();
    console.log('HEADER TITLE TEXT:', text);
  }

  const summary = await page.locator('.accounts-summary-value').count();
  console.log('SUMMARY VALUE COUNT:', summary);

  const cards = await page.locator('.account-card').count();
  console.log('ACCOUNT CARD COUNT:', cards);

  await page.screenshot({ path: 'F:/Projects/finanse/artifacts/ui-review/accounts-desktop-debug.png', fullPage: false });
});
