const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve('F:/Projects/finanse');
const DB_NAME = 'finora-empty-db-' + Date.now();

const server = http.createServer((req, res) => {
  const reqPath = new URL(req.url, 'http://localhost:9884').pathname;
  const filePath = path.join(ROOT, reqPath);
  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404); res.end('not found'); return; }
    const ext = path.extname(filePath);
    const type = ext === '.css' ? 'text/css' : (ext === '.js' || ext === '.mjs') ? 'application/javascript' : 'text/html';
    res.writeHead(200, { 'Content-Type': type });
    res.end(data);
  });
});

(async () => {
  server.listen(9884, async () => {
    const browser = await chromium.launch();
    const page = await browser.newPage();
    page.on('dialog', dialog => dialog.accept());

    await page.goto(`http://localhost:9884/src/ui/app.html?db=${encodeURIComponent(DB_NAME)}`, { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(5000);

    const results = {
      emptyDbFirstLaunch: {},
      browserHealth: {},
    };

    // Verify initial ready state with empty database
    results.emptyDbFirstLaunch.initialReady = await page.evaluate(() => {
      const ready = document.getElementById('app-lifecycle-ready');
      const error = document.getElementById('app-lifecycle-error');
      return {
        ready: ready ? getComputedStyle(ready).display : 'NOT_FOUND',
        error: error ? getComputedStyle(error).display : 'NOT_FOUND',
      };
    });

    // Verify dashboard shows empty state
    results.emptyDbFirstLaunch.dashboardEmpty = await page.evaluate(() => {
      const main = document.getElementById('app-main');
      return main ? main.innerHTML.includes('0.00') : false;
    });

    // Navigate through all 7 views and verify they render
    const tabs = ['accounts', 'transactions', 'budgets', 'goals', 'reports', 'settings'];
    results.emptyDbFirstLaunch.views = {};
    for (const tab of tabs) {
      await page.click(`.nav-link[data-tab="${tab}"]`);
      await page.waitForTimeout(300);
      results.emptyDbFirstLaunch.views[tab] = await page.evaluate(() => {
        const main = document.getElementById('app-main');
        return main ? main.innerHTML.length > 0 : false;
      });
    }

    results.browserHealth.consoleErrors = [];
    results.browserHealth.failedRequests = [];
    page.on('console', msg => {
      if (msg.type() === 'error') results.browserHealth.consoleErrors.push(msg.text());
    });
    page.on('requestfailed', req => {
      if (req.url().includes('.js') || req.url().includes('.mjs')) {
        results.browserHealth.failedRequests.push(req.url());
      }
    });

    console.log(JSON.stringify(results, null, 2));

    await browser.close();
    server.close();
  });
})();
