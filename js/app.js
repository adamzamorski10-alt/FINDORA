import { firebaseApp } from './firebase-config.js';
import { initAuth } from './auth.js';
import { initUI } from './ui.js';

export function initApp() {
  if (firebaseApp) {
    // Firebase is initialized by the shared config module.
  }

  initUI();
  initAuth();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp, { once: true });
} else {
  initApp();
}
