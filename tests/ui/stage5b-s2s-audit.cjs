const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve('F:/Projects/finanse');
const DB_NAME = 'finora-s2s-audit-' + Date.now();

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

    const results = {
      caseA_NoGoals: {},
      caseB_WithGoal: {},
      caseC_NegativeS2S: {},
      caseD_Reload: {},
    };

    async function waitForView(tab, timeout = 1000) {
      await page.click(`.nav-link[data-tab="${tab}"]`);
      await page.waitForTimeout(timeout);
    }

    async function submitForm(viewClass) {
      await page.click(`.${viewClass} button[type="submit"]`);
      await page.waitForTimeout(1500);
    }

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
      // === CASE A: No goals, positive opening balance ===
      await page.goto(`http://localhost:9885/src/ui/app.html?db=${encodeURIComponent(DB_NAME)}`, { waitUntil: 'networkidle', timeout: 15000 });
      await page.waitForTimeout(3000);

      await waitForView('accounts');
      await fillForm('accounts-view', {
        'Name': 'Main Account',
        'Type': 'bank',
        'Icon (emoji)': 'landmark',
        'Color (hex)': '#4A90D9',
        'Opening Balance (optional)': '1000'
      });
      await submitForm('accounts-view');

      await waitForView('dashboard', 1000);
      results.caseA_NoGoals.dashboardText = await page.evaluate(() => {
        const main = document.getElementById('app-main');
        return main ? main.innerText : '';
      });

      // === CASE B: With active goal, opening balance excluded from Safe-to-Spend ===
      await waitForView('goals');
      await fillForm('goals-view', {
        'Name': 'Vacation',
        'Target Amount': '2000',
        'Deadline (YYYY-MM-DD)': '2026-12-31'
      });
      await submitForm('goals-view');

      await waitForView('dashboard', 1000);
      results.caseB_WithGoal.dashboardText = await page.evaluate(() => {
        const main = document.getElementById('app-main');
        return main ? main.innerText : '';
      });

      // === CASE C: Negative Safe-to-Spend ===
      // Add ordinary income to make safe-to-spend positive first, then expense
      await waitForView('transactions');
      await fillForm('transactions-view', {
        'Account': 'Main Account',
        'Type': 'income',
        'Amount': '500',
        'Category (optional)': '',
        'Description': 'Salary',
        'Date (YYYY-MM-DD)': new Date().toISOString().slice(0, 10)
      });
      await submitForm('transactions-view');

      await fillForm('transactions-view', {
        'Account': 'Main Account',
        'Type': 'expense',
        'Amount': '3000',
        'Category (optional)': '',
        'Description': 'Big Expense',
        'Date (YYYY-MM-DD)': new Date().toISOString().slice(0, 10)
      });
      await submitForm('transactions-view');

      await waitForView('dashboard', 1000);
      results.caseC_NegativeS2S.dashboardText = await page.evaluate(() => {
        const main = document.getElementById('app-main');
        return main ? main.innerText : '';
      });

      // === CASE D: Reload ===
      await page.reload({ waitUntil: 'networkidle', timeout: 15000 });
      await page.waitForTimeout(3000);

      await waitForView('dashboard', 1000);
      results.caseD_Reload.dashboardText = await page.evaluate(() => {
        const main = document.getElementById('app-main');
        return main ? main.innerText : '';
      });
    } catch (e) {
      results.testError = e.message;
    }

    console.log(JSON.stringify(results, null, 2));

    await browser.close();
    server.close();
  });
})();
