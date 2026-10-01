let currentLocale = 'pl';

export function setFormatLocale(locale) {
  currentLocale = locale;
}

export function formatCurrency(value, currency = 'PLN') {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—';
  try {
    return new Intl.NumberFormat(currentLocale, {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return Number(value).toFixed(2);
  }
}

export function formatNumber(value, options = {}) {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—';
  try {
    return new Intl.NumberFormat(currentLocale, options).format(value);
  } catch {
    return String(value);
  }
}

export function formatPercent(value, options = {}) {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—';
  try {
    return new Intl.NumberFormat(currentLocale, {
      style: 'percent',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
      ...options,
    }).format(value);
  } catch {
    return String(value);
  }
}

export function formatDate(value) {
  if (!value) return '';
  try {
    const d = new Date(value + 'T00:00:00');
    if (Number.isNaN(d.getTime())) return value;
    return new Intl.DateTimeFormat(currentLocale, {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(d);
  } catch {
    return value;
  }
}

export function formatMonthYear(monthKey) {
  if (!monthKey) return '';
  const [year, month] = monthKey.split('-').map(Number);
  if (!year || !month) return monthKey;
  try {
    const d = new Date(year, month - 1, 1);
    return new Intl.DateTimeFormat(currentLocale, {
      month: 'long',
      year: 'numeric',
    }).format(d);
  } catch {
    return monthKey;
  }
}

export function formatShortMonth(monthKey) {
  if (!monthKey) return '';
  const [year, month] = monthKey.split('-').map(Number);
  if (!year || !month) return monthKey;
  try {
    const d = new Date(year, month - 1, 1);
    const parts = new Intl.DateTimeFormat(currentLocale, {
      month: 'short',
    }).format(d).split(' ');
    return parts[0] || monthKey;
  } catch {
    return monthKey;
  }
}

export function formatMonthLabel(monthKey) {
  return formatMonthYear(monthKey);
}

export function getMonthNames() {
  try {
    const formatter = new Intl.DateTimeFormat(currentLocale, { month: 'long' });
    const names = [];
    for (let m = 0; m < 12; m++) {
      const d = new Date(2000, m, 1);
      names.push(formatter.format(d));
    }
    return names;
  } catch {
    return currentLocale === 'pl'
      ? ['Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec', 'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień']
      : ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  }
}
