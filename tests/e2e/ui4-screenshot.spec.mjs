import { test, expect } from '@playwright/test';

const SCREENSHOT_DIR = 'F:/Projects/finanse/artifacts/ui-review';

async function navigateToTab(page, tab) {
  const menuBtn = page.locator('.top-bar-menu-btn');
  if (await menuBtn.count() > 0 && await menuBtn.isVisible().catch(() => false)) {
    await menuBtn.click();
    await page.waitForTimeout(300);
  }
  const locator = page.locator(`.sidebar-link[data-tab="${tab}"]`);
  await locator.click();
  await page.waitForTimeout(600);
}

async function openAddAccountModal(page) {
  const addBtn = page.locator('.accounts-add-btn').first();
  await addBtn.click();
  await page.waitForTimeout(300);
}

async function createAccountViaUI(page, { name, type, icon, color, openingBalance }) {
  await navigateToTab(page, 'accounts');
  await openAddAccountModal(page);

  await page.locator('.account-form input[type="text"]').first().fill(name);
  await page.locator('.account-form select').first().selectOption(type);

  if (icon) {
    const iconBtn = page.locator(`.icon-picker-btn[title="${icon}"]`).first();
    if (await iconBtn.count() > 0) {
      await iconBtn.click();
    }
  }

  if (color) {
    const swatch = page.locator(`.color-swatch[title="${color}"]`).first();
    if (await swatch.count() > 0) {
      await swatch.click();
    }
  }

  if (openingBalance !== undefined && openingBalance !== null) {
    await page.locator('.account-form input[type="number"]').first().fill(String(openingBalance));
  }

  await page.locator('.account-form button[type="submit"]').first().click();
  await page.waitForTimeout(2000);
}

test('ui4 accounts visual review screenshots fixed v4', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('http://localhost:3006/');
  await page.waitForTimeout(3000);

  await createAccountViaUI(page, {
    name: 'Main Account',
    type: 'bank',
    icon: 'Bank',
    color: '#0000FF',
    openingBalance: 5000,
  });

  await createAccountViaUI(page, {
    name: 'Savings',
    type: 'savings',
    icon: 'Savings',
    color: '#10B981',
    openingBalance: 2000,
  });

  await createAccountViaUI(page, {
    name: 'Cash',
    type: 'cash',
    icon: 'Cash',
    color: '#F59E0B',
    openingBalance: 500,
  });

  await navigateToTab(page, 'accounts');
  await page.waitForTimeout(4000);

  const main = page.locator('main');
  await main.scrollIntoViewIfNeeded();
  await page.waitForTimeout(1000);

  await expect(page.locator('.accounts-header-title')).toHaveText('Accounts');
  await expect(page.locator('.account-card').first()).toBeVisible();
  await expect(page.locator('.accounts-summary-value')).not.toHaveText('…');

  await page.screenshot({ path: `${SCREENSHOT_DIR}/accounts-desktop.png`, fullPage: false });

  await page.setViewportSize({ width: 1024, height: 768 });
  await page.waitForTimeout(2000);
  await page.locator('main').scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${SCREENSHOT_DIR}/accounts-tablet.png`, fullPage: false });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(2000);
  await page.locator('main').scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${SCREENSHOT_DIR}/accounts-mobile.png`, fullPage: false });
});
