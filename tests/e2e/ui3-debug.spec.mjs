import { test, expect } from '@playwright/test';

test('dashboard desktop render check', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('http://localhost:3006/');
  await page.waitForTimeout(4000);

  const heroText = await page.locator('.dashboard-hero-value').textContent();
  console.log('HERO TEXT:', heroText);

  const kpiText = await page.locator('.dashboard-kpi-row').textContent();
  console.log('KPI TEXT:', kpiText);

  const dashboardHTML = await page.locator('.dashboard-view').innerHTML();
  console.log('DASHBOARD HTML LENGTH:', dashboardHTML.length);
  console.log('DASHBOARD HTML:', dashboardHTML.slice(0, 500));
});
