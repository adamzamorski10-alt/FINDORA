/**
 * Stage UI-2 — Dashboard Visual Verification
 *
 * Captures screenshots of the redesigned Dashboard in Chromium.
 */

import { test, expect } from '@playwright/test';
import http from 'http';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const SERVE_PORT = 3005;
const SCREENSHOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'test-results', 'ui2-screenshots');

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

test.describe('Stage UI-2 Dashboard Visual Verification', () => {
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

  test('dashboard loads without console or page errors', async ({ page }) => {
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

    expect(consoleErrors, 'no console errors').toHaveLength(0);
    expect(pageErrors, 'no page errors').toHaveLength(0);
    expect(failedRequests, 'no failed requests').toHaveLength(0);
  });

  test('desktop dashboard: sections present', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto(`http://localhost:${SERVE_PORT}/`);
    await page.waitForTimeout(3000);

    await expect(page.locator('.dashboard-view')).toBeVisible();
    await expect(page.locator('.dashboard-summary-grid')).toBeVisible();
    await expect(page.locator('.dashboard-middle-grid')).toBeVisible();
    await expect(page.locator('.dashboard-bottom-grid')).toBeVisible();
    await expect(page.locator('.cash-flow-card')).toBeVisible();
    await expect(page.locator('.safe-detail-card')).toBeVisible();
  });

  test('mobile dashboard: no horizontal overflow', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto(`http://localhost:${SERVE_PORT}/`);
    await page.waitForTimeout(3000);

    const hasOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    expect(hasOverflow, 'no horizontal overflow').toBe(false);
  });

  test('capture desktop dashboard screenshot', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto(`http://localhost:${SERVE_PORT}/`);
    await page.waitForTimeout(3000);

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'desktop-dashboard.png'), fullPage: false });
  });

  test('capture mobile dashboard screenshot', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto(`http://localhost:${SERVE_PORT}/`);
    await page.waitForTimeout(3000);

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'mobile-dashboard.png'), fullPage: false });
  });
});
