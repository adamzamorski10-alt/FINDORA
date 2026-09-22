const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve('F:/Projects/finanse');

function createServer(dbName) {
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
  return server;
}

async function getTransactionCategoryOptions(page) {
  return await page.evaluate(() => {
    const main = document.getElementById('app-main');
    const view = main.querySelector('.transactions-view');
    if (!view) return 'NO_VIEW';
    const selects = view.querySelectorAll('select');
    // Find the category select (the one with "None" option and category-like options)
    let catSelect = null;
    for (const sel of selects) {
      const opts = Array.from(sel.options).map(o => o.textContent);
      if (opts.includes('None') || opts.includes('Savings')) {
        catSelect = sel;
        break;
      }
    }
    if (!catSelect) return 'NO_SELECT';
    return Array.from(catSelect.options).map(o => ({ value: o.value, text: o.textContent }));
  });
}

async function runTest(dbName) {
  const server = createServer(dbName);
  await new Promise(resolve => server.listen(9885, resolve));
  
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  const consoleErrors = [];
  const pageErrors = [];
  
  page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
  page.on('pageerror', err => pageErrors.push(err.message));
  
  page.on('dialog', async dialog => {
    await dialog.accept();
  });
  
  const results = {
    consoleErrors: [],
    pageErrors: [],
    steps: {},
  };
  
  try {
    await page.goto(`http://localhost:9885/src/ui/app.html?db=${encodeURIComponent(dbName)}`, { waitUntil: 'networkidle', timeout: 15000 });
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
    await page.waitForTimeout(1500);
    
    // Create income category
    await page.click('.nav-link[data-tab="settings"]');
    await page.waitForTimeout(500);
    await page.evaluate(() => {
      const main = document.getElementById('app-main');
      const view = main.querySelector('.settings-view');
      const forms = view.querySelectorAll('form');
      if (forms.length < 2) return;
      const catForm = forms[1];
      const fields = catForm.querySelectorAll('.form-field');
      const data = {};
      for (const field of fields) {
        const label = field.querySelector('label');
        const input = field.querySelector('input, select');
        if (label && input) {
          data[label.textContent] = input;
        }
      }
      if (data['Name']) data['Name'].value = 'Salary';
      if (data['Type']) data['Type'].value = 'income';
      if (data['Icon']) data['Icon'].value = 'briefcase';
      if (data['Color (hex)']) data['Color (hex)'].value = '#4A90D9';
      for (const input of Object.values(data)) {
        if (input && input.tagName) {
          input.dispatchEvent(new Event('input', { bubbles: true }));
          input.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }
      catForm.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });
    await page.waitForTimeout(1000);
    
    // Create expense category
    await page.evaluate(() => {
      const main = document.getElementById('app-main');
      const view = main.querySelector('.settings-view');
      const forms = view.querySelectorAll('form');
      if (forms.length < 2) return;
      const catForm = forms[1];
      const fields = catForm.querySelectorAll('.form-field');
      const data = {};
      for (const field of fields) {
        const label = field.querySelector('label');
        const input = field.querySelector('input, select');
        if (label && input) {
          data[label.textContent] = input;
        }
      }
      if (data['Name']) data['Name'].value = 'Groceries';
      if (data['Type']) data['Type'].value = 'expense';
      if (data['Icon']) data['Icon'].value = 'shopping-cart';
      if (data['Color (hex)']) data['Color (hex)'].value = '#FF6B6B';
      for (const input of Object.values(data)) {
        if (input && input.tagName) {
          input.dispatchEvent(new Event('input', { bubbles: true }));
          input.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }
      catForm.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });
    await page.waitForTimeout(1000);
    
    // Navigate to transactions - form starts as expense by default
    await page.click('.nav-link[data-tab="transactions"]');
    await page.waitForTimeout(1000);
    
    // A. Initial form (expense) has expense categories but not income categories
    const initialExpenseOptions = await getTransactionCategoryOptions(page);
    results.steps.initialExpenseOptions = initialExpenseOptions;
    
    // Switch to income
    await page.evaluate(() => {
      const main = document.getElementById('app-main');
      const view = main.querySelector('.transactions-view');
      const selects = view.querySelectorAll('select');
      for (const sel of selects) {
        const opts = Array.from(sel.options).map(o => o.value);
        if (opts.includes('income')) {
          sel.value = 'income';
          sel.dispatchEvent(new Event('change', { bubbles: true }));
          break;
        }
      }
    });
    await page.waitForTimeout(500);
    
    // B. Income form has income categories but not expense categories
    const initialIncomeOptions = await getTransactionCategoryOptions(page);
    results.steps.initialIncomeOptions = initialIncomeOptions;
    
    // C. Changing income -> expense refreshes the select
    const beforeSwitchToExpense = await getTransactionCategoryOptions(page);
    await page.evaluate(() => {
      const main = document.getElementById('app-main');
      const view = main.querySelector('.transactions-view');
      const selects = view.querySelectorAll('select');
      for (const sel of selects) {
        const opts = Array.from(sel.options).map(o => o.value);
        if (opts.includes('expense')) {
          sel.value = 'expense';
          sel.dispatchEvent(new Event('change', { bubbles: true }));
          break;
        }
      }
    });
    await page.waitForTimeout(500);
    const afterSwitchToExpense = await getTransactionCategoryOptions(page);
    results.steps.afterSwitchToExpense = afterSwitchToExpense;
    
    // D. Changing expense -> income refreshes the select
    await page.evaluate(() => {
      const main = document.getElementById('app-main');
      const view = main.querySelector('.transactions-view');
      const selects = view.querySelectorAll('select');
      for (const sel of selects) {
        const opts = Array.from(sel.options).map(o => o.value);
        if (opts.includes('income')) {
          sel.value = 'income';
          sel.dispatchEvent(new Event('change', { bubbles: true }));
          break;
        }
      }
    });
    await page.waitForTimeout(500);
    const afterSwitchToIncome = await getTransactionCategoryOptions(page);
    results.steps.afterSwitchToIncome = afterSwitchToIncome;
    
    // E. Invalid previously selected category is cleared after type change
    // First, set to expense and select Groceries
    await page.evaluate(() => {
      const main = document.getElementById('app-main');
      const view = main.querySelector('.transactions-view');
      const selects = view.querySelectorAll('select');
      for (const sel of selects) {
        const opts = Array.from(sel.options).map(o => o.value);
        if (opts.includes('expense')) {
          sel.value = 'expense';
          sel.dispatchEvent(new Event('change', { bubbles: true }));
          break;
        }
      }
    });
    await page.waitForTimeout(500);
    
    await page.evaluate(() => {
      const main = document.getElementById('app-main');
      const view = main.querySelector('.transactions-view');
      const selects = view.querySelectorAll('select');
      for (const sel of selects) {
        const opts = Array.from(sel.options).map(o => o.textContent);
        if (opts.includes('Groceries')) {
          sel.value = Array.from(sel.options).find(o => o.textContent === 'Groceries').value;
          sel.dispatchEvent(new Event('change', { bubbles: true }));
          break;
        }
      }
    });
    await page.waitForTimeout(300);
    
    // Now switch to income - Groceries should be cleared
    await page.evaluate(() => {
      const main = document.getElementById('app-main');
      const view = main.querySelector('.transactions-view');
      const selects = view.querySelectorAll('select');
      for (const sel of selects) {
        const opts = Array.from(sel.options).map(o => o.value);
        if (opts.includes('income')) {
          sel.value = 'income';
          sel.dispatchEvent(new Event('change', { bubbles: true }));
          break;
        }
      }
    });
    await page.waitForTimeout(500);
    
    const afterInvalidClear = await getTransactionCategoryOptions(page);
    results.steps.afterInvalidClear = afterInvalidClear;
    
    // F. Opening Balance is never offered for normal transactions
    const allOptionsTexts = [];
    for (const opts of [initialIncomeOptions, initialExpenseOptions, afterSwitchToIncome, afterSwitchToExpense]) {
      if (Array.isArray(opts)) {
        for (const opt of opts) {
          allOptionsTexts.push(opt.text);
        }
      }
    }
    results.steps.hasOpeningBalance = allOptionsTexts.includes('Opening Balance');
    
    results.consoleErrors = consoleErrors;
    results.pageErrors = pageErrors;
  } catch (e) {
    results.testError = e.message;
  }
  
  await browser.close();
  server.close();
  
  return results;
}

(async () => {
  const results = await runTest('finora-tx-category-' + Date.now());
  console.log(JSON.stringify(results, null, 2));
})();
