const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve('F:/Projects/finanse');
const DB_NAME = 'finora-remediation-' + Date.now();

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
      } else if (text.includes('Please select an account')) {
        await dialog.accept();
      } else {
        await dialog.accept();
      }
    });
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

    const results = {
      account: {},
      categories: {},
      transactions: {},
      budget: {},
      goalDeposit: {},
      overTargetDeposit: {},
      reports: {},
      reload: {},
      browserHealth: {},
    };

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

      results.account.created = await page.evaluate(() => {
        const main = document.getElementById('app-main');
        return main ? main.innerHTML.includes('Main Account') : false;
      });

      // Create income category
      await waitForView('settings');
      await fillForm('settings-view', {
        'Name': 'Salary',
        'Type': 'income',
        'Icon': 'briefcase',
        'Color (hex)': '#4A90D9'
      });
      await page.evaluate(() => {
        const main = document.getElementById('app-main');
        const view = main.querySelector('.settings-view');
        const forms = view.querySelectorAll('form');
        const categoryForm = forms[1];
        if (categoryForm) categoryForm.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      });
      await page.waitForTimeout(1000);

      // Create expense category
      await fillForm('settings-view', {
        'Name': 'Groceries',
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

      results.categories.created = await page.evaluate(() => {
        const main = document.getElementById('app-main');
        return main ? main.innerHTML.includes('Salary') && main.innerHTML.includes('Groceries') : false;
      });

      // Create income with income category
      await waitForView('transactions');
      await fillForm('transactions-view', {
        'Account': 'Main Account',
        'Type': 'Income',
        'Amount': '500',
        'Category (optional)': 'Salary',
        'Description': 'Monthly Salary',
        'Date (YYYY-MM-DD)': new Date().toISOString().slice(0, 10)
      });
      await submitForm('transactions-view');

      results.transactions.incomeCreated = await page.evaluate(() => {
        const main = document.getElementById('app-main');
        return main ? main.innerHTML.includes('Monthly Salary') : false;
      });

      // Create expense with expense category
      await fillForm('transactions-view', {
        'Account': 'Main Account',
        'Type': 'Expense',
        'Amount': '200',
        'Category (optional)': 'Groceries',
        'Description': 'Weekly Groceries',
        'Date (YYYY-MM-DD)': new Date().toISOString().slice(0, 10)
      });
      await submitForm('transactions-view');

      results.transactions.expenseCreated = await page.evaluate(() => {
        const main = document.getElementById('app-main');
        return main ? main.innerHTML.includes('Weekly Groceries') : false;
      });

      // Create budget for Groceries
      await waitForView('budgets');
      await fillForm('budgets-view', {
        'Category': 'Groceries',
        'Amount': '300'
      });
      await submitForm('budgets-view');

      results.budget.created = await page.evaluate(() => {
        const main = document.getElementById('app-main');
        if (!main) return false;
        const html = main.innerHTML;
        const has300 = html.includes('300.00');
        const hasGroceries = html.includes('Groceries');
        const hasSpent = html.includes('Spent:');
        return has300 && hasGroceries && hasSpent;
      });

      // Create another expense affecting budget
      await waitForView('transactions');
      await fillForm('transactions-view', {
        'Account': 'Main Account',
        'Type': 'Expense',
        'Amount': '50',
        'Category (optional)': 'Groceries',
        'Description': 'Budget Test',
        'Date (YYYY-MM-DD)': new Date().toISOString().slice(0, 10)
      });
      await submitForm('transactions-view');

      await waitForView('budgets', 500);
      results.budget.progressUpdated = await page.evaluate(() => {
        const main = document.getElementById('app-main');
        return main ? main.innerHTML.includes('Budget Test') : false;
      });

      // Create goal
      await waitForView('goals');
      await fillForm('goals-view', {
        'Name': 'Vacation',
        'Target Amount': '2000',
        'Deadline (YYYY-MM-DD)': '2026-12-31'
      });
      await submitForm('goals-view');

      results.goalDeposit.created = await page.evaluate(() => {
        const main = document.getElementById('app-main');
        return main ? main.innerHTML.includes('Vacation') : false;
      });

      // Deposit to goal
      await page.evaluate(() => {
        const main = document.getElementById('app-main');
        const goalsView = main.querySelector('.goals-view');
        const selects = goalsView.querySelectorAll('select');
        if (selects.length > 0) {
          selects[0].value = selects[0].options[0].value;
          selects[0].dispatchEvent(new Event('change', { bubbles: true }));
        }
      });

      await page.click('.goals-view .btn-secondary');
      await page.waitForTimeout(500);

      await fillForm('goals-view', {
        'Amount': '100',
        'Date (YYYY-MM-DD)': new Date().toISOString().slice(0, 10)
      });
      await page.evaluate(() => {
        const main = document.getElementById('app-main');
        const depositForm = main.querySelector('.deposit-form');
        if (depositForm) {
          const submitBtn = depositForm.querySelector('button');
          if (submitBtn) submitBtn.click();
        }
      });
      await page.waitForTimeout(2000);

      results.goalDeposit.attempted = true;
      results.goalDeposit.textAfterDeposit = await page.evaluate(() => {
        const main = document.getElementById('app-main');
        return main ? main.innerText : '';
      });

      // Over-target deposit
      await page.click('.goals-view .btn-secondary');
      await page.waitForTimeout(500);

      await fillForm('goals-view', {
        'Amount': '5000',
        'Date (YYYY-MM-DD)': new Date().toISOString().slice(0, 10)
      });
      await page.evaluate(() => {
        const main = document.getElementById('app-main');
        const depositForm = main.querySelector('.deposit-form');
        if (depositForm) {
          const submitBtn = depositForm.querySelector('button');
          if (submitBtn) submitBtn.click();
        }
      });
      await page.waitForTimeout(2000);

      results.overTargetDeposit.attempted = true;
      results.overTargetDeposit.textAfterOverTarget = await page.evaluate(() => {
        const main = document.getElementById('app-main');
        return main ? main.innerText : '';
      });

      // Check reports
      await waitForView('reports', 1000);
      results.reports.text = await page.evaluate(() => {
        const main = document.getElementById('app-main');
        return main ? main.innerText : '';
      });

      // Reload and verify
      await page.reload({ waitUntil: 'networkidle', timeout: 15000 });
      await page.waitForTimeout(3000);

      await waitForView('dashboard', 500);
      results.reload.dashboardAfterReload = await page.evaluate(() => {
        const main = document.getElementById('app-main');
        return main ? main.innerText : '';
      });

      await waitForView('settings', 500);
      results.reload.settingsAfterReload = await page.evaluate(() => {
        const main = document.getElementById('app-main');
        return main ? main.innerHTML.includes('Salary') && main.innerHTML.includes('Groceries') : false;
      });

      const tabs = ['dashboard', 'accounts', 'transactions', 'budgets', 'goals', 'reports', 'settings'];
      results.navigation = {};
      for (const tab of tabs) {
        await page.click(`.nav-link[data-tab="${tab}"]`);
        await page.waitForTimeout(300);
        results.navigation[tab] = await page.evaluate(() => {
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
