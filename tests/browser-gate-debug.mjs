import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await context.newPage();

  const consoleErrors = [];
  const pageErrors = [];

  page.on('console', (msg) => {
    const text = `[${msg.type()}] ${msg.text()}`;
    console.log('CONSOLE:', text);
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', (err) => {
    console.log('PAGE ERROR:', err.message);
    pageErrors.push(err.message);
  });

  const BASE = 'http://localhost:3002';

  try {
    await page.goto(`${BASE}/index.html?view=debt`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(3000);
  } catch (err) {
    console.log('Navigation error:', err.message);
  }

  console.log('\n=== SUMMARY ===');
  console.log(`Console errors: ${consoleErrors.length}`);
  console.log(`Page errors: ${pageErrors.length}`);
  
  await browser.close();
})();
