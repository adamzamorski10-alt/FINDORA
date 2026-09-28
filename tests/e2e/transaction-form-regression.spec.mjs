/**
 * Regression test for transaction form account selection bug.
 *
 * Verifies that the transaction form account select has a placeholder
 * and that a valid submission succeeds after selecting an account.
 */

import { test, expect } from '@playwright/test';
import http from 'http';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const PREFERRED_PORT = 3011;
let serverPort = null;

function createServer(rootDir, preferredPort) {
  const uiDir = path.join(rootDir, 'src/ui');
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

test.describe('Transaction Form Regression', () => {
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

  test('account select has placeholder and valid submission succeeds', async ({ page }) => {
    await page.goto(`http://localhost:${serverPort}/`);
    await page.waitForTimeout(3000);

    const consoleErrors = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    // Create an account
    await page.click('[data-tab="accounts"]');
    await page.waitForTimeout(600);
    await page.locator('.accounts-add-btn').first().click();
    await page.waitForTimeout(300);

    await page.locator('.account-form input[type="text"]').first().fill('Regression Account');
    await page.locator('.account-form select').first().selectOption('bank');
    await page.locator('.icon-picker-btn[title="Bank"]').first().click();
    await page.locator('.color-swatch[title="#0000FF"]').first().click();
    await page.locator('.account-form button[type="submit"]').first().click();
    await page.waitForTimeout(1200);

    // Open transaction form
    await page.click('[data-tab="transactions"]');
    await page.waitForTimeout(600);
    await page.locator('.transactions-add-btn').first().click();
    await page.waitForTimeout(300);

    const form = page.locator('.transaction-form').first();
    const accountSelect = form.locator('select').first();

    // Verify placeholder exists
    const placeholderOption = accountSelect.locator('option').first();
    const placeholderText = await placeholderOption.innerText();
    expect(placeholderText).toBe('Select account');

    const placeholderValue = await placeholderOption.getAttribute('value');
    expect(placeholderValue).toBe('');

    // Select the account
    await accountSelect.selectOption({ label: 'Regression Account' });
    await page.waitForTimeout(200);

    // Fill remaining fields
    const today = new Date();
    const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    await form.locator('input[type="number"]').first().fill('150');
    await form.locator('.form-field:has-text("Description") input[type="text"]').first().fill('Regression test tx');
    await form.locator('.form-field:has-text("Date") input[type="text"]').first().fill(dateStr);
    await form.locator('button[type="submit"]').first().click();
    await page.waitForTimeout(1500);

    // Verify transaction was created
    const txDescriptions = await page.locator('.transaction-row-desc').allTextContents();
    expect(txDescriptions).toContain('Regression test tx');

    expect(consoleErrors, 'no console errors during transaction creation').toHaveLength(0);
  });
});
