export function showModal({ title, bodyHTML, footerHTML, onClose, size = 'md' }) {
  if (typeof document === 'undefined' || !document.body) {
    return () => {};
  }
  let trigger = document.activeElement;
  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';

  const dialog = document.createElement('div');
  dialog.className = `modal modal-${size}`;
  dialog.setAttribute('role', 'dialog');
  dialog.setAttribute('aria-modal', 'true');
  dialog.setAttribute('aria-label', title || 'Dialog');

  if (title) {
    const header = document.createElement('div');
    header.className = 'modal-header';
    const titleEl = document.createElement('h2');
    titleEl.className = 'modal-title';
    titleEl.textContent = title;
    header.appendChild(titleEl);
    dialog.appendChild(header);
  }

  const body = document.createElement('div');
  body.className = 'modal-body';
  if (typeof bodyHTML === 'string') {
    body.innerHTML = bodyHTML;
  } else if (bodyHTML && typeof bodyHTML.appendChild === 'function') {
    body.appendChild(bodyHTML);
  }
  dialog.appendChild(body);

  if (footerHTML) {
    const footer = document.createElement('div');
    footer.className = 'modal-footer';
    if (typeof footerHTML === 'string') {
      footer.innerHTML = footerHTML;
    } else if (footerHTML && typeof footerHTML.appendChild === 'function') {
      footer.appendChild(footerHTML);
    }
    dialog.appendChild(footer);
  }

  backdrop.appendChild(dialog);
  document.body.appendChild(backdrop);

  function finish() {
    backdrop.remove();
    if (trigger && typeof trigger.focus === 'function') {
      trigger.focus();
    }
    if (typeof onClose === 'function') onClose();
    document.removeEventListener('keydown', handleEscape);
  }

  function handleEscape(e) {
    if (e.key === 'Escape') {
      finish();
    }
  }
  document.addEventListener('keydown', handleEscape);

  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) finish();
  });

  const raf = typeof requestAnimationFrame === 'function' ? requestAnimationFrame : (cb) => setTimeout(cb, 0);
  raf(() => {
    const focusable = dialog.querySelector('input, select, button, textarea, [tabindex]');
    if (focusable) focusable.focus();
  });

  return finish;
}

export function showToast({ message, type = 'info' }) {
  if (typeof document === 'undefined' || !document.body) {
    return;
  }
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.setAttribute('role', 'status');
  toast.setAttribute('aria-live', 'polite');
  toast.textContent = message;
  document.body.appendChild(toast);

  toast.offsetHeight;

  setTimeout(() => {
    toast.classList.add('toast-exit');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

export function showConfirm({ message, title = 'Confirm' }) {
  if (typeof document === 'undefined' || !document.body) {
    return Promise.resolve(false);
  }
  let trigger = document.activeElement;
  return new Promise((resolve) => {
    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop';

    const dialog = document.createElement('div');
    dialog.className = 'modal modal-sm';
    dialog.setAttribute('role', 'alertdialog');
    dialog.setAttribute('aria-modal', 'true');

    dialog.innerHTML = `
      <div class="modal-header">
        <h2 class="modal-title">${escapeHtml(title)}</h2>
      </div>
      <div class="modal-body">
        <p>${escapeHtml(message)}</p>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary confirm-cancel">Cancel</button>
        <button class="btn btn-danger confirm-ok">Confirm</button>
      </div>
    `;

    backdrop.appendChild(dialog);
    document.body.appendChild(backdrop);

    function finish(result) {
      backdrop.remove();
      if (trigger && typeof trigger.focus === 'function') {
        trigger.focus();
      }
      resolve(result);
    }

    dialog.querySelector('.confirm-ok').addEventListener('click', () => finish(true));
    dialog.querySelector('.confirm-cancel').addEventListener('click', () => finish(false));
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) finish(false);
    });

    function handleEscape(e) {
      if (e.key === 'Escape') {
        finish(false);
        document.removeEventListener('keydown', handleEscape);
      }
    }
    document.addEventListener('keydown', handleEscape);

    requestAnimationFrame(() => {
      const firstBtn = dialog.querySelector('button');
      if (firstBtn) firstBtn.focus();
    });
  });
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
