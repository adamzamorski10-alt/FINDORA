import { writeFileSync } from 'node:fs';

const content = `import { test, expect } from '@playwright/test';

test.describe('Stage 2 Receivables Browser Acceptance', () => {
  test.beforeEach(async ({ page }) => {
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log('BROWSER ERROR:', msg.text());
      }
    });
    page.on('pageerror', err => {
      console.log('PAGE ERROR:', err.message);
    });
    await page.goto('http://localhost:3002/ui/app.html');
    await page.waitForTimeout(3000);
  });

  test('receivables end-to-end scenario', async ({ page }) => {
    await page.click('[data-tab="receivables"]');
    await page.waitForSelector('.receivables-view', { state: 'visible', timeout: 10000 });

    await page.click('.receivables-add-btn');
    await page.waitForSelector('.receivable-form', { state: 'visible', timeout: 5000 });

    await page.fill('.receivable-form input[type="text"]', 'Jan Kowalski');
    await page.click('.receivable-form button[type="submit"]');
    await page.waitForSelector('.receivables-person-item', { state: 'visible', timeout: 5000 });

    const personItem = page.locator('.receivables-person-item').first();
    await expect(personItem).toContainText('Jan Kowalski');

    await personItem.click();
    await page.waitForSelector('.receivables-detail', { state: 'visible', timeout: 5000 });

    await page.click('.receivables-detail .btn-primary:has-text("Dodaj należność")');
    await page.waitForSelector('.receivable-form', { state: 'visible', timeout: 5000 });

    await page.fill('.receivable-form input[type="number"]', '200');
    await page.fill('.receivable-form input[type="text"]', 'Pożyczka na remont');
    await page.selectOption('.receivable-form select', { label: 'Bank' });
    await page.click('.receivable-form button[type="submit"]');
    await page.waitForSelector('.receivable-item', { state: 'visible', timeout: 5000 });

    const receivable = page.locator('.receivable-item').first();
    await expect(receivable).toContainText('200');
    await expect(receivable).toContainText('Otwarta');

    await receivable.locator('.btn-secondary:has-text("Zapłać")').click();
    await page.waitForSelector('.receivable-form', { state: 'visible', timeout: 5000 });

    await page.fill('.receivable-form input[type="number"]', '100');
    await page.selectOption('.receivable-form select', { label: 'Cash' });
    await page.click('.receivable-form button[type="submit"]');
    await page.waitForSelector('.receivable-item', { state: 'visible', timeout: 5000 });

    await expect(receivable).toContainText('100');

    await receivable.locator('.btn-secondary:has-text("Zapłać")').click();
    await page.waitForSelector('.receivable-form', { state: 'visible', timeout: 5000 });

    await page.fill('.receivable-form input[type="number"]', '100');
    await page.selectOption('.receivable-form select', { label: 'Cash' });
    await page.click('.receivable-form button[type="submit"]');
    await page.waitForSelector('.receivable-item', { state: 'visible', timeout: 5000 });

    await expect(receivable).toContainText('Zapłacona');

    await page.click('.receivables-detail .btn-primary:has-text("Dodaj należność")');
    await page.waitForSelector('.receivable-form', { state: 'visible', timeout: 5000 });

    await page.fill('.receivable-form input[type="number"]', '150');
    await page.fill('.receivable-form input[type="text"]', 'Druga pożyczka');
    await page.selectOption('.receivable-form select', { label: 'Bank' });
    await page.click('.receivable-form button[type="submit"]');
    await page.waitForSelector('.receivable-item', { state: 'visible', timeout: 5000 });

    const secondReceivable = page.locator('.receivable-item').last();
    await secondReceivable.click();
    await page.waitForSelector('.receivables-detail', { state: 'visible', timeout: 5000 });

    await secondReceivable.locator('.btn-secondary:has-text("Przebacz")').click();
    await page.waitForSelector('.receivable-form', { state: 'visible', timeout: 5000 });

    await page.fill('.receivable-form input[type="number"]', '150');
    await page.click('.receivable-form button[type="submit"]');
    await page.waitForSelector('.receivable-item', { state: 'visible', timeout: 5000 });

    await expect(secondReceivable).toContainText('Przebaczone');

    await page.reload();
    await page.waitForTimeout(3000);

    await page.click('[data-tab="receivables"]');
    await page.waitForSelector('.receivables-view', { state: 'visible', timeout: 10000 });

    await expect(page.locator('.receivables-person-item').first()).toContainText('Jan Kowalski');
  });

  test('mobile viewport receivables', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });

    await page.click('[data-tab="receivables"]');
    await page.waitForSelector('.receivables-view', { state: 'visible', timeout: 10000 });

    const viewportWidth = await page.evaluate(() => window.innerWidth);
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 1);
  });
});
`;

writeFileSync('tests/e2e/stage2-receivables.spec.js', content);
console.log('File written successfully');
