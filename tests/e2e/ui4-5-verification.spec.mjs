/**
 * Stage UI-4/5 — Transactions and Budgets Verification
 */

import { test, expect } from '@playwright/test';
import http from 'http';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const SERVE_PORT = 3010;
const SCREENSHOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'test-results', 'ui4-5-verification');

function createServer(rootDir, port) {
  const uiDir = path.join(rootDir, 'src/ui');
  const srcDir = path.join(rootDir, 'src');
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const reqPath = req.url.split('?')[0];
      if (reqPath === '/favicon.ico') {
        res.writeHead(204);
        res.end();
        return;
      }
      let filePath = path.join(rootDir, reqPath === '/' ? 'src/ui/app.html' : reqPath);
      if (!fs.existsSync(filePath)) {
        const uiPath = path.join(uiDir, reqPath);
        if (fs.existsSync(uiPath)) {
          filePath = uiPath;
        } else {
          const srcPath = path.join(srcDir, reqPath);
          if (fs.existsSync(srcPath)) {
            filePath = srcPath;
          }
        }
      }
      if (!filePath.startsWith(rootDir)) {
        res.writeHead(403);
        res.end('Forbidden');
        return;
      }
      fs.readFile(filePath, (err, data) => {
        if (err) {
          res.writeHead(404);
          res.end('Not found: ' + filePath);
          return;
        }
        const ext = path.extname(filePath);
        const contentType = {
          '.html': 'text/html',
          '.js': 'application/javascript',
          '.mjs': 'application/javascript',
          '.css': 'text/css',
          '.json': 'application/json',
        }[ext] || 'application/octet-stream';
        res.writeHead(200, { 'Content-Type': contentType, 'Cache-Control': 'no-store' });
        res.end(data);
      });
    });
    server.on('error', reject);
    server.listen(port, () => resolve(server));
  });
}

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

async function createAccountViaUI(page, { name, type, icon, color, openingBalance }) {
  await navigateToTab(page, 'accounts');
  const form = page.locator('.account-form').first();
  await form.locator('input[type="text"]').first().fill(name);
  await form.locator('select').first().selectOption(type);
  await form.locator('input[type="text"]').nth(1).fill(icon);
  await form.locator('input[type="text"]').nth(2).fill(color);
  if (openingBalance !== undefined && openingBalance !== null) {
    await form.locator('input[type="number"]').first().fill(String(openingBalance));
  }
  await form.locator('button[type="submit"]').first().click();
  await page.waitForTimeout(1200);
}

async function createCategoryViaUI(page, { name, type, icon, color }) {
  await navigateToTab(page, 'settings');
  const catForm = page.locator('.category-form').first();
  await catForm.locator('input[type="text"]').first().fill(name);
  await catForm.locator('select').first().selectOption(type);
  await catForm.locator('input[type="text"]').nth(1).fill(icon);
  await catForm.locator('input[type="text"]').nth(2).fill(color);
  await catForm.locator('button[type="submit"]').first().click();
  await page.waitForTimeout(1200);
}

async function createTransactionViaUI(page, { accountName, type, categoryName, amount, description, date }) {
  await navigateToTab(page, 'transactions');
  const form = page.locator('.transaction-form').first();
  await form.locator('select').first().selectOption({ label: accountName });
  await form.locator('select').nth(1).selectOption(type);
  await form.locator('input[type="number"]').first().fill(String(amount));
  if (categoryName) {
    await form.locator('select').last().selectOption({ label: categoryName });
  }
  await form.locator('.form-field:has-text("Description") input[type="text"]').first().fill(description);
  await form.locator('.form-field:has-text("Date") input[type="text"]').first().fill(date);
  await form.locator('button[type="submit"]').first().click();
  await page.waitForTimeout(1200);
}

async function createBudgetViaUI(page, { categoryName, amount }) {
  await navigateToTab(page, 'budgets');
  const form = page.locator('.budget-form').first();
  await form.locator('select').first().selectOption({ label: categoryName });
  await form.locator('input[type="number"]').first().fill(String(amount));
  await form.locator('button[type="submit"]').first().click();
  await page.waitForTimeout(1200);
}

test.describe('Stage UI-4/5 Transactions and Budgets Verification', () => {
  let server = null;

  test.beforeAll(async () => {
    if (!fs.existsSync(SCREENSHOT_DIR)) {
      fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
    }
    server = await createServer(PROJECT_ROOT, SERVE_PORT);
  });

  test.afterAll(async () => {
    if (server) {
      server.close();
      server = null;
    }
  });

  test('full verification: create data and verify UI', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto(`http://localhost:${SERVE_PORT}/`);
    await page.waitForTimeout(3000);

    const consoleErrors = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    const pageErrors = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));
    const failedRequests = [];
    page.on('requestfailed', (req) => failedRequests.push(req.url()));

    const today = new Date();
    const currentMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    const currentDay = String(today.getDate()).padStart(2, '0');
    const dateStr = `${currentMonth}-${currentDay}`;

    await createAccountViaUI(page, {
      name: 'Transaction Test Account',
      type: 'bank',
      icon: '🏦',
      color: '#0000FF',
      openingBalance: 5000,
    });

    await createCategoryViaUI(page, {
      name: 'Groceries',
      type: 'expense',
      icon: '🛒',
      color: '#EF4444',
    });

    await createCategoryViaUI(page, {
      name: 'Salary',
      type: 'income',
      icon: '💰',
      color: '#10B981',
    });

    await createTransactionViaUI(page, {
      accountName: 'Transaction Test Account',
      type: 'income',
      categoryName: 'Salary',
      amount: 3000,
      description: 'Monthly salary',
      date: dateStr,
    });

    await createTransactionViaUI(page, {
      accountName: 'Transaction Test Account',
      type: 'expense',
      categoryName: 'Groceries',
      amount: 300,
      description: 'Weekly groceries',
      date: dateStr,
    });

    await createBudgetViaUI(page, {
      categoryName: 'Groceries',
      amount: 500,
    });

    expect(consoleErrors, 'no console errors during setup').toHaveLength(0);
    expect(pageErrors, 'no page errors during setup').toHaveLength(0);
    expect(failedRequests, 'no failed requests during setup').toHaveLength(0);

    await navigateToTab(page, 'transactions');
    await page.waitForTimeout(2000);

    await expect(page.locator('.transactions-list')).toBeVisible();
    await expect(page.locator('.transaction-item-desc:has-text("Monthly salary")')).toHaveCount(1);
    await expect(page.locator('.transaction-item-desc:has-text("Weekly groceries")')).toHaveCount(1);
    await expect(page.locator('.transaction-item-meta').first()).toContainText('Transaction Test Account');
    await expect(page.locator('.transaction-item-amount').first()).toHaveClass(/amount-positive/);

    await navigateToTab(page, 'budgets');
    await page.waitForTimeout(2000);

    await expect(page.locator('.budgets-grid')).toBeVisible();
    await expect(page.locator('.budget-card')).toHaveCount(1);
    await expect(page.locator('.budget-card-name').first()).toContainText('Groceries');

    await page.setViewportSize({ width: 375, height: 667 });
    await navigateToTab(page, 'transactions');
    await page.waitForTimeout(2000);

    const hasOverflowTx = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    expect(hasOverflowTx, 'no horizontal overflow on transactions').toBe(false);

    await navigateToTab(page, 'budgets');
    await page.waitForTimeout(2000);

    const hasOverflowBg = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    expect(hasOverflowBg, 'no horizontal overflow on budgets').toBe(false);

    await page.setViewportSize({ width: 1280, height: 720 });
    await navigateToTab(page, 'dashboard');
    await page.waitForTimeout(2000);

    const dashboardText = await page.locator('.dashboard-view').textContent();
    expect(dashboardText).toContain('Dashboard');

    await page.reload();
    await page.waitForTimeout(3000);

    await navigateToTab(page, 'transactions');
    await page.waitForTimeout(2000);
    await expect(page.locator('.transaction-item-desc:has-text("Monthly salary")')).toHaveCount(1);
    await expect(page.locator('.transaction-item-desc:has-text("Weekly groceries")')).toHaveCount(1);

    await navigateToTab(page, 'budgets');
    await page.waitForTimeout(2000);
    await expect(page.locator('.budget-card')).toHaveCount(1);
  });
});
