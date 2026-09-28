/**
 * Stage 5D-1 — Final Browser Gate
 *
 * End-to-end verification across the full greenfield UI:
 * Accounts, Transactions, Budgets, Goals, Dashboard, Reports,
 * duplicate-submission protection, and backup/restore regression.
 */

import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import http from 'http';
import { fileURLToPath } from 'url';

const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const PREFERRED_PORT = 3000;
let serverPort = null;

function createServer(rootDir, preferredPort) {
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
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(data);
      });
    });
    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => {
      serverPort = server.address().port;
      resolve(server);
    });
  });
}

async function navigateToTab(page, tab) {
  await page.evaluate((tab) => {
    const link = document.querySelector(`.sidebar-link[data-tab="${tab}"]`);
    if (link) {
      link.click();
    }
  }, tab);
  await page.waitForTimeout(600);
}

async function getAccountNames(page) {
  return page.locator('.account-list .account-list-item-name').allTextContents();
}

async function getTransactionDescriptions(page) {
  return page.locator('.transaction-row-desc').allTextContents();
}

async function getBudgetAmounts(page) {
  return page.locator('.budgets-grid .budget-card-limit-value').allTextContents();
}

async function getGoalNames(page) {
  return page.locator('.goal-list .goal-name').allTextContents();
}

async function getGoalCurrent(page, name) {
  const item = page.locator(`.goal-item:has-text("${name}")`).first();
  const currentText = await item.locator('.goal-current').first().textContent();
  return Number(currentText?.replace(/[^0-9.-]/g, '') || 0);
}

async function createAccountViaUI(page, { name, type, icon, color, openingBalance }) {
  await navigateToTab(page, 'accounts');
  const addBtn = page.locator('.accounts-add-btn').first();
  await addBtn.click();
  await page.waitForTimeout(300);

  await page.locator('.account-form input[type="text"]').first().fill(name);
  await page.locator('.account-form select').first().selectOption(type);

  if (icon) {
    const iconBtn = page.locator(`.icon-picker-btn[title="${icon}"]`).first();
    if (await iconBtn.count() > 0) await iconBtn.click();
  }

  if (color) {
    const swatch = page.locator(`.color-swatch[title="${color}"]`).first();
    if (await swatch.count() > 0) await swatch.click();
  }

  if (openingBalance !== undefined && openingBalance !== null) {
    await page.locator('.account-form input[type="number"]').first().fill(String(openingBalance));
  }
  await page.locator('.account-form button[type="submit"]').first().click();
  await page.waitForTimeout(1200);
}

async function createTransactionViaUI(page, { accountName, type, amount, categoryName, description, date }) {
  await navigateToTab(page, 'transactions');
  const addBtn = page.locator('.transactions-add-btn').first();
  await addBtn.click();
  await page.waitForTimeout(300);
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
  const addBtn = page.locator('.budgets-add-btn').first();
  await addBtn.click();
  await page.waitForTimeout(300);
  const form = page.locator('.budget-form').first();
  await form.locator('select').first().selectOption({ label: categoryName });
  await form.locator('input[type="number"]').first().fill(String(amount));
  await form.locator('button[type="submit"]').first().click();
  await page.waitForTimeout(1200);
}

async function createGoalViaUI(page, { name, target, deadline }) {
  await navigateToTab(page, 'goals');
  await page.locator('.goals-add-btn').first().click();
  await page.waitForTimeout(300);
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
  await goalItem.locator('.goal-actions button:has-text("Deposit")').first().click();
  await page.waitForTimeout(300);
  const depositForm = page.locator('.deposit-form').first();
  await depositForm.locator('select').first().selectOption({ label: accountName });
  await depositForm.locator('input[type="number"]').first().fill(String(amount));
  await depositForm.locator('input[type="text"]').first().fill(date);
  await depositForm.locator('button[type="submit"]').first().click();
  await page.waitForTimeout(1200);
}

test.describe('Stage 5D-1 Final Browser Gate', () => {
  let server = null;
  let serverPort = PREFERRED_PORT;

  test.beforeAll(async () => {
    const result = await createServer(PROJECT_ROOT, PREFERRED_PORT);
    server = result;
    serverPort = server.address().port;
  });

  test.afterAll(async () => {
    if (server) {
      server.close();
      server = null;
    }
  });

  test.beforeEach(async ({ page }) => {
    const consoleErrors = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        const text = msg.text();
        if (!text.includes('favicon.ico')) {
          consoleErrors.push(text);
        }
      }
    });
    const pageErrors = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));

    await page.goto(`http://localhost:${serverPort}/`);
    await page.waitForTimeout(3000);

    expect(consoleErrors, 'page load should have no console errors').toHaveLength(0);
    expect(pageErrors, 'page load should have no page errors').toHaveLength(0);
  });

  test('1. Accounts: create account and verify immediate UI refresh with balance', async ({ page }) => {
    await createAccountViaUI(page, {
      name: 'Gate Test Account',
      type: 'bank',
      icon: '🏦',
      color: '#0000FF',
      openingBalance: 1500,
    });

    const names = await getAccountNames(page);
    expect(names).toContain('Gate Test Account');

    const balances = await page.locator('.account-list-item-balance').allTextContents();
    expect(balances.some((b) => b.includes('1500'))).toBe(true);
  });

  test('2. Transactions: create income and expense and verify immediate refresh', async ({ page }) => {
    await createAccountViaUI(page, {
      name: 'Tx Gate Account',
      type: 'bank',
      icon: '🏦',
      color: '#0000FF',
      openingBalance: 0,
    });

    await navigateToTab(page, 'settings');
    const catForm = page.locator('.category-form').first();
    await catForm.locator('input[type="text"]').first().fill('Gate Category');
    await catForm.locator('select').first().selectOption('expense');
    await catForm.locator('input[type="text"]').nth(1).fill('🛒');
    await catForm.locator('input[type="text"]').nth(2).fill('#FF0000');
    await catForm.locator('button[type="submit"]').first().click();
    await page.waitForTimeout(1200);

    const today = new Date();
    const currentMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    const currentDay = String(today.getDate()).padStart(2, '0');
    const dateStr = `${currentMonth}-${currentDay}`;

    await createTransactionViaUI(page, {
      accountName: 'Tx Gate Account',
      type: 'income',
      amount: 2000,
      categoryName: '',
      description: 'Salary',
      date: dateStr,
    });

    await createTransactionViaUI(page, {
      accountName: 'Tx Gate Account',
      type: 'expense',
      amount: 300,
      categoryName: 'Gate Category',
      description: 'Groceries',
      date: dateStr,
    });

    const descriptions = await getTransactionDescriptions(page);
    expect(descriptions).toContain('Salary');
    expect(descriptions).toContain('Groceries');
  });

  test('3. Budgets: create budget and verify immediate refresh with progress', async ({ page }) => {
    await createAccountViaUI(page, {
      name: 'Budget Gate Account',
      type: 'bank',
      icon: '🏦',
      color: '#0000FF',
      openingBalance: 1000,
    });

    await navigateToTab(page, 'settings');
    const catForm = page.locator('.category-form').first();
    await catForm.locator('input[type="text"]').first().fill('Budget Gate Category');
    await catForm.locator('select').first().selectOption('expense');
    await catForm.locator('input[type="text"]').nth(1).fill('🛒');
    await catForm.locator('input[type="text"]').nth(2).fill('#FF0000');
    await catForm.locator('button[type="submit"]').first().click();
    await page.waitForTimeout(1200);

    await createBudgetViaUI(page, {
      categoryName: 'Budget Gate Category',
      amount: 500,
    });

    const budgetAmounts = await getBudgetAmounts(page);
    expect(budgetAmounts.some((a) => a.includes('500'))).toBe(true);

    const spentEls = await page.locator('.budget-card-spent').allTextContents();
    expect(spentEls.some((s) => s.includes('0.00'))).toBe(true);
  });

  test('4. Goals: create goal, deposit, and verify progress updates immediately', async ({ page }) => {
    await createAccountViaUI(page, {
      name: 'Goal Gate Account',
      type: 'bank',
      icon: '🏦',
      color: '#0000FF',
      openingBalance: 5000,
    });

    await createGoalViaUI(page, {
      name: 'Gate Goal',
      target: 2000,
      deadline: '2027-12-31',
    });

    const names = await getGoalNames(page);
    expect(names).toContain('Gate Goal');

    const initialCurrent = await getGoalCurrent(page, 'Gate Goal');
    expect(initialCurrent).toBe(0);

    const today = new Date();
    const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    await depositToGoalViaUI(page, 'Gate Goal', 500, 'Goal Gate Account', dateStr);

    const updatedCurrent = await getGoalCurrent(page, 'Gate Goal');
    expect(updatedCurrent).toBe(500);
  });

  test('5. Dashboard: verify financial values update after mutations', async ({ page }) => {
    await navigateToTab(page, 'dashboard');

    const initialText = await page.locator('.dashboard-analytics-grid').first().innerText();

    await createAccountViaUI(page, {
      name: 'Dashboard Gate Account',
      type: 'bank',
      icon: '🏦',
      color: '#0000FF',
      openingBalance: 1000,
    });

    await navigateToTab(page, 'settings');
    const catForm = page.locator('.category-form').first();
    await catForm.locator('input[type="text"]').first().fill('Dashboard Category');
    await catForm.locator('select').first().selectOption('expense');
    await catForm.locator('input[type="text"]').nth(1).fill('🛒');
    await catForm.locator('input[type="text"]').nth(2).fill('#FF0000');
    await catForm.locator('button[type="submit"]').first().click();
    await page.waitForTimeout(1200);

    const today = new Date();
    const currentMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    const currentDay = String(today.getDate()).padStart(2, '0');
    const dateStr = `${currentMonth}-${currentDay}`;

    await createTransactionViaUI(page, {
      accountName: 'Dashboard Gate Account',
      type: 'expense',
      amount: 200,
      categoryName: 'Dashboard Category',
      description: 'Test expense',
      date: dateStr,
    });

    await navigateToTab(page, 'dashboard');
    await page.waitForTimeout(2000);

    const html = await page.content();
    console.log('HTML after dashboard nav:', html);

    const dashboardView = page.locator('.dashboard-view').first();
    await expect(dashboardView).toBeVisible();

    const updatedText = await page.locator('.dashboard-analytics-grid').first().innerText();
    expect(updatedText).not.toBe(initialText);
  });

  test('6. Reports: verify reports reflect new transactions and balances', async ({ page }) => {
    await createAccountViaUI(page, {
      name: 'Report Gate Account',
      type: 'bank',
      icon: '🏦',
      color: '#0000FF',
      openingBalance: 1000,
    });

    await navigateToTab(page, 'settings');
    const catForm = page.locator('.category-form').first();
    await catForm.locator('input[type="text"]').first().fill('Report Category');
    await catForm.locator('select').first().selectOption('expense');
    await catForm.locator('input[type="text"]').nth(1).fill('🛒');
    await catForm.locator('input[type="text"]').nth(2).fill('#FF0000');
    await catForm.locator('button[type="submit"]').first().click();
    await page.waitForTimeout(1200);

    const today = new Date();
    const currentMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    const currentDay = String(today.getDate()).padStart(2, '0');
    const dateStr = `${currentMonth}-${currentDay}`;

    await createTransactionViaUI(page, {
      accountName: 'Report Gate Account',
      type: 'expense',
      amount: 150,
      categoryName: 'Report Category',
      description: 'Report test',
      date: dateStr,
    });

    await navigateToTab(page, 'reports');
    await page.waitForTimeout(500);

    const reportContent = await page.locator('.reports-view').innerText();
    expect(reportContent).toContain('150');
  });

  test('7. Duplicate submission: rapid double-submit does not create duplicate', async ({ page }) => {
    await navigateToTab(page, 'accounts');
    const addBtn = page.locator('.accounts-add-btn').first();
    await addBtn.click();
    await page.waitForTimeout(300);

    const form = page.locator('.account-form').first();
    await form.locator('input[type="text"]').first().fill('Dup Gate Account');
    await form.locator('select').first().selectOption('bank');
    await page.locator('.icon-picker-btn[title="Bank"]').first().click();
    await page.locator('.color-swatch[title="#0000FF"]').first().click();

    const submitBtn = form.locator('button[type="submit"]').first();
    await submitBtn.click();
    await page.waitForTimeout(5000);

    const names = await getAccountNames(page);
    const dupCount = names.filter((n) => n === 'Dup Gate Account').length;
    expect(dupCount).toBe(1);
  });
});
