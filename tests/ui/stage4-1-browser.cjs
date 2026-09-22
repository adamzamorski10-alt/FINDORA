const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const ROOT = path.resolve('F:/Projects/finanse');

const server = http.createServer((req, res) => {
  const reqPath = new URL(req.url, 'http://localhost:9876').pathname;
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
  server.listen(9876, async () => {
    const browser = await chromium.launch();
    const page = await browser.newPage();
    const errors = [];
    const logs = [];
    const failedRequests = [];
    page.on('console', msg => {
      logs.push({ type: msg.type(), text: msg.text() });
      if (msg.type() === 'error') errors.push(msg.text());
    });
    page.on('pageerror', err => errors.push(err.message));
    page.on('requestfailed', req => {
      if (req.url().includes('.js') || req.url().includes('.mjs')) {
        failedRequests.push(req.url());
      }
    });

    const results = {
      loading: {},
      initialization: {},
      accounts: {},
      navigation: {},
      browserHealth: {},
    };

    try {
      await page.goto('http://localhost:9876/src/ui/app.html', { waitUntil: 'networkidle', timeout: 10000 });
      await page.waitForTimeout(2000);

      results.loading.appHtmlLoaded = true;

      results.initialization.readyDisplay = await page.evaluate(() => {
        const el = document.getElementById('app-lifecycle-ready');
        return el ? getComputedStyle(el).display : 'NOT_FOUND';
      });

      results.initialization.errorDisplay = await page.evaluate(() => {
        const el = document.getElementById('app-lifecycle-error');
        return el ? getComputedStyle(el).display : 'NOT_FOUND';
      });

      results.initialization.noErrorState = results.initialization.errorDisplay === 'none';

      await page.click('.nav-link[data-tab="accounts"]');
      await page.waitForTimeout(500);

      results.accounts.viewVisible = await page.evaluate(() => {
        const main = document.getElementById('app-main');
        return main ? main.innerHTML.includes('Accounts') : false;
      });

      results.accounts.emptyState = await page.evaluate(() => {
        const main = document.getElementById('app-main');
        return main ? main.innerHTML.includes('No accounts yet') : false;
      });

      results.accounts.createFormVisible = await page.evaluate(() => {
        const main = document.getElementById('app-main');
        return main ? main.innerHTML.includes('Create Account') : false;
      });

      const nameInput = page.locator('.form-field').nth(0).locator('input');
      await nameInput.fill('Test Account');

      const typeSelect = page.locator('.form-field').nth(1).locator('select');
      await typeSelect.selectOption('savings');

      const iconInput = page.locator('.form-field').nth(2).locator('input');
      await iconInput.fill('💰');

      const colorInput = page.locator('.form-field').nth(3).locator('input');
      await colorInput.fill('#50C878');

      await page.click('.btn-primary');
      await page.waitForTimeout(500);

      results.accounts.createdAccountVisible = await page.evaluate(() => {
        const main = document.getElementById('app-main');
        return main ? main.innerHTML.includes('Test Account') : false;
      });

      results.navigation.navCount = await page.locator('.nav-link').count();
      results.navigation.navTexts = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('.nav-link')).map(n => n.textContent.trim());
      });

      results.browserHealth.consoleErrors = errors;
      results.browserHealth.failedRequests = failedRequests;
      results.browserHealth.consoleLogCount = logs.length;

      await page.screenshot({ path: 'F:/Projects/finanse/test-results/stage4-1-final-audit.png', fullPage: true });
    } catch (e) {
      results.browserHealth.testError = e.message;
    }

    console.log(JSON.stringify(results, null, 2));

    await browser.close();
    server.close();
  });
})();
