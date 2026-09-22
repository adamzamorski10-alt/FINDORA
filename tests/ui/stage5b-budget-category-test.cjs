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
    
    // Create expense category
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
    
    // Create income category
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
    
    // Navigate to budgets
    await page.click('.nav-link[data-tab="budgets"]');
    await page.waitForTimeout(1000);
    
    // Get budget category options
    const budgetOptions = await page.evaluate(() => {
      const main = document.getElementById('app-main');
      const view = main.querySelector('.budgets-view');
      if (!view) return 'NO_VIEW';
      const selects = view.querySelectorAll('select');
      if (selects.length === 0) return 'NO_SELECT';
      const catSelect = selects[0];
      return Array.from(catSelect.options).map(o => ({ value: o.value, text: o.textContent }));
    });
    results.steps.budgetOptions = budgetOptions;
    
    const optionTexts = Array.isArray(budgetOptions) ? budgetOptions.map(o => o.text) : [];
    
    // A. Ordinary expense category appears
    results.steps.hasGroceries = optionTexts.includes('Groceries');
    
    // B. Income category does not appear
    results.steps.hasSalary = optionTexts.includes('Salary');
    
    // C. Opening Balance does not appear
    results.steps.hasOpeningBalance = optionTexts.includes('Opening Balance');
    
    // D. Savings does not appear
    results.steps.hasSavings = optionTexts.includes('Savings');
    
    // E. Budget creation with a normal expense category still works
    if (Array.isArray(budgetOptions) && budgetOptions.find(o => o.text === 'Groceries')) {
      const groceriesValue = budgetOptions.find(o => o.text === 'Groceries').value;
      await page.evaluate((catId) => {
        const main = document.getElementById('app-main');
        const view = main.querySelector('.budgets-view');
        const fields = view.querySelectorAll('.form-field');
        const data = {};
        for (const field of fields) {
          const label = field.querySelector('label');
          const input = field.querySelector('input, select');
          if (label && input) {
            data[label.textContent] = input;
          }
        }
        if (data['Category']) data['Category'].value = catId;
        if (data['Amount']) data['Amount'].value = '300';
        for (const input of Object.values(data)) {
          input.dispatchEvent(new Event('input', { bubbles: true }));
          input.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }, groceriesValue);
      await page.click('.budgets-view button[type="submit"]');
      await page.waitForTimeout(1500);
      
      // Check for errors
      const budgetError = await page.evaluate(() => {
        const main = document.getElementById('app-main');
        const errorEl = main.querySelector('.error-message');
        return errorEl ? errorEl.textContent : null;
      });
      results.steps.budgetError = budgetError;
      
      results.steps.budgetCreated = await page.evaluate(() => {
        const main = document.getElementById('app-main');
        return main ? main.innerHTML.includes('300.00') && main.innerHTML.includes('Groceries') : false;
      });
      
      // F. Persistence after reload
      await page.reload({ waitUntil: 'networkidle', timeout: 15000 });
      await page.waitForTimeout(3000);
      
      await page.click('.nav-link[data-tab="budgets"]');
      await page.waitForTimeout(500);
      
      results.steps.persistsAfterReload = await page.evaluate(() => {
        const main = document.getElementById('app-main');
        return main ? main.innerHTML.includes('300.00') && main.innerHTML.includes('Groceries') : false;
      });
    }
    
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
  const results = await runTest('finora-budget-category-' + Date.now());
  console.log(JSON.stringify(results, null, 2));
})();
