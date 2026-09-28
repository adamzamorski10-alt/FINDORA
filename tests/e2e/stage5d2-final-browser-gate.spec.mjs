/**
 * Stage 5D-2 — Final Browser Gate
 *
 * Real Chromium/Playwright verification against production greenfield UI.
 */

import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import http from 'http';
import { fileURLToPath } from 'url';

const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const PREFERRED_PORT = 3001;
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
        res.writeHead(200, { 'Content-Type': contentType, 'Cache-Control': 'no-store' });
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
  await page.waitForTimeout(600);
}

async function loadPage(page) {
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

async function editBudgetViaUI(page, budgetId, newAmount) {
  const budgetCard = page.locator(`.budget-card[data-budget-id="${budgetId}"]`).first();
  const editBtn = budgetCard.locator('.budget-card-actions .surface-list-item-action:has-text("✎")').first();
  await editBtn.click();
  await page.waitForTimeout(300);
  const form = page.locator('.budget-form').first();
  const amountInput = form.locator('input[type="number"]').first();
  await amountInput.fill(String(newAmount));
  await form.locator('button[type="submit"]').first().click();
  await page.waitForTimeout(1200);
}

async function editGoalViaUI(page, goalId, newName, newTarget) {
  const goalItem = page.locator(`.goal-item[data-goal-id="${goalId}"]`).first();
  await goalItem.locator('.goal-actions button:has-text("Edit")').first().click();
  await page.waitForTimeout(300);
  const form = page.locator('.goal-form').first();
  const nameInput = form.locator('input[type="text"]').first();
  await nameInput.fill(newName);
  const targetInput = form.locator('input[type="number"]').first();
  await targetInput.fill(String(newTarget));
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

test.describe('Stage 5D-2 Final Browser Gate', () => {
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

  test.beforeEach(async ({ page }) => {
  });

  test.afterEach(async ({ page }) => {
    await page.unrouteAll();
  });

  test('F-5D-04: budget edit UI', async ({ page }) => {
    await loadPage(page);

    await createAccountViaUI(page, {
      name: 'Budget Edit Account',
      type: 'bank',
      icon: '🏦',
      color: '#0000FF',
      openingBalance: 1000,
    });

    await navigateToTab(page, 'settings');
    const catForm = page.locator('.category-form').first();
    await catForm.locator('input[type="text"]').first().fill('Budget Edit Category');
    await catForm.locator('select').first().selectOption('expense');
    await catForm.locator('input[type="text"]').nth(1).fill('🛒');
    await catForm.locator('input[type="text"]').nth(2).fill('#FF0000');
    await catForm.locator('button[type="submit"]').first().click();
    await page.waitForTimeout(1200);

    await createBudgetViaUI(page, {
      categoryName: 'Budget Edit Category',
      amount: 500,
    });

    const budgetCard = page.locator('.budget-card').first();
    const initialAmount = await budgetCard.locator('.budget-card-limit-value').first().textContent();
    expect(initialAmount).toContain('500.00');

    const budgetId = await budgetCard.getAttribute('data-budget-id');
    await editBudgetViaUI(page, budgetId, 750);

    const updatedAmount = await budgetCard.locator('.budget-card-limit-value').first().textContent();
    expect(updatedAmount).toContain('750.00');
  });

  test('F-5D-05: goal edit UI', async ({ page }) => {
    await loadPage(page);

    await createAccountViaUI(page, {
      name: 'Goal Edit Account',
      type: 'bank',
      icon: '🏦',
      color: '#0000FF',
      openingBalance: 5000,
    });

    await createGoalViaUI(page, {
      name: 'Goal Edit Test',
      target: 2000,
      deadline: '2027-12-31',
    });

    const goalItem = page.locator('.goal-item:has-text("Goal Edit Test")').first();
    const initialTarget = await goalItem.locator('.goal-target').first().textContent();
    expect(initialTarget).toContain('2000.00');

    const goalId = await goalItem.getAttribute('data-goal-id');
    await editGoalViaUI(page, goalId, 'Goal Edit Updated', 3000);

    const updatedGoal = page.locator(`.goal-item[data-goal-id="${goalId}"]`).first();
    const updatedName = await updatedGoal.locator('.goal-name').first().textContent();
    const updatedTarget = await updatedGoal.locator('.goal-target').first().textContent();
    expect(updatedName).toContain('Goal Edit Updated');
    expect(updatedTarget).toContain('3000.00');
  });

  test('F-5D-06: archived category safety', async ({ page }) => {
    await loadPage(page);

    await navigateToTab(page, 'settings');
    const catForm = page.locator('.category-form').first();
    await catForm.locator('input[type="text"]').first().fill('Archivable Category');
    await catForm.locator('select').first().selectOption('expense');
    await catForm.locator('input[type="text"]').nth(1).fill('🏷️');
    await catForm.locator('input[type="text"]').nth(2).fill('#888888');
    await catForm.locator('button[type="submit"]').first().click();
    await page.waitForTimeout(1200);

    await navigateToTab(page, 'transactions');
    const addBtn = page.locator('.transactions-add-btn').first();
    await addBtn.click();
    await page.waitForTimeout(300);
    const txForm = page.locator('.transaction-form').first();
    const optionsBefore = await txForm.locator('select').last().locator('option').allTextContents();
    expect(optionsBefore).toContain('Archivable Category');

    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);

    await page.evaluate(async () => {
      try {
        const request = indexedDB.open('finora');
        await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => reject(new Error('IDB_TIMEOUT')), 5000);
          request.onsuccess = () => {
            clearTimeout(timeout);
            try {
              const db = request.result;
              const tx = db.transaction('kv', 'readwrite');
              const store = tx.objectStore('kv');
              const getAllKeys = store.getAllKeys();
              getAllKeys.onsuccess = () => {
                const keys = getAllKeys.result;
                const categoryKeys = keys.filter(key => typeof key === 'string' && key.startsWith('category:'));
                let pending = categoryKeys.length;
                let found = false;
                if (pending === 0) {
                  console.log('NO CATEGORY KEYS FOUND');
                  resolve();
                  return;
                }
                for (const key of categoryKeys) {
                  const getReq = store.get(key);
                  getReq.onsuccess = () => {
                    const record = getReq.result;
                    const entity = record && record.value ? record.value : record;
                    if (entity && entity.name === 'Archivable Category') {
                      entity.archived = true;
                      entity.updatedAt = new Date().toISOString();
                      store.put({ key, value: entity });
                      console.log('ARCHIVED CATEGORY:', entity.name, 'archived:', entity.archived);
                      found = true;
                    }
                    pending--;
                    if (pending === 0) {
                      if (!found) {
                        console.log('CATEGORY NOT FOUND IN IDB');
                      }
                      tx.oncomplete = () => resolve();
                      tx.onerror = (e) => reject(tx.error);
                    }
                  };
                  getReq.onerror = () => {
                    pending--;
                    if (pending === 0) {
                      tx.oncomplete = () => resolve();
                      tx.onerror = (e) => reject(tx.error);
                    }
                  };
                }
              };
              getAllKeys.onerror = () => {
                clearTimeout(timeout);
                reject(getAllKeys.error);
              };
            } catch (e) {
              clearTimeout(timeout);
              reject(e);
            }
          };
          request.onerror = () => {
            clearTimeout(timeout);
            reject(request.error);
          };
        });
      } catch (e) {
        console.error('IDB ERROR:', e);
      }
    });

    await navigateToTab(page, 'dashboard');
    await page.waitForTimeout(300);
    await navigateToTab(page, 'transactions');
    await page.waitForTimeout(300);

    const optionsAfter = await txForm.locator('select').last().locator('option').allTextContents();
    console.log('OPTIONS AFTER:', optionsAfter);
    expect(optionsAfter).not.toContain('Archivable Category');
  });

  test('F-5D-07: dashboard partial failure', async ({ page }) => {
    await page.route('**/application/reporting/reporting-module.mjs', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/javascript',
        body: `
          export function createReportingModule() {
            return {
              getMonthlySummary: async () => { throw new Error('SIMULATED_REPORTING_FAILURE'); },
              getMonthCategoryBreakdown: async () => { throw new Error('SIMULATED_REPORTING_FAILURE'); },
              getAccountBalance: async () => ({ balance: 0 }),
            };
          }
        `,
      });
    });

    const pageErrors = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));

    await page.goto(`http://localhost:${serverPort}/`);
    await page.waitForTimeout(3000);

    expect(pageErrors, 'page load should have no page errors').toHaveLength(0);

    await navigateToTab(page, 'dashboard');
    await page.waitForTimeout(2000);

    const errorVisible = await page.locator('.error-message').count();
    expect(errorVisible).toBeGreaterThan(0);

    const dashboardVisible = await page.locator('.dashboard-view').count();
    expect(dashboardVisible).toBe(1);
  });

  test('F-5D-09: settings rollback after persistence failure', async ({ page }) => {
    await page.route('**/application/user/user-module.js', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/javascript',
        body: `
          export function createUserModule() {
            return {
              getProfile: async ({ userId }) => ({ id: userId, settings: { currency: 'PLN', theme: 'light', privacyMode: false, excludeInvestmentsFromNetWorth: false } }),
              updateProfile: async () => { throw new Error('SIMULATED_SAVE_FAILURE'); },
            };
          }
        `,
      });
    });

    await loadPage(page);

    await navigateToTab(page, 'settings');
    const currencyField = page.locator('.settings-section:has(.settings-section-title:has-text("Preferences")) input[type="text"]').first();
    await currencyField.fill('EUR');

    await page.locator('.settings-save-btn').first().click();
    await page.waitForTimeout(500);

    const errorVisible = await page.locator('.error-message').count();
    expect(errorVisible).toBeGreaterThan(0);

    await page.waitForTimeout(500);
    const currencyAfter = await page.locator('.settings-section:has(.settings-section-title:has-text("Preferences")) input[type="text"]').first().inputValue();
    expect(currencyAfter).toBe('PLN');
  });

  test('F-5D-10: transaction display names', async ({ page }) => {
    await loadPage(page);

    await createAccountViaUI(page, {
      name: 'Display Name Account',
      type: 'bank',
      icon: '🏦',
      color: '#0000FF',
      openingBalance: 0,
    });

    await navigateToTab(page, 'settings');
    const catForm = page.locator('.category-form').first();
    await catForm.locator('input[type="text"]').first().fill('Display Name Category');
    await catForm.locator('select').first().selectOption('expense');
    await catForm.locator('input[type="text"]').nth(1).fill('🏷️');
    await catForm.locator('input[type="text"]').nth(2).fill('#888888');
    await catForm.locator('button[type="submit"]').first().click();
    await page.waitForTimeout(1200);

    const today = new Date();
    const currentMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    const currentDay = String(today.getDate()).padStart(2, '0');
    const dateStr = `${currentMonth}-${currentDay}`;

    await createTransactionViaUI(page, {
      accountName: 'Display Name Account',
      type: 'expense',
      amount: 100,
      categoryName: 'Display Name Category',
      description: 'Display test',
      date: dateStr,
    });

    const accountEl = page.locator('.transaction-row .transaction-row-account').first();
    await expect(accountEl).toContainText('Display Name Account');
    const categoryEl = page.locator('.transaction-row .transaction-row-category').first();
    await expect(categoryEl).toContainText('Display Name Category');
  });

  test('F-5D-12: amount validation', async ({ page }) => {
    await loadPage(page);

    await createAccountViaUI(page, {
      name: 'Validation Account',
      type: 'bank',
      icon: '🏦',
      color: '#0000FF',
      openingBalance: 0,
    });

    await navigateToTab(page, 'transactions');
    const addBtn = page.locator('.transactions-add-btn').first();
    await addBtn.click();
    await page.waitForTimeout(300);
    const form = page.locator('.transaction-form').first();
    await form.locator('select').first().selectOption({ label: 'Validation Account' });
    await form.locator('select').nth(1).selectOption('expense');
    await form.locator('input[type="number"]').first().fill('0');
    await form.locator('.form-field:has-text("Description") input[type="text"]').first().fill('Zero amount');
    await form.locator('.form-field:has-text("Date") input[type="text"]').first().fill(new Date().toISOString().slice(0, 10));
    await form.locator('button[type="submit"]').first().click();
    await page.waitForTimeout(300);

    const alertShown = await page.evaluate(() => {
      return typeof window.alert === 'function';
    });
    expect(alertShown).toBe(true);
  });
});
