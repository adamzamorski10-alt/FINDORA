export function openModal({
  title,
  content,
  onClose,
  onSubmit,
  submitLabel = 'Save',
  cancelLabel = 'Cancel',
  width = '520px',
}) {
  if (typeof document === 'undefined' || !document.body) {
    if (typeof onClose === 'function') onClose('invalid');
    return {
      close() {},
      element: null,
      backdrop: null,
      submitButton: null,
    };
  }
  const trigger = document.activeElement;
  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';

  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.style.width = width;
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.setAttribute('aria-labelledby', 'modal-title-id');

  modal.innerHTML = `
    <div class="modal-header">
      <h2 class="modal-title" id="modal-title-id">${escapeHtml(title)}</h2>
      <button class="modal-close" aria-label="Close modal">&times;</button>
    </div>
    <div class="modal-body"></div>
    <div class="modal-footer">
      <button class="btn btn-secondary modal-cancel">${escapeHtml(cancelLabel)}</button>
      <button class="btn btn-primary modal-submit">${escapeHtml(submitLabel)}</button>
    </div>
  `;

  const bodyEl = modal.querySelector('.modal-body');
  if (typeof content === 'string') {
    bodyEl.innerHTML = content;
  } else if (content && typeof content.appendChild === 'function') {
    bodyEl.appendChild(content);
  }

  backdrop.appendChild(modal);
  document.body.appendChild(backdrop);

  function close(result) {
    backdrop.remove();
    if (trigger && typeof trigger.focus === 'function') {
      trigger.focus();
    }
    if (typeof onClose === 'function') onClose(result);
  }

  modal.querySelector('.modal-close').addEventListener('click', () => close('close'));
  modal.querySelector('.modal-cancel').addEventListener('click', () => close('cancel'));
  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) close('backdrop');
  });

  if (typeof onSubmit === 'function') {
    modal.querySelector('.modal-submit').addEventListener('click', () => {
      onSubmit();
    });
  }

  function handleEscape(e) {
    if (e.key === 'Escape') {
      close('escape');
      document.removeEventListener('keydown', handleEscape);
    }
  }
  document.addEventListener('keydown', handleEscape);

  requestAnimationFrame(() => {
    const firstInput = modal.querySelector('input, select, textarea, button');
    if (firstInput) firstInput.focus();
  });

  return {
    close,
    element: modal,
    backdrop,
    submitButton: modal.querySelector('.modal-submit'),
  };
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
