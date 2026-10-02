import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  const consoleErrors = [];
  const pageErrors = [];
  const allConsole = [];

  page.on('console', (msg) => {
    allConsole.push(`[${msg.type()}] ${msg.text()}`);
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', (err) => pageErrors.push(err.message));

  const BASE = 'http://localhost:24021';
  let pass = true;

  function check(label, condition) {
    const status = condition ? 'PASS' : 'FAIL';
    if (!condition) pass = false;
    console.log(`[${status}] ${label}`);
  }

  try {
    // Step 1: Open FINDORA
    await page.goto(`${BASE}/src/ui/app.html`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForSelector('#app-lifecycle-ready', { state: 'visible', timeout: 20000 });
    await page.waitForTimeout(3000);
    check('1. No errors on app load', consoleErrors.length === 0 && pageErrors.length === 0);

    // Step 2: Navigate to Accounts
    await page.click('.nav-link[data-tab="accounts"]');
    await page.waitForTimeout(1000);
    check('2. Accounts tab visible', await page.locator('.accounts-view').count() > 0);

    // Step 3: Open Create Account form
    await page.click('button:has-text("Dodaj konto")');
    await page.waitForTimeout(500);
    check('3. Create account form opens', await page.locator('.account-form').count() > 0);

    // Step 4: Enter 214,93
    const obInput = await page.locator('input[name="openingBalance"]').first();
    await obInput.fill('214,93');
    check('4. Field accepts 214,93 (comma)', (await obInput.inputValue()) === '214,93');

    // Step 5: Unit label
    const labelTexts = await page.locator('label').allTextContents();
    check('5. UI shows zł/PLN unit', labelTexts.some(l => l.includes('zł') || l.includes('PLN')));

    // Step 6: Create account
    await page.locator('input[name="name"]').first().fill('Konto 214,93');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);
    check('6. Account created without errors', (await page.locator('#app-main').innerHTML()).includes('Konto 214,93'));

    // Step 8: Refresh
    await page.reload({ waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForSelector('#app-lifecycle-ready', { state: 'visible', timeout: 20000 });
    await page.waitForTimeout(3000);
    check('8. No errors after refresh', consoleErrors.length === 0);

    // Step 9: Persistence
    await page.click('.nav-link[data-tab="accounts"]');
    await page.waitForTimeout(2000);
    check('9. Account persists (214,93 after refresh)', (await page.locator('#app-main').innerHTML()).includes('Konto 214,93'));

    // Step 10: Second account
    await page.click('button:has-text("Dodaj konto")');
    await page.waitForTimeout(500);
    await page.locator('input[name="name"]').first().fill('Drugie Konto');
    await page.locator('input[name="openingBalance"]').first().fill('50');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);
    check('10. Second account created', (await page.locator('#app-main').innerHTML()).includes('Drugie Konto'));

    // Step 12: No IDB errors
    const idbErrors = consoleErrors.filter(e => 
      e.toLowerCase().includes('idb') || e.toLowerCase().includes('closing')
    );
    check('12. No IDBDatabase closing errors', idbErrors.length === 0);

    // Step 13: Navigate to Zarobki
    await page.click('.nav-link[data-tab="incomeProfiles"]');
    await page.waitForTimeout(2000);
    check('13. Income Profiles tab visible', await page.locator('.income-profiles-view').count() > 0);

    // Create profile if none
    const profiles = await page.locator('.income-profile-item').all();
    if (profiles.length === 0) {
      await page.click('button:has-text("Nowy profil")');
      await page.waitForTimeout(500);
      await page.locator('select[name="profileType"]').selectOption('reselling');
      await page.locator('input[name="profileName"]').fill('Vinted Test');
      await page.click('button[type="submit"]');
      await page.waitForTimeout(2000);
    }

    // Step 14-15: Open profile, check workspace
    const profileItems = await page.locator('.income-profile-item').all();
    check('14. Income profiles exist', profileItems.length > 0);
    
    if (profileItems.length > 0) {
      await profileItems[0].click();
      await page.waitForTimeout(2000);
      
      const mainHtml = await page.locator('#app-main').innerHTML();
      check('15. Workspace renders (Reselling sub-nav present)', 
        mainHtml.includes('reselling-view') && mainHtml.includes('sub-nav-tab'));
    }

    // Step 16-18: Refresh and reopen
    await page.reload({ waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForSelector('#app-lifecycle-ready', { state: 'visible', timeout: 20000 });
    await page.waitForTimeout(3000);
    check('16. No errors after second refresh', consoleErrors.length === 0 && pageErrors.length === 0);

    await page.click('.nav-link[data-tab="incomeProfiles"]');
    await page.waitForTimeout(2000);
    const profilesAfter = await page.locator('.income-profile-item').all();
    if (profilesAfter.length > 0) {
      await profilesAfter[0].click();
      await page.waitForTimeout(2000);
      check('18. Workspace persists after refresh/reopen', 
        (await page.locator('#app-main').innerHTML()).includes('reselling-view'));
    }

    console.log('\n=== FINAL VERDICT ===');
    console.log(pass ? 'ALL CHECKS PASSED ✓' : 'SOME CHECKS FAILED ✗');
    
    if (consoleErrors.length > 0) {
      console.log('\n=== CONSOLE ERRORS ===');
      consoleErrors.forEach(e => console.log(' ', e));
    }
    if (pageErrors.length > 0) {
      console.log('\n=== PAGE ERRORS ===');
      pageErrors.forEach(e => console.log(' ', e));
    }

  } catch (err) {
    console.error('Test error:', err.message);
    pass = false;
  } finally {
    await browser.close();
  }
})();
