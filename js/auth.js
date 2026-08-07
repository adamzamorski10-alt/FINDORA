import { auth } from './firebase-config.js';

function getElement(id) {
  return document.getElementById(id);
}

function bindIfExists(id, eventName, handler) {
  const element = getElement(id);
  if (element) element.addEventListener(eventName, handler);
}

function mapAuthError(err) {
  switch (err && err.code) {
    case 'auth/invalid-email': return 'Nieprawidłowy adres e-mail.';
    case 'auth/user-not-found': return 'Nie znaleziono konta o podanym e-mailu.';
    case 'auth/wrong-password':
    case 'auth/invalid-credential': return 'Błędny e-mail lub hasło.';
    case 'auth/email-already-in-use': return 'Konto z tym adresem e-mail już istnieje.';
    case 'auth/weak-password': return 'Hasło musi mieć co najmniej 6 znaków.';
    case 'auth/too-many-requests': return 'Zbyt wiele prób logowania. Spróbuj ponownie za chwilę.';
    case 'auth/network-request-failed': return 'Brak połączenia z internetem.';
    case 'auth/popup-closed-by-user': return 'Logowanie przez Google zostało anulowane.';
    default: return (err && err.message) ? err.message : 'Wystąpił nieznany błąd. Spróbuj ponownie.';
  }
}

export function initAuth() {
  const overlay = getElement('auth-overlay');
  const form = getElement('auth-form');
  const emailEl = getElement('auth-email');
  const passEl = getElement('auth-password');
  const errEl = getElement('auth-error-msg');
  const submitBtn = getElement('auth-submit-btn');
  const googleBtn = getElement('auth-google-btn');
  const subtitleEl = getElement('auth-subtitle');
  const switchTextEl = getElement('auth-switch-text');
  const switchBtnEl = getElement('auth-switch-btn');
  const signOutButtons = ['signout-btn-mobile', 'signout-btn-desktop'];

  if (!overlay || !form || !emailEl || !passEl || !errEl || !submitBtn || !googleBtn || !subtitleEl || !switchTextEl || !switchBtnEl) {
    return;
  }

  if (new URLSearchParams(window.location.search).get('view') === 'debt') {
    overlay.classList.add('hidden');
    return;
  }

  let authMode = 'login';

  function showAuthError(msg) {
    errEl.textContent = msg;
    errEl.classList.remove('hidden');
  }

  function hideAuthError() {
    errEl.classList.add('hidden');
  }

  function setBusy(busy) {
    submitBtn.disabled = busy;
    submitBtn.classList.toggle('is-loading', busy);
    googleBtn.disabled = busy;
    signOutButtons.forEach((id) => {
      const button = getElement(id);
      if (button) button.disabled = busy;
    });
  }

  function toggleAuthMode() {
    authMode = authMode === 'login' ? 'register' : 'login';
    submitBtn.textContent = authMode === 'login' ? 'Zaloguj się' : 'Zarejestruj się';
    subtitleEl.textContent = authMode === 'login' ? 'Zaloguj się, aby zobaczyć swoje dane' : 'Utwórz konto, aby zacząć';
    switchTextEl.textContent = authMode === 'login' ? 'Nie masz konta?' : 'Masz już konto?';
    switchBtnEl.textContent = authMode === 'login' ? 'Zarejestruj się' : 'Zaloguj się';
    hideAuthError();
  }

  async function handleAuthSubmit() {
    hideAuthError();
    const email = emailEl.value.trim();
    const pass = passEl.value;
    if (!email || !pass) {
      showAuthError('Podaj e-mail i hasło.');
      return;
    }
    setBusy(true);
    try {
      if (authMode === 'login') {
        await auth.signInWithEmailAndPassword(email, pass);
      } else {
        await auth.createUserWithEmailAndPassword(email, pass);
      }
    } catch (err) {
      showAuthError(mapAuthError(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleGoogleSignIn() {
    hideAuthError();
    setBusy(true);
    try {
      const provider = new firebase.auth.GoogleAuthProvider();
      await auth.signInWithPopup(provider);
    } catch (err) {
      if (!err || err.code !== 'auth/popup-closed-by-user') {
        showAuthError(mapAuthError(err));
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleSignOut() {
    try {
      await auth.signOut();
    } catch (err) {
      toast('Błąd wylogowania: ' + (err && err.message ? err.message : err), 'error');
    }
  }

  window.toggleAuthMode = toggleAuthMode;
  window.handleAuthSubmit = handleAuthSubmit;
  window.handleGoogleSignIn = handleGoogleSignIn;
  window.handleSignOut = handleSignOut;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    handleAuthSubmit();
  });
  switchBtnEl.addEventListener('click', toggleAuthMode);
  submitBtn.addEventListener('click', handleAuthSubmit);
  googleBtn.addEventListener('click', handleGoogleSignIn);
  signOutButtons.forEach((id) => bindIfExists(id, 'click', handleSignOut));

  auth.onAuthStateChanged((user) => {
    window._currentUser = user;
    const emailBadge = document.getElementById('sidebar-user-email');
    const avatarBadge = document.getElementById('sidebar-user-avatar');

    if (user) {
      overlay.classList.add('hidden');
      if (emailBadge) emailBadge.textContent = user.email || '';
      if (avatarBadge) avatarBadge.textContent = (user.email || '?').charAt(0).toUpperCase();
      if (window._onUserSignedIn) window._onUserSignedIn(user);
    } else {
      overlay.classList.remove('hidden');
      if (emailBadge) emailBadge.textContent = '—';
      if (avatarBadge) avatarBadge.textContent = '?';
      if (window._onUserSignedOut) window._onUserSignedOut();
    }
  });
}
