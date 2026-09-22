const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve('F:/Projects/finanse');
const DB_NAME = 'finora-debug-' + Date.now();

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

    page.on('dialog', dialog => dialog.accept());
    const logs = [];
    page.on('console', msg => logs.push(msg.text()));

    async function fillForm(viewClass, values) {
      await page.evaluate(({ viewClass, values }) => {
        const main = document.getElementById('app-main');
        const view = main.querySelector('.' + viewClass);
        const formFields = view.querySelectorAll('.form-field');
        const data = {};
        for (const field of formFields) {
          const label = field.querySelector('label');
          const input = field.querySelector('input, select');
          if (label && input) {
            data[label.textContent] = input;
          }
        }
        for (const [label, value] of Object.entries(values)) {
          const input = data[label];
          if (!input) continue;
          if (input.tagName === 'SELECT') {
            const option = Array.from(input.options).find(o => o.value === value || o.textContent === value);
            if (option) input.value = option.value;
          } else {
            input.value = value;
          }
          input.dispatchEvent(new Event('input', { bubbles: true }));
          input.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }, { viewClass, values });
    }

    try {
      await page.goto(`http://localhost:9885/src/ui/app.html?db=${encodeURIComponent(DB_NAME)}`, { waitUntil: 'networkidle', timeout: 15000 });
      await page.waitForTimeout(3000);

      // Create account
      await page.click('.nav-link[data-tab="accounts"]');
      await page.waitForTimeout(500);
      await fillForm('accounts-view', {
        'Name': 'Main Account',
        'Type': 'bank',
        'Icon (emoji)': 'landmark',
        'Color (hex)': '#4A90D9',
        'Opening Balance (optional)': '1000'
      });
      await page.click('.accounts-view button[type="submit"]');
      await page.waitForTimeout(1500);

      // Create goal
      await page.click('.nav-link[data-tab="goals"]');
      await page.waitForTimeout(500);
      await fillForm('goals-view', {
        'Name': 'Vacation',
        'Target Amount': '2000',
        'Deadline (YYYY-MM-DD)': '2026-12-31'
      });
      await page.click('.goals-view button[type="submit"]');
      await page.waitForTimeout(1500);

      // Click Deposit button
      await page.click('.goals-view .btn-secondary');
      await page.waitForTimeout(500);

      // Check deposit form visibility
      const depositVisible = await page.evaluate(() => {
        const main = document.getElementById('app-main');
        const depositForm = main.querySelector('.deposit-form');
        if (!depositForm) return 'not found';
        return getComputedStyle(depositForm).display;
      });

      console.log('Deposit form display after click:', depositVisible);

      // Select account
      const firstAccountValue = await page.evaluate(() => {
        const main = document.getElementById('app-main');
        const goalActions = main.querySelector('.goal-actions');
        if (!goalActions) return null;
        const select = goalActions.querySelector('select');
        if (!select || select.options.length === 0) return null;
        return select.options[0].value;
      });

      if (firstAccountValue) {
        await page.selectOption('.goal-actions select', firstAccountValue);
      }

      await page.waitForTimeout(500);

      // Check deposit form visibility after select
      const depositVisibleAfterSelect = await page.evaluate(() => {
        const main = document.getElementById('app-main');
        const depositForm = main.querySelector('.deposit-form');
        if (!depositForm) return 'not found';
        return getComputedStyle(depositForm).display;
      });

      console.log('Deposit form display after select:', depositVisibleAfterSelect);

      // Fill deposit form
      await page.evaluate(() => {
        const main = document.getElementById('app-main');
        const depositForm = main.querySelector('.deposit-form');
        if (!depositForm) return;
        const inputs = depositForm.querySelectorAll('input');
        for (const input of inputs) {
          const label = input.closest('.form-field')?.querySelector('label')?.textContent;
          if (label === 'Amount') {
            input.value = '100';
          } else if (label === 'Date (YYYY-MM-DD)') {
            input.value = new Date().toISOString().slice(0, 10);
          }
          input.dispatchEvent(new Event('input', { bubbles: true }));
          input.dispatchEvent(new Event('change', { bubbles: true }));
        }
      });

      // Check deposit form visibility after fill
      const depositVisibleAfterFill = await page.evaluate(() => {
        const main = document.getElementById('app-main');
        const depositForm = main.querySelector('.deposit-form');
        if (!depositForm) return 'not found';
        return getComputedStyle(depositForm).display;
      });

      console.log('Deposit form display after fill:', depositVisibleAfterFill);

      // Try clicking the button with force
      try {
        await page.locator('.deposit-form .btn-primary').click({ force: true });
        console.log('Button clicked with force');
      } catch (e) {
        console.log('Click failed:', e.message);
      }

      await page.waitForTimeout(3000);

      const afterDeposit = await page.evaluate(() => {
        const main = document.getElementById('app-main');
        return {
          goalCurrent: main ? main.querySelector('.goal-current')?.textContent : null,
          depositFormVisible: main ? getComputedStyle(main.querySelector('.deposit-form')).display : 'not found'
        };
      });

      console.log('After deposit:', JSON.stringify(afterDeposit, null, 2));
      console.log('Logs:', logs);
    } catch (e) {
      console.log('Error:', e.message);
    }

    await browser.close();
    server.close();
  });
})();
