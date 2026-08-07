function bindClick(id, handler) {
  const element = document.getElementById(id);
  if (element) element.addEventListener('click', handler);
}

export function bindThemeControls() {
  bindClick('theme-toggle-desktop', () => {
    if (typeof window.toggleTheme === 'function') window.toggleTheme();
  });
  bindClick('theme-toggle-mobile', () => {
    if (typeof window.toggleTheme === 'function') window.toggleTheme();
  });
}

export function bindPrivacyControls() {
  bindClick('privacy-toggle-desktop', () => {
    if (typeof window.togglePrivacyMode === 'function') window.togglePrivacyMode();
  });
  bindClick('privacy-toggle-mobile', () => {
    if (typeof window.togglePrivacyMode === 'function') window.togglePrivacyMode();
  });
}

export function bindTabControls() {
  document.querySelectorAll('[data-tab-target]').forEach((button) => {
    button.addEventListener('click', () => {
      const target = button.getAttribute('data-tab-target');
      if (target && typeof window.switchTab === 'function') window.switchTab(target);
    });
  });
}

export function bindModalControls() {
  document.querySelectorAll('[data-modal-close]').forEach((button) => {
    button.addEventListener('click', () => {
      const handlerName = button.getAttribute('data-modal-close');
      const handler = handlerName ? window[handlerName] : null;
      if (typeof handler === 'function') handler();
    });
  });
}

export function initUI() {
  bindTabControls();
  bindModalControls();
}
