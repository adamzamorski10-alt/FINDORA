import { test, expect } from '@playwright/test';

test('debug receivable submit', async ({ page }) => {
  page.on('console', msg => {
    console.log('CONSOLE [' + msg.type() + ']:', msg.text());
  });
  page.on('pageerror', err => {
    console.log('PAGE ERROR:', err.message);
  });
  await page.goto('http://localhost:3002/ui/app.html');
  await page.waitForTimeout(2000);
  
  await page.click('[data-tab="receivables"]');
  await page.waitForSelector('.receivables-view', { state: 'visible', timeout: 10000 });
  
  await page.click('.receivables-add-btn');
  console.log('CLICKED ADD BTN');
  await page.waitForSelector('.receivable-form', { state: 'visible', timeout: 5000 });
  console.log('FORM VISIBLE');
  
  await page.fill('.receivable-form input[type="text"]', 'Jan Kowalski');
  console.log('FILLED NAME');
  await page.click('.receivable-form button[type="submit"]');
  console.log('CLICKED SUBMIT');
  await page.waitForSelector('.receivables-person-item', { state: 'visible', timeout: 5000 });
  console.log('PERSON VISIBLE');
  
  const personItem = page.locator('.receivables-person-item').first();
  await personItem.click();
  console.log('CLICKED PERSON');
  await page.waitForSelector('.receivables-detail', { state: 'visible', timeout: 5000 });
  console.log('DETAIL VISIBLE');
  
  await page.click('.receivables-detail .btn-primary:has-text("Dodaj należność")');
  console.log('CLICKED ADD RECEIVABLE');
  await page.waitForSelector('.receivable-form', { state: 'visible', timeout: 5000 });
  console.log('RECEIVABLE FORM VISIBLE');
  
  await page.fill('.receivable-form input[type="number"]', '200');
  console.log('FILLED AMOUNT');
  await page.fill('.receivable-form input[type="text"]', 'Pożyczka na remont');
  console.log('FILLED DESC');
  
  const optionCount = await page.locator('.receivable-form select option').count();
  console.log('OPTION COUNT:', optionCount);
  for (let i = 0; i < optionCount; i++) {
    const text = await page.locator('.receivable-form select option').nth(i).textContent();
    console.log('OPTION ' + i + ':', text);
  }
  
  await page.selectOption('.receivable-form select', { index: 1 });
  console.log('SELECTED ACCOUNT');
  
  console.log('CLICKING SUBMIT');
  await page.click('.receivable-form button[type="submit"]');
  console.log('CLICKED SUBMIT');
  
  await page.waitForTimeout(3000);
  console.log('WAITED 3S');
  
  const html = await page.locator('.receivables-view').innerHTML();
  console.log('HTML:', html.slice(0, 2000));
});

