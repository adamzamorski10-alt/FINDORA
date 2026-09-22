const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve('F:/Projects/finanse');
const DB_NAME = 'finora-stage5b-' + Date.now();

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
    const consoleErrors = [];
    const pageErrors = [];
    const failedRequests = [];
    page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
    page.on('pageerror', err => pageErrors.push(err.message));
    page.on('requestfailed', req => {
      if (req.url().includes('.js') || req.url().includes('.mjs')) {
        failedRequests.push(req.url());
      }
    });

    const results = {
      initialization: {},
      accounts: {},
      transactions: {},
      dashboard: {},
      budgets: {},
      goals: {},
      reports: {},
      reload: {},
      navigation: {},
      browserHealth: {},
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

      results.initialization.readyDisplay = await page.evaluate(() => {
        const el = document.getElementById('app-lifecycle-ready');
        return el ? getComputedStyle(el).display : 'NOT_FOUND';
      });

      await waitForView('accounts');
      await fillForm('accounts-view', {
        'Name': 'Main Account',
        'Type': 'bank',
        'Icon (emoji)': 'landmark',
        'Color (hex)': '#4A90D9',
        'Opening Balance (optional)': '1000'
      });
      await submitForm('accounts-view');

      results.accounts.created = await page.evaluate(() => {
        const main = document.getElementById('app-main');
        return main ? main.innerHTML.includes('Main Account') : false;
      });

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

      const incomeResult = await page.evaluate(() => {
        const main = document.getElementById('app-main');
        if (!main) return { created: false, error: null };
        const html = main.innerHTML;
        const hasSalary = html.includes('Salary');
        const errorEl = main.querySelector('.error-message');
        return { created: hasSalary, error: errorEl ? errorEl.textContent : null };
      });
      results.transactions.incomeCreated = incomeResult.created;
      results.transactions.incomeError = incomeResult.error;

      await fillForm('transactions-view', {
        'Account': 'Main Account',
        'Type': 'expense',
        'Amount': '200',
        'Category (optional)': '',
        'Description': 'Groceries',
        'Date (YYYY-MM-DD)': new Date().toISOString().slice(0, 10)
      });
      await submitForm('transactions-view');

      const expenseResult = await page.evaluate(() => {
        const main = document.getElementById('app-main');
        if (!main) return { created: false, error: null };
        const html = main.innerHTML;
        const hasGroceries = html.includes('Groceries');
        const errorEl = main.querySelector('.error-message');
        return { created: hasGroceries, error: errorEl ? errorEl.textContent : null };
      });
      results.transactions.expenseCreated = expenseResult.created;
      results.transactions.expenseError = expenseResult.error;

      await waitForView('dashboard', 1000);
      results.dashboard.valuesChanged = await page.evaluate(() => {
        const main = document.getElementById('app-main');
        if (!main) return false;
        const html = main.innerHTML;
        return html.includes('Safe-to-Spend') && html.includes('Accounts:');
      });

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
        if (forms.length >= 2) {
          const categoryForm = forms[1];
          if (categoryForm) categoryForm.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
        }
      });
      await page.waitForTimeout(1000);

      await waitForView('budgets');
      await fillForm('budgets-view', {
        'Category': 'Food',
        'Amount': '300'
      });
      await submitForm('budgets-view');

      const budgetCreated = await page.evaluate(() => {
        const main = document.getElementById('app-main');
        if (!main) return { created: false, error: null };
        const html = main.innerHTML;
        const has300 = html.includes('300.00');
        const errorEl = main.querySelector('.error-message');
        return { created: has300, error: errorEl ? errorEl.textContent : null };
      });
      results.budgets.created = budgetCreated.created;
      results.budgets.error = budgetCreated.error;

      await waitForView('transactions');
      await fillForm('transactions-view', {
        'Account': 'Main Account',
        'Type': 'expense',
        'Category (optional)': 'Groceries',
        'Amount': '50',
        'Description': 'Budget test',
        'Date (YYYY-MM-DD)': new Date().toISOString().slice(0, 10)
      });
      await submitForm('transactions-view');

      await waitForView('budgets', 500);
      results.budgets.progressUpdated = await page.evaluate(() => {
        const main = document.getElementById('app-main');
        return main ? main.innerHTML.includes('Budget test') : false;
      });

      await waitForView('goals');
      await fillForm('goals-view', {
        'Name': 'Vacation',
        'Target Amount': '2000',
        'Deadline (YYYY-MM-DD)': '2026-12-31'
      });
      await submitForm('goals-view');

      results.goals.created = await page.evaluate(() => {
        const main = document.getElementById('app-main');
        return main ? main.innerHTML.includes('Vacation') : false;
      });

      await waitForView('reports', 1000);
      results.reports.visible = await page.evaluate(() => {
        const main = document.getElementById('app-main');
        return main ? main.innerHTML.includes('Monthly Summary') : false;
      });

      await waitForView('dashboard', 500);
      await page.reload({ waitUntil: 'networkidle', timeout: 15000 });
      await page.waitForTimeout(3000);

      results.reload.readyAfterReload = await page.evaluate(() => {
        const ready = document.getElementById('app-lifecycle-ready');
        return ready ? getComputedStyle(ready).display : 'NOT_FOUND';
      });

      results.reload.dashboardPersists = await page.evaluate(() => {
        const main = document.getElementById('app-main');
        return main ? main.innerHTML.includes('Safe-to-Spend') : false;
      });

      const tabs = ['dashboard', 'accounts', 'transactions', 'budgets', 'goals', 'reports', 'settings'];
      results.navigation.allViewsRender = {};
      for (const tab of tabs) {
        await page.click(`.nav-link[data-tab="${tab}"]`);
        await page.waitForTimeout(300);
        results.navigation.allViewsRender[tab] = await page.evaluate(() => {
          const main = document.getElementById('app-main');
          return main ? main.innerHTML.length > 0 : false;
        });
      }

      results.browserHealth.consoleErrors = consoleErrors;
      results.browserHealth.pageErrors = pageErrors;
      results.browserHealth.failedRequests = failedRequests;
    } catch (e) {
      results.browserHealth.testError = e.message;
    }

    console.log(JSON.stringify(results, null, 2));

    await browser.close();
    server.close();
  });
})();
