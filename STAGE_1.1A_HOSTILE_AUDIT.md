# STAGE 1.1A — HOSTILE STATE & PERSISTENCE AUDIT
## Post-Implementation Architecture Verification

**Date:** 2026-09-05
**Status:** FAIL
**Verdict:** FALSE_STATE_BOUNDARY

---

## 1. GIT BASELINE

### HEAD
```
8e3ad698e76a5d18758de6e20c2b744fa0f30cf8
```

### Working Tree Status
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
?? STAGE_1.0A_HOSTILE_AUDIT.md
?? STAGE_1.0B_REMEDIATION_REPORT.md
?? STAGE_1.0C_HOSTILE_REAUDIT.md
?? STAGE_1.0_ARCHITECTURE_AUDIT.md
?? STAGE_1.0_FINAL_REPORT.md
?? STAGE_1.1_PROPOSED_ARCHITECTURE.md
?? STAGE_1.1_STATE_PERSISTENCE_REPORT.md
?? _extracted.js
?? backup/
?? fixtures/
?? node_modules/
?? src/data-layer.js
?? src/repositories/
?? src/state/
?? tests/
```

### Diff Stats
```
index.html | 3489 insertions(+), 393 deletions(-)
```

---

## 2. NEW MODULE AUDIT

### 2.1 ApplicationState (`src/state/application-state.js`)
- **Firebase access:** NONE
- **DataLayer dependency:** NONE
- **Persistence:** NONE
- **State exposure:** Getters return internal references by reference — callers can mutate without setters
- **Events:** Implemented but unused — no subscribers anywhere

### 2.2 DashboardLayoutsState (`src/state/dashboard-layouts-state.js`)
- **Firebase access:** NONE
- **DataLayer dependency:** NONE
- **Source of truth:** Internal `layouts` variable
- **Reality:** NOT the actual source of truth — global `dashboardLayouts` is still primary
- **Sync:** Bidirectional and uncontrolled with global

### 2.3 DashboardLayoutsRepository (`src/repositories/dashboard-layouts-repository.js`)
- **Firebase access:** Via DataLayer only
- **Critical violation:** Reads from `window.dbData` directly (line 25), NOT from DashboardLayoutsState
- **Reads:** `window.dbData.settings.layouts` and `window.load('finapp_dashboard_layouts', null)`
- **Not coordinated with state**

### 2.4 DataLayer (`src/data-layer.js`)
- **Firebase access:** Direct — this IS the Firebase boundary
- **Status:** Clean, no changes in Stage 1.1

---

## 3. CRITICAL FINDINGS

### Finding 1: FALSE_STATE_BOUNDARY

**ID:** SB-001
**Severity:** CRITICAL

The claimed source of truth `DashboardLayoutsState` is actually a notification mirror. The real source of truth is the global `dashboardLayouts` variable.

**Evidence:**
- `ensureDashboardLayouts()` mutates global FIRST, then syncs to state
- `saveDashboardLayoutTab()` reads from global, not state
- Repository reads from `dbData`, not state

### Finding 2: Repository Bypasses State for Reads

**ID:** SB-002
**Severity:** HIGH

`DashboardLayoutsRepository.loadAll()` reads `window.dbData.settings.layouts` directly, bypassing `DashboardLayoutsState`.

### Finding 3: Global ↔ State Bidirectional Sync

**ID:** SB-003
**Severity:** HIGH

Multiple functions mutate both global and state independently:
- `ensureDashboardLayouts()`: global → state
- `persistDashboardOrder()`: state updated, global also mutated in fallback
- `hideDashboardWidget()`: state updated, global also mutated in fallback

### Finding 4: saveDashboardLayoutTab() Reads from Global, Repository Reads from State

**ID:** SB-004
**Severity:** HIGH

If global and state are out of sync, repository saves stale data from state while global has newer data.

### Finding 5: ApplicationState Exposes Internal State via Getters

**ID:** SB-005
**Severity:** MEDIUM

Getters return object references. Callers can mutate internal state without using setters.

### Finding 6: ApplicationState Events Unused

**ID:** SB-006
**Severity:** LOW

No code calls `AppState.on()`. Event system exists but is not used.

---

## 4. DATA FLOW AUDIT

### 4.1 Initial Load
```
Firebase → dbData → ensureDashboardLayouts() → dashboardLayouts (global) → DashboardLayoutsState → renderAll()
```

### 4.2 Change Layout Order
```
User drags → persistDashboardOrder() → DashboardLayoutsState.updateTab() [AND global mutation in fallback] → saveDashboardLayoutTab() reads global → Repository reads state → DataLayer → Firebase
```

### 4.3 Critical Path Divergence
```
Global: dashboardLayouts[tab].order = ['a', 'b', 'c']
State: layouts[tab].order = ['a', 'b']  (stale)
↓
saveDashboardLayoutTab() saves from global ['a', 'b', 'c']
Repository.saveTab() reads from state ['a', 'b']
↓
WRONG DATA SAVED
```

---

## 5. SOURCE-OF-TRUTH AUDIT

### 5.1 Claimed Source of Truth
`DashboardLayoutsState`

### 5.2 Actual Source of Truth
1. `dashboardLayouts` global variable (primary)
2. `dbData.settings.layouts` (persistent cache)
3. `DashboardLayoutsState` (notification mirror)

### 5.3 Multiple Sources of Truth

| Source | Role | Can Override Others? |
|--------|------|---------------------|
| `dashboardLayouts` global | Primary working state | YES |
| `DashboardLayoutsState` | Notification mirror | NO |
| `dbData.settings.layouts` | Firebase cache | YES |
| `DashboardLayoutsRepository` | Persistence coordinator | NO |

---

## 6. PERSISTENCE BOUNDARY AUDIT

### 6.1 Firebase Operations in index.html
| Line | Operation | Classification |
|------|-----------|----------------|
| 35 | `firebase.initializeApp()` | C — Infrastructure |
| 680 | `firebase.auth().signInWithEmailAndPassword()` | C — Infrastructure |
| 706 | `firebase.auth().onAuthStateChanged()` | C — Infrastructure |
| 4324 | `currentUserRef = db.ref('users/' + uid)` | C — Infrastructure |
| 4442 | `DataLayer.currentUserRef = db.ref(...)` | C — Infrastructure |
| 3598 | `DataLayer.remove(SK.dashboardLayouts)` | A — Data Layer |
| 3624 | `save('settings/layouts/' + tab, clean)` | A — Data Layer |

### 6.2 Classification Summary
- **UI BYPASS:** 0
- **REPOSITORY VIOLATION:** 1 (reads from dbData directly)
- **UNAUTHORIZED:** 0

---

## 7. TEST QUALITY AUDIT

### 7.1 Test Results
| Suite | Tests | Pass | Fail |
|-------|-------|------|------|
| `backup-restore.test.js` | 28 | 28 | 0 |
| `data-layer.test.js` | 33 | 33 | 0 |
| `characterization.test.js` | 17 | 17 | 0 |
| `application-state.test.js` | 13 | 13 | 0 |
| `dashboard-layouts-state.test.js` | 13 | 13 | 0 |
| `dashboard-layouts-repository.test.js` | 13 | 13 | 0 |
| **TOTAL** | **117** | **117** | **0** |

### 7.2 Test Quality Issues
- Tests verify modules in isolation, not integration
- No test verifies UI → State → Repository flow
- No test verifies global ↔ state sync
- Repository tests use fake dbData, not real state
- No test for stale data / divergence scenario

### 7.3 False Confidence Risk
**HIGH.** Tests pass because they test isolated modules with mocks. They do NOT test the actual data flow.

---

## 8. REMAINING TECHNICAL DEBT

| Debt | Severity | Description |
|------|----------|-------------|
| Global variables still source of truth | CRITICAL | `dashboardLayouts`, `dashboardEditTab` are still primary |
| State ↔ global bidirectional sync | HIGH | No clear data flow direction |
| Repository reads from dbData | HIGH | Bypasses state layer |
| saveDashboardLayoutTab() reads from global | HIGH | Potential stale data save |
| ApplicationState exposes internals | MEDIUM | Getters return mutable references |
| Event system unused | LOW | No subscribers to AppState events |
| Fallback paths everywhere | MEDIUM | Every function has `if (window.X) { state } else { global }` |
| No integration tests | HIGH | Tests verify modules in isolation |

---

## 9. FINAL ARCHITECTURAL VERDICT

```text
FALSE_STATE_BOUNDARY
```

### Justification

1. **DashboardLayoutsState is NOT the source of truth** — the global `dashboardLayouts` variable is
2. **Repository bypasses state for reads** — reads from `dbData` directly
3. **Global ↔ State sync is bidirectional and uncontrolled** — both are mutated independently
4. **saveDashboardLayoutTab() reads from global while repository reads from state** — data loss risk
5. **ApplicationState exposes internal state via getters** — callers can bypass setters
6. **Event system is implemented but unused** — state changes don't propagate through events

The architecture is a **facade**, not a real boundary. The new modules exist and are functional, but they don't enforce the separation they claim. UI code can still bypass the state layer by mutating globals, and the repository doesn't trust state as its data source.

---

## 10. FINAL STAGE VERDICT

```text
STAGE_1.1A_FAIL
```

### Rationale

Stage 1.1A hostile audit concludes that the state/persistence boundary claimed in Stage 1.1 is **not real**. The new modules (`ApplicationState`, `DashboardLayoutsState`, `DashboardLayoutsRepository`) exist and are functional, but:

1. The global variables (`dashboardLayouts`, `dashboardEditTab`, etc.) remain the actual source of truth
2. The repository reads from `dbData` directly, bypassing state
3. State and global are bidirectionally synced without clear ownership
4. The event system is unused
5. Multiple paths exist where UI can bypass the state layer

**This is not a PASS_WITH_BLOCKERS situation.** The core architectural claim of Stage 1.1 ("DashboardLayoutsState is the source of truth") is factually incorrect based on code evidence.

### Required for Future Stages

To achieve a true state boundary, subsequent work must:
1. Make `DashboardLayoutsState` the single source of truth
2. Remove global variable mutations or make them private
3. Make repository read from state, not `dbData`
4. Ensure all UI reads come from state
5. Wire up the event system or remove it
6. Add integration tests that verify the actual data flow

---

## 11. EVIDENCE TAGS

| Claim | Tag |
|-------|-----|
| FALSE_STATE_BOUNDARY | `CONFIRMED` |
| Global variables are source of truth | `CONFIRMED` |
| Repository reads from dbData directly | `CONFIRMED` |
| State ↔ global bidirectional sync | `CONFIRMED` |
| ApplicationState exposes internals via getters | `CONFIRMED` |
| Event system unused | `CONFIRMED` |
| 117/117 tests passing | `TESTED` |
| No production data changes | `CONFIRMED` |
| No new Firebase listeners | `CONFIRMED` |
| No additional Firebase reads/writes | `CONFIRMED` |
| Browser runtime smoke test | `UNVERIFIED` |
