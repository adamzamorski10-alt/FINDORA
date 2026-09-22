const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve('F:/Projects/finanse');
const DB_NAME = 'finora-goal-deposit-' + Date.now();

const server = http.createServer((req, res) => {
  const reqPath = new URL(req.url, 'http://localhost:9885').pathname;
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
  server.listen(9885, async () => {
    const browser = await chromium.launch();
    const page = await browser.newPage();
    page.on('dialog', async dialog => {
      const text = dialog.message();
      if (text.includes('Deposit amount')) {
        await dialog.accept('100');
      } else {
        await dialog.accept();
      }
    });
    page.on('console', msg => {
      if (msg.type() === 'error') console.log('CONSOLE ERROR:', msg.text());
    });
    page.on('pageerror', err => console.log('PAGE ERROR:', err.message));

    const results = {
      goalDepositAttempt: {},
      consoleErrors: [],
      pageErrors: [],
    };

    try {
      await page.goto(`http://localhost:9885/src/ui/app.html?db=${encodeURIComponent(DB_NAME)}`, { waitUntil: 'networkidle', timeout: 15000 });
      await page.waitForTimeout(3000);

      // Create account
      await page.click('.nav-link[data-tab="accounts"]');
      await page.waitForTimeout(500);
      await page.evaluate(() => {
        const main = document.getElementById('app-main');
        const view = main.querySelector('.accounts-view');
        const fields = view.querySelectorAll('.form-field');
        const data = {};
        for (const field of fields) {
          const label = field.querySelector('label');
          const input = field.querySelector('input, select');
          if (label && input) {
            data[label.textContent] = input;
          }
        }
        data['Name'].value = 'Main Account';
        data['Type'].value = 'bank';
        data['Icon (emoji)'].value = 'landmark';
        data['Color (hex)'].value = '#4A90D9';
        data['Opening Balance (optional)'].value = '1000';
        for (const input of Object.values(data)) {
          input.dispatchEvent(new Event('input', { bubbles: true }));
          input.dispatchEvent(new Event('change', { bubbles: true }));
        }
      });
      await page.click('.accounts-view button[type="submit"]');
      await page.waitForTimeout(1000);

      // Create goal
      await page.click('.nav-link[data-tab="goals"]');
      await page.waitForTimeout(500);
      await page.evaluate(() => {
        const main = document.getElementById('app-main');
        const view = main.querySelector('.goals-view');
        const fields = view.querySelectorAll('.form-field');
        const data = {};
        for (const field of fields) {
          const label = field.querySelector('label');
          const input = field.querySelector('input, select');
          if (label && input) {
            data[label.textContent] = input;
          }
        }
        data['Name'].value = 'Vacation';
        data['Target Amount'].value = '2000';
        data['Deadline (YYYY-MM-DD)'].value = '2026-12-31';
        for (const input of Object.values(data)) {
          input.dispatchEvent(new Event('input', { bubbles: true }));
          input.dispatchEvent(new Event('change', { bubbles: true }));
        }
      });
      await page.click('.goals-view button[type="submit"]');
      await page.waitForTimeout(1000);

      // Select account and deposit
      await page.evaluate(() => {
        const main = document.getElementById('app-main');
        const goalsView = main.querySelector('.goals-view');
        const selects = goalsView.querySelectorAll('select');
        if (selects.length > 0) {
          selects[0].value = selects[0].options[0].value;
          selects[0].dispatchEvent(new Event('change', { bubbles: true }));
        }
      });

      // Listen for dialog
      let dialogMessage = null;
      page.on('dialog', async dialog => {
        dialogMessage = dialog.message();
        await dialog.accept('100');
      });

      await page.click('.goals-view .goal-actions .btn-secondary');
      await page.waitForTimeout(2000);

      results.goalDepositAttempt.dialogMessage = dialogMessage;
      results.goalDepositAttempt.goalsText = await page.evaluate(() => {
        const main = document.getElementById('app-main');
        return main ? main.innerText : '';
      });

      // Check for error in operations state
      results.goalDepositAttempt.operationsState = await page.evaluate(() => {
        const state = window.__finoraState || {};
        return state.operations || {};
      });
    } catch (e) {
      results.testError = e.message;
    }

    console.log(JSON.stringify(results, null, 2));

    await browser.close();
    server.close();
  });
})();
