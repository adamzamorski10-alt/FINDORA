const SUPPORTED_LOCALES = ['pl', 'en'];
const DEFAULT_LOCALE = 'pl';

const listeners = new Set();

let currentLocale = DEFAULT_LOCALE;
let translations = {};

import { setFormatLocale } from './i18n-format.js';

async function loadTranslations(locale) {
  if (translations[locale]) return translations[locale];
  try {
    const mod = await import(`./locales/${locale}.js`);
    translations[locale] = mod.default || mod;
    return translations[locale];
  } catch {
    return null;
  }
}

async function setLocale(locale) {
  if (!SUPPORTED_LOCALES.includes(locale)) {
    locale = DEFAULT_LOCALE;
  }
  if (locale === currentLocale && translations[locale]) {
    return;
  }
  currentLocale = locale;
  await loadTranslations(locale);
  setFormatLocale(locale);
  for (const fn of listeners) {
    try { fn(locale); } catch (e) { console.error('[i18n] listener error:', e); }
  }
}

function getLocale() {
  return currentLocale;
}

function getSupportedLocales() {
  return [...SUPPORTED_LOCALES];
}

function getDisplayName(locale) {
  return locale === 'pl' ? 'Polski' : locale === 'en' ? 'English' : locale;
}

function t(key, params = {}) {
  const dict = translations[currentLocale] || {};
  let template = dict[key];
  if (!template) {
    const fallback = translations[DEFAULT_LOCALE] || {};
    template = fallback[key];
  }
  if (!template) {
    return key;
  }
  if (typeof template !== 'string') {
    return key;
  }
  return template.replace(/\{(\w+)\}/g, (_, k) => {
    const val = params[k];
    return val !== undefined ? String(val) : `{${k}}`;
  });
}

function onChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

async function init(locale) {
  if (!locale || !SUPPORTED_LOCALES.includes(locale)) {
    locale = DEFAULT_LOCALE;
  }
  await setLocale(locale);
}

export { SUPPORTED_LOCALES, DEFAULT_LOCALE, init, setLocale, getLocale, getSupportedLocales, getDisplayName, t, onChange };
