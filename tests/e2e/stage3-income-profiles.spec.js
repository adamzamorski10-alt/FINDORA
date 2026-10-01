import { test, expect } from '@playwright/test';

test.describe('Stage 3 Income Profile Foundation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3002/src/ui/app.html?nocache=' + Date.now());
    await page.waitForTimeout(5000);
  });

  test('income-profile-empty-state-and-creation', async ({ page }) => {
    await page.click('[data-tab="incomeProfiles"]');
    await page.waitForSelector('.income-profiles-view', { state: 'visible', timeout: 10000 });

    const emptyTitle = await page.locator('.income-profiles-view .empty-state-title').first().textContent();
    expect(emptyTitle).toContain('Brak profili');

    await page.click('.income-profiles-add-btn');
    await page.waitForSelector('.income-profile-form', { state: 'visible', timeout: 5000 });

    await page.selectOption('.income-profile-form select[name="profileType"]', { value: 'reselling' });
    await page.fill('.income-profile-form input[name="profileName"]', 'Vinted');
    await page.fill('.income-profile-form input[name="profileDescription"]', 'Reselling on Vinted');
    await page.click('.income-profile-form button[type="submit"]');
    await page.waitForSelector('.income-profile-item', { state: 'visible', timeout: 10000 });

    const itemTitle = await page.locator('.income-profile-item .surface-list-item-title').first().textContent();
    expect(itemTitle).toContain('Vinted');
  });

  test('income-profile-edit-and-archive', async ({ page }) => {
    await page.click('[data-tab="incomeProfiles"]');
    await page.waitForSelector('.income-profiles-view', { state: 'visible', timeout: 10000 });

    await page.click('.income-profiles-add-btn');
    await page.waitForSelector('.income-profile-form', { state: 'visible', timeout: 5000 });
    await page.selectOption('.income-profile-form select[name="profileType"]', { value: 'reselling' });
    await page.fill('.income-profile-form input[name="profileName"]', 'Vinted');
    await page.click('.income-profile-form button[type="submit"]');
    await page.waitForSelector('.income-profile-item', { state: 'visible', timeout: 10000 });

    await page.click('.income-profile-item .surface-list-item-action:has-text("Edytuj")');
    await page.waitForSelector('.income-profile-form', { state: 'visible', timeout: 5000 });
    await page.fill('.income-profile-form input[name="profileName"]', 'Vinted PL');
    await page.click('.income-profile-form button[type="submit"]');
    await page.waitForSelector('.income-profile-item', { state: 'visible', timeout: 10000 });

    const updatedTitle = await page.locator('.income-profile-item .surface-list-item-title').first().textContent();
    expect(updatedTitle).toContain('Vinted PL');

    await page.click('.income-profile-item .surface-list-item-action--danger:has-text("Archiwizuj")');
    await page.waitForSelector('.modal-backdrop', { state: 'visible', timeout: 5000 });
    await page.click('.modal-backdrop .confirm-ok');
    await page.waitForSelector('.income-profiles-view', { state: 'visible', timeout: 10000 });

    const items = await page.locator('.income-profile-item').count();
    expect(items).toBe(0);
  });

  test('income-profile-persistence-through-refresh', async ({ page }) => {
    await page.click('[data-tab="incomeProfiles"]');
    await page.waitForSelector('.income-profiles-view', { state: 'visible', timeout: 10000 });

    await page.click('.income-profiles-add-btn');
    await page.waitForSelector('.income-profile-form', { state: 'visible', timeout: 5000 });
    await page.selectOption('.income-profile-form select[name="profileType"]', { value: 'reselling' });
    await page.fill('.income-profile-form input[name="profileName"]', 'Vinted');
    await page.click('.income-profile-form button[type="submit"]');
    await page.waitForSelector('.income-profile-item', { state: 'visible', timeout: 10000 });

    await page.reload();
    await page.waitForSelector('#app-lifecycle-ready', { state: 'visible', timeout: 20000 });

    await page.click('[data-tab="incomeProfiles"]');
    await page.waitForSelector('.income-profiles-view', { state: 'visible', timeout: 10000 });

    const itemTitle = await page.locator('.income-profile-item .surface-list-item-title').first().textContent();
    expect(itemTitle).toContain('Vinted');
  });
});
