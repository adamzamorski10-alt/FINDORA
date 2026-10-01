import { test, expect } from '@playwright/test';

test('debug app state', async ({ page }) => {
  page.on('console', msg => {
    console.log('CONSOLE [' + msg.type() + ']:', msg.text());
  });
  page.on('pageerror', err => {
    console.log('PAGE ERROR:', err.message);
  });
  await page.goto('http://localhost:3002/ui/app.html');
  await page.waitForTimeout(5000);
  
  const html = await page.content();
  console.log('PAGE HTML SNIPPET:');
  console.log(html.slice(0, 2000));
  
  const lifecycleStates = await page.evaluate(() => {
    return {
      initializing: document.getElementById('app-lifecycle-initializing')?.style.display,
      ready: document.getElementById('app-lifecycle-ready')?.style.display,
      error: document.getElementById('app-lifecycle-error')?.style.display,
    };
  });
  console.log('LIFECYCLE STATES:', lifecycleStates);
});
