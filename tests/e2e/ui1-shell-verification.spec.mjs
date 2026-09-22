/**
 * Stage UI-1 — Mobile shell & overflow verification
 */

import { test, expect } from '@playwright/test';
import http from 'http';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const SERVER_PORT = 3002;

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

test.describe('Stage UI-1 Shell Verification', () => {
  let server = null;

  test.beforeAll(async () => {
    server = await createServer(PROJECT_ROOT, SERVER_PORT);
  });

  test.afterAll(async () => {
    if (server) {
      server.close();
      server = null;
    }
  });

  test('desktop shell: sidebar visible, no horizontal overflow', async ({ page }) => {
    const consoleErrors = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    const pageErrors = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));
    const failedRequests = [];
    page.on('requestfailed', (req) => failedRequests.push(req.url()));

    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto(`http://localhost:${SERVER_PORT}/`);
    await page.waitForTimeout(3000);

    expect(consoleErrors, 'no console errors').toHaveLength(0);
    expect(pageErrors, 'no page errors').toHaveLength(0);
    expect(failedRequests, 'no failed requests').toHaveLength(0);

    const sidebar = page.locator('.sidebar');
    await expect(sidebar).toBeVisible();

    const hasOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    expect(hasOverflow, 'no horizontal overflow').toBe(false);
  });

  test('mobile shell: sidebar hidden behind hamburger', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto(`http://localhost:${SERVER_PORT}/`);
    await page.waitForTimeout(3000);

    const sidebar = page.locator('.sidebar');
    await expect(sidebar).not.toHaveClass(/is-open/);

    const menuBtn = page.locator('.top-bar-menu-btn');
    await expect(menuBtn).toBeVisible();

    await menuBtn.click();
    await page.waitForTimeout(300);

    await expect(sidebar).toHaveClass(/is-open/);

    const overlay = page.locator('.sidebar-overlay');
    await expect(overlay).toHaveClass(/is-open/);

    await overlay.click({ position: { x: 300, y: 300 } });
    await page.waitForTimeout(300);
    await expect(sidebar).not.toHaveClass(/is-open/);
    await expect(overlay).not.toHaveClass(/is-open/);
  });

  test('navigation: all tabs work and update active state', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto(`http://localhost:${SERVER_PORT}/`);
    await page.waitForTimeout(3000);

    const tabs = ['dashboard', 'accounts', 'transactions', 'budgets', 'goals', 'reports', 'settings'];
    for (const tab of tabs) {
      await page.click(`[data-tab="${tab}"]`);
      await page.waitForTimeout(300);
      const active = page.locator(`.sidebar-link[data-tab="${tab}"]`);
      await expect(active).toHaveAttribute('aria-current', 'page');
    }
  });

  test('forms remain usable after shell redesign', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto(`http://localhost:${SERVER_PORT}/`);
    await page.waitForTimeout(3000);

    await page.click('[data-tab="accounts"]');
    await page.waitForTimeout(600);

    const form = page.locator('.account-form').first();
    await expect(form).toBeVisible();

    const nameInput = form.locator('input[type="text"]').first();
    await expect(nameInput).toBeVisible();
    await nameInput.fill('Test Account');
    await expect(nameInput).toHaveValue('Test Account');
  });
});
