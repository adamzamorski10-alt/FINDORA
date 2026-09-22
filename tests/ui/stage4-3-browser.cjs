const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve('F:/Projects/finanse');

const server = http.createServer((req, res) => {
  const reqPath = new URL(req.url, 'http://localhost:9878').pathname;
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
  server.listen(9878, async () => {
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
      budgets: {},
      browserHealth: {},
    };

    try {
      await page.goto('http://localhost:9878/src/ui/app.html', { waitUntil: 'networkidle', timeout: 10000 });
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

      await page.click('.nav-link[data-tab="budgets"]');
      await page.waitForTimeout(500);

      results.budgets.viewVisible = await page.evaluate(() => {
        const main = document.getElementById('app-main');
        return main ? main.innerHTML.includes('Budgets') : false;
      });

      results.budgets.emptyState = await page.evaluate(() => {
        const main = document.getElementById('app-main');
        return main ? main.innerHTML.includes('No budgets yet') : false;
      });

      results.budgets.createFormVisible = await page.evaluate(() => {
        const main = document.getElementById('app-main');
        return main ? main.innerHTML.includes('Create Budget') : false;
      });

      results.browserHealth.consoleErrors = errors;
      results.browserHealth.failedRequests = failedRequests;

      await page.screenshot({ path: 'F:/Projects/finanse/test-results/stage4-3-final-audit.png', fullPage: true });
    } catch (e) {
      results.browserHealth.testError = e.message;
    }

    console.log(JSON.stringify(results, null, 2));

    await browser.close();
    server.close();
  });
})();
