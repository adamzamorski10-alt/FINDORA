/**
 * DISCOVERY ONLY — Finora UI Screenshot Pack
 * 
 * Temporary script for capturing UI screenshots. Does not modify production code.
 * Removed after screenshot completion.
 */

import { chromium } from 'playwright';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import http from 'http';
import os from 'os';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '../..');
const ARTIFACTS_DIR = path.join(PROJECT_ROOT, 'artifacts', 'ui-review');
const SERVER_PORT = 3000;
const SERVER_URL = `http://localhost:${SERVER_PORT}`;
const APP_URL = `${SERVER_URL}/src/ui/app.html`;
const SEED_URL = `${SERVER_URL}/artifacts/ui-review/seed-demo.html`;

const VIEWS = [
  { id: 'dashboard', label: 'Dashboard', href: '#dashboard' },
  { id: 'accounts', label: 'Accounts', href: '#accounts' },
  { id: 'transactions', label: 'Transactions', href: '#transactions' },
  { id: 'budgets', label: 'Budgets', href: '#budgets' },
  { id: 'goals', label: 'Goals', href: '#goals' },
  { id: 'reports', label: 'Reports', href: '#reports' },
  { id: 'settings', label: 'Settings', href: '#settings' },
];

const DESKTOP_VIEWPORT = { width: 1440, height: 900 };
const MOBILE_VIEWPORT = { width: 390, height: 844 };

let serverProcess = null;
let browser = null;

function log(msg) {
  console.log(`[${new Date().toLocaleTimeString()}] ${msg}`);
}

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

async function startServer() {
  log('Starting local HTTP server...');
  serverProcess = spawn('npx', ['serve', '.', '-l', String(SERVER_PORT)], {
    cwd: PROJECT_ROOT,
    stdio: 'pipe',
    shell: true,
  });

  let serverReady = false;
  serverProcess.stdout.on('data', (data) => {
    const text = data.toString();
    if (text.includes('Accepting requests') || text.includes('Local:') || text.includes(SERVER_URL)) {
      serverReady = true;
    }
  });

  serverProcess.stderr.on('data', (data) => {
    const text = data.toString();
    if (text.includes('Accepting requests') || text.includes('Local:') || text.includes(SERVER_URL)) {
      serverReady = true;
    }
  });

  await waitForServer(`${SERVER_URL}/src/ui/app.html`, 90000);
  log('Server is ready.');
}

async function stopServer() {
  if (serverProcess) {
    log('Stopping server...');
    serverProcess.kill('SIGTERM');
    serverProcess = null;
  }
}

async function seedDemoData(page) {
  log('Navigating to seed page...');
  await page.goto(SEED_URL, { waitUntil: 'networkidle', timeout: 120000 });
  
  log('Waiting for seed completion...');
  await page.waitForFunction('window._finoraSeedComplete === true', { timeout: 120000 });
  log('Demo data seeded.');
}

async function waitForAppReady(page) {
  log('Waiting for app to be ready...');
  await page.waitForSelector('#app-lifecycle-ready[style*="flex"]', { timeout: 60000 });
  await page.waitForTimeout(2000);
  log('App is ready.');
}

async function navigateToView(page, viewId) {
  const view = VIEWS.find(v => v.id === viewId);
  if (!view) return;
  
  await page.evaluate((href) => {
    window.location.hash = href;
  }, view.href);
  
  await page.waitForTimeout(800);
}

async function takeScreenshots(page, viewport, prefix) {
  const screenshots = [];
  
  for (const view of VIEWS) {
    await navigateToView(page, view.id);
    
    // Wait for any animations
    await page.waitForTimeout(1000);
    
    const filename = `${prefix}-${view.id}.png`;
    const filepath = path.join(ARTIFACTS_DIR, prefix, filename);
    
    await page.screenshot({ path: filepath, fullPage: false });
    screenshots.push({ view: view.label, filepath, filename });
    log(`Screenshot saved: ${prefix}/${filename}`);
  }

  // Account form screenshot — form is rendered at the bottom of Accounts view
  await navigateToView(page, 'accounts');
  await page.waitForTimeout(600);
  await page.evaluate(() => {
    const form = document.querySelector('.create-account-section, .account-form');
    if (form) form.scrollIntoView({ behavior: 'instant', block: 'start' });
  });
  await page.waitForTimeout(400);

  const formFilename = `${prefix}-account-form.png`;
  const formFilepath = path.join(ARTIFACTS_DIR, prefix, formFilename);
  await page.screenshot({ path: formFilepath, fullPage: false });
  screenshots.push({ view: 'Account Form', filepath: formFilepath, filename: formFilename });
  log(`Screenshot saved: ${prefix}/${formFilename}`);

  return screenshots;
}

async function collectHealthInfo(page) {
  const health = {
    consoleErrors: [],
    pageErrors: [],
    unhandledRejections: [],
    failedRequests: [],
    horizontalOverflow: false,
    brokenIcons: false,
  };

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      health.consoleErrors.push(msg.text());
    }
  });

  page.on('pageerror', (err) => {
    health.pageErrors.push(err.message);
  });

  page.on('requestfailed', (req) => {
    health.failedRequests.push(req.url() + ' (' + req.failure()?.errorText + ')');
  });

  // Check horizontal overflow
  const hasOverflow = await page.evaluate(() => {
    return document.documentElement.scrollWidth > window.innerWidth;
  });
  health.horizontalOverflow = hasOverflow;

  return health;
}

async function createContactSheet(desktopScreenshots, mobileScreenshots) {
  log('Creating contact sheet...');
  
  const thumbWidthDesktop = 300;
  const thumbHeightDesktop = Math.round(300 * 900 / 1440);
  const thumbWidthMobile = 150;
  const thumbHeightMobile = Math.round(150 * 844 / 390);
  const gap = 20;
  const padding = 40;
  const labelHeight = 30;
  const sectionHeaderHeight = 50;

  // Load images
  const sharp = await import('sharp').catch(() => null);
  
  if (!sharp) {
    log('Sharp not available, skipping contact sheet');
    return;
  }

  const { sharp: s } = await import('sharp');
  
  const desktopRows = Math.ceil(desktopScreenshots.length / 4);
  const mobileRows = Math.ceil(mobileScreenshots.length / 4);
  
  const maxWidth = Math.max(
    desktopRows * (thumbWidthDesktop + gap) - gap,
    mobileRows * (thumbWidthMobile + gap) - gap
  );
  
  let height = padding * 2;
  height += sectionHeaderHeight;
  height += desktopRows * (thumbHeightDesktop + labelHeight + gap) - gap;
  height += gap * 2;
  height += sectionHeaderHeight;
  height += mobileRows * (thumbHeightMobile + labelHeight + gap) - gap;
  height += padding * 2;

  const composite = [];
  let yOffset = padding;

  // Desktop section
  // Background for section header
  // We'll draw text using canvas API via sharp
  const width = maxWidth + padding * 2;
  
  // Create base image
  let canvas = s({
    create: {
      width,
      height,
      channels: 4,
      background: { r: 9, g: 13, b: 22, alpha: 1 },
    },
  });

  // Helper to add text
  const addText = async (text, x, y, fontSize = 24, color = '#F8FAFC') => {
    const svgText = `<svg width="${width}" height="${fontSize + 10}"><text x="${x}" y="${fontSize}" font-family="Inter, system-ui, sans-serif" font-size="${fontSize}" fill="${color}" font-weight="bold">${text}</text></svg>`;
    const textBuffer = Buffer.from(svgText);
    const textImg = await s(textBuffer).png().toBuffer();
    return { input: textImg, top: y, left: 0 };
  };

  // Desktop header
  const desktopHeaderSvg = `<svg width="${width}" height="${sectionHeaderHeight}"><text x="${padding}" y="32" font-family="Inter, system-ui, sans-serif" font-size="24" fill="#8B5CF6" font-weight="bold">DESKTOP</text></svg>`;
  const desktopHeaderBuf = Buffer.from(desktopHeaderSvg);
  canvas = await s({
    create: { width, height, channels: 4, background: { r: 9, g: 13, b: 22, alpha: 1 } },
  }).composite([{ input: await s(desktopHeaderBuf).png().toBuffer(), top: yOffset, left: 0 }])
    .png()
    .toBuffer()
    .then(buf => s(buf));
  
  yOffset += sectionHeaderHeight;

  for (let i = 0; i < desktopScreenshots.length; i++) {
    const shot = desktopScreenshots[i];
    const col = i % 4;
    const row = Math.floor(i / 4);
    const x = padding + col * (thumbWidthDesktop + gap);
    const y = yOffset + row * (thumbHeightDesktop + labelHeight + gap);
    
    const thumb = await s(shot.filepath).resize(thumbWidthDesktop, thumbHeightDesktop).png().toBuffer();
    
    const labelSvg = `<svg width="${thumbWidthDesktop}" height="${labelHeight}"><text x="0" y="20" font-family="Inter, system-ui, sans-serif" font-size="14" fill="#94A3B8">${shot.view}</text></svg>`;
    const labelBuf = Buffer.from(labelSvg);
    const labelImg = await s(labelBuf).png().toBuffer();
    
    canvas = await s(canvas).composite([
      { input: thumb, top: y, left: x },
      { input: labelImg, top: y + thumbHeightDesktop, left: x },
    ]).png().toBuffer().then(buf => s(buf));
  }

  yOffset += desktopRows * (thumbHeightDesktop + labelHeight + gap) - gap + gap * 2;

  // Mobile header
  const mobileHeaderSvg = `<svg width="${width}" height="${sectionHeaderHeight}"><text x="${padding}" y="32" font-family="Inter, system-ui, sans-serif" font-size="24" fill="#8B5CF6" font-weight="bold">MOBILE</text></svg>`;
  const mobileHeaderBuf = Buffer.from(mobileHeaderSvg);
  canvas = await s(canvas).composite([
    { input: await s(mobileHeaderBuf).png().toBuffer(), top: yOffset, left: 0 },
  ]).png().toBuffer().then(buf => s(buf));
  
  yOffset += sectionHeaderHeight;

  for (let i = 0; i < mobileScreenshots.length; i++) {
    const shot = mobileScreenshots[i];
    const col = i % 4;
    const row = Math.floor(i / 4);
    const x = padding + col * (thumbWidthMobile + gap);
    const y = yOffset + row * (thumbHeightMobile + labelHeight + gap);
    
    const thumb = await s(shot.filepath).resize(thumbWidthMobile, thumbHeightMobile).png().toBuffer();
    
    const labelSvg = `<svg width="${thumbWidthMobile}" height="${labelHeight}"><text x="0" y="20" font-family="Inter, system-ui, sans-serif" font-size="14" fill="#94A3B8">${shot.view}</text></svg>`;
    const labelBuf = Buffer.from(labelSvg);
    const labelImg = await s(labelBuf).png().toBuffer();
    
    canvas = await s(canvas).composite([
      { input: thumb, top: y, left: x },
      { input: labelImg, top: y + thumbHeightMobile, left: x },
    ]).png().toBuffer().then(buf => s(buf));
  }

  const outputPath = path.join(ARTIFACTS_DIR, 'finora-ui-overview.png');
  await s(canvas).toFile(outputPath);
  log(`Contact sheet saved: ${outputPath}`);
}

function writeDiscoveryMarkdown(screenshots, health) {
  const md = `# FINORA UI DISCOVERY

Generated: ${new Date().toISOString()}

## Screenshots

### Desktop
${screenshots.desktop.map(s => `- ${s.view}: \`${s.filename}\``).join('\n')}

### Mobile
${screenshots.mobile.map(s => `- ${s.view}: \`${s.filename}\``).join('\n')}

---

## Current UI Documentation

### Dashboard
- **Goal**: Personal Financial Health & Overview
- **Main Sections**: Summary cards (Total Balance, Income, Expenses, Safe-to-Spend), Cash Flow bars, Safe-to-Spend Breakdown, Recent Transactions, Budgets, Goals
- **KPIs**: Total Balance, Monthly Income, Monthly Expenses, Safe-to-Spend (daily), Days left in month
- **Charts/Visualizations**: Cash flow bar charts, budget/goal progress bars
- **Components**: Summary cards with hover effects, month navigation, sidebar navigation
- **Responsive**: Grid collapses from 4 columns to 2 to 1; sidebar becomes drawer on mobile
- **Data Source**: Reporting module, Safe-to-Spend module, Account/Transaction/Budget/Goal repositories

### Accounts
- **Goal**: Manage accounts and balances
- **Main Sections**: Total balance summary, accounts grid, create account form
- **KPIs**: Total Balance across all accounts
- **Charts/Visualizations**: None (card-based layout)
- **Components**: Account cards with accent colors, icon badges, balance display, edit/archive actions
- **Responsive**: Grid auto-fill minmax(280px, 1fr); form becomes single column on mobile
- **Data Source**: Account module, Reporting module

### Transactions
- **Goal**: Transaction management and history
- **Main Sections**: Month navigation, transaction list, create transaction form
- **KPIs**: Transaction count, category breakdown
- **Charts/Visualizations**: None (list-based)
- **Components**: Transaction items with type icons, month nav, form with account/category/type selectors
- **Responsive**: Form grid 3 columns -> 1 column on mobile
- **Data Source**: Transaction module, Account/Category repositories

### Budgets
- **Goal**: Spending limit tracking
- **Main Sections**: Budgets summary, budget cards with progress bars, create budget form
- **KPIs**: Budget amount, spent, remaining, over-budget status
- **Charts/Visualizations**: Progress bars for budget utilization
- **Components**: Budget cards with category name, progress track, amount display
- **Responsive**: Summary flex column on mobile; grid auto-fill
- **Data Source**: Budget module, Category repository

### Goals
- **Goal**: Financial goal tracking
- **Main Sections**: Goals grid, goal cards with progress, deposit form, create goal form
- **KPIs**: Target amount, current progress, deadline
- **Charts/Visualizations**: Progress bars, ring progress (if implemented in future)
- **Components**: Goal cards with icon, name, progress bar, deposit form inline
- **Responsive**: Grid auto-fill minmax(320px, 1fr)
- **Data Source**: Goal module

### Reports
- **Goal**: Financial insights and breakdowns
- **Main Sections**: Summary grid, category breakdown, charts
- **KPIs**: Monthly totals, category distribution
- **Charts/Visualizations**: Category breakdown bars, summary cards
- **Components**: Report section cards, breakdown items with bar tracks
- **Responsive**: 4 columns -> 2 columns -> 1 column
- **Data Source**: Reporting module

### Settings
- **Goal**: User preferences and configuration
- **Main Sections**: Profile settings, theme, currency, privacy
- **KPIs**: None
- **Charts/Visualizations**: None
- **Components**: Settings form fields, toggle buttons
- **Responsive**: Single column form layout
- **Data Source**: User module, profile settings

---

## Observed Issues

${health.consoleErrors.length ? `### Console Errors\n${health.consoleErrors.map(e => `- ${e}`).join('\n')}\n` : ''}
${health.pageErrors.length ? `### Page Errors\n${health.pageErrors.map(e => `- ${e}`).join('\n')}\n` : ''}
${health.unhandledRejections.length ? `### Unhandled Promise Rejections\n${health.unhandledRejections.map(e => `- ${e}`).join('\n')}\n` : ''}
${health.failedRequests.length ? `### Failed Network Requests\n${health.failedRequests.map(e => `- ${e}`).join('\n')}\n` : ''}
${health.horizontalOverflow ? '- Horizontal overflow detected\n' : ''}
`;

  const mdPath = path.join(ARTIFACTS_DIR, 'FINORA_UI_DISCOVERY.md');
  fs.writeFileSync(mdPath, md);
  log(`Discovery markdown saved: ${mdPath}`);
}

async function main() {
  try {
    await startServer();
    
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      viewport: DESKTOP_VIEWPORT,
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    });
    
    const page = await context.newPage();
    
    // Collect health info
    const health = await collectHealthInfo(page);
    
    // Seed demo data
    await seedDemoData(page);
    
    // Wait for app after redirect
    await page.waitForTimeout(3000);
    await waitForAppReady(page);
    
    // Desktop screenshots
    log('Taking desktop screenshots...');
    const desktopScreenshots = await takeScreenshots(page, DESKTOP_VIEWPORT, 'desktop');
    
    // Mobile screenshots
    log('Taking mobile screenshots...');
    await page.setViewportSize(MOBILE_VIEWPORT);
    await page.waitForTimeout(1000);
    const mobileScreenshots = await takeScreenshots(page, MOBILE_VIEWPORT, 'mobile');
    
    // Collect final health info
    const finalHealth = await collectHealthInfo(page);
    
    // Create contact sheet
    await createContactSheet(desktopScreenshots, mobileScreenshots);
    
    // Write discovery markdown
    writeDiscoveryMarkdown(
      { desktop: desktopScreenshots, mobile: mobileScreenshots },
      finalHealth
    );
    
    log('All screenshots captured successfully!');
    
  } catch (err) {
    console.error('ERROR:', err);
    process.exitCode = 1;
  } finally {
    if (browser) {
      await browser.close();
    }
    await stopServer();
  }
}

main();
