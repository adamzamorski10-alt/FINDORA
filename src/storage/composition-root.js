/**
 * Stage 1.2B — Composition Root
 *
 * Wires the active StorageAdapter implementation.
 * Must run after FirebaseStorageAdapter is defined and after Firebase is initialized.
 */

(function() {
  'use strict';

  if (typeof window.StorageAdapterContract !== 'object' || !window.StorageAdapterContract) {
    console.warn('[CompositionRoot] StorageAdapterContract not available');
    return;
  }

  if (typeof window.FirebaseStorageAdapter !== 'object' || !window.FirebaseStorageAdapter) {
    console.warn('[CompositionRoot] FirebaseStorageAdapter not available');
    return;
  }

  try {
    window.StorageAdapterContract.create(window.FirebaseStorageAdapter, 'firebase');
    window.setActiveStorageAdapter(window.FirebaseStorageAdapter, 'firebase');
    console.log('[CompositionRoot] Active StorageAdapter set to FirebaseStorageAdapter');
  } catch (e) {
    console.error('[CompositionRoot] Failed to set active StorageAdapter:', e);
  }
})();
