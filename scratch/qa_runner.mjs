import { chromium } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const ARTIFACT_DIR = 'C:/Users/adamz/.gemini/antigravity-ide/brain/7165b962-1c68-466d-81e8-fc516534e639';
const SCREENSHOT_DIR = path.join(ARTIFACT_DIR, 'qa_screenshots');

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

const ACCENTS = ['purple', 'blue', 'emerald', 'amber', 'rose', 'cyan'];
const DESKTOP_VIEWPORTS = [
  { width: 1920, height: 1080, name: 'desktop_1920x1080' },
  { width: 1440, height: 900, name: 'desktop_1440x900' },
  { width: 1280, height: 720, name: 'desktop_1280x720' },
];
const MOBILE_VIEWPORTS = [
  { width: 390, height: 844, name: 'mobile_390x844' },
  { width: 375, height: 667, name: 'mobile_375x667' },
];

const VIEWS = ['dashboard', 'accounts', 'transactions', 'budgets', 'goals', 'reports', 'settings'];

async function navigateToTab(page, tab) {
  await page.evaluate((t) => {
    const el = document.querySelector(`.sidebar-link[data-tab="${t}"], .nav-link[data-tab="${t}"]`);
    if (el) el.click();
  }, tab);
  await page.waitForTimeout(400);
}

async function runQA() {
  console.log('--- Starting Finora Appearance Physical QA ---');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();

  const consoleErrors = [];
  const pageErrors = [];

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push(`[CONSOLE ERROR] ${msg.text()}`);
    }
  });

  page.on('pageerror', (err) => {
    pageErrors.push(`[PAGE ERROR] ${err.message}`);
  });

  const BASE_URL = 'http://localhost:3000/src/ui/app.html';
  
  console.log('1. Loading app...');
  await page.goto(BASE_URL);
  await page.waitForSelector('.sidebar', { timeout: 10000 });

  const today = new Date();
  const currentMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  const currentDay = String(today.getDate()).padStart(2, '0');
  const dateStr = `${currentMonth}-${currentDay}`;

  // Check if account exists, if not seed data
  await navigateToTab(page, 'accounts');
  const accountCards = await page.locator('.account-card').count();

  if (accountCards === 0) {
    console.log('Seeding demo data...');
    // Account 1
    const form = page.locator('.account-form').first();
    if (await form.count() > 0) {
      await form.locator('input[type="text"]').first().fill('Main Checking');
      await form.locator('select').first().selectOption('bank');
      await form.locator('input[type="number"]').first().fill('8500.00');
      await form.locator('button[type="submit"]').first().click();
      await page.waitForTimeout(600);

      // Account 2
      await form.locator('input[type="text"]').first().fill('Savings Vault');
      await form.locator('select').first().selectOption('savings');
      await form.locator('input[type="number"]').first().fill('24000.00');
      await form.locator('button[type="submit"]').first().click();
      await page.waitForTimeout(600);
    }

    // Category in settings
    await navigateToTab(page, 'settings');
    const catForm = page.locator('.category-form').first();
    if (await catForm.count() > 0) {
      await catForm.locator('input[type="text"]').first().fill('Groceries');
      await catForm.locator('select').first().selectOption('expense');
      await catForm.locator('button[type="submit"]').first().click();
      await page.waitForTimeout(600);
    }

    // Transactions
    await navigateToTab(page, 'transactions');
    const txForm = page.locator('.transaction-form').first();
    if (await txForm.count() > 0) {
      // Income
      await txForm.locator('select').nth(1).selectOption('income');
      await txForm.locator('input[type="number"]').first().fill('6200.00');
      await txForm.locator('.form-field:has-text("Description") input[type="text"]').first().fill('Monthly Salary');
      await txForm.locator('.form-field:has-text("Date") input[type="text"]').first().fill(dateStr);
      await txForm.locator('button[type="submit"]').first().click();
      await page.waitForTimeout(600);

      // Expense
      await txForm.locator('select').nth(1).selectOption('expense');
      await txForm.locator('input[type="number"]').first().fill('450.00');
      await txForm.locator('.form-field:has-text("Description") input[type="text"]').first().fill('Supermarket Purchase');
      await txForm.locator('.form-field:has-text("Date") input[type="text"]').first().fill(dateStr);
      await txForm.locator('button[type="submit"]').first().click();
      await page.waitForTimeout(600);
    }

    // Budget
    await navigateToTab(page, 'budgets');
    const bForm = page.locator('.budget-form').first();
    if (await bForm.count() > 0) {
      await bForm.locator('input[type="number"]').first().fill('1200.00');
      await bForm.locator('button[type="submit"]').first().click();
      await page.waitForTimeout(600);
    }

    // Goal
    await navigateToTab(page, 'goals');
    const gForm = page.locator('.goal-form').first();
    if (await gForm.count() > 0) {
      await gForm.locator('input[type="text"]').first().fill('Emergency Reserve');
      await gForm.locator('input[type="number"]').first().fill('15000.00');
      await gForm.locator('input[type="text"]').nth(1).fill(`${today.getFullYear()}-12-31`);
      await gForm.locator('button[type="submit"]').first().click();
      await page.waitForTimeout(600);
    }
  }

  console.log('Data setup verified.');

  // 2. Comprehensive Visual & Color Contrast QA across all 6 accents
  const themeAuditResults = [];

  for (const accent of ACCENTS) {
    console.log(`\n--- Inspecting Accent: [${accent.toUpperCase()}] ---`);
    await page.setViewportSize({ width: 1440, height: 900 });

    // Switch accent in Settings
    await navigateToTab(page, 'settings');
    const accentSelect = page.locator('select:has(option[value="purple"])').first();
    await accentSelect.selectOption(accent);
    await page.locator('button:has-text("Save Settings")').first().click();
    await page.waitForTimeout(400);

    // Verify attribute set on <html>
    const currentAccentAttr = await page.getAttribute('html', 'data-accent');
    const rootStyles = await page.evaluate(() => {
      const computed = getComputedStyle(document.documentElement);
      return {
        primary: computed.getPropertyValue('--color-primary').trim(),
        primaryHover: computed.getPropertyValue('--color-primary-hover').trim(),
        primaryLight: computed.getPropertyValue('--color-primary-light').trim(),
        primaryBorder: computed.getPropertyValue('--color-primary-border').trim(),
        accentGlow: computed.getPropertyValue('--color-accent-glow').trim(),
        positive: computed.getPropertyValue('--color-positive').trim(),
        negative: computed.getPropertyValue('--color-negative').trim(),
        warning: computed.getPropertyValue('--color-warning').trim(),
      };
    });

    console.log(`Attribute data-accent: "${currentAccentAttr}"`);
    console.log(`Computed Primary Color: ${rootStyles.primary}`);

    // Audit Semantic Color Isolation on Dashboard
    await navigateToTab(page, 'dashboard');
    await page.waitForTimeout(400);

    const semanticCheck = await page.evaluate(() => {
      const positiveEls = Array.from(document.querySelectorAll('.amount-positive'));
      const negativeEls = Array.from(document.querySelectorAll('.amount-negative'));

      const positiveColors = positiveEls.map(el => ({ text: el.textContent, color: getComputedStyle(el).color }));
      const negativeColors = negativeEls.map(el => ({ text: el.textContent, color: getComputedStyle(el).color }));

      return {
        positiveColors,
        negativeColors,
      };
    });

    // Capture screenshots for Desktop (1440x900)
    await page.setViewportSize({ width: 1440, height: 900 });
    const dashShotPath = path.join(SCREENSHOT_DIR, `desktop_${accent}_dashboard.png`);
    await page.screenshot({ path: dashShotPath });

    await navigateToTab(page, 'settings');
    const settingsShotPath = path.join(SCREENSHOT_DIR, `desktop_${accent}_settings.png`);
    await page.screenshot({ path: settingsShotPath });

    // Inspect buttons, active sidebar, progress bars, contrast
    const elementAudit = await page.evaluate((accentName) => {
      const activeNav = document.querySelector('.sidebar-link[aria-current="page"], .nav-link[aria-current="page"]');
      const activeNavBg = activeNav ? getComputedStyle(activeNav).backgroundColor : null;
      const activeNavColor = activeNav ? getComputedStyle(activeNav).color : null;

      const primaryBtn = document.querySelector('.btn-primary');
      const primaryBtnBg = primaryBtn ? getComputedStyle(primaryBtn).backgroundColor : null;
      const primaryBtnColor = primaryBtn ? getComputedStyle(primaryBtn).color : null;

      return {
        activeNavBg,
        activeNavColor,
        primaryBtnBg,
        primaryBtnColor,
      };
    }, accent);

    // Capture Mobile screenshot (390x844)
    await page.setViewportSize({ width: 390, height: 844 });
    await navigateToTab(page, 'dashboard');
    await page.waitForTimeout(300);

    // Check overflow on mobile
    const mobileOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth || document.body.scrollWidth > window.innerWidth;
    });

    const mobileShotPath = path.join(SCREENSHOT_DIR, `mobile_${accent}_dashboard.png`);
    await page.screenshot({ path: mobileShotPath });

    themeAuditResults.push({
      accent,
      attr: currentAccentAttr,
      rootStyles,
      semanticCheck,
      elementAudit,
      mobileOverflow,
    });
  }

  // 3. Viewport Responsiveness Audit across all views
  console.log('\n--- 3. Viewport Responsiveness Audit ---');
  const viewportResults = [];
  for (const vp of [...DESKTOP_VIEWPORTS, ...MOBILE_VIEWPORTS]) {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.waitForTimeout(200);

    for (const v of VIEWS) {
      await navigateToTab(page, v);
      await page.waitForTimeout(200);

      const overflow = await page.evaluate(() => {
        return document.body.scrollWidth > window.innerWidth || document.documentElement.scrollWidth > window.innerWidth;
      });

      if (overflow) {
        viewportResults.push({ viewport: vp.name, view: v, overflow: true });
        console.log(`[OVERFLOW DEFECT] Viewport ${vp.name} on view ${v} has horizontal overflow!`);
      }
    }
  }

  // 4. Persistence Test
  console.log('\n--- 4. Persistence Testing ---');
  await page.setViewportSize({ width: 1440, height: 900 });
  await navigateToTab(page, 'settings');

  // Test 1: Switch to Cyan and reload
  await page.locator('select:has(option[value="purple"])').first().selectOption('cyan');
  await page.locator('button:has-text("Save Settings")').first().click();
  await page.waitForTimeout(500);

  await page.reload();
  await page.waitForSelector('.sidebar', { timeout: 10000 });
  const reloadedAccentCyan = await page.getAttribute('html', 'data-accent');
  console.log(`After reload, html data-accent is: "${reloadedAccentCyan}"`);

  // Test 2: Switch to Emerald and reload
  await navigateToTab(page, 'settings');
  await page.locator('select:has(option[value="purple"])').first().selectOption('emerald');
  await page.locator('button:has-text("Save Settings")').first().click();
  await page.waitForTimeout(500);

  await page.reload();
  await page.waitForSelector('.sidebar', { timeout: 10000 });
  const reloadedAccentEmerald = await page.getAttribute('html', 'data-accent');
  console.log(`After reload, html data-accent is: "${reloadedAccentEmerald}"`);

  // Reset back to purple
  await navigateToTab(page, 'settings');
  await page.locator('select:has(option[value="purple"])').first().selectOption('purple');
  await page.locator('button:has-text("Save Settings")').first().click();

  const finalReport = {
    themeAuditResults,
    viewportResults,
    persistence: {
      cyanPersistence: reloadedAccentCyan === 'cyan',
      emeraldPersistence: reloadedAccentEmerald === 'emerald',
    },
    browserHealth: {
      consoleErrors,
      pageErrors,
    }
  };

  fs.writeFileSync(path.join(ARTIFACT_DIR, 'qa_report_raw.json'), JSON.stringify(finalReport, null, 2));
  console.log('\nQA Run Complete. Raw data written to qa_report_raw.json');

  await browser.close();
}

runQA().catch(err => {
  console.error('QA Runner error:', err);
  process.exit(1);
});
