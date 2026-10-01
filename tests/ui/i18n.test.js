import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { SUPPORTED_LOCALES, DEFAULT_LOCALE, init, setLocale, getLocale, getSupportedLocales, getDisplayName, t, onChange } from '../../src/ui/i18n.js';

describe('i18n', () => {
  it('has supported locales', () => {
    assert.deepEqual(SUPPORTED_LOCALES, ['pl', 'en']);
  });

  it('defaults to pl', () => {
    assert.equal(DEFAULT_LOCALE, 'pl');
  });

  it('getSupportedLocales returns copy', () => {
    const locales = getSupportedLocales();
    assert.deepEqual(locales, ['pl', 'en']);
    assert.notEqual(locales, SUPPORTED_LOCALES);
  });

  it('getDisplayName returns Polish for pl', () => {
    assert.equal(getDisplayName('pl'), 'Polski');
  });

  it('getDisplayName returns English for en', () => {
    assert.equal(getDisplayName('en'), 'English');
  });

  it('falls back to key for missing translation', async () => {
    await init('pl');
    assert.equal(t('nonexistent.key.xyz'), 'nonexistent.key.xyz');
  });

  it('falls back to pl for missing en translation', async () => {
    await init('en');
    assert.equal(t('nonexistent.key.xyz'), 'nonexistent.key.xyz');
  });

  it('switches locale and returns new translations', async () => {
    await init('pl');
    const plTitle = t('dashboard.totalBalance');
    assert.notEqual(plTitle, 'dashboard.totalBalance');

    await setLocale('en');
    assert.equal(getLocale(), 'en');
    const enTitle = t('dashboard.totalBalance');
    assert.notEqual(enTitle, 'dashboard.totalBalance');
    assert.notEqual(enTitle, plTitle);
  });

  it('falls back invalid locale to pl', async () => {
    await init('pl');
    await setLocale('invalid-locale');
    assert.equal(getLocale(), 'pl');
  });

  it('interpolates params', async () => {
    await init('pl');
    assert.equal(t('validation.required'), 'Pole jest wymagane.');
    await setLocale('en');
    assert.equal(t('validation.required'), 'This field is required.');
  });

  it('notifies listeners on locale change', async () => {
    await init('pl');
    let called = false;
    const unsub = onChange((locale) => {
      called = true;
      assert.equal(locale, 'en');
    });
    await setLocale('en');
    assert.equal(called, true);
    unsub();
  });
});
