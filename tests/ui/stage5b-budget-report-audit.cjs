const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve('F:/Projects/finanse');
const DB_NAME = 'finora-budget-report-' + Date.now();

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
      budgetFlow: {},
      reporting: {},
      reload: {},
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
      await page.goto(`http://localhost:9885/src/ui/app.html?db=${encodeURIComponent(DB_NAME)}`, { waitUntil: 'networkidle', timeout: 15000 });
      await page.waitForTimeout(3000);

      // Create account with opening balance
      await waitForView('accounts');
      await fillForm('accounts-view', {
        'Name': 'Main Account',
        'Type': 'bank',
        'Icon (emoji)': 'landmark',
        'Color (hex)': '#4A90D9',
        'Opening Balance (optional)': '1000'
      });
      await submitForm('accounts-view');

      // Create expense category for budget
      await waitForView('settings');
      await fillForm('settings-view', {
        'Name': 'Food',
        'Type': 'expense',
        'Icon': 'shopping-cart',
        'Color (hex)': '#FF6B6B'
      });
      await page.evaluate(() => {
        const main = document.getElementById('app-main');
        const view = main.querySelector('.settings-view');
        const forms = view.querySelectorAll('form');
        const categoryForm = forms[1];
        if (categoryForm) categoryForm.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      });
      await page.waitForTimeout(1000);

      // Verify budget categories exclude system categories
      await waitForView('budgets');
      const budgetCats = await page.evaluate(() => {
        const main = document.getElementById('app-main');
        const view = main.querySelector('.budgets-view');
        const fields = view.querySelectorAll('.form-field');
        const data = {};
        for (const field of fields) {
          const label = field.querySelector('label');
          const select = field.querySelector('select');
          if (label && select) {
            data[label.textContent] = Array.from(select.options).map(o => ({ value: o.value, text: o.textContent }));
          }
        }
        return data;
      });

      results.budgetFlow.availableCategories = budgetCats;

      // Create budget using the expense category
      await fillForm('budgets-view', {
        'Category': 'Food',
        'Amount': '500'
      });
      await submitForm('budgets-view');

      await waitForView('budgets', 500);
      results.budgetFlow.budgetCreated = await page.evaluate(() => {
        const main = document.getElementById('app-main');
        return main ? main.innerText : '';
      });

      // Create expense in that category
      await waitForView('transactions');
      await fillForm('transactions-view', {
        'Account': 'Main Account',
        'Type': 'expense',
        'Amount': '200',
        'Category (optional)': 'Food',
        'Description': 'Food Expense',
        'Date (YYYY-MM-DD)': new Date().toISOString().slice(0, 10)
      });
      await submitForm('transactions-view');

      await waitForView('reports', 1000);
      results.reporting.monthlySummary = await page.evaluate(() => {
        const main = document.getElementById('app-main');
        return main ? main.innerText : '';
      });

      // Reload and verify
      await page.reload({ waitUntil: 'networkidle', timeout: 15000 });
      await page.waitForTimeout(3000);

      await waitForView('budgets', 500);
      results.reload.budgetText = await page.evaluate(() => {
        const main = document.getElementById('app-main');
        return main ? main.innerText : '';
      });

      await waitForView('reports', 1000);
      results.reload.reportText = await page.evaluate(() => {
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
