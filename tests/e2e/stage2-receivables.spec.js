import { test, expect } from '@playwright/test';

test.describe('Stage 2.5 Receivables Browser Acceptance', () => {
  test.beforeEach(async ({ page }) => {
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log('BROWSER ERROR:', msg.text());
      }
    });
    page.on('pageerror', err => {
      console.log('PAGE ERROR:', err.message);
    });
    page.on('requestfailed', request => {
      console.log('FAILED REQUEST:', request.url(), request.failure()?.errorText);
    });
    await page.goto('http://localhost:3002/src/ui/app.html?nocache=' + Date.now());
    await page.waitForSelector('#app-lifecycle-ready', { state: 'visible', timeout: 15000 });
  });

  test.afterEach(async ({ page }) => {
    const toasts = await page.locator('.toast').allTextContents();
    if (toasts.length > 0) {
      console.log('REMAINING TOASTS:', JSON.stringify(toasts));
    }
    const errorToasts = await page.locator('.toast-error').allTextContents();
    if (errorToasts.length > 0) {
      console.log('ERROR TOASTS:', JSON.stringify(errorToasts));
    }
  });

  test('receivables full financial semantics scenario', async ({ page }) => {
    const today = new Date().toISOString().slice(0, 10);

    // Setup: create Bank account with 1000 and Cash account with 0
    await page.click('[data-tab="accounts"]');
    await page.waitForSelector('.accounts-view', { state: 'visible', timeout: 10000 });

    await page.click('.accounts-add-btn');
    await page.waitForSelector('.account-form', { state: 'visible', timeout: 5000 });
    await page.fill('.account-form input[name="name"]', 'Bank');
    await page.selectOption('.account-form select', { value: 'bank' });
    await page.fill('.account-form input[name="openingBalance"]', '1000');
    await page.click('.account-form button[type="submit"]');
    await page.waitForSelector('.account-list-item', { state: 'visible', timeout: 5000 });

    await page.click('.accounts-add-btn');
    await page.waitForSelector('.account-form', { state: 'visible', timeout: 5000 });
    await page.fill('.account-form input[name="name"]', 'Cash');
    await page.selectOption('.account-form select', { value: 'cash' });
    await page.fill('.account-form input[name="openingBalance"]', '0');
    await page.click('.account-form button[type="submit"]');
    await page.waitForSelector('.account-list-item', { state: 'visible', timeout: 5000 });
    await page.waitForTimeout(2000);

    // Get Bank and Cash account IDs for later use
    const bankAccountId = await page.locator('.account-list-item').filter({ has: page.locator('.account-list-item-name:has-text("Bank")') }).getAttribute('data-account-id');
    const cashAccountId = await page.locator('.account-list-item').filter({ has: page.locator('.account-list-item-name:has-text("Cash")') }).getAttribute('data-account-id');

    // Verify initial balances
    await page.waitForTimeout(2000);
    const bankBalanceEl = await page.locator('.account-list-item').filter({ has: page.locator('.account-list-item-name:has-text("Bank")') }).locator('.account-list-item-balance').first();
    await bankBalanceEl.waitFor({ text: /[0-9]/, timeout: 10000 });
    expect(await bankBalanceEl.textContent()).toContain('1');

    // Go to Receivables
    await page.click('[data-tab="receivables"]');
    await page.waitForSelector('.receivables-view', { state: 'visible', timeout: 10000 });

    // Create person
    await page.click('.receivables-add-btn');
    await page.waitForSelector('.receivable-form', { state: 'visible', timeout: 5000 });
    await page.fill('.receivable-form input[name="personName"]', 'Jan Kowalski');
    await page.click('.receivable-form button[type="submit"]');
    await page.waitForSelector('.receivables-person-item', { state: 'visible', timeout: 5000 });

    const personItem = page.locator('.receivables-person-item').first();
    await expect(personItem).toContainText('Jan Kowalski');

    // Open person detail and create receivable
    await personItem.click();
    await page.waitForSelector('.receivables-detail', { state: 'visible', timeout: 5000 });

    await page.click('.receivables-detail .btn-primary:has-text("Dodaj należność")');
    await page.waitForSelector('.receivable-form', { state: 'visible', timeout: 5000 });

    await page.fill('.receivable-form input[name="amount"]', '200');
    await page.fill('.receivable-form input[name="description"]', 'Pożyczka na remont');
    await page.fill('.receivable-form input[name="date"]', today);
    await page.selectOption('.receivable-form select[name="accountId"]', { value: bankAccountId });
    await page.click('.receivable-form button[type="submit"]');
    await page.waitForSelector('.modal-backdrop', { state: 'detached', timeout: 5000 });
    await page.waitForSelector('.receivable-item', { state: 'visible', timeout: 15000 });

    // Verify receivable created with open status
    const receivable = page.locator('.receivable-item').first();
    await expect(receivable).toContainText('200');
    await expect(receivable).toContainText('Otwarta');

    // Verify Bank account balance decreased by 200
    await page.click('[data-tab="accounts"]');
    await page.waitForSelector('.accounts-view', { state: 'visible', timeout: 10000 });
    await page.waitForTimeout(2000);
    const bankBalanceAfter = await page.locator('.account-list-item').filter({ has: page.locator('.account-list-item-name:has-text("Bank")') }).locator('.account-list-item-balance').first();
    await bankBalanceAfter.waitFor({ text: /[0-9]/, timeout: 10000 });
    expect(await bankBalanceAfter.textContent()).toContain('8');

    // Verify Reports exclude receivable from ordinary expense
    await page.click('[data-tab="reports"]');
    await page.waitForSelector('.reports-view', { state: 'visible', timeout: 10000 });
    await page.waitForTimeout(2000);
    const expenseValue = await page.locator('.summary-strip-item:has-text("Wydatek") .summary-strip-value').first().textContent();
    expect(expenseValue).toContain('0');

    // Partial repayment: 40
    await page.click('[data-tab="receivables"]');
    await page.waitForSelector('.receivables-view', { state: 'visible', timeout: 10000 });
    await page.click('.receivables-person-item');
    await page.waitForSelector('.receivables-detail', { state: 'visible', timeout: 5000 });

    await page.locator('.receivable-item .btn-secondary:has-text("Zapłać")').first().click();
    await page.waitForSelector('.receivable-form', { state: 'visible', timeout: 5000 });
    await page.fill('.receivable-form input[name="repayAmount"]', '40');
    await page.fill('.receivable-form input[name="repayDate"]', today);
    await page.selectOption('.receivable-form select[name="accountId"]', { value: cashAccountId });
    await page.click('.receivable-form button[type="submit"]');
    await page.waitForSelector('.modal-backdrop', { state: 'detached', timeout: 5000 });
    await page.waitForSelector('.receivable-item', { state: 'visible', timeout: 15000 });

    // Verify status is Partially Paid
    const repaidReceivable = page.locator('.receivable-item').first();
    await expect(repaidReceivable).toContainText('Częściowo spłacona');

    // Verify Cash account balance increased by 40
    await page.click('[data-tab="accounts"]');
    await page.waitForSelector('.accounts-view', { state: 'visible', timeout: 10000 });
    await page.waitForTimeout(2000);
    const cashBalanceEl = await page.locator('.account-list-item').filter({ has: page.locator('.account-list-item-name:has-text("Cash")') }).locator('.account-list-item-balance').first();
    await cashBalanceEl.waitFor({ text: /[0-9]/, timeout: 10000 });
    expect(await cashBalanceEl.textContent()).toContain('4');

    // Full repayment: remaining 160
    await page.click('[data-tab="receivables"]');
    await page.waitForSelector('.receivables-view', { state: 'visible', timeout: 10000 });
    await page.click('.receivables-person-item');
    await page.waitForSelector('.receivables-detail', { state: 'visible', timeout: 5000 });

    await page.locator('.receivable-item .btn-secondary:has-text("Zapłać")').first().click();
    await page.waitForSelector('.receivable-form', { state: 'visible', timeout: 5000 });
    await page.fill('.receivable-form input[name="repayAmount"]', '160');
    await page.fill('.receivable-form input[name="repayDate"]', today);
    await page.selectOption('.receivable-form select[name="accountId"]', { value: cashAccountId });
    await page.click('.receivable-form button[type="submit"]');
    await page.waitForSelector('.modal-backdrop', { state: 'detached', timeout: 5000 });
    await page.waitForSelector('.receivable-item', { state: 'visible', timeout: 15000 });

    // Verify status is Paid
    await expect(page.locator('.receivable-item').first()).toContainText('Zapłacona');

    // Verify Cash balance is now 200 (40 + 160)
    await page.click('[data-tab="accounts"]');
    await page.waitForSelector('.accounts-view', { state: 'visible', timeout: 10000 });
    await page.waitForTimeout(2000);
    const cashBalanceFullEl = await page.locator('.account-list-item').filter({ has: page.locator('.account-list-item-name:has-text("Cash")') }).locator('.account-list-item-balance').first();
    await cashBalanceFullEl.waitFor({ text: /[0-9]/, timeout: 10000 });
    expect(await cashBalanceFullEl.textContent()).toContain('2');

    // Create second receivable: 200
    await page.click('[data-tab="receivables"]');
    await page.waitForSelector('.receivables-view', { state: 'visible', timeout: 10000 });
    await page.click('.receivables-person-item');
    await page.waitForSelector('.receivables-detail', { state: 'visible', timeout: 5000 });

    await page.click('.receivables-detail .btn-primary:has-text("Dodaj należność")');
    await page.waitForSelector('.receivable-form', { state: 'visible', timeout: 5000 });
    await page.fill('.receivable-form input[name="amount"]', '200');
    await page.fill('.receivable-form input[name="description"]', 'Druga pożyczka');
    await page.fill('.receivable-form input[name="date"]', today);
    await page.selectOption('.receivable-form select[name="accountId"]', { value: bankAccountId });
    await page.click('.receivable-form button[type="submit"]');
    await page.waitForSelector('.modal-backdrop', { state: 'detached', timeout: 5000 });
    await page.waitForSelector('.receivable-item', { state: 'visible', timeout: 15000 });

    // Partial forgiveness: 80
    await page.locator('.receivable-item:has-text("Druga pożyczka") .btn-secondary:has-text("Przebacz")').click();
    await page.waitForSelector('.receivable-form', { state: 'visible', timeout: 5000 });
    await page.fill('.receivable-form input[name="forgiveAmount"]', '80');
    await page.click('.receivable-form button[type="submit"]');
    await page.waitForSelector('.modal-backdrop', { state: 'detached', timeout: 5000 });
    await page.waitForSelector('.receivable-item', { state: 'visible', timeout: 15000 });

    // Verify status is Partially Forgiven
    await expect(page.locator('.receivable-item:has-text("Druga pożyczka")')).toContainText('Częściowo przebaczone');

    // Verify Bank balance unchanged after forgiveness (still 600 after second 200 receivable)
    await page.click('[data-tab="accounts"]');
    await page.waitForSelector('.accounts-view', { state: 'visible', timeout: 10000 });
    await page.waitForTimeout(2000);
    const bankBalanceForgivenessEl = await page.locator('.account-list-item').filter({ has: page.locator('.account-list-item-name:has-text("Bank")') }).locator('.account-list-item-balance').first();
    await bankBalanceForgivenessEl.waitFor({ text: /[0-9]/, timeout: 10000 });
    expect(await bankBalanceForgivenessEl.textContent()).toContain('6');

    // Full forgiveness: remaining 120
    await page.click('[data-tab="receivables"]');
    await page.waitForSelector('.receivables-view', { state: 'visible', timeout: 10000 });
    await page.click('.receivables-person-item');
    await page.waitForSelector('.receivables-detail', { state: 'visible', timeout: 5000 });

    await page.locator('.receivable-item:has-text("Druga pożyczka") .btn-secondary:has-text("Przebacz")').click();
    await page.waitForSelector('.receivable-form', { state: 'visible', timeout: 5000 });
    await page.fill('.receivable-form input[name="forgiveAmount"]', '120');
    await page.click('.receivable-form button[type="submit"]');
    await page.waitForSelector('.modal-backdrop', { state: 'detached', timeout: 5000 });
    await page.waitForSelector('.receivable-item', { state: 'visible', timeout: 15000 });

    // Verify status is Forgiven
    await expect(page.locator('.receivable-item:has-text("Druga pożyczka")')).toContainText('Przebaczone');

    // Verify history shows both events
    await page.click('.receivables-person-item');
    await page.waitForSelector('.receivables-detail', { state: 'visible', timeout: 5000 });
    await page.waitForTimeout(2000);
    const historyItems = await page.locator('#receivables-history .surface-list-item').count();
    expect(historyItems).toBeGreaterThanOrEqual(3);
  });

  test('mobile viewport receivables', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });

    await page.click('.top-bar-menu-btn');
    await page.waitForSelector('.sidebar', { state: 'visible', timeout: 5000 });

    await page.click('[data-tab="receivables"]');
    await page.waitForSelector('.receivables-view', { state: 'visible', timeout: 10000 });

    const viewportWidth = await page.evaluate(() => window.innerWidth);
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 1);
  });
});
