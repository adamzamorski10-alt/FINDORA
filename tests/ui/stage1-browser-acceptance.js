import { chromium } from 'playwright';

const BASE = 'http://localhost:42409/src/ui/app.html';

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForText(page, selector, text, timeout = 5000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const el = await page.$(selector);
    if (el) {
      const content = await el.textContent();
      if (content && content.includes(text)) return true;
    }
    await sleep(300);
  }
  return false;
}

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  const errors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', (err) => errors.push('pageerror: ' + err.message));

  // 1. Initial load
  console.log('=== Step 1: Initial load ===');
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await sleep(3000);
  console.log('URL:', page.url());
  console.log('Console errors:', errors.length);

  // Check Polish UI
  const hasPolishNav = await waitForText(page, '.sidebar-link[data-tab="accounts"] span', 'Konta', 3000);
  console.log('Polish sidebar visible:', hasPolishNav);

  // 2. Default language
  console.log('\n=== Step 2: Default language ===');
  const dashboardTitle = await page.locator('.top-bar-title').textContent();
  console.log('Dashboard title:', dashboardTitle);

  // 3. Language switching
  console.log('\n=== Step 3: Language switching ===');
  await page.click('[data-tab="settings"]');
  await sleep(1000);

  // Find language selector
  const languageSelect = page.locator('select').filter({ hasText: /Polski|English/i }).first();
  const selectorExists = await languageSelect.count() > 0;
  console.log('Language selector found:', selectorExists);

  if (!selectorExists) {
    console.log('FAIL: Cannot proceed without language selector');
    await browser.close();
    return;
  }

  // Switch to English and save
  await languageSelect.selectOption('en');
  await sleep(500);
  const saveBtn = page.locator('button[type="submit"]').filter({ hasText: /Save|Zapisz/i }).first();
  if (await saveBtn.count() > 0) {
    await saveBtn.click();
    await sleep(3000);
  }
  
  // Verify English
  const hasEnglishNav = await waitForText(page, '.sidebar-link[data-tab="accounts"] span', 'Accounts', 3000);
  console.log('English sidebar visible after switch:', hasEnglishNav);

  // Switch back to Polish and save
  await page.click('[data-tab="settings"]');
  await sleep(1000);
  await languageSelect.selectOption('pl');
  await sleep(500);
  const saveBtn2 = page.locator('button[type="submit"]').filter({ hasText: /Save|Zapisz/i }).first();
  if (await saveBtn2.count() > 0) {
    await saveBtn2.click();
    await sleep(3000);
  }
  
  // Verify Polish
  const hasPolishNav2 = await waitForText(page, '.sidebar-link[data-tab="accounts"] span', 'Konta', 3000);
  console.log('Polish sidebar visible after switch back:', hasPolishNav2);

  // 4. Persistence - English
  console.log('\n=== Step 4: Persistence (English) ===');
  await page.click('[data-tab="settings"]');
  await sleep(1000);
  await languageSelect.selectOption('en');
  await sleep(500);
  const saveBtn3 = page.locator('button[type="submit"]').filter({ hasText: /Save|Zapisz/i }).first();
  if (await saveBtn3.count() > 0) {
    await saveBtn3.click();
    await sleep(3000);
  }
  await page.reload({ waitUntil: 'networkidle' });
  await sleep(3000);
  const englishAfterRefresh = await waitForText(page, '.sidebar-link[data-tab="accounts"] span', 'Accounts', 3000);
  console.log('English persists after refresh:', englishAfterRefresh);

  // Persistence - Polish
  console.log('\n=== Step 5: Persistence (Polish) ===');
  await page.click('[data-tab="settings"]');
  await sleep(1000);
  await languageSelect.selectOption('pl');
  await sleep(500);
  const saveBtn4 = page.locator('button[type="submit"]').filter({ hasText: /Save|Zapisz/i }).first();
  if (await saveBtn4.count() > 0) {
    await saveBtn4.click();
    await sleep(3000);
  }
  await page.reload({ waitUntil: 'networkidle' });
  await sleep(3000);
  const polishAfterRefresh = await waitForText(page, '.sidebar-link[data-tab="accounts"] span', 'Konta', 3000);
  console.log('Polish persists after refresh:', polishAfterRefresh);

  // 6. Coverage
  console.log('\n=== Step 6: Coverage ===');
  const screens = [
    { tab: 'dashboard', pl: 'Dashboard', en: 'Dashboard' },
    { tab: 'accounts', pl: 'Konta', en: 'Accounts' },
    { tab: 'transactions', pl: 'Transakcje', en: 'Transactions' },
    { tab: 'budgets', pl: 'Budżety', en: 'Budgets' },
    { tab: 'goals', pl: 'Cele', en: 'Goals' },
    { tab: 'reports', pl: 'Raporty', en: 'Reports' },
  ];

  for (const screen of screens) {
    await page.click(`[data-tab="${screen.tab}"]`);
    await sleep(800);
    const title = await page.locator('.top-bar-title').textContent();
    console.log(`${screen.tab}: ${title}`);
  }

  // 7. Formatting
  console.log('\n=== Step 7: Formatting ===');
  await page.click('[data-tab="accounts"]');
  await sleep(800);
  const bodyText = await page.textContent('body');
  console.log('Has PLN/zł formatting:', bodyText.includes('zł') || bodyText.includes('PLN'));

  // 8. Mobile
  console.log('\n=== Step 8: Mobile ===');
  await page.setViewportSize({ width: 375, height: 667 });
  await sleep(500);
  
  // Open mobile menu
  const menuBtn = page.locator('.top-bar-menu-btn');
  if (await menuBtn.count() > 0) {
    await menuBtn.click();
    await sleep(500);
  }
  
  await page.click('[data-tab="settings"]');
  await sleep(1000);
  const mobileSelector = await page.locator('select').filter({ hasText: /Polski|English/i }).count();
  console.log('Language selector on mobile:', mobileSelector > 0);
  await page.setViewportSize({ width: 1440, height: 900 });

  // 9. Data safety
  console.log('\n=== Step 9: Data safety ===');
  await page.click('[data-tab="accounts"]');
  await sleep(800);
  const accountNames = await page.locator('.account-list-item-name').allTextContents();
  console.log('Account names preserved:', accountNames);

  // Summary
  console.log('\n=== SUMMARY ===');
  console.log('Console errors:', errors.length);
  if (errors.length > 0) {
    errors.forEach(e => console.log(' -', e));
  } else {
    console.log('No console errors detected.');
  }

  const allPassed = hasPolishNav && hasEnglishNav && hasPolishNav2 && 
                    englishAfterRefresh && polishAfterRefresh &&
                    errors.length === 0;
  
  console.log('\n=== VERDICT ===');
  console.log(allPassed ? 'PASS' : 'REMEDIATION REQUIRED');

  await browser.close();
}

run().catch((err) => {
  console.error('Verification failed:', err);
  process.exit(1);
});
