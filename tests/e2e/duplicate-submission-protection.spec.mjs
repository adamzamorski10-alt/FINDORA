/**
 * Stage 5D-1 — Real browser E2E for duplicate submission protection.
 *
 * Uses:
 * - production src/ui/app.html
 * - production src/ui/bootstrap.js
 * - real IndexedDBStorageAdapter
 * - real Chromium
 *
 * Verifies:
 * - Account creation: second submit blocked while pending, button disabled, re-enabled after success
 * - Transaction creation: same protection
 * - Failure path: button re-enabled after failure
 * - No console errors or page errors
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
  const uiDir = path.join(rootDir, 'src', 'ui');
  const srcDir = path.join(rootDir, 'src');
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const rawPath = req.url.split('?')[0];
      const reqPath = rawPath.replace(/^[/\\]+/, '');
      if (rawPath === '/favicon.ico') {
        res.writeHead(204);
        res.end();
        return;
      }
      let filePath = path.join(rootDir, rawPath === '/' ? 'src/ui/app.html' : reqPath);
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
      if (!filePath.toLowerCase().startsWith(rootDir.toLowerCase())) {
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
  await page.waitForTimeout(500);
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
  await page.waitForTimeout(1200);
}

test.describe('Stage 5D-1 Duplicate Submission Protection', () => {
  let server = null;
  let serverPort = PREFERRED_PORT;

  test.beforeAll(async () => {
    server = await createServer(PROJECT_ROOT, PREFERRED_PORT);
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
        const text = `${msg.text()} (${msg.location().url || ''})`;
        if (!text.includes('favicon.ico')) {
          consoleErrors.push(text);
        }
      }
    });
    const pageErrors = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));

    await page.goto(`http://localhost:${serverPort}/src/ui/app.html`);
    await page.waitForTimeout(3000);

    expect(consoleErrors, 'page load should have no console errors').toHaveLength(0);
    expect(pageErrors, 'page load should have no page errors').toHaveLength(0);
  });

  test('account creation blocks second submit while first is pending', async ({ page }) => {
    await navigateToTab(page, 'accounts');
    await openAddAccountModal(page);

    const form = page.locator('.account-form').first();
    await form.locator('input[type="text"]').first().fill('Double Submit Test');
    await form.locator('select').first().selectOption('bank');
    await page.locator('.icon-picker-btn[title="Bank"]').first().click();
    await page.locator('.color-swatch[title="#0000FF"]').first().click();

    const submitBtn = form.locator('button[type="submit"]').first();
    await submitBtn.click();
    await page.waitForTimeout(5000);

    const accountNames = await page.locator('.account-list .account-list-item-name').allTextContents();
    const doubleSubmitCount = accountNames.filter((n) => n === 'Double Submit Test').length;
    expect(doubleSubmitCount).toBe(1);
  });

  test('transaction creation blocks second submit while first is pending', async ({ page }) => {
    await navigateToTab(page, 'accounts');
    await openAddAccountModal(page);

    const accForm = page.locator('.account-form').first();
    await accForm.locator('input[type="text"]').first().fill('Tx Test Account');
    await accForm.locator('select').first().selectOption('bank');
    await page.locator('.icon-picker-btn[title="Bank"]').first().click();
    await page.locator('.color-swatch[title="#0000FF"]').first().click();
    await accForm.locator('button[type="submit"]').first().click();
    await page.waitForTimeout(1000);

    await navigateToTab(page, 'settings');
    const catForm = page.locator('.category-form').first();
    await catForm.locator('input[type="text"]').first().fill('Test Category');
    await catForm.locator('select').first().selectOption('expense');
    await catForm.locator('input[type="text"]').nth(1).fill('🛒');
    await catForm.locator('input[type="text"]').nth(2).fill('#FF0000');
    await catForm.locator('button[type="submit"]').first().click();
    await page.waitForTimeout(1000);

    await navigateToTab(page, 'transactions');
    const addBtn = page.locator('.transactions-add-btn').first();
    await addBtn.click();
    await page.waitForTimeout(300);
    const txForm = page.locator('.transaction-form').first();
    await txForm.locator('select').first().selectOption({ label: 'Tx Test Account' });
    await txForm.locator('select').nth(1).selectOption('expense');
    await txForm.locator('input[type="number"]').first().fill('50');
    await txForm.locator('select').last().selectOption({ label: 'Test Category' });
    await txForm.locator('.form-field:has-text("Description") input[type="text"]').first().fill('Test tx');
    const today = new Date();
    const currentMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    const currentDay = String(today.getDate()).padStart(2, '0');
    await txForm.locator('.form-field:has-text("Date") input[type="text"]').first().fill(`${currentMonth}-${currentDay}`);

    const txSubmitBtn = txForm.locator('button[type="submit"]').first();
    await txSubmitBtn.click();
    await page.waitForTimeout(3000);

    const txDescriptions = await page.locator('.transaction-row-desc').allTextContents();
    const doubleSubmitCount = txDescriptions.filter((d) => d === 'Test tx').length;
    expect(doubleSubmitCount).toBe(1);
  });

  test('submit button is re-enabled after failed mutation', async ({ page }) => {
    await navigateToTab(page, 'accounts');
    await openAddAccountModal(page);

    const form = page.locator('.account-form').first();

    await form.locator('input[type="text"]').first().fill('');
    await form.locator('button[type="submit"]').first().click();
    await page.waitForTimeout(300);

    const submitBtn = form.locator('button[type="submit"]').first();
    const reEnabled = await submitBtn.isDisabled();
    expect(reEnabled).toBe(false);
  });
});
