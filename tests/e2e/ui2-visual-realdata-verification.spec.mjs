/**
 * Stage UI-2 — Dashboard Visual + Real-Data Verification
 *
 * Creates realistic data through the actual UI, then captures screenshots
 * of the populated Dashboard across multiple viewport sizes.
 *
 * Verification ONLY — no production code changes.
 */

import { test, expect } from '@playwright/test';
import http from 'http';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const SERVE_PORT = 3007;
const SCREENSHOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'test-results', 'ui2-visual-verification');

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
  const locator = page.locator(`.sidebar-link[data-tab="${tab}"]`);
  await locator.click({ force: true });
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
  await page.waitForTimeout(600);

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

async function createGoalViaUI(page, { name, target, deadline }) {
  await navigateToTab(page, 'goals');
  const form = page.locator('.goal-form').first();
  await form.locator('input[type="text"]').first().fill(name);
  await form.locator('input[type="number"]').first().fill(String(target));
  await form.locator('input[type="text"]').nth(1).fill(deadline);
  await form.locator('button[type="submit"]').first().click();
  await page.waitForTimeout(1200);
}

async function depositToGoalViaUI(page, goalName, amount, accountName, date) {
  await navigateToTab(page, 'goals');
  const goalItem = page.locator(`.goal-item:has-text("${goalName}")`).first();
  const actions = goalItem.locator('.goal-actions');
  await actions.locator('select').first().selectOption({ label: accountName });
  await actions.locator('button:has-text("Deposit")').first().click();
  const depositForm = actions.locator('.deposit-form');
  await depositForm.locator('input[type="number"]').first().fill(String(amount));
  await depositForm.locator('input[type="text"]').first().fill(date);
  await depositForm.locator('button').first().click();
  await page.waitForTimeout(1200);
}

test.describe('Stage UI-2 Dashboard Visual + Real-Data Verification', () => {
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

  test('full verification: create data and capture screenshots', async ({ page }) => {
    const consoleErrors = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    const pageErrors = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));
    const failedRequests = [];
    page.on('requestfailed', (req) => failedRequests.push(req.url()));

    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto(`http://localhost:${SERVE_PORT}/`);
    await page.waitForTimeout(3000);

    expect(consoleErrors, 'no console errors during load').toHaveLength(0);
    expect(pageErrors, 'no page errors during load').toHaveLength(0);

    const today = new Date();
    const currentMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    const currentDay = String(today.getDate()).padStart(2, '0');
    const dateStr = `${currentMonth}-${currentDay}`;

    await createAccountViaUI(page, {
      name: 'Main Account',
      type: 'bank',
      icon: '🏦',
      color: '#0000FF',
      openingBalance: 5000,
    });

    await createAccountViaUI(page, {
      name: 'Savings Account',
      type: 'savings',
      icon: '🐷',
      color: '#10B981',
      openingBalance: 2000,
    });

    await createCategoryViaUI(page, {
      name: 'Salary',
      type: 'income',
      icon: '💰',
      color: '#10B981',
    });

    await createCategoryViaUI(page, {
      name: 'Groceries',
      type: 'expense',
      icon: '🛒',
      color: '#EF4444',
    });

    await createCategoryViaUI(page, {
      name: 'Rent',
      type: 'expense',
      icon: '🏠',
      color: '#F59E0B',
    });

    await createTransactionViaUI(page, {
      accountName: 'Main Account',
      type: 'income',
      categoryName: 'Salary',
      amount: 7000,
      description: 'Monthly salary',
      date: dateStr,
    });

    await createTransactionViaUI(page, {
      accountName: 'Main Account',
      type: 'expense',
      categoryName: 'Groceries',
      amount: 500,
      description: 'Groceries',
      date: dateStr,
    });

    await createTransactionViaUI(page, {
      accountName: 'Main Account',
      type: 'expense',
      categoryName: 'Rent',
      amount: 2000,
      description: 'Rent',
      date: dateStr,
    });

    await createBudgetViaUI(page, {
      categoryName: 'Groceries',
      amount: 600,
    });

    await createGoalViaUI(page, {
      name: 'Vacation',
      target: 3000,
      deadline: '2026-12-31',
    });

    await depositToGoalViaUI(page, 'Vacation', 500, 'Main Account', dateStr);

    await navigateToTab(page, 'dashboard');
    await page.waitForTimeout(2000);

    const dashboardText = await page.locator('.dashboard-view').textContent();
    expect(dashboardText).toContain('Dashboard');
    expect(dashboardText).toContain('Total Balance');
    expect(dashboardText).toContain('Safe-to-Spend');

    await page.setViewportSize({ width: 1280, height: 720 });
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'desktop-1280x720.png'), fullPage: false });

    await page.setViewportSize({ width: 1440, height: 900 });
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'desktop-1440x900.png'), fullPage: false });

    await page.setViewportSize({ width: 375, height: 667 });
    const hasOverflow375 = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    expect(hasOverflow375, 'no horizontal overflow on mobile 375').toBe(false);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'mobile-375x667.png'), fullPage: false });

    await page.setViewportSize({ width: 390, height: 844 });
    const hasOverflow390 = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    expect(hasOverflow390, 'no horizontal overflow on mobile 390').toBe(false);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'mobile-390x844.png'), fullPage: false });

    await navigateToTab(page, 'accounts');
    await page.waitForTimeout(600);
    const accountsText = await page.locator('.accounts-view').textContent();
    expect(accountsText).toContain('Main Account');
    expect(accountsText).toContain('Savings Account');
  });
});
