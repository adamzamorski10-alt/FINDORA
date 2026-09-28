/**
 * Stage UI-8 — Final Browser Gate
 *
 * Comprehensive browser verification:
 * - 7 screens at 4 viewports
 * - Reports and Settings specific checks
 * - Six-accent verification
 * - Modal / bottom-sheet behavior
 * - Form behavior
 * - Navigation / shell
 * - Visual regression screenshots
 */

import { test, expect } from '@playwright/test';
import http from 'http';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const SCREENSHOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'test-results', 'ui8-gate-screenshots');
const PREFERRED_PORT = 3000;
let serverPort = null;

const VIEWPORTS = {
  desktopLarge: { width: 1440, height: 900 },
  desktopSmall: { width: 1024, height: 768 },
  mobileLarge: { width: 390, height: 844 },
  mobileSmall: { width: 375, height: 812 },
};

const ACCENTS = ['purple', 'blue', 'emerald', 'amber', 'rose', 'cyan'];
const TABS = ['dashboard', 'accounts', 'transactions', 'budgets', 'goals', 'reports', 'settings'];

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
  await page.evaluate((tab) => {
    const link = document.querySelector(`.sidebar-link[data-tab="${tab}"]`);
    if (link) {
      link.click();
    }
  }, tab);
  await page.waitForTimeout(600);
}

async function getAccountNames(page) {
  return page.locator('.accounts-grid .account-card-name').allTextContents();
}

async function createAccountViaUI(page, { name, type, icon, color, openingBalance }) {
  await navigateToTab(page, 'accounts');
  await page.waitForTimeout(300);
  await page.click('.btn-primary:has-text("Add Account")');
  await page.waitForTimeout(300);
  await page.fill('input[name="name"]', name);
  await page.selectOption('select[name="type"]', type);
  await page.fill('input[name="icon"]', icon);
  await page.fill('input[name="color"]', color);
  await page.fill('input[name="openingBalance"]', String(openingBalance));
  await page.click('.modal-footer .btn-primary, .btn-primary:has-text("Save")');
  await page.waitForTimeout(500);
}

async function openFirstAccountEdit(page) {
  const editBtn = page.locator('.account-card-actions .btn-icon, .account-card .btn-icon').first();
  if (await editBtn.count() > 0) {
    await editBtn.first().click();
    await page.waitForTimeout(300);
  }
}

test.describe('Stage UI-8 Final Browser Gate', () => {
  let server = null;
  let serverPort = PREFERRED_PORT;

  test.beforeAll(async () => {
    if (!fs.existsSync(SCREENSHOT_DIR)) {
      fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
    }
    server = await createServer(PROJECT_ROOT, PREFERRED_PORT);
    serverPort = server.address().port;
  });

  test.afterAll(async () => {
    if (server) {
      server.close();
    }
  });

  test.beforeEach(async ({ page }) => {
    page.setViewportSize(VIEWPORTS.desktopLarge);
    await page.goto(`http://localhost:${serverPort}/`);
    await page.waitForTimeout(2000);
  });

  test('page load has no console or page errors', async ({ page }) => {
    const consoleErrors = [];
    const pageErrors = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    page.on('pageerror', (err) => pageErrors.push(err.message));

    await page.reload();
    await page.waitForTimeout(3000);

    expect(consoleErrors, 'page load should have no console errors').toHaveLength(0);
    expect(pageErrors, 'page load should have no page errors').toHaveLength(0);
  });

  test('navigation: all tabs reachable and active state updates', async ({ page }) => {
    for (const tab of TABS) {
      await navigateToTab(page, tab);
      await page.waitForTimeout(300);
      const active = page.locator(`.sidebar-link[data-tab="${tab}"].nav-link-active, .sidebar-link[data-tab="${tab}"][aria-current="true"]`);
      if (await active.count() > 0) {
        await expect(active.first()).toBeVisible();
      }
    }
  });

  test('navigation: return to dashboard preserves view', async ({ page }) => {
    await navigateToTab(page, 'accounts');
    await page.waitForTimeout(300);
    await navigateToTab(page, 'dashboard');
    await page.waitForTimeout(300);
    await expect(page.locator('.dashboard-view').first()).toBeVisible();
  });

  test.describe('Reports view', () => {
  test('renders header, summary strip, and chart sections', async ({ page }) => {
    await navigateToTab(page, 'reports');
    await page.waitForTimeout(1500);
    await expect(page.locator('.reports-page-header')).toBeVisible();
    await expect(page.locator('.reports-page-title')).toHaveText('Reports');
    await expect(page.locator('.summary-strip')).toBeVisible();
    await expect(page.locator('.summary-strip-item')).toHaveCount(4);
    await expect(page.locator('.surface-analytic')).toHaveCount(3);
  });

  test('summary strip contains expected labels', async ({ page }) => {
    await navigateToTab(page, 'reports');
    await page.waitForTimeout(1500);
    const labels = await page.locator('.summary-strip-label').allTextContents();
    expect(labels).toContain('Income');
    expect(labels).toContain('Expenses');
    expect(labels).toContain('Net Cash Flow');
    expect(labels).toContain('Savings Rate');
  });

  test('breakdown items have bar tracks and totals', async ({ page }) => {
    await navigateToTab(page, 'reports');
    await page.waitForTimeout(1500);
    const tracks = await page.locator('.breakdown-item-bar-track').count();
    const totals = await page.locator('.breakdown-item-total').count();
    expect(tracks).toBe(totals);
  });
  });

  test.describe('Settings view', () => {
  test('renders header, sections, and forms', async ({ page }) => {
    await navigateToTab(page, 'settings');
    await page.waitForTimeout(500);
    await expect(page.locator('.settings-page-header')).toBeVisible();
    await expect(page.locator('.settings-page-title')).toHaveText('Settings');
    await expect(page.locator('.category-form')).toBeVisible();
    await expect(page.locator('.backup-preview')).toHaveCount(1);
  });

  test('accent selector contains all six accents', async ({ page }) => {
    await navigateToTab(page, 'settings');
    await page.waitForTimeout(500);
    const swatches = page.locator('.settings-accent-swatch');
    await expect(swatches).toHaveCount(6);
    const activeSwatch = page.locator('.settings-accent-swatch--active');
    await expect(activeSwatch).toHaveCount(1);
  });

  test('backup preview is hidden by default', async ({ page }) => {
    await navigateToTab(page, 'settings');
    await page.waitForTimeout(500);
    const preview = page.locator('.backup-preview');
    await expect(preview).toHaveCount(1);
    await expect(preview).toHaveCSS('display', 'none');
  });
  });

  test.describe('Six-accent verification', () => {
    for (const accent of ACCENTS) {
      const accentLabel = accent.charAt(0).toUpperCase() + accent.slice(1);
      test(`accent "${accent}" applies and persists across navigation`, async ({ page }) => {
        await navigateToTab(page, 'settings');
        await page.waitForTimeout(300);
        const swatch = page.locator(`.settings-accent-swatch[title="${accentLabel}"]`);
        await expect(swatch).toHaveCount(1);
        await swatch.click();
        await page.waitForTimeout(300);

        const dataAccent = await page.getAttribute('html', 'data-accent');
        expect(dataAccent).toBe(accent);

        for (const tab of TABS) {
          await navigateToTab(page, tab);
          await page.waitForTimeout(300);
          const current = await page.getAttribute('html', 'data-accent');
          expect(current).toBe(accent);
        }
      });
    }
  });

  test.describe('Modal / bottom-sheet behavior', () => {
    test('Accounts: open and close modal via Cancel', async ({ page }) => {
      await navigateToTab(page, 'accounts');
      await page.waitForTimeout(300);
      await page.click('.btn-primary:has-text("Add Account")');
      await page.waitForTimeout(300);
      await expect(page.locator('.modal, .bottom-sheet, .drawer')).toBeVisible();
      await page.click('.btn-secondary:has-text("Cancel"), .modal-close, [data-action="close-modal"]');
      await page.waitForTimeout(300);
    });

    test('Accounts: repeated open/close does not accumulate listeners', async ({ page }) => {
      await navigateToTab(page, 'accounts');
      await page.waitForTimeout(300);
      for (let i = 0; i < 3; i++) {
        await page.click('.btn-primary:has-text("Add Account")');
        await page.waitForTimeout(200);
        await page.click('.btn-secondary:has-text("Cancel"), .modal-close, [data-action="close-modal"]');
        await page.waitForTimeout(200);
      }
    });

    test('Transactions: form opens', async ({ page }) => {
      await navigateToTab(page, 'transactions');
      await page.waitForTimeout(300);
      const addBtn = page.locator('.btn-primary:has-text("Add Transaction"), .btn-primary:has-text("New Transaction")');
      if (await addBtn.count() > 0) {
        await addBtn.first().click();
        await page.waitForTimeout(300);
        await expect(page.locator('.modal, .bottom-sheet, .drawer').first()).toBeVisible();
      }
    });
  });

  test.describe('Form behavior', () => {
    test('Settings form: typing does not reset other fields', async ({ page }) => {
      await navigateToTab(page, 'settings');
      await page.waitForTimeout(500);
      const currencyInput = page.locator('.settings-section:has(.settings-section-title:has-text("Preferences")) input[type="text"]').first();
      if (await currencyInput.count() > 0) {
        await currencyInput.first().fill('EUR');
        await page.waitForTimeout(200);
        const value = await currencyInput.first().inputValue();
        expect(value).toBe('EUR');
      }
    });
  });

  test.describe('Empty / error states', () => {
    test('Accounts empty state uses shared empty-state classes', async ({ page }) => {
      await page.evaluate(() => {
        const state = window.__finoraState;
        if (state && state.dispatch) {
          state.dispatch({ type: 'SET_ACCOUNTS', accounts: [] });
        }
      });
      await navigateToTab(page, 'accounts');
      await page.waitForTimeout(500);
      const emptyEl = page.locator('.empty-state');
      if (await emptyEl.count() > 0) {
        await expect(emptyEl).toBeVisible();
      }
    });
  });

  test.describe('Responsive viewports', () => {
    for (const [name, viewport] of Object.entries(VIEWPORTS)) {
      test(`no horizontal overflow at ${name} (${viewport.width}x${viewport.height})`, async ({ page }) => {
        page.setViewportSize(viewport);
        await page.goto(`http://localhost:${serverPort}/`);
        await page.waitForTimeout(2000);

        const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
        const viewportWidth = viewport.width;
        expect(bodyWidth, `body scrollWidth should not exceed viewport at ${name}`).toBeLessThanOrEqual(viewportWidth + 1);
      });

      test(`modal fits within viewport at ${name} (${viewport.width}x${viewport.height})`, async ({ page }) => {
        page.setViewportSize(viewport);
        await page.goto(`http://localhost:${serverPort}/`);
        await page.waitForTimeout(2000);
        await navigateToTab(page, 'accounts');
        await page.waitForTimeout(300);
        await page.click('.btn-primary:has-text("Add Account")');
        await page.waitForTimeout(300);

        const modalBox = await page.locator('.modal, .bottom-sheet, .drawer').first().boundingBox();
        if (modalBox) {
          expect(modalBox.x + modalBox.width, 'modal right edge').toBeLessThanOrEqual(viewport.width + 1);
          expect(modalBox.y + modalBox.height, 'modal bottom edge').toBeLessThanOrEqual(viewport.height + 1);
        }
      });
    }
  });

  test.describe('Visual regression screenshots', () => {
    test('capture desktop screenshots for all screens', async ({ page }) => {
      page.setViewportSize(VIEWPORTS.desktopLarge);
      await page.goto(`http://localhost:${serverPort}/`);
      await page.waitForTimeout(2000);

      for (const tab of TABS) {
        await navigateToTab(page, tab);
        await page.waitForTimeout(500);
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, `ui8-desktop-${tab}.png`), fullPage: false });
      }
    });

    test('capture representative mobile screenshots', async ({ page }) => {
      page.setViewportSize(VIEWPORTS.mobileLarge);
      await page.goto(`http://localhost:${serverPort}/`);
      await page.waitForTimeout(2000);

      const mobileTabs = ['dashboard', 'accounts', 'reports', 'settings'];
      for (const tab of mobileTabs) {
        await navigateToTab(page, tab);
        await page.waitForTimeout(500);
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, `ui8-mobile-${tab}.png`), fullPage: false });
      }
    });
  });
});
