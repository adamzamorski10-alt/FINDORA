const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve('F:/Projects/finanse');
const FIXED_DATE = '2024-09-15';
const DB_NAME = 'finora-persistence-test-' + Date.now();

const server = http.createServer((req, res) => {
  const reqPath = new URL(req.url, 'http://localhost:9883').pathname;
  const filePath = path.join(ROOT, reqPath);
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/html' });
      res.end('not found: ' + reqPath);
      return;
    }
    const ext = path.extname(filePath);
    const type = ext === '.css' ? 'text/css' : (ext === '.js' || ext === '.mjs') ? 'application/javascript' : 'text/html';
    res.writeHead(200, { 'Content-Type': type });
    res.end(data);
  });
});

(async () => {
  server.listen(9883, async () => {
    const browser = await chromium.launch();
    const page = await browser.newPage();
    const errors = [];
    const failedRequests = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    page.on('pageerror', err => errors.push(err.message));
    page.on('requestfailed', req => {
      if (req.url().includes('.js') || req.url().includes('.mjs')) {
        failedRequests.push(req.url());
      }
    });
    page.on('dialog', dialog => dialog.accept());

    const results = {
      persistence: {},
      browserHealth: {},
    };

    try {
      await page.goto(`http://localhost:9883/src/ui/app.html?db=${encodeURIComponent(DB_NAME)}`, { waitUntil: 'networkidle', timeout: 15000 });
      await page.waitForTimeout(5000);

      results.persistence.initialLoad = await page.evaluate(() => {
        const ready = document.getElementById('app-lifecycle-ready');
        const error = document.getElementById('app-lifecycle-error');
        return {
          ready: ready ? getComputedStyle(ready).display : 'NOT_FOUND',
          error: error ? getComputedStyle(error).display : 'NOT_FOUND',
        };
      });

      // Create account
      await page.click('.nav-link[data-tab="accounts"]');
      await page.waitForTimeout(500);
      await page.locator('.form-field').nth(0).locator('input').fill('Persistence Test Account');
      await page.locator('.form-field').nth(1).locator('select').selectOption('bank');
      await page.locator('.form-field').nth(2).locator('input').fill('🏦');
      await page.locator('.form-field').nth(3).locator('input').fill('#4A90D9');
      await page.click('.btn-primary');
      await page.waitForTimeout(1000);

      // Create transaction (no category available in UI)
      await page.click('.nav-link[data-tab="transactions"]');
      await page.waitForTimeout(500);
      const accountSelect = page.locator('.form-field').nth(0).locator('select');
      await accountSelect.selectOption({ label: 'Persistence Test Account' });
      await page.locator('.form-field').nth(1).locator('select').selectOption('expense');
      await page.locator('.form-field').nth(2).locator('input').fill('50');
      await page.click('.btn-primary');
      await page.waitForTimeout(1000);

      // Create goal
      await page.click('.nav-link[data-tab="goals"]');
      await page.waitForTimeout(500);
      await page.locator('.form-field').nth(0).locator('input').fill('Persistence Goal');
      await page.locator('.form-field').nth(1).locator('input').fill('1000');
      await page.locator('.form-field').nth(2).locator('input').fill('2025-12-31');
      await page.locator('.form-field').nth(3).locator('input').fill('🎯');
      await page.locator('.form-field').nth(4).locator('input').fill('#FF0000');
      await page.click('.btn-primary');
      await page.waitForTimeout(1000);

      // Change settings
      await page.click('.nav-link[data-tab="settings"]');
      await page.waitForTimeout(500);
      await page.locator('.settings-section:has(.settings-section-title:has-text("Preferences")) input[type="text"]').first().fill('EUR');
      await page.locator('.settings-save-btn').first().click();
      await page.waitForTimeout(500);

      // Reload the page
      await page.reload({ waitUntil: 'networkidle', timeout: 15000 });
      await page.waitForTimeout(5000);

      // Verify accounts persisted
      await page.click('.nav-link[data-tab="accounts"]');
      await page.waitForTimeout(500);
      results.persistence.accountPersisted = await page.evaluate(() => {
        const main = document.getElementById('app-main');
        return main ? main.innerHTML.includes('Persistence Test Account') : false;
      });

      // Verify goal persisted
      await page.click('.nav-link[data-tab="goals"]');
      await page.waitForTimeout(500);
      results.persistence.goalPersisted = await page.evaluate(() => {
        const main = document.getElementById('app-main');
        return main ? main.innerHTML.includes('Persistence Goal') : false;
      });

      // Verify settings persisted by reading input value directly
      await page.click('.nav-link[data-tab="settings"]');
      await page.waitForTimeout(500);
      results.persistence.settingsPersisted = await page.evaluate(() => {
        const input = document.querySelector('.settings-section:has(.settings-section-title:has-text("Preferences")) input[type="text"]');
        return input ? input.value === 'EUR' : false;
      });

      results.browserHealth.consoleErrors = errors;
      results.browserHealth.failedRequests = failedRequests;
    } catch (e) {
      results.browserHealth.testError = e.message;
    }

    console.log(JSON.stringify(results, null, 2));

    await browser.close();
    server.close();
  });
})();
