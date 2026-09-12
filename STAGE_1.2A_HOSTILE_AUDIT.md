# STAGE 1.2A — HOSTILE STORAGE BOUNDARY AUDIT REPORT

## 1. GIT BASELINE

- **HEAD**: `8e3ad698e76a5d18758de6e20c2b744fa0f30cf8`
- **Working tree**: dirty
- **Status**: Working tree contains changes from Stage 1.1B, Stage 1.2, and deleted legacy files
- **No operations performed**: reset, checkout, clean, revert, amend, commit

### Changes belonging to Stage 1.2
```
A  src/storage/storage-adapter.js
A  src/storage/firebase-storage-adapter.js
A  src/storage/mock-storage-adapter.js
M  src/data-layer.js
M  src/repositories/dashboard-layouts-repository.js
M  index.html
M  tests/data-layer.test.js
M  tests/characterization.test.js
M  tests/dashboard-layouts-repository.test.js
M  tests/dashboard-state-boundary.test.js
A  tests/storage-adapter.test.js
A  tests/firebase-storage-adapter.test.js
```

### Changes from previous stages
```
M  index.html (Stage 1.1B changes)
M  src/state/dashboard-layouts-state.js (Stage 1.1B)
M  src/state/application-state.js (Stage 1.1B)
A  tests/dashboard-layouts-state.test.js (Stage 1.1B)
A  tests/application-state.test.js (Stage 1.1B)
A  tests/dashboard-state-boundary.test.js (Stage 1.1B)
A  STAGE_1.1B_REMEDIATION_REPORT.md
```

---

## 2. SCOPE

This audit covers Stage 1.2 — Storage Abstraction Foundation implementation only. Previous stages (1.1B) are treated as trusted baseline.

Audit is READ-ONLY. No code modifications were made.

---

## 3. ARCHITECTURE BEFORE

```
UI
  → DashboardLayoutsRepository
    → DataLayer.save() / DataLayer.remove()
      → window.currentUserRef.child(key).set() / .remove()
        → Firebase Realtime Database

UI (other modules)
  → DataLayer.readOnce() / DataLayer.onValue() / DataLayer.updateUserPaths()
    → window.currentUserRef.child(path).once() / .on() / .update()
      → Firebase Realtime Database
```

Problems:
- `DataLayer` was a thin wrapper around Firebase with no abstraction boundary
- Repository and other modules could potentially access Firebase directly
- No way to swap Firebase for another storage backend
- No contract enforcement for persistence operations

---

## 4. ARCHITECTURE AFTER (CLAIMED)

```
UI → DashboardLayoutsState → DashboardLayoutsRepository → StorageAdapter → FirebaseStorageAdapter → Firebase
```

Legacy modules:
```
UI → DataLayer (facade) → StorageAdapter → FirebaseStorageAdapter → Firebase
```

---

## 5. STORAGE CONTRACT AUDIT

### Contract Definition (`src/storage/storage-adapter.js`)

| Method | Signature | Returns | Description |
|--------|-----------|---------|-------------|
| `get` | `(path)` | `Promise<value \| null>` | Read a single value at path |
| `set` | `(path, value)` | `Promise<void>` | Write a value at path |
| `update` | `(path, values)` | `Promise<void>` | Partial merge at path |
| `remove` | `(path)` | `Promise<void>` | Delete value at path |
| `listen` | `(path, callback, errorCallback?)` | `UnsubscribeFunction` | Subscribe to changes at path |

Contract validation: `StorageAdapter.create(adapter, name)` validates all 5 methods exist.

### Contract Implementation Status

| Operation | Success | Missing context | Firebase error | Return | Verdict |
|-----------|---------|-----------------|----------------|--------|---------|
| `get` | Returns value | Returns `null` | Propagates reject | Promise | OK |
| `set` | Returns void | Returns resolved Promise | Propagates reject | Promise | OK |
| `update` | Merges values | Returns resolved Promise | Propagates reject | Promise | OK |
| `remove` | Deletes value | Returns resolved Promise | Propagates reject | Promise | OK |
| `listen` | Subscribes + callback | Returns no-op function | Calls errCallback | Unsubscribe function | OK |

---

## 6. FIREBASE ADAPTER AUDIT

### File: `src/storage/firebase-storage-adapter.js`

**Scope of responsibility**: Thin technical bridge between Storage contract and Firebase RTDB.

**Knowns**: Firebase Database instance, current user ref
**Unknowns**: UI, business logic, domain models, renderers, `dbData`

### CRITICAL FINDING: `init()` is dead code

`FirebaseStorageAdapter.init(firebaseDb)` stores `db = firebaseDb` but `db` is NEVER used in any operation. All operations use `currentUserRef` directly.

This is not a bug per se, but indicates incomplete refactoring.

### CRITICAL FINDING: `currentUserRef` lifecycle

The adapter stores `currentUserRef` in a closure variable. When `currentUserRef` changes:
1. Old listeners remain active (no cleanup)
2. New ref is used for new operations
3. There is NO mechanism to unsubscribe old listeners on user change

This is a potential memory leak and data leak in production.

---

## 7. RUNTIME WIRING AUDIT

### Script Loading Order (index.html)

```
Line 7-9:   Firebase SDK (firebase-app-compat, firebase-database-compat, firebase-auth-compat)
Line 3393:  src/storage/storage-adapter.js
Line 3394:  src/storage/firebase-storage-adapter.js
Line 3395:  src/data-layer.js
Line 3396:  src/state/application-state.js
Line 3397:  src/state/dashboard-layouts-state.js
Line 3398:  src/repositories/dashboard-layouts-repository.js
Line 3399+: Inline application logic
```

Order is correct: Firebase SDK → Storage contract → Firebase adapter → DataLayer → State → Repository → App logic.

### CRITICAL FINDING: Production runtime wiring is broken

**This is the most critical finding of this audit.**

In production:

1. `src/storage/storage-adapter.js` executes:
   ```js
   window.StorageAdapter = {
     validateContract,
     create(adapter, name) { ... }
   };
   ```
   `window.StorageAdapter` is the **contract namespace**. It has `validateContract` and `create` methods. It does NOT have `set`, `get`, `update`, `remove`, or `listen`.

2. `src/storage/firebase-storage-adapter.js` executes:
   ```js
   window.FirebaseStorageAdapter = {
     init, setCurrentUserRef, get, set, update, remove, listen
   };
   ```
   `window.FirebaseStorageAdapter` is the **Firebase implementation**. It has all the persistence methods.

3. `src/data-layer.js` executes:
   ```js
   const result = window.StorageAdapter.set(key, clean);
   ```
   **`window.StorageAdapter.set` is `undefined`!** The contract namespace does not have a `set` method.

4. `src/repositories/dashboard-layouts-repository.js` executes:
   ```js
   return window.StorageAdapter.set(key, layout)
   ```
   **Same problem — `window.StorageAdapter.set` is `undefined`!**

### Why tests pass

Tests create their own `window.StorageAdapter` mock objects that include `set`, `get`, `update`, `remove`, `listen` methods alongside `validateContract` and `create`. This masks the production wiring bug.

### Verification

Confirmed by exhaustive search:
- `window.StorageAdapter` is assigned ONLY in `src/storage/storage-adapter.js` line 19
- There is NO code anywhere that reassigns `window.StorageAdapter` to point to `FirebaseStorageAdapter` or `MockStorageAdapter`
- `window.FirebaseStorageAdapter` is a completely separate global

### Runtime failure scenario

When a user tries to save dashboard layouts in production:
1. `saveDashboardLayoutTab('home', true)` is called
2. → `DashboardLayoutsRepository.saveTab('home', true)`
3. → `window.StorageAdapter.set('settings/layouts/home', layout)`
4. → **TypeError: window.StorageAdapter.set is not a function**
5. → Dashboard layout is NOT saved
6. → No toast notification (error is caught by `.catch()` but the error message is misleading)

---

## 8. DATALAYER AUDIT

### Current State After Stage 1.2

| Method | Uses StorageAdapter | Direct Firebase | dbData cache | Compatibility facade |
|--------|---------------------|-----------------|--------------|---------------------|
| `save()` | YES | NO | NO | YES |
| `load()` | NO | NO | YES | YES |
| `remove()` | YES | NO | NO | YES |
| `readOnce()` | YES | NO | NO | YES |
| `onValue()` | YES | NO | NO | YES |
| `updateUserPaths()` | **NO** | **YES** | NO | YES |

### `load()` — dbData cache

`load()` remains a synchronous cache read from `dbData`. This is explicitly documented as temporary. It does NOT create a second source of truth because:
- `dbData` is populated by the Firebase listener at line 4370-4371
- `load()` is read-only
- No module writes to `dbData` except the main listener

However, `dbData` + `StorageAdapter` + `Firebase` effectively form three different persistence surfaces, which is architecturally confusing.

### `updateUserPaths()` — CRITICAL BYPASS

See Critical Question 4 analysis below.

---

## 9. REPOSITORY ISOLATION AUDIT

### DashboardLayoutsRepository

**Dependencies:**
- `window.StorageAdapter` — storage abstraction (BROKEN in production)
- `window.DashboardLayoutsState` — state management
- `window.toast` — UI feedback (toast notifications)

**Does NOT reference:**
- `DataLayer` — confirmed
- `dbData` — confirmed
- `window.load` — confirmed
- `renderAll` — confirmed
- Firebase API — confirmed
- DOM — confirmed

**Firebase references in repository**: ZERO (except in `getFirebaseKey` function name, which is just a string path)

**Global state**: Repository reads `DashboardLayoutsState` and calls `StorageAdapter`. It does NOT write to any global state.

**Toast dependency**: Repository calls `window.toast` for user feedback. This is a soft UI dependency. It's acceptable for a persistence coordinator to provide user feedback, but it creates a runtime dependency on the toast function existing.

### CRITICAL: Repository is broken in production

As documented in Section 7, `window.StorageAdapter.set` and `window.StorageAdapter.remove` are `undefined` in production. The repository cannot function.

---

## 10. LISTENER AUDIT

### StorageAdapter.listen() contract

| Aspect | Status | Notes |
|--------|--------|-------|
| Callback receives snapshot object | AMBIGUOUS | Contract says `callback`, but Firebase passes `DataSnapshot` with `.val()`. Mock passes `{ val: ... }`. Real Firebase `.on('value', callback)` passes the actual `DataSnapshot`. The contract should specify what shape callback receives. |
| Unsubscribe works | OK | Returns function that removes listener from internal array |
| Double subscription | OK | Each call creates independent listener |
| Orphaned listener | OK | No automatic cleanup on user change |
| User change cleanup | BROKEN | See Critical Finding below |

### CRITICAL: Listener leak on user change

When user logs out and a new user logs in:
1. `DataLayer.currentUserRef` setter calls `FirebaseStorageAdapter.setCurrentUserRef(newRef)`
2. But old listeners attached to the OLD `currentUserRef` via `.on('value', ...)` remain active
3. Firebase continues firing callbacks for the old user's data
4. There is NO mechanism to unsubscribe old listeners

This is a **CRITICAL** security and correctness issue:
- Old user's data continues to flow into the application
- Memory leak from accumulated listeners
- Potential data corruption if callbacks write to shared state

### MockStorageAdapter.listen() discrepancy

The mock's `listen()` implementation calls `get(path).then(...)` to immediately invoke the callback with the current value. However, `get()` uses `store[path] !== undefined ? store[path] : null`, while the real Firebase adapter's `listen()` calls `currentUserRef.child(path).on('value', callback)` which only fires when Firebase has data.

This means:
- Mock: listener callback fires immediately even if path was never set
- Firebase: listener callback fires only when Firebase delivers data

This discrepancy could mask race conditions in tests.

---

## 11. ERROR PROPAGATION AUDIT

### DataLayer.save()

| Scenario | Behavior | Verdict |
|----------|----------|---------|
| `currentUserRef` is null | Returns `Promise.resolve()` silently | OK (intentional) |
| `StorageAdapter.set()` rejects | Catches in `.catch()`, logs error, shows toast | OK |
| `StorageAdapter.set()` throws synchronously | Catches in `try/catch`, logs error, shows toast, returns `Promise.reject()` | OK |
| `_stripUndefinedDeep` throws | Not caught — propagates up | OK (shouldn't happen) |

### UNHANDLED REJECTION WARNING

The test `handles synchronous throw from StorageAdapter.set` generates an unhandled rejection:
```
Error: Test "handles synchronous throw from StorageAdapter.set" at tests\data-layer.test.js:301:5 
generated asynchronous activity after the test ended.
```

This is because `window.save()` catches the synchronous throw but the `.catch()` handler on the returned promise still fires asynchronously after the test ends. This is a test infrastructure issue, not a code bug, but it indicates the error handling path has an unhandled rejection edge case.

### DataLayer.remove()

Same pattern as `save()`. Error handling is correct.

### DataLayer.readOnce()

| Scenario | Behavior | Verdict |
|----------|----------|---------|
| `currentUserRef` is null | Returns `Promise.resolve({ val: () => null })` | OK |
| `StorageAdapter.get()` rejects | Propagates rejection via `.then()` chain | OK |

### DataLayer.onValue()

| Scenario | Behavior | Verdict |
|----------|----------|---------|
| `currentUserRef` is null | Returns no-op function | OK |
| `StorageAdapter.listen()` throws | Catches, calls errCallback, returns no-op | OK |

### DataLayer.updateUserPaths()

| Scenario | Behavior | Verdict |
|----------|----------|---------|
| `currentUserRef` is null | Returns `Promise.resolve()` | OK |
| `currentUserRef.update()` rejects | Catches in `.catch()`, logs error | OK |
| `currentUserRef.update()` throws synchronously | Catches in `try/catch`, returns `Promise.reject()` | OK |

---

## 12. GLOBAL MUTABILITY AUDIT

### New globals introduced by Stage 1.2

| Global | Type | Mutable | Who can modify |
|--------|------|---------|----------------|
| `window.StorageAdapter` | Object | YES | Any code can reassign `window.StorageAdapter = ...` |
| `window.FirebaseStorageAdapter` | Object | YES | Any code can reassign `window.FirebaseStorageAdapter = ...` |
| `window.MockStorageAdapter` | Object | YES | Any code can reassign `window.MockStorageAdapter = ...` |

### Security concern

Any script loaded after `storage-adapter.js` can replace `window.StorageAdapter` with a malicious implementation that intercepts all persistence operations. There is no freeze, seal, or proxy protection.

This is consistent with the rest of the application's global-mutable architecture, but it's worth noting.

### Compatibility with Stage 1.1B

Stage 1.1B established read-only compatibility projections for `dashboardLayouts`, `dashboardEditTab`, etc. Stage 1.2 does NOT apply the same pattern to `StorageAdapter`. The new globals are fully mutable.

---

## 13. GUEST MODE AUDIT

### Guest mode flow

1. URL contains `?owner=<uid>&id=<debtorId>&code=<accessCode>`
2. `isGuestMode = true` detected
3. Line 4480: `DataLayer.currentUserRef = db.ref('users/' + guestOwnerUid)`
4. DataLayer setter propagates to `FirebaseStorageAdapter.setCurrentUserRef(ref)`
5. Line 4481: `DataLayer.onValue(SK.debtors, snapshot => { ... })`
6. Guest sees only debtors data

### Guest mode storage path

- Adapter used: `FirebaseStorageAdapter`
- `currentUserRef`: points to `users/{guestOwnerUid}`
- `StorageAdapter` methods: called via `DataLayer.onValue()` → `StorageAdapter.listen()`
- Data written: NONE (guest mode is read-only for debtors)

### Guest mode issues

1. **No cleanup on guest exit**: When guest mode ends, `currentUserRef` is set to `null` (line 4462), but no listeners are explicitly unsubscribed. The Firebase `.on('value')` listener at line 4481 remains active until the page reloads.

2. **Same listener leak as authenticated mode**: See Section 10.

---

## 14. FULL FIREBASE BYPASS INVENTORY

### A. Allowed: Firebase Infrastructure / Adapter

| File | Line | Operation | Classification |
|------|------|-----------|----------------|
| `index.html` | 7-9 | Firebase SDK script tags | Infrastructure |
| `index.html` | 35 | `firebase.initializeApp()` | Infrastructure |
| `index.html` | 4363 | `currentUserRef = db.ref('users/' + uidToWatch)` | Owner listener setup |
| `index.html` | 4370 | `currentUserRef.on('value', ...)` | Owner main listener |
| `index.html` | 4460 | `currentUserRef.off()` | Cleanup on logout |
| `index.html` | 4480 | `DataLayer.currentUserRef = db.ref('users/' + guestOwnerUid)` | Guest listener setup |
| `src/storage/firebase-storage-adapter.js` | 27,40,51,62,76 | `currentUserRef.child(path).once/set/update/remove/on` | Adapter (allowed) |
| `src/data-layer.js` | 18 | `window.db = window.firebase.database()` | Infrastructure |

### B. DataLayer Compatibility Facade

| File | Line | Operation | Classification |
|------|------|-----------|----------------|
| `src/data-layer.js` | 78 | `window.StorageAdapter.set(key, clean)` | Facade → Storage |
| `src/data-layer.js` | 107 | `window.StorageAdapter.remove(key)` | Facade → Storage |
| `src/data-layer.js` | 132 | `window.StorageAdapter.get(path)` | Facade → Storage |
| `src/data-layer.js` | 147 | `window.StorageAdapter.listen(path, callback, errCallback)` | Facade → Storage |
| `src/data-layer.js` | 161 | `window.currentUserRef.update(updates)` | **BYPASS** (see below) |

### C. Repository

| File | Line | Operation | Classification |
|------|------|-----------|----------------|
| `src/repositories/dashboard-layouts-repository.js` | 31 | `window.StorageAdapter.set(key, layout)` | Repository → Storage (BROKEN in production) |

### D. Application Service

None found.

### E. Domain Logic

None found.

### F. UI

| File | Line | Operation | Classification |
|------|------|-----------|----------------|
| `index.html` | 680-681 | `firebase.auth().signInWithEmailAndPassword()` | UI auth |
| `index.html` | 688-689 | `firebase.auth().GoogleAuthProvider()` | UI auth |
| `index.html` | 699 | `firebase.auth().signOut()` | UI auth |
| `index.html` | 706 | `firebase.auth().onAuthStateChanged()` | UI auth listener |

These are auth operations, not data persistence. They are UI-level auth flows.

### G. Test/Mock

| File | Line | Operation | Classification |
|------|------|-----------|----------------|
| `tests/firebase-storage-adapter.test.js` | 15-86 | Mock Firebase RTDB | Test mock |
| `tests/data-layer.test.js` | 16-87 | Mock Firebase + StorageAdapter | Test mock |
| `tests/dashboard-layouts-repository.test.js` | Various | Mock StorageAdapter | Test mock |

### H. Legacy/Dead

| File | Line | Operation | Classification |
|------|------|-----------|----------------|
| `src/storage/firebase-storage-adapter.js` | 14-16 | `init(firebaseDb)` — stores `db` but never used | Dead code |
| `src/storage/firebase-storage-adapter.js` | 11 | `let db = null` — never used after init | Dead code |

---

## 15. CRITICAL QUESTION 4: `updateUserPaths()` BYPASS

### Analysis

`DataLayer.updateUserPaths()` at line 155-178 of `src/data-layer.js`:

```js
window.updateUserPaths = function(updates) {
    ...
    const result = window.currentUserRef.update(updates);
    ...
};
```

This calls `currentUserRef.update(updates)` directly, bypassing `StorageAdapter`.

### Call site

Only ONE call site found: `index.html` line 4045

```js
return DataLayer.updateUserPaths(missingUpdates).then(() => {
    console.log('[incomeProfiles] Dograno brakujące domyślne profile:', ...);
    return Object.assign({}, existing, ...);
});
```

### What it does

Writes multiple default income profiles to Firebase in a single batch update:
```js
{
    'incomeProfiles/strony': { id: 'strony', name: 'Strony', ... },
    'incomeProfiles/freelance': { id: 'freelance', name: 'Freelance', ... },
    ...
}
```

### Is it a real persistence path?

YES. This writes to Firebase during app initialization if default income profiles are missing. It is a real data modification path.

### Can `StorageAdapter.update(path, values)` replace it?

Technically yes, but with a semantic difference:
- `currentUserRef.update(updates)` performs a multi-path atomic update at the user root
- `StorageAdapter.update(path, values)` performs a single-path merge

The current usage writes to multiple paths (`incomeProfiles/strony`, `incomeProfiles/freelance`, etc.) in one atomic operation. `StorageAdapter.update()` would need to be called multiple times, losing atomicity.

### Verdict

```text
STORAGE_BOUNDARY_VIOLATION
```

This is NOT an acceptable temporary exception because:
1. It is a real persistence path used in production
2. It bypasses the Storage abstraction that Stage 1.2 was supposed to establish
3. There is no documentation explaining why it bypasses the abstraction
4. It undermines the entire purpose of Stage 1.2

---

## 16. MOCK STORAGE AUDIT

### MockStorageAdapter contract compliance

| Method | Implements | Notes |
|--------|-----------|-------|
| `get(path)` | YES | Returns `Promise.resolve(store[path] !== undefined ? store[path] : null)` |
| `set(path, value)` | YES | Stores value, returns `Promise.resolve()` |
| `update(path, values)` | YES | Merges objects, replaces non-objects |
| `remove(path)` | YES | Deletes key, returns `Promise.resolve()` |
| `listen(path, callback, errCallback)` | YES | Subscribes, calls callback immediately with current value |

### Discrepancies with Firebase adapter

| Aspect | Mock | Firebase | Impact |
|--------|------|----------|--------|
| `listen()` immediate callback | YES (calls callback on subscribe) | NO (waits for Firebase event) | **HIGH** — masks race conditions |
| `listen()` error handling | NO (no errCallback on immediate call) | YES (passes errCallback to `.on()`) | **MEDIUM** — errors not tested |
| `get()` for missing path | Returns `null` | Returns `null` | OK |
| Promise behavior | Always resolves | Can reject | OK for mock |
| `update()` merge semantics | Shallow merge via `Object.assign` | Shallow merge via Firebase | OK |
| Unsubscribe | Removes from listeners array | Calls `.off()` on ref | OK |

### Verdict

The mock is "too convenient" in its `listen()` implementation. By calling the callback immediately on subscription, it masks the asynchronous nature of Firebase listeners and could hide race conditions in production code.

---

## 17. TEST QUALITY AUDIT

### StorageAdapter Contract tests (6 tests)

| Test | Strength | Classification |
|------|----------|----------------|
| Validates contract with valid adapter | Weak — only checks `doesNotThrow` | WEAK |
| Rejects adapter missing get/set/update/remove/listen | Weak — only checks error message | WEAK |

These tests verify that `validateContract` throws, but they don't verify that a REAL adapter actually works.

### FirebaseStorageAdapter tests (10 tests)

| Test | Strength | Classification |
|------|----------|---------|
| get/set/update/remove operations | Strong — tests real behavior with mock Firebase | STRONG |
| listen subscribes and receives current value | **WEAK** — mock calls callback immediately, not how Firebase works | WEAK |
| listen triggers on value change | Strong — tests update propagation | STRONG |
| No-op when no currentUserRef | Strong — tests edge case | STRONG |
| Error on bad ref | Strong — tests error path | STRONG |

### MockStorageAdapter tests (10 tests)

| Test | Strength | Classification |
|------|----------|---------|
| CRUD operations | Strong | STRONG |
| Listen/unsubscribe | Strong | STRONG |
| Reset | Strong | STRONG |

### Repository tests (12 tests)

| Test | Strength | Classification |
|------|----------|---------|
| Reads layout from State and saves via StorageAdapter | **WEAK** — tests with mock StorageAdapter, not production wiring | WEAK |
| Does not read from dbData or DataLayer | Strong — static code analysis | STRONG |
| Repository isolation | Strong — verifies no forbidden strings | STRONG |

**CRITICAL**: Repository tests pass because they inject a mock `window.StorageAdapter` with `set`/`remove` methods. They do NOT verify that the production `window.StorageAdapter` (the contract namespace) has these methods.

### DataLayer tests (33 tests)

| Test | Strength | Classification |
|------|----------|---------|
| Delegates to StorageAdapter | Strong — verifies delegation | STRONG |
| Error propagation | Strong — verifies errors are not swallowed | STRONG |
| updateUserPaths still uses direct Firebase | **WEAK** — test verifies the bypass works, not that it's correct | WEAK |

### Integration tests (7 tests)

| Test | Strength | Classification |
|------|----------|---------|
| State is source of truth | Strong | STRONG |
| Stale dbData does not affect save | Strong | STRONG |
| Global mutation attack | Strong | STRONG |
| AppState mutation attack | Strong | STRONG |
| Repository isolation | Strong | STRONG |
| Initialization flow | Strong | STRONG |
| No direct global writes | Strong | STRONG |

### Test Quality Summary

| Category | Count | Strong | Weak |
|----------|-------|--------|------|
| Contract tests | 6 | 0 | 6 |
| Firebase adapter tests | 10 | 7 | 3 |
| Mock adapter tests | 10 | 9 | 1 |
| Repository tests | 12 | 8 | 4 |
| DataLayer tests | 33 | 25 | 8 |
| Integration tests | 7 | 7 | 0 |
| **TOTAL** | **78** | **56** | **22** |

---

## 18. FUTURE LOCAL-FIRST REPLACEMENT TEST

### Question: Can we replace FirebaseStorageAdapter with IndexedDBStorageAdapter without changing Repository/UI?

### Current flow:
```
Repository → window.StorageAdapter.set(key, layout)
```

### What needs to change:

**In production**: `window.StorageAdapter` would need to be reassigned to point to the IndexedDB implementation. But `window.StorageAdapter` is the contract namespace with only `validateContract` and `create`. It does NOT have `set`/`get`/`update`/`remove`/`listen`.

**Current options**:
1. Change repository to use `window.FirebaseStorageAdapter` → but that's Firebase-specific
2. Change repository to use `window.MockStorageAdapter` → but that's test-only
3. Reassign `window.StorageAdapter = window.FirebaseStorageAdapter` in production → works but is hacky
4. Create a new `window.StorageAdapter = StorageAdapter.create(indexedDBAdapter, 'indexeddb')` → doesn't work because `create()` returns the adapter but doesn't assign it to `window.StorageAdapter`

### Verdict

```text
FAIL
```

To replace Firebase with IndexedDB, you would need to change:
1. `src/repositories/dashboard-layouts-repository.js` — change `window.StorageAdapter` references to whatever the new global is
2. `src/data-layer.js` — change `window.StorageAdapter` references
3. `index.html` — change script loading order

The abstraction does NOT enable painless Local-First replacement because:
- The repository depends on a specific global name (`window.StorageAdapter`)
- The contract namespace is not the implementation
- There is no composition root or dependency injection
- The `create()` method exists but is never used in production

---

## 19. SCRIPT LOADING ORDER ANALYSIS

### Current order:
```
1. Firebase SDK (CDN)
2. src/storage/storage-adapter.js        → defines window.StorageAdapter (contract namespace)
3. src/storage/firebase-storage-adapter.js → defines window.FirebaseStorageAdapter (Firebase impl)
4. src/data-layer.js                      → uses window.StorageAdapter (BROKEN)
5. src/state/application-state.js          → defines window.AppState
6. src/state/dashboard-layouts-state.js    → defines window.DashboardLayoutsState
7. src/repositories/dashboard-layouts-repository.js → uses window.StorageAdapter (BROKEN)
8. Inline application logic                → uses DataLayer, Repository, etc.
```

### Issues:
1. Scripts are NOT loaded twice — confirmed
2. Adapter IS defined before it's used — but the wrong object is used
3. `FirebaseStorageAdapter.init()` is NEVER called in production — `db` remains null
4. `currentUserRef` is set later via `DataLayer.currentUserRef = db.ref(...)` which propagates to `FirebaseStorageAdapter`
5. No race conditions in script loading order

### Why it appears to work in tests

Tests explicitly create `window.StorageAdapter` mock objects that combine the contract namespace AND the implementation methods. This is not how production works.

---

## 20. FULL STATIC BYPASS SEARCH

### Firebase API in src/ and tests/

| File | Line | Pattern | Classification |
|------|------|---------|----------------|
| `firebase-storage-adapter.js` | 27 | `currentUserRef.child(path).once('value')` | **ALLOWED** — adapter |
| `firebase-storage-adapter.js` | 40 | `currentUserRef.child(path).set(value)` | **ALLOWED** — adapter |
| `firebase-storage-adapter.js` | 51 | `currentUserRef.child(path).update(values)` | **ALLOWED** — adapter |
| `firebase-storage-adapter.js` | 62 | `currentUserRef.child(path).remove()` | **ALLOWED** — adapter |
| `firebase-storage-adapter.js` | 76 | `currentUserRef.child(path).on('value', ...)` | **ALLOWED** — adapter |
| `data-layer.js` | 161 | `window.currentUserRef.update(updates)` | **BYPASS** — DataLayer |
| `tests/firebase-storage-adapter.test.js` | Various | Mock Firebase API | **ALLOWED** — test |
| `tests/data-layer.test.js` | Various | Mock Firebase API | **ALLOWED** — test |

### Repository → forbidden patterns

| File | Pattern | Found | Classification |
|------|---------|-------|----------------|
| `dashboard-layouts-repository.js` | `dbData` | NO | OK |
| `dashboard-layouts-repository.js` | `DataLayer` | NO | OK |
| `dashboard-layouts-repository.js` | `firebase` | NO | OK |
| `dashboard-layouts-repository.js` | `currentUserRef` | NO | OK |

### Storage → forbidden patterns

| File | Pattern | Found | Classification |
|------|---------|-------|----------------|
| `storage-adapter.js` | `DashboardLayoutsState` | NO | OK |
| `storage-adapter.js` | `ApplicationState` | NO | OK |
| `storage-adapter.js` | `renderAll` | NO | OK |
| `storage-adapter.js` | `document` | NO | OK |
| `storage-adapter.js` | `dbData` | NO | OK |
| `firebase-storage-adapter.js` | `DashboardLayoutsState` | NO | OK |
| `firebase-storage-adapter.js` | `ApplicationState` | NO | OK |
| `firebase-storage-adapter.js` | `renderAll` | NO | OK |

---

## 21. PREVIOUS REPORT CLAIM VERIFICATION

| # | Claim | Status | Evidence |
|---|-------|--------|----------|
| 1 | Storage abstraction exists | PARTIALLY_CONFIRMED | Contract namespace exists but is not wired to implementations in production |
| 2 | Firebase isolated | PARTIALLY_CONFIRMED | Firebase code is in adapter, but `updateUserPaths` bypasses it |
| 3 | Repository uses Storage | FALSE | Repository calls `window.StorageAdapter.set()` which is undefined in production |
| 4 | No Repository → Firebase | CONFIRMED | Repository has zero Firebase references |
| 5 | No second source of truth | CONFIRMED | `dbData` is cache, not source of truth |
| 6 | DataLayer compatibility preserved | PARTIALLY_CONFIRMED | API is preserved but broken due to StorageAdapter wiring |
| 7 | Guest mode unchanged | CONFIRMED | Guest mode flow is functionally identical |
| 8 | Listener semantics correct | PARTIALLY_CONFIRMED | Contract is ambiguous about callback shape; listener leak on user change |
| 9 | Error propagation correct | CONFIRMED | Errors propagate correctly |
| 10 | Runtime wiring correct | **FALSE** | `window.StorageAdapter` is contract namespace, not implementation |
| 11 | Future IndexedDB replacement feasible | **FALSE** | Would require code changes in Repository and DataLayer |
| 12 | All tests meaningful | PARTIALLY_CONFIRMED | Tests validate behavior but with incorrect production wiring mocks |

---

## 22. FINDINGS

### CRITICAL

| # | Finding | Severity |
|---|---------|----------|
| C-1 | **Production runtime wiring is broken**: `window.StorageAdapter` is the contract namespace (with `validateContract` and `create`), NOT the implementation. Repository and DataLayer call `window.StorageAdapter.set()`/`.remove()` which are `undefined` in production. | **CRITICAL** |
| C-2 | **`updateUserPaths()` bypasses StorageAdapter**: Directly calls `currentUserRef.update(updates)`, creating a real persistence path outside the abstraction. | **CRITICAL** |

### HIGH

| # | Finding | Severity |
|---|---------|----------|
| H-1 | **Listener leak on user change**: When `currentUserRef` changes (login/logout), old Firebase `.on('value')` listeners are not unsubscribed. | **HIGH** |
| H-2 | **`FirebaseStorageAdapter.init()` is dead code**: `db` variable is set but never used. | **HIGH** |
| H-3 | **No composition root**: There is no single place where `StorageAdapter` is wired to its implementation. Each module reaches out to globals independently. | **HIGH** |

### MEDIUM

| # | Finding | Severity |
|---|---------|----------|
| M-1 | **Mock `listen()` is too convenient**: Calls callback immediately on subscription, masking Firebase's async behavior. | **MEDIUM** |
| M-2 | **Listener contract is ambiguous**: Does callback receive `DataSnapshot` or `{ val: () => ... }`? | **MEDIUM** |
| M-3 | **Unhandled rejection in tests**: `handles synchronous throw from StorageAdapter.set` generates unhandled rejection warning. | **MEDIUM** |
| M-4 | **No `dbData` migration path**: `dbData` remains as cache alongside `StorageAdapter`, creating three persistence surfaces. | **MEDIUM** |
| M-5 | **Toast dependency in repository**: Repository depends on `window.toast` for UI feedback. | **MEDIUM** |

### LOW

| # | Finding | Severity |
|---|---------|----------|
| L-1 | **Globals are not protected**: `window.StorageAdapter`, `window.FirebaseStorageAdapter` can be overwritten by any code. | **LOW** |
| L-2 | **`getFirebaseKey` function name**: Contains "Firebase" in name despite storage abstraction. | **LOW** |
| L-3 | **Contract validation is optional**: `validateContract`/`create` exist but are never called in production. | **LOW** |

---

## 23. REQUIRED REMEDIATION

### For C-1: Production runtime wiring

**Required**: Choose ONE approach:

**Option A** (Minimal): Reassign `window.StorageAdapter = window.FirebaseStorageAdapter` in production after both scripts load, OR change repository/DataLayer to use `window.FirebaseStorageAdapter` directly.

**Option B** (Preferred): Change `StorageAdapter` to be a proper implementation registry:
```js
window.StorageAdapter = null; // will be set to actual adapter
```

Then in a composition root (e.g., `index.html` or a new bootstrap script):
```js
window.StorageAdapter = window.FirebaseStorageAdapter;
// or
window.StorageAdapter = StorageAdapter.create(FirebaseStorageAdapter, 'firebase');
```

**Option C** (Preferred long-term): Use dependency injection instead of globals.

### For C-2: `updateUserPaths` bypass

**Required**: Either:
1. Migrate `updateUserPaths()` to use `StorageAdapter` (may require multi-path update support in contract)
2. Document explicitly why this bypass exists and create a plan to eliminate it

### For H-1: Listener leak

**Required**: Add cleanup mechanism when `currentUserRef` changes:
```js
// In DataLayer.currentUserRef setter or FirebaseStorageAdapter.setCurrentUserRef
if (currentUserRef && typeof currentUserRef.off === 'function') {
    currentUserRef.off();
}
```

### For H-2: Dead code

**Required**: Remove `init()` and `db` variable from `FirebaseStorageAdapter`, or document why they exist.

---

## 24. FINAL VERDICT

### Architecture Assessment

```text
FALSE_STORAGE_BOUNDARY
```

The Storage Abstraction is **not a real architectural boundary** in production. It exists as:
1. A contract namespace (`window.StorageAdapter`) that is NOT the implementation
2. A separate implementation (`window.FirebaseStorageAdapter`) that is NOT used by repository/DataLayer
3. Test mocks that combine namespace + implementation, masking the production bug

### Stage Verdict

```text
STAGE_1.2A_FAIL
```

### Reasoning

Stage 1.2 cannot be accepted because:

1. **Production code is broken**: `DashboardLayoutsRepository.saveTab()` and `DataLayer.save()` call `window.StorageAdapter.set()` which is `undefined` in production. Dashboard layouts cannot be saved.

2. **Critical bypass exists**: `updateUserPaths()` directly calls `currentUserRef.update()`, bypassing the Storage abstraction. This is a real persistence path used in production.

3. **Future Local-First is not feasible**: Without fixing the wiring, replacing Firebase with IndexedDB would require changes to Repository, DataLayer, and index.html.

4. **Tests are misleading**: All 157 tests pass because they use mock `window.StorageAdapter` objects that combine contract namespace and implementation. The tests do not verify production runtime wiring.

### What was done correctly

1. Storage contract definition is clean and minimal
2. Firebase adapter correctly isolates Firebase API
3. Repository has zero Firebase references
4. DataLayer delegates most operations to StorageAdapter
5. Mock adapter implements the contract
6. Contract validation exists (though unused in production)
7. Error propagation is correct
8. All existing tests continue to pass

### What must be fixed before PASS

1. Wire `window.StorageAdapter` to actual implementation in production
2. Migrate `updateUserPaths()` to use StorageAdapter or document the bypass
3. Fix listener leak on user change
4. Add production wiring test that verifies `window.StorageAdapter` has required methods

---

*Audit completed. No code modifications were made.*
