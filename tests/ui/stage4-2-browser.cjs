const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve('F:/Projects/finanse');

const server = http.createServer((req, res) => {
  const reqPath = new URL(req.url, 'http://localhost:9877').pathname;
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
  server.listen(9877, async () => {
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

    const results = {
      loading: {},
      initialization: {},
      transactions: {},
      browserHealth: {},
    };

    try {
      await page.goto('http://localhost:9877/src/ui/app.html', { waitUntil: 'networkidle', timeout: 10000 });
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

      const accountOptions = await page.locator('.form-field').nth(1).locator('select').all();
      if (accountOptions.length > 0) {
        await page.locator('.form-field').nth(1).locator('select').selectOption({ index: 0 });
      }

      await page.locator('.form-field').nth(0).locator('input').fill('Transaction Account');
      await page.locator('.form-field').nth(2).locator('input').fill('💰');
      await page.locator('.form-field').nth(3).locator('input').fill('#50C878');

      await page.click('.btn-primary');
      await page.waitForTimeout(1000);

      await page.click('.nav-link[data-tab="transactions"]');
      await page.waitForTimeout(500);

      results.transactions.viewVisible = await page.evaluate(() => {
        const main = document.getElementById('app-main');
        return main ? main.innerHTML.includes('Transactions') : false;
      });

      results.transactions.emptyState = await page.evaluate(() => {
        const main = document.getElementById('app-main');
        return main ? main.innerHTML.includes('No transactions yet') : false;
      });

      results.transactions.createFormVisible = await page.evaluate(() => {
        const main = document.getElementById('app-main');
        return main ? main.innerHTML.includes('Create Transaction') : false;
      });

      const formInputs = await page.locator('.transaction-form .form-field').all();
      if (formInputs.length >= 6) {
        await formInputs[0].locator('select').selectOption({ index: 0 });
        await formInputs[1].locator('select').selectOption('income');
        await formInputs[2].locator('input').fill('100');
        await formInputs[3].locator('input').fill('');
        await formInputs[4].locator('input').fill('Test Transaction');
        await formInputs[5].locator('input').fill(new Date().toISOString().slice(0, 10));

        await page.click('.transaction-form .btn-primary');
        await page.waitForTimeout(500);
      }

      results.transactions.createdTransactionVisible = await page.evaluate(() => {
        const main = document.getElementById('app-main');
        return main ? main.innerHTML.includes('Test Transaction') : false;
      });

      results.browserHealth.consoleErrors = errors;
      results.browserHealth.failedRequests = failedRequests;

      await page.screenshot({ path: 'F:/Projects/finanse/test-results/stage4-2-final-audit.png', fullPage: true });
    } catch (e) {
      results.browserHealth.testError = e.message;
    }

    console.log(JSON.stringify(results, null, 2));

    await browser.close();
    server.close();
  });
})();
