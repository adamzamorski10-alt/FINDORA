import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  page.on('console', (msg) => allConsole.push(`[${msg.type()}] ${msg.text()}`));
  const allConsole = [];

  const BASE = 'http://localhost:24021';

  try {
    await page.goto(`${BASE}/src/ui/app.html`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForSelector('#app-lifecycle-ready', { state: 'visible', timeout: 20000 });
    await page.waitForTimeout(3000);

    await page.click('.nav-link[data-tab="incomeProfiles"]');
    await page.waitForTimeout(2000);

    // Create profile
    const profiles = await page.locator('.income-profile-item').all();
    if (profiles.length === 0) {
      await page.click('button:has-text("Nowy profil")');
      await page.waitForTimeout(500);
      await page.locator('select[name="profileType"]').selectOption('reselling');
      await page.locator('input[name="profileName"]').fill('Vinted Test');
      await page.click('button[type="submit"]');
      await page.waitForTimeout(2000);
    }

    // Inspect nav links
    const navInfo = await page.evaluate(() => {
      const links = document.querySelectorAll('.nav-link');
      return Array.from(links).map(l => ({
        tab: l.dataset.tab,
        aria: l.getAttribute('aria-current'),
        text: l.textContent.trim().substring(0, 30),
      }));
    });
    console.log('Nav links before click:', JSON.stringify(navInfo, null, 2));

    // Click profile
    const profileItems = await page.locator('.income-profile-item').all();
    await profileItems[0].click();
    
    // Check immediately
    await page.waitForTimeout(100);
    const navAfter = await page.evaluate(() => {
      const links = document.querySelectorAll('.nav-link');
      return Array.from(links).map(l => ({
        tab: l.dataset.tab,
        aria: l.getAttribute('aria-current'),
      }));
    });
    console.log('Nav links after click (100ms):', JSON.stringify(navAfter, null, 2));

    // Wait and check again
    await page.waitForTimeout(2000);
    const navAfter2 = await page.evaluate(() => {
      const links = document.querySelectorAll('.nav-link');
      return Array.from(links).map(l => ({
        tab: l.dataset.tab,
        aria: l.getAttribute('aria-current'),
      }));
    });
    console.log('Nav links after click (2s):', JSON.stringify(navAfter2, null, 2));

    const mainHtml = await page.locator('#app-main').innerHTML();
    console.log('Has reselling-view:', mainHtml.includes('reselling-view'));

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await browser.close();
  }
})();
