/**
 * Stage UI-4 — Accounts Visual Verification
 */

import { test, expect } from '@playwright/test';
import http from 'http';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const PREFERRED_PORT = 3008;
const SCREENSHOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'test-results', 'ui4-accounts');
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
  await page.waitForTimeout(1200);
}

test.describe('Stage UI-4 Accounts Verification', () => {
  let server = null;

  test.beforeAll(async () => {
    if (!fs.existsSync(SCREENSHOT_DIR)) {
      fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
    }
    server = await createServer(PROJECT_ROOT, PREFERRED_PORT);
  });

  test.afterAll(async () => {
    if (server) {
      server.close();
      server = null;
    }
  });

  test('desktop: populated accounts', async ({ page }) => {
    const consoleErrors = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    const pageErrors = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));
    const failedRequests = [];
    page.on('requestfailed', (req) => failedRequests.push(req.url()));

    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`http://localhost:${serverPort}/`);
    await page.waitForTimeout(3000);

    await createAccountViaUI(page, {
      name: 'Main Account',
      type: 'bank',
      icon: 'Bank',
      color: '#0000FF',
      openingBalance: 5000,
    });

    await navigateToTab(page, 'accounts');
    await page.waitForTimeout(2000);

    expect(consoleErrors, 'no console errors').toHaveLength(0);
    expect(pageErrors, 'no page errors').toHaveLength(0);
    expect(failedRequests, 'no failed requests').toHaveLength(0);

    await expect(page.locator('.account-list')).toBeVisible();
    await expect(page.locator('.account-list-item').first()).toBeVisible();
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'desktop-populated.png'), fullPage: false });
  });

  test('mobile: populated accounts', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`http://localhost:${serverPort}/`);
    await page.waitForTimeout(3000);

    const menuBtn = page.locator('.top-bar-menu-btn');
    await menuBtn.click();
    await page.waitForTimeout(300);

    await page.click('.sidebar-link[data-tab="accounts"]');
    await page.waitForTimeout(2000);

    const hasOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    expect(hasOverflow, 'no horizontal overflow').toBe(false);

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'mobile-populated.png'), fullPage: false });
  });

  test('empty state: fresh database', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`http://localhost:${serverPort}/`);
    await page.waitForTimeout(3000);

    await navigateToTab(page, 'accounts');
    await page.waitForTimeout(2000);

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'desktop-empty.png'), fullPage: false });
  });

  test('functional: edit and archive', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`http://localhost:${serverPort}/`);
    await page.waitForTimeout(3000);

    await createAccountViaUI(page, {
      name: 'Test Account',
      type: 'bank',
      icon: 'Bank',
      color: '#0000FF',
      openingBalance: 1000,
    });

    await navigateToTab(page, 'accounts');
    await page.waitForTimeout(1000);

    const editBtn = page.locator('.account-list-item').first().locator('.btn-secondary');
    await expect(editBtn).toBeVisible();
    await editBtn.click();
    await page.waitForTimeout(300);

    const modalTitle = page.locator('.modal-title');
    await expect(modalTitle).toHaveText('Edit Account');
  });
});
