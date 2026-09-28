import { test, expect } from '@playwright/test';

const SCREENSHOT_DIR = 'F:/Projects/finanse/artifacts/ui-review';

async function navigateToTab(page, tab) {
  const locator = page.locator(`.sidebar-link[data-tab="${tab}"]`);
  await locator.click({ force: true });
  await page.waitForTimeout(1000);
}

async function createAccountViaUI(page, { name, type, icon, color, openingBalance }) {
  await navigateToTab(page, 'accounts');
  const addBtn = page.locator('.accounts-add-btn').first();
  await addBtn.click();
  await page.waitForTimeout(300);

  await page.locator('.account-form input[type="text"]').first().fill(name);
  await page.locator('.account-form select').first().selectOption(type);

  if (icon) {
    const iconBtn = page.locator(`.icon-picker-btn[title="${icon}"]`).first();
    if (await iconBtn.count() > 0) await iconBtn.click();
  }

  if (color) {
    const swatch = page.locator(`.color-swatch[title="${color}"]`).first();
    if (await swatch.count() > 0) await swatch.click();
  }

  if (openingBalance !== undefined && openingBalance !== null) {
    await page.locator('.account-form input[type="number"]').first().fill(String(openingBalance));
  }
  await page.locator('.account-form button[type="submit"]').first().click();
  await page.waitForTimeout(2000);
}

async function createCategoryViaUI(page, { name, type, icon, color }) {
  await navigateToTab(page, 'settings');
  await page.waitForTimeout(1000);
  const catForm = page.locator('.category-form').first();
  await catForm.locator('input[type="text"]').first().fill(name);
  await catForm.locator('select').first().selectOption(type);
  await catForm.locator('input[type="text"]').nth(1).fill(icon);
  await catForm.locator('input[type="text"]').nth(2).fill(color);
  await catForm.locator('button[type="submit"]').first().click();
  await page.waitForTimeout(2000);
}

async function createTransactionViaUI(page, { accountName, type, categoryName, amount, description, date }) {
  await navigateToTab(page, 'transactions');
  const addBtn = page.locator('.transactions-add-btn').first();
  await addBtn.click();
  await page.waitForTimeout(300);
  const form = page.locator('.transaction-form').first();
  await form.locator('select').first().selectOption({ label: accountName });
  await form.locator('select').nth(1).selectOption(type);
  await form.locator('input[type="number"]').first().fill(String(amount));
  if (categoryName) {
    await form.locator('select').last().selectOption({ label: categoryName });
  }
  await form.locator('.form-field:has-text("Description") input[type="text"]').first().fill(description);
  await form.locator('.form-field:has-text("Date") input[type="text"]').first().fill(date);
  await form.locator('button[type="submit"]').first().click();
  await page.waitForTimeout(2000);
}

async function createBudgetViaUI(page, { categoryName, amount }) {
  await navigateToTab(page, 'budgets');
  const addBtn = page.locator('.budgets-add-btn').first();
  await addBtn.click();
  await page.waitForTimeout(300);
  const form = page.locator('.budget-form').first();
  await form.locator('select').first().selectOption({ label: categoryName });
  await form.locator('input[type="number"]').first().fill(String(amount));
  await form.locator('button[type="submit"]').first().click();
  await page.waitForTimeout(2000);
}

async function createGoalViaUI(page, { name, target, deadline }) {
  await navigateToTab(page, 'goals');
  await page.locator('.goals-add-btn').first().click();
  await page.waitForTimeout(300);
  const form = page.locator('.goal-form').first();
  await form.locator('input[type="text"]').first().fill(name);
  await form.locator('input[type="number"]').first().fill(String(target));
  await form.locator('input[type="text"]').nth(1).fill(deadline);
  await form.locator('button[type="submit"]').first().click();
  await page.waitForTimeout(2000);
}

async function depositToGoalViaUI(page, goalName, amount, accountName, date) {
  await navigateToTab(page, 'goals');
  const goalItem = page.locator(`.goal-item:has-text("${goalName}")`).first();
  await goalItem.locator('.goal-actions button:has-text("Deposit")').first().click();
  await page.waitForTimeout(300);
  const depositForm = page.locator('.deposit-form').first();
  await depositForm.locator('select').first().selectOption({ label: accountName });
  await depositForm.locator('input[type="number"]').first().fill(String(amount));
  await depositForm.locator('input[type="text"]').first().fill(date);
  await depositForm.locator('button[type="submit"]').first().click();
  await page.waitForTimeout(2000);
}

test('ui3 dashboard visual review screenshots v3', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('http://localhost:3006/');
  await page.waitForTimeout(4000);

  const today = new Date();
  const currentMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  const currentDay = String(today.getDate()).padStart(2, '0');
  const dateStr = `${currentMonth}-${currentDay}`;

  await createAccountViaUI(page, {
    name: 'Main Account',
    type: 'bank',
    icon: '🏦',
    color: '#0000FF',
    openingBalance: 5000,
  });

  await createAccountViaUI(page, {
    name: 'Savings Account',
    type: 'savings',
    icon: '🐷',
    color: '#10B981',
    openingBalance: 2000,
  });

  await createCategoryViaUI(page, { name: 'Salary', type: 'income', icon: '💰', color: '#10B981' });
  await createCategoryViaUI(page, { name: 'Groceries', type: 'expense', icon: '🛒', color: '#EF4444' });
  await createCategoryViaUI(page, { name: 'Rent', type: 'expense', icon: '🏠', color: '#F59E0B' });

  await createTransactionViaUI(page, {
    accountName: 'Main Account',
    type: 'income',
    categoryName: 'Salary',
    amount: 7000,
    description: 'Monthly salary',
    date: dateStr,
  });

  await createTransactionViaUI(page, {
    accountName: 'Main Account',
    type: 'expense',
    categoryName: 'Groceries',
    amount: 500,
    description: 'Groceries',
    date: dateStr,
  });

  await createTransactionViaUI(page, {
    accountName: 'Main Account',
    type: 'expense',
    categoryName: 'Rent',
    amount: 2000,
    description: 'Rent',
    date: dateStr,
  });

  await createBudgetViaUI(page, { categoryName: 'Groceries', amount: 600 });
  await createGoalViaUI(page, { name: 'Vacation', target: 5000, deadline: '2026-12-31' });
  await depositToGoalViaUI(page, 'Vacation', 1000, 'Main Account', dateStr);

  await navigateToTab(page, 'dashboard');
  await page.waitForTimeout(4000);

  const heroText = await page.locator('.dashboard-hero-value').textContent();
  console.log('HERO TEXT BEFORE DESKTOP SCREENSHOT:', heroText);

  await page.screenshot({ path: `${SCREENSHOT_DIR}/desktop-ui3.png`, fullPage: false });

  await page.setViewportSize({ width: 1024, height: 768 });
  await page.waitForTimeout(2000);
  
  const heroTextTablet = await page.locator('.dashboard-hero-value').textContent();
  console.log('HERO TEXT BEFORE TABLET SCREENSHOT:', heroTextTablet);
  
  await page.screenshot({ path: `${SCREENSHOT_DIR}/tablet-ui3.png`, fullPage: false });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(2000);
  
  const heroTextMobile = await page.locator('.dashboard-hero-value').textContent();
  console.log('HERO TEXT BEFORE MOBILE SCREENSHOT:', heroTextMobile);
  
  await page.screenshot({ path: `${SCREENSHOT_DIR}/mobile-ui3.png`, fullPage: false });
});
