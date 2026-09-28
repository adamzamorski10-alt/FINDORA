/**
 * Stage 5C — Real browser E2E for backup/restore flow.
 *
 * Uses:
 * - production src/ui/app.html
 * - production src/ui/bootstrap.js
 * - real IndexedDBStorageAdapter
 * - real Chromium
 * - real Settings view
 * - real file download/upload
 *
 * This test verifies the complete flow purely through the UI:
 * no window.__kernel or other test globals are used.
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
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const reqPath = req.url.split('?')[0];
      let filePath = path.join(rootDir, reqPath === '/' ? 'src/ui/app.html' : reqPath);
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
  await page.click(`[data-tab="${tab}"]`);
  await page.waitForTimeout(400);
}

async function createCategoryViaUI(page, { name, type, icon, color }) {
  await navigateToTab(page, 'settings');
  const form = page.locator('.category-form').first();
  await form.locator('input[type="text"]').first().fill(name);
  await form.locator('select').first().selectOption(type);
  await form.locator('input[type="text"]').nth(1).fill(icon);
  await form.locator('input[type="text"]').nth(2).fill(color);
  await form.locator('button[type="submit"]').first().click();
  await page.waitForTimeout(500);
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
  await page.waitForTimeout(500);
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
  await page.waitForTimeout(500);
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
  await page.waitForTimeout(500);
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
  await page.waitForTimeout(500);
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
  await page.waitForTimeout(500);
}

async function archiveAccountViaUI(page, accountName) {
  await navigateToTab(page, 'accounts');
  const accountItem = page.locator(`.account-list-item:has-text("${accountName}")`).first();
  await accountItem.locator('button:has-text("Archive")').click();
  const confirmBtn = page.locator('.modal-backdrop .btn-danger').first();
  if (await confirmBtn.count()) {
    await confirmBtn.click();
  }
  await page.waitForTimeout(500);
}

function getAccountNames(page) {
  return page.locator('.account-list .account-list-item-name').allTextContents();
}

function getGoalNames(page) {
  return page.locator('.goal-list .goal-name').allTextContents();
}

async function getGoalCurrent(page, goalName) {
  const goalItem = page.locator(`.goal-item:has-text("${goalName}")`).first();
  const currentEl = goalItem.locator('.goal-current');
  if (await currentEl.count() === 0) return null;
  return parseFloat(await currentEl.textContent() || '0');
}

async function getBudgetAmount(page) {
  const budgetItem = page.locator('.budget-card').first();
  const amountEl = budgetItem.locator('.budget-card-limit-value');
  if (await amountEl.count() === 0) return null;
  const text = await amountEl.textContent() || '0';
  return parseFloat(text.replace(/[^0-9.-]/g, '') || '0');
}

test.describe.configure({ mode: 'serial' });

test.describe('Stage 5C Backup/Restore Browser E2E', () => {
  let server = null;

  test.beforeAll(async () => {
    server = await createServer(PROJECT_ROOT, PREFERRED_PORT);
  });

  test.afterAll(async () => {
    if (server) {
      server.close();
      server = null;
    }
  });

  test('export → mutate → import → restore through real Settings UI', async ({ page }) => {
    const dbName = 'finora-e2e-test-' + Date.now();
    const url = `http://localhost:${serverPort}/src/ui/app.html?db=${dbName}`;

    await page.goto(url);

    await page.waitForSelector('#app-lifecycle-ready:not([style*="display: none"])', { timeout: 30000 });

    await createCategoryViaUI(page, {
      name: 'Food',
      type: 'expense',
      icon: 'shopping-cart',
      color: '#FF6B6B',
    });

    await createAccountViaUI(page, {
      name: 'Main Account',
      type: 'bank',
      icon: 'landmark',
      color: '#4A90D9',
      openingBalance: 1000,
    });

    await createTransactionViaUI(page, {
      accountName: 'Main Account',
      type: 'income',
      amount: 500,
      categoryName: '',
      description: 'Salary',
      date: '2026-09-01',
    });

    await createTransactionViaUI(page, {
      accountName: 'Main Account',
      type: 'expense',
      amount: 200,
      categoryName: 'Food',
      description: 'Groceries',
      date: '2026-09-05',
    });

    await createGoalViaUI(page, {
      name: 'Vacation',
      target: 2000,
      deadline: '2027-12-31',
    });

    await depositToGoalViaUI(page, 'Vacation', 100, 'Main Account', '2026-09-06');

    await createBudgetViaUI(page, {
      categoryName: 'Food',
      amount: 400,
    });

    await archiveAccountViaUI(page, 'Inne');

    await navigateToTab(page, 'settings');

    const exportBtn = await page.locator('button:has-text("Export Backup")').first();
    expect(await exportBtn.count()).toBeGreaterThan(0);

    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 30000 }),
      exportBtn.click(),
    ]);

    const downloadPath = await download.path();
    const backupContent = await fs.promises.readFile(downloadPath, 'utf8');
    const backupEnvelope = JSON.parse(backupContent);

    expect(backupEnvelope.userId).toBe('dev-user');
    expect(backupEnvelope.backupVersion).toBe('1.0.0');
    expect(backupEnvelope.data.accounts.length).toBeGreaterThan(0);
    expect(backupEnvelope.data.categories.length).toBeGreaterThan(0);
    expect(backupEnvelope.data.transactions.length).toBeGreaterThan(0);
    expect(backupEnvelope.data.budgets.length).toBeGreaterThan(0);
    expect(backupEnvelope.data.goals.length).toBeGreaterThan(0);

    const preRestoreAccountCount = (await getAccountNames(page)).length;

    await createAccountViaUI(page, {
      name: 'Mutated Account',
      type: 'cash',
      icon: 'wallet',
      color: '#FF0000',
    });

    await archiveAccountViaUI(page, 'Mutated Account');

    const postMutationAccountCount = (await getAccountNames(page)).length;
    expect(postMutationAccountCount).toBeGreaterThanOrEqual(preRestoreAccountCount);

    await navigateToTab(page, 'settings');

    const fileInput = await page.locator('input[type="file"]').first();
    expect(await fileInput.count()).toBeGreaterThan(0);
    await fileInput.setInputFiles({
      name: 'finora-backup.json',
      mimeType: 'application/json',
      buffer: Buffer.from(backupContent),
    });

    await page.waitForSelector('.backup-preview:not([style*="display: none"])', { timeout: 10000 });

    await page.locator('button:has-text("Confirm Restore")').first().click();

    await page.waitForTimeout(5000);

    await page.reload({ waitUntil: 'networkidle', timeout: 30000 });

    await page.waitForSelector('#app-lifecycle-ready:not([style*="display: none"])', { timeout: 30000 });

    await navigateToTab(page, 'accounts');
    await page.waitForTimeout(500);

    const activeAccountNames = await getAccountNames(page);
    expect(activeAccountNames).toContain('Main Account');
    expect(activeAccountNames).not.toContain('Mutated Account');

    await navigateToTab(page, 'goals');
    const goalNames = await getGoalNames(page);
    expect(goalNames).toContain('Vacation');

    const vacationCurrent = await getGoalCurrent(page, 'Vacation');
    expect(vacationCurrent).toBe(100);

    await navigateToTab(page, 'budgets');
    const budgetAmount = await getBudgetAmount(page);
    expect(budgetAmount).toBe(400);
  });
});
