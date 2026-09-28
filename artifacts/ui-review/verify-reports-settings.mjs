import { chromium } from 'playwright';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import os from 'os';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '../..');
const ARTIFACTS_DIR = path.join(PROJECT_ROOT, 'artifacts', 'ui-review');
const SERVER_URL = 'http://localhost:3000';
const APP_URL = `${SERVER_URL}/src/ui/app.html`;
const SEED_URL = `${SERVER_URL}/artifacts/ui-review/seed-demo.html`;

const VIEWPORTS = [
  { id: 'desktop-1440', width: 1440, height: 900, label: '1440x900' },
  { id: 'desktop-1024', width: 1024, height: 768, label: '1024x768' },
  { id: 'mobile-390', width: 390, height: 844, label: '390x844' },
  { id: 'mobile-375', width: 375, height: 812, label: '375x812' },
];

const VIEWS = [
  { id: 'reports', label: 'Reports', hash: '#reports' },
  { id: 'settings', label: 'Settings', hash: '#settings' },
];

async function waitForServer(url, timeoutMs = 60000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      await new Promise((resolve, reject) => {
        const req = http.get(url, (res) => {
          resolve(res.statusCode >= 200 && res.statusCode < 500);
        });
        req.on('error', reject);
        req.setTimeout(5000, () => { req.destroy(); reject(new Error('timeout')); });
      });
      return true;
    } catch (e) {
      await new Promise(r => setTimeout(r, 500));
    }
  }
  throw new Error(`Server at ${url} did not respond within ${timeoutMs}ms`);
}

async function main() {
  console.log('Waiting for server...');
  await waitForServer(`${SERVER_URL}/src/ui/app.html`, 90000);
  console.log('Server ready.');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Seed demo data
    console.log('Seeding demo data...');
    await page.goto(SEED_URL, { waitUntil: 'networkidle', timeout: 120000 });
    await page.waitForFunction('window._finoraSeedComplete === true', { timeout: 120000 });
    console.log('Demo data seeded.');

    // Navigate to app
    console.log('Navigating to app...');
    await page.goto(APP_URL, { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForTimeout(2000);

    const resultsDir = path.join(ARTIFACTS_DIR, 'reports-settings-verify');
    if (!fs.existsSync(resultsDir)) {
      fs.mkdirSync(resultsDir, { recursive: true });
    }

    const health = {
      consoleErrors: [],
      pageErrors: [],
      horizontalOverflow: false,
    };

    page.on('console', (msg) => {
      if (msg.type() === 'error') health.consoleErrors.push(msg.text());
    });
    page.on('pageerror', (err) => health.pageErrors.push(err.message));

    for (const vp of VIEWPORTS) {
      console.log(`\n=== Viewport: ${vp.label} ===`);
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.waitForTimeout(500);

      for (const view of VIEWS) {
        await page.evaluate((hash) => { window.location.hash = hash; }, view.hash);
        await page.waitForTimeout(1200);

        const hasOverflow = await page.evaluate(() => {
          return document.documentElement.scrollWidth > window.innerWidth;
        });
        health.horizontalOverflow = health.horizontalOverflow || hasOverflow;

        const filename = `${vp.id}-${view.id}.png`;
        const filepath = path.join(resultsDir, filename);
        await page.screenshot({ path: filepath, fullPage: false });
        console.log(`  Saved: ${filename}`);
      }
    }

    // Save health report
    const reportPath = path.join(resultsDir, 'health-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(health, null, 2));
    console.log(`\nHealth report: ${reportPath}`);
    console.log('Console errors:', health.consoleErrors.length);
    console.log('Page errors:', health.pageErrors.length);
    console.log('Horizontal overflow:', health.horizontalOverflow);
    console.log('\nAll screenshots captured successfully!');
  } finally {
    await browser.close();
  }
}

main().catch(err => {
  console.error('ERROR:', err);
  process.exitCode = 1;
});
