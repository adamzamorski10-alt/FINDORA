import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { init, setLocale, getLocale, t, onChange } from '../../src/ui/i18n.js';

describe('i18n integration', () => {
  it('switching pl -> en updates visible translations', async () => {
    await init('pl');
    const plDashboard = t('nav.dashboard');
    assert.equal(plDashboard, 'Dashboard');

    await setLocale('en');
    assert.equal(getLocale(), 'en');
    const enDashboard = t('nav.dashboard');
    assert.equal(enDashboard, 'Dashboard');
  });

  it('switching en -> pl updates visible translations', async () => {
    await init('en');
    const enAccounts = t('nav.accounts');
    assert.equal(enAccounts, 'Accounts');

    await setLocale('pl');
    assert.equal(getLocale(), 'pl');
    const plAccounts = t('nav.accounts');
    assert.equal(plAccounts, 'Konta');
  });

  it('invalid locale falls back to pl', async () => {
    await init('pl');
    await setLocale('xx');
    assert.equal(getLocale(), 'pl');
    assert.equal(t('nav.dashboard'), 'Dashboard');
  });

  it('interpolates params in both locales', async () => {
    await init('pl');
    assert.equal(t('backup.exportFailed', { error: 'X' }), 'Eksport nie powiódł się: X');

    await setLocale('en');
    assert.equal(t('backup.exportFailed', { error: 'X' }), 'Export failed: X');
  });

  it('notifies listeners on locale change', async () => {
    await init('pl');
    let received = null;
    const unsub = onChange((locale) => {
      received = locale;
    });
    await setLocale('en');
    assert.equal(received, 'en');
    unsub();
  });
});
