# STAGE 1.0A HOSTILE AUDIT REPORT

## 1. Git Baseline

**HEAD:** `8e3ad698e76a5d18758de6e20c2b744fa0f30cf8`

**Working tree status:**
```
D  INSTRUKCJA.md
D  css/style.css
M  index.html
D  js/app.js
D  js/auth.js
D  js/firebase-config.js
D  js/ui.js
D  popsuty.html
D  src/userData.js
D  "stary v11.html"
?? FINORA_DOKLADNY_PLAN_ROZBUDOWY.txt
?? STAGE_0.3_DATA_INVENTORY.md
?? STAGE_0.3_FINAL_REPORT.md
?? STAGE_0.3_GIT_BASELINE.md
?? STAGE_1.0_ARCHITECTURE_AUDIT.md
?? STAGE_1.0_FINAL_REPORT.md
?? _extracted.js
?? backup/
?? fixtures/
?? node_modules/
?? src/data-layer.js
?? tests/
```

**Diff stat:** `index.html` | 3329 insertions(+), 393 deletions(-)

**Assessment:** Working tree is dirty as expected from Stage 0.3/1.0 work. No destructive Git operations detected. `DEPLOYED_RULES_UNVERIFIED` and `AUTHENTICATED_RUNTIME_UNVERIFIED` remain.

---

## 2. Direct Firebase Access Audit

### Classification Legend
- **A** — Through new Data Layer
- **B** — Direct access from UI/application
- **C** — Initialization/configuration
- **D** — Test/mock
- **E** — Legacy/dead code
- **F** — Unknown

### 2.1 `index.html` — Production Code

| Line | Function/Context | Operation | Classification | Evidence |
|------|------------------|-----------|----------------|----------|
| 35 | `<script>` (Firebase init) | `firebase.initializeApp(firebaseConfig)` | C | `CONFIRMED` |
| 680 | `handleAuthSubmit()` | `firebase.auth().signInWithEmailAndPassword()` | C | `CONFIRMED` |
| 688 | `handleGoogleSignIn()` | `firebase.auth().signInWithPopup()` | C | `CONFIRMED` |
| 699 | `handleSignOut()` | `firebase.auth().signOut()` | C | `CONFIRMED` |
| 706 | `onAuthStateChanged` | `firebase.auth().onAuthStateChanged()` | C | `CONFIRMED` |
| 3589 | `ensureDashboardLayouts()` | `currentUserRef.child(SK.dashboardLayouts).remove()` | **B** | `CONFIRMED` |
| 3610 | `saveDashboardLayoutTab()` | `currentUserRef.child('settings/layouts/' + tab).set(clean)` | **B** | `CONFIRMED` |
| 3990 | `ensureIncomeProfilesExist()` | `db.ref('users/' + userId + '/incomeProfiles').once('value')` | **B** | `CONFIRMED` |
| 3998 | `ensureIncomeProfilesExist()` | `ref.set(DEFAULT_INCOME_PROFILES)` | **B** | `CONFIRMED` |
| 4016 | `ensureIncomeProfilesExist()` | `db.ref('users/' + userId).update(missingUpdates)` | **B** | `CONFIRMED` |
| 4308 | `saveNewIncomeProfile()` | `currentUserRef.child('incomeProfiles/' + newId).set(newProfile)` | **B** | `CONFIRMED` |
| 4313 | `saveNewIncomeProfile()` | `currentUserRef.child('incomeProfiles').once('value')` | **B** | `CONFIRMED` |
| 4334 | `startOwnerListener()` | `db.ref('users/' + uidToWatch)` | **B** | `CONFIRMED` |
| 4341 | `startOwnerListener()` | `currentUserRef.on('value', snapshot => ...)` | A | `CONFIRMED` (uses `save()` via `window.save`) |
| 4452 | Guest mode init | `db.ref('users/' + guestOwnerUid)` | **B** | `CONFIRMED` |
| 4453 | Guest mode init | `currentUserRef.child(SK.debtors).on('value', ...)` | **B** | `CONFIRMED` |

### 2.2 `src/data-layer.js` — Extracted Module

| Line | Function/Context | Operation | Classification | Evidence |
|------|------------------|-----------|----------------|----------|
| 17 | IIFE init | `window.db = window.firebase.database()` | C | `CONFIRMED` |
| 76 | `save()` | `window.currentUserRef.child(key).set(clean)` | A | `CONFIRMED` |
| 101-102 | DataLayer API | `currentUserRef` getter/setter | A | `CONFIRMED` |

### 2.3 `_extracted.js` — Legacy/Dead Code

| Line | Function/Context | Operation | Classification | Evidence |
|------|------------------|-----------|----------------|----------|
| 17 | Firebase init | `firebase.initializeApp(firebaseConfig)` | E | `CONFIRMED` (not loaded by index.html) |
| 77 | Auth | `firebase.auth().signInWithEmailAndPassword()` | E | `CONFIRMED` |
| 85 | Auth | `firebase.auth().signInWithPopup()` | E | `CONFIRMED` |
| 96 | Auth | `firebase.auth().signOut()` | E | `CONFIRMED` |
| 103 | Auth | `firebase.auth().onAuthStateChanged()` | E | `CONFIRMED` |
| 314 | `ensureDashboardLayouts()` | `currentUserRef.child(SK.dashboardLayouts).remove()` | E | `CONFIRMED` |
| 335 | `saveDashboardLayoutTab()` | `currentUserRef.child('settings/layouts/' + tab).set(clean)` | E | `CONFIRMED` |
| 673 | `save()` | `currentUserRef.child(key).set(clean)` | E | `CONFIRMED` |
| 809 | `ensureIncomeProfilesExist()` | `db.ref('users/' + userId + '/incomeProfiles').once('value')` | E | `CONFIRMED` |
| 835 | `ensureIncomeProfilesExist()` | `db.ref('users/' + userId).update(missingUpdates)` | E | `CONFIRMED` |
| 1127 | `saveNewIncomeProfile()` | `currentUserRef.child('incomeProfiles/' + newId).set(newProfile)` | E | `CONFIRMED` |
| 1132 | `saveNewIncomeProfile()` | `currentUserRef.child('incomeProfiles').once('value')` | E | `CONFIRMED` |
| 1153 | `startOwnerListener()` | `db.ref('users/' + uidToWatch)` | E | `CONFIRMED` |
| 1160 | `startOwnerListener()` | `currentUserRef.on('value', ...)` | E | `CONFIRMED` |
| 1263 | Guest mode | `db.ref('users/' + guestOwnerUid)` | E | `CONFIRMED` |
| 1264 | Guest mode | `currentUserRef.child(SK.debtors).on('value', ...)` | E | `CONFIRMED` |

### 2.4 `tests/` — Test/Mock Code

All Firebase access in tests is mock-based. See Section 10 for details.

---

## 3. Data Layer Audit

### 3.1 `save()`

**Location:** `src/data-layer.js:69-91`

**Behavior:**
- Checks `window.currentUserRef` — returns early with `console.warn` if null
- Calls `window._stripUndefinedDeep(data)` to sanitize
- Calls `window.currentUserRef.child(key).set(clean)`
- Attaches `.catch()` for async errors → `console.error` + `window.toast`
- Wraps synchronous throws in try/catch → `console.error` + `window.toast`

**Semantic equivalence with original:** `CONFIRMED` — matches original behavior from `index.html` lines 3938-3958.

**Data mutation:** Does NOT mutate input data. Creates new object via `_stripUndefinedDeep`.

### 3.2 `load()`

**Location:** `src/data-layer.js:52-54`

**Behavior:**
- Returns `window.dbData[key]` if defined, otherwise fallback `fb`
- No side effects

**Semantic equivalence:** `CONFIRMED` — matches original `index.html` lines 3913-3915.

### 3.3 `dbData`

**Owner:** `src/data-layer.js` (via `window.dbData`)

**Writers:**
- `startOwnerListener()` in `index.html:4342` — `dbData = snapshot.val() || {}`
- `resetLocalAppState()` in `index.html:3909` — `dbData = {}`
- `DataLayer` setter in `src/data-layer.js:100`

**Readers:**
- `load()` in `src/data-layer.js:52`
- `ensureDashboardLayouts()` in `index.html:3569`
- `loadVintedPricesFromStorage()` in `index.html:21408`
- Various `dbData[SK_VINTED]` reads

**Lifecycle:** Global mutable singleton. Created at module init, replaced on every Firebase snapshot, cleared on logout.

**Assessment:** `dbData` remains a global mutable singleton. The extraction did NOT reduce coupling — it merely moved the declaration to a different file. All readers/writers in `index.html` still access the same global reference.

### 3.4 `currentUserRef`

**Owner:** `src/data-layer.js` (via `window.currentUserRef`)

**Writers:**
- `startOwnerListener()` in `index.html:4334` — `db.ref('users/' + uidToWatch)`
- Guest mode init in `index.html:4452` — `db.ref('users/' + guestOwnerUid)`
- `stopOwnerListener()` in `index.html:4434` — `null`
- `DataLayer` setter in `src/data-layer.js:102`

**Readers:**
- `save()` in `src/data-layer.js:70`
- `saveDashboardLayoutTab()` in `index.html:3602`
- Various direct `.child().set()` calls

**Parallel references:** `CONFIRMED` — `currentUserRef` is created directly in `index.html` via `db.ref(...)` and also via the DataLayer setter. There is no second "parallel" reference, but the direct creation bypasses any potential future abstraction.

### 3.5 `SK`

**Owner:** `src/data-layer.js` (via `window.SK`)

**Readers:**
- Extensive — all `save(SK.xxx, ...)` calls in `index.html`
- Direct access in `index.html:3589`, `4453`, etc.

**Assessment:** `SK` is read-only after initialization. No coupling issues.

---

## 4. Window Export Audit

| Export | Reason | Consumer | Temporary/Permanent |
|--------|--------|----------|---------------------|
| `window.db` | Firebase Database ref | `index.html` inline script | Permanent |
| `window.dbData` | Local cache for `load()` | `index.html` inline script | Permanent |
| `window.initialLoadDone` | First-load guard | `index.html` inline script | Permanent |
| `window._resaleShippingToastShown` | One-time toast flag | `index.html` inline script | Permanent |
| `window.currentUserRef` | Active user path | `index.html` inline script, `save()` | Permanent |
| `window.currentUid` | Active user ID | `index.html` inline script | Permanent |
| `window.SK` | Collection key map | `index.html` inline script | Permanent |
| `window.load` | Cache lookup | `index.html` inline script | Permanent |
| `window._stripUndefinedDeep` | Sanitization | `index.html` inline script, `saveDashboardLayoutTab()` | Permanent |
| `window.save` | Centralized write | `index.html` inline script | Permanent |
| `window.DataLayer` | Future direct API | Tests only | Permanent |

**Assessment:** `window.*` exports are necessary for backward compatibility with inline scripts. The number of exports is reasonable for the scope. `DataLayer` is an additional API surface that was not present before Stage 1.0.

---

## 5. Duplicate Implementation Audit

**Result:** NO duplicate implementations found.

- `save()` is defined ONLY in `src/data-layer.js`
- `load()` is defined ONLY in `src/data-layer.js`
- `_stripUndefinedDeep()` is defined ONLY in `src/data-layer.js`
- `SK` is defined ONLY in `src/data-layer.js`
- `dbData` is initialized ONLY in `src/data-layer.js`
- `currentUserRef` is initialized ONLY in `src/data-layer.js`

`index.html` does NOT redefine any of these. It relies on the `window.*` attachments from `data-layer.js`.

**Legacy duplicate:** `_extracted.js` contains old inline definitions but is NOT loaded by `index.html`. It is dead code.

---

## 6. Listener Architecture

### 6.1 Owner Listener

| Attribute | Value |
|-----------|-------|
| Creation point | `index.html:4341` — `currentUserRef.on('value', snapshot => ...)` |
| Trigger | `startOwnerListener(uidToWatch)` |
| Callback | Replaces `dbData`, re-populates ALL global arrays, calls `renderAll()` |
| State mutation | `dbData`, all `transactions[]`, `debtors[]`, etc. |
| Render trigger | `renderAll()` + `applyThemeIcons()` + `scheduleNotifications()` + `autoCheckRecurring()` |
| Unsubscribe | `index.html:4432` — `currentUserRef.off()` in `stopOwnerListener()` |

### 6.2 Guest Listener

| Attribute | Value |
|-----------|-------|
| Creation point | `index.html:4453` — `currentUserRef.child(SK.debtors).on('value', ...)` |
| Trigger | Guest mode init (`?view=debt&owner=<uid>`) |
| Callback | Replaces `debtors[]`, resolves `guestDebtorRef`, calls `renderGuestView()` |
| State mutation | `debtors`, `guestDebtorRef` |
| Render trigger | `renderGuestView()` |
| Unsubscribe | Not explicitly unsubscribed (relies on page unload) |

### 6.3 Stage 1.0 Impact

**CONFIRMED:** Stage 1.0 did NOT create additional listeners. The listener architecture is unchanged.

---

## 7. `renderAll()` Audit

**Location:** `index.html:21104-21152`

**Call sites (selected):**
- After owner listener snapshot (line ~4512)
- After transaction CRUD
- After debt operations
- After goal operations
- After budget operations
- After recurring booking
- After creditor/loan operations
- After privacy mode toggle

**Flow:**
```
Firebase snapshot
  → dbData = snapshot.val()
  → load(SK.xxx, fallback) for each collection
  → renderAll()
    → renderHome()
    → renderTransactions()
    → renderDebtors()
    → renderGoals()
    → conditional renders per active tab
    → lucide.createIcons()
```

**Assessment:** `renderAll()` flow is semantically unchanged. Stage 1.0 did not modify the render pipeline.

---

## 8. `save()`/`load()` Call-Site Coverage

### 8.1 `save()` Call Sites Using Data Layer (A)

| Domain | Key | Count | Via Data Layer? |
|--------|-----|-------|-----------------|
| Transactions | `finapp_transactions` | ~25 | YES — `save(SK.transactions, ...)` |
| Debtors | `finapp_debtors` | ~20 | YES — `save(SK.debtors, ...)` |
| Budgets | `finapp_budgets` | ~5 | YES — `save(SK.budgets, ...)` |
| Goals | `finapp_goals` | ~6 | YES — `save(SK.goals, ...)` |
| Recurring | `finapp_recurring` | ~8 | YES — `save(SK.recurring, ...)` |
| Creditors | `finapp_creditors` | ~10 | YES — `save(SK.creditors, ...)` |
| Auto-save rules | `finapp_autosave_rules` | ~3 | YES — `save(SK.autoSaveRules, ...)` |
| Rule targets | `finapp_rule_targets` | ~1 | YES — `save(SK.ruleTargets, ...)` |
| Templates | `finapp_templates` | ~4 | YES — `save(SK.templates, ...)` |
| Strony products | `finapp_strony_products` | ~6 | YES — `save(SK.stronyProducts, ...)` |
| Resale products | `finapp_resale_products` | ~15 | YES — `save(SK.resaleProducts, ...)` |
| Resale sales | `finapp_resale_sales` | ~20 | YES — `save(SK.resaleSales, ...)` |
| Resale tasks | `finapp_resale_tasks` | ~5 | YES — `save(SK.resaleTasks, ...)` |
| Resale shipments | `finapp_resale_shipments` | ~10 | YES — `save(SK.resaleShipments, ...)` |
| Resale events | `finapp_resale_events` | ~10 | YES — `save(SK.resaleEvents, ...)` |
| Resale settings | `finapp_resale_settings` | ~1 | YES — `save(SK.resaleSettings, ...)` |
| Giełda ops | `finapp_gielda_ops` | ~3 | YES — `save(SK.gieldaOps, ...)` |
| Strony clients | `finapp_strony_clients` | ~10 | YES — `save(SK.stronyClients, ...)` |
| Income sources | `finapp_income_sources` | ~3 | YES — `save(SK.incomeSources, ...)` |
| Local settings | `finapp_active_money_place` etc. | ~5 | YES — `save('finapp_xxx', ...)` |

### 8.2 Direct Firebase Bypasses (B)

| Line | Function | Operation | Bypass Type |
|------|----------|-----------|-------------|
| 3589 | `ensureDashboardLayouts()` | `currentUserRef.child(SK.dashboardLayouts).remove()` | Direct DELETE |
| 3610 | `saveDashboardLayoutTab()` | `currentUserRef.child('settings/layouts/' + tab).set(clean)` | Direct WRITE |
| 3990 | `ensureIncomeProfilesExist()` | `db.ref('users/' + userId + '/incomeProfiles').once('value')` | Direct READ |
| 3998 | `ensureIncomeProfilesExist()` | `ref.set(DEFAULT_INCOME_PROFILES)` | Direct WRITE |
| 4016 | `ensureIncomeProfilesExist()` | `db.ref('users/' + userId).update(missingUpdates)` | Direct UPDATE |
| 4308 | `saveNewIncomeProfile()` | `currentUserRef.child('incomeProfiles/' + newId).set(newProfile)` | Direct WRITE |
| 4313 | `saveNewIncomeProfile()` | `currentUserRef.child('incomeProfiles').once('value')` | Direct READ |
| 4453 | Guest mode init | `currentUserRef.child(SK.debtors).on('value', ...)` | Direct LISTENER |

### 8.3 `load()` Call Sites

| Line | Context | Key | Fallback | Via Data Layer? |
|------|---------|-----|----------|-----------------|
| 4437 | `startOwnerListener()` | `SK.transactions` | `[]` | YES |
| 4438 | `startOwnerListener()` | `SK.debtors` | `[]` | YES |
| 4448 | `startOwnerListener()` | `SK.ruleTargets` | `{ needs:50, wants:30, savings:20 }` | YES |
| 4902 | Init | `'finapp_active_money_place'` | `'konto'` | YES |

All `load()` calls use the Data Layer.

---

## 9. Guest Mode Audit

### 9.1 Path Construction

```javascript
// index.html:4452
currentUserRef = db.ref('users/' + guestOwnerUid);
```

**Classification:** **B** — Direct Firebase path construction. Bypasses any potential abstraction.

### 9.2 Listener

```javascript
// index.html:4453
currentUserRef.child(SK.debtors).on('value', snapshot => {
  debtors = snapshot.val() || [];
  guestDebtorRef = debtors.find(x => x.id === guestDebtorId) || null;
  renderGuestView();
});
```

**Classification:** **B** — Direct listener on sub-node. Bypasses Data Layer.

### 9.3 Guest Writes

Guest mode writes (`guestAddDebt`, `guestDeleteDebt`, `guestEditDebt`, `guestMarkPaid`) all use `save(SK.debtors, debtors)` — **A** (through Data Layer).

### 9.4 Access Control

Guest edit permission is checked client-side via `guestCanEdit(d)` which reads `d.shareSettings.allowEdit`. No Firebase Security Rules enforcement.

**Assessment:** Stage 1.0 did NOT change guest mode. The direct Firebase access for guest listener and path construction remains. `DEPLOYED_FIREBASE_RULES = UNVERIFIED`.

---

## 10. Test Quality Audit

### 10.1 Test Count

| Suite | Tests | Pass | Fail |
|-------|-------|------|------|
| `tests/backup-restore.test.js` | 28 | 28 | 0 |
| `tests/data-layer.test.js` | 20 | 20 | 0 |
| `tests/characterization.test.js` | 17 | 17 | 0 |
| **TOTAL** | **65** | **65** | **0** |

### 10.2 Test Quality Findings

| ID | Finding | Severity | Evidence |
|----|---------|----------|----------|
| TQ-1 | `data-layer.test.js` tests `data-layer.js` in isolation, not integrated with `index.html` | MEDIUM | Tests use `new Function('window', dataLayerCode)` to execute the module in a mock window. They do NOT verify that `index.html`'s inline script correctly resolves `save()`, `load()`, etc. from `window`. |
| TQ-2 | `characterization.test.js` documents desired shapes, not actual runtime shapes | LOW | Fixtures define expected shapes, but the app may contain records with additional/missing fields that are not tested. |
| TQ-3 | No integration test verifying `index.html` + `data-layer.js` interaction | HIGH | There is no test that loads both files together and verifies that `index.html`'s `save()` calls resolve to the Data Layer implementation. |
| TQ-4 | Mock Firebase does not simulate race conditions | LOW | The mock is synchronous. Real Firebase has async timing that could expose race conditions. |

**Test quality verdict:** `TEST_QUALITY_RISK` — Tests pass but they do not verify the production integration path.

---

## 11. Backward Compatibility Audit

### 11.1 Global Resolution

`index.html` inline script references:
- `save` → resolves to `window.save` from `data-layer.js`
- `load` → resolves to `window.load` from `data-layer.js`
- `_stripUndefinedDeep` → resolves to `window._stripUndefinedDeep` from `data-layer.js`
- `SK` → resolves to `window.SK` from `data-layer.js`
- `dbData` → resolves to `window.dbData` from `data-layer.js`
- `currentUserRef` → resolves to `window.currentUserRef` from `data-layer.js`
- `db` → resolves to `window.db` from `data-layer.js`

**CONFIRMED:** All references resolve correctly because `data-layer.js` is loaded first and attaches to `window`.

### 11.2 Null/Undefined/Empty Handling

- `save()` returns early when `currentUserRef` is null — `CONFIRMED`
- `load()` returns fallback when `dbData[key]` is undefined — `CONFIRMED`
- `_stripUndefinedDeep()` removes `undefined` from objects, preserves in arrays — `CONFIRMED`

---

## 12. Script Loading Order

```html
<script src="src/data-layer.js"></script>
<script>
  // MAIN INLINE SCRIPT
</script>
```

**Order:**
1. Firebase CDN scripts (lines 7-9)
2. Tailwind CDN (line 10)
3. Chart.js CDN (line 11)
4. Lucide CDN (line 12)
5. SortableJS CDN (line 13)
6. JSZip CDN (line 14)
7. Theme/bootstrap inline script (lines 15-21)
8. Firebase initialization inline script (lines 22-36)
9. **`src/data-layer.js`** (line 3393)
10. Main inline script (lines 3394+)

**Assessment:**
- **Deterministic:** YES — scripts load in document order, no `defer`/`async` on data-layer or main script
- **No race condition:** `data-layer.js` executes before inline script
- **Module available:** `window.save`, `window.load`, etc. are available when inline script runs
- **Production serving:** Works with any static file server (no module bundler required)

---

## 13. Architecture Verdict

### 13.1 What Stage 1.0 Achieved

1. **Extracted data layer primitives** (`save`, `load`, `_stripUndefinedDeep`, `SK`, `db`, `dbData`, `currentUserRef`) into `src/data-layer.js`
2. **Attached all exports to `window`** for backward compatibility
3. **Created adapter tests** (20 tests) and characterization tests (17 tests)
4. **Preserved all existing behavior** — no functional changes
5. **Removed duplicate inline definitions** — `index.html` no longer defines these functions locally

### 13.2 What Stage 1.0 Did NOT Achieve

1. **Did not eliminate direct Firebase bypasses** — 8 significant bypasses remain in `index.html`
2. **Did not reduce global mutable state** — `dbData`, `currentUserRef`, all arrays remain global
3. **Did not create repository layer** — no domain-specific repositories
4. **Did not abstract Firebase initialization** — `firebase.initializeApp` and `firebase.auth()` calls remain inline

### 13.3 Verdict

```text
PARTIAL_SEPARATION
```

**Reasoning:**
- The Data Layer module exists and is functional
- The majority of data operations (~100+ call sites) go through `save()`/`load()`
- BUT significant direct Firebase access remains for:
  - Dashboard layouts (`saveDashboardLayoutTab`, legacy migration)
  - Income profiles (`ensureIncomeProfilesExist`, `saveNewIncomeProfile`)
  - Guest mode (listener, path construction)
- These bypasses are not trivial — they involve `.set()`, `.update()`, `.remove()`, `.on()`, `.once()` calls that skip the Data Layer entirely
- The global state architecture is unchanged — `dbData` is still a mutable singleton, `currentUserRef` is still directly assigned

### 13.4 Comparison to Stage 1.0 Report Claims

| Stage 1.0 Report Claim | Audit Finding |
|------------------------|---------------|
| "extracted `save()` / `load()` / Firebase data layer" | `CONFIRMED` — extracted to `src/data-layer.js` |
| "65/65 tests passing" | `CONFIRMED` |
| "no behavior changes" | `CONFIRMED` |
| "Firebase behind adapter for new paths" | `PARTIAL` — existing paths still have bypasses |
| "UI doesn't need Firebase details for covered paths" | `CONFIRMED` for `save()`/`load()` paths |
| "no uncontrolled mixing of new layer with Firebase" | `FAILED` — 8 direct Firebase bypasses exist |

---

## 14. Critical Findings

### Finding 1: Direct Firebase Bypasses Remain

**ID:** BYPASS-001
**Severity:** HIGH
**Evidence:**
- `index.html:3610` — `currentUserRef.child('settings/layouts/' + tab).set(clean)`
- `index.html:4308` — `currentUserRef.child('incomeProfiles/' + newId).set(newProfile)`
- `index.html:4016` — `db.ref('users/' + userId).update(missingUpdates)`
- `index.html:4453` — `currentUserRef.child(SK.debtors).on('value', ...)`

**Impact:** These 8 locations bypass the Data Layer entirely. They write/read/update/remove/listen on Firebase without going through `save()`/`load()`. This means:
- No `_stripUndefinedDeep` sanitization for dashboard layouts and income profiles
- No centralized error handling
- No rollback capability
- Future local-first adapter would need to patch these locations individually

### Finding 2: Global State Unchanged

**ID:** STATE-001
**Severity:** MEDIUM
**Evidence:** `dbData`, `currentUserRef`, and all 20+ global arrays remain mutable singletons in `index.html`.

**Impact:** The extraction did not reduce coupling. Any function in `index.html` can still mutate `dbData` or `currentUserRef` directly. The Data Layer provides a convenient API but does not enforce boundaries.

### Finding 3: Tests Do Not Verify Integration

**ID:** TEST-001
**Severity:** HIGH
**Evidence:** `tests/data-layer.test.js` uses `new Function('window', dataLayerCode)` to execute `data-layer.js` in isolation. It does not load `index.html` and verify that `save()` calls in `index.html` resolve to the Data Layer.

**Impact:** If `data-layer.js` were removed or broken, the tests would still pass. The tests verify the module works in isolation, not that the production code uses it.

### Finding 4: No Duplicate Implementations (Positive)

**ID:** DUP-001
**Severity:** N/A
**Evidence:** `index.html` does NOT redefine `save()`, `load()`, `_stripUndefinedDeep()`, `SK`, `db`, `currentUserRef`, or `dbData`. All come from `window.*` set by `data-layer.js`.

**Impact:** This is a POSITIVE finding. Stage 1.0 correctly avoided the trap of duplicate definitions.

---

## 15. Acceptance Criteria Review

| Criterion | Status | Evidence |
|-----------|--------|----------|
| Baseline saved | PASS | Git HEAD unchanged |
| Previous changes not overwritten | PASS | `index.html` diff shows additions, not overwrites |
| No destructive Git operations | PASS | No `git reset`, `git clean`, etc. |
| Stage 0.3 tests still passing | PASS | 28/28 |
| Characterization tests passing | PASS | 17/17 |
| Adapter tests passing | PASS | 20/20 |
| Firebase behind adapter for new paths | PARTIAL | Main paths use adapter; 8 bypasses remain |
| UI doesn't need Firebase details for covered paths | PASS | Via `window.DataLayer` |
| No uncontrolled mixing | PARTIAL | Direct `.child().set()` calls exist |
| No production migration | PASS | No Firebase writes |
| No production data changes | PASS | No Firebase writes |
| No production schema changes | PASS | No schema changes |
| No unjustified functional changes | PASS | NONE |
| No credential leakage | PASS | Firebase config remains in `index.html` |
| No Security Rules changes | PASS | No rules files modified |
| `DEPLOYED_RULES_UNVERIFIED` remains explicit | PASS | Documented in audit |
| Syntax checks pass | PASS | `node --check src/data-layer.js` passes |
| Automated tests pass | PASS | 65/65 |
| Runtime smoke test | UNVERIFIED | No browser environment available |

---

## 16. Final Verdict

```text
STAGE_1.0A_PASS_WITH_BLOCKERS
```

**Rationale:**
- Stage 1.0 successfully extracted the data layer into a testable module
- All 65 tests pass
- No behavior changes were introduced
- The majority of data operations go through the Data Layer

**Blockers:**
1. **8 direct Firebase bypasses** remain in `index.html` (dashboard layouts, income profiles, guest mode)
2. **Global mutable state** is unchanged — `dbData` and `currentUserRef` are still singletons
3. **Integration tests missing** — tests verify the module in isolation, not its usage in production
4. **Runtime unverified** — no browser smoke test performed

These blockers do NOT require reverting Stage 1.0. They are documented risks that can be addressed in subsequent stages.

---

## 17. Evidence Tags Summary

| Claim | Tag |
|-------|-----|
| Git HEAD `8e3ad698` | `CONFIRMED` |
| Working tree dirty | `CONFIRMED` |
| No destructive Git ops | `CONFIRMED` |
| `save()` defined only in `data-layer.js` | `CONFIRMED` |
| `load()` defined only in `data-layer.js` | `CONFIRMED` |
| 8 direct Firebase bypasses in `index.html` | `CONFIRMED` |
| `_extracted.js` is dead code | `CONFIRMED` |
| No duplicate implementations | `CONFIRMED` |
| 65/65 tests passing | `TESTED` |
| Script loading order deterministic | `CONFIRMED` |
| Global state unchanged | `CONFIRMED` |
| No production Firebase writes | `CONFIRMED` |
| Runtime smoke test | `UNVERIFIED` |
| Integration tests missing | `CONFIRMED` |
