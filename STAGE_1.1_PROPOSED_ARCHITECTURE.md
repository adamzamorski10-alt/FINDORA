# STAGE 1.1 — PROPOSED ARCHITECTURE
## State & Persistence Boundary Hardening

**Date:** 2026-09-05  
**Status:** PROPOSAL  
**Based on:** `STAGE_1.1_STATE_AUDIT.md`

---

## 1. CURRENT ARCHITECTURE

```
UI Event
  ↓
Global Array Mutation (transactions[], debtors[], etc.)
  ↓
save(SK.xxx, array)
  ↓
DataLayer.save()
  ↓
currentUserRef.child(key).set(clean)
  ↓
Firebase Realtime Database
  ↓
currentUserRef.on('value', snapshot)
  ↓
dbData = snapshot.val()
  ↓
load(SK.xxx, fallback)
  ↓
Global Array
  ↓
renderAll()
```

### Problems
1. **No clear state ownership** — Global arrays are the "source of truth" for UI, but Firebase is the source of truth for persistence
2. **No state encapsulation** — Any function can mutate any global array at any time
3. **No persistence abstraction** — UI knows about `save()`, `SK` keys, and Firebase paths
4. **Tight coupling** — `renderAll()` depends on all global arrays being in sync with `dbData`
5. **Hard to test** — State mutations are scattered across 21K lines with no clear contracts

---

## 2. PROPOSED ARCHITECTURE

### 2.1 Layered Model

```
┌─────────────────────────────────────────────┐
│                  UI Layer                    │
│  (event handlers, render functions, DOM)     │
└──────────────────────┬──────────────────────┘
                       │ calls
                       ▼
┌─────────────────────────────────────────────┐
│            Application State                 │
│  • Owns all global state variables           │
│  • Provides getters/setters with validation   │
│  • Emits change events                        │
│  • NO Firebase knowledge                      │
└──────────────────────┬──────────────────────┘
                       │ delegates
                       ▼
┌─────────────────────────────────────────────┐
│              Repository                      │
│  • Coordinates between state and persistence  │
│  • Handles persistence logic                  │
│  • Can work with any persistence backend      │
│  • Minimal interface per domain               │
└──────────────────────┬──────────────────────┘
                       │ uses
                       ▼
┌─────────────────────────────────────────────┐
│           Persistence Adapter                 │
│  • Currently: DataLayer (Firebase)            │
│  • Future: LocalPersistenceAdapter (IndexedDB)│
│  • Handles all Firebase operations            │
└──────────────────────┬──────────────────────┘
                       │ calls
                       ▼
┌─────────────────────────────────────────────┐
│              Firebase                        │
│  Realtime Database + Auth                    │
└─────────────────────────────────────────────┘
```

### 2.2 Layer Responsibilities

| Layer | Owns | Knows About | Can Do |
|-------|------|-------------|--------|
| **UI** | DOM events, rendering | State getters, Repository methods | Trigger actions, render state |
| **Application State** | All global state variables | Nothing about Firebase | Get/set state, emit changes |
| **Repository** | Persistence coordination | State shape, Persistence Adapter | Load, save, update state |
| **Persistence Adapter** | Firebase operations | Firebase SDK | Read/write/listen to Firebase |

### 2.3 Key Principles

1. **State is king** — All UI renders from state. No direct DOM manipulation for data.
2. **Repository is the gateway** — UI never calls DataLayer directly. UI calls Repository.
3. **State doesn't know Firebase** — ApplicationState has zero Firebase imports.
4. **Backward compatibility** — Existing `save()`, `load()`, `dbData` continue to work during migration.
5. **Gradual migration** — Start with one domain (dashboard layouts), prove the pattern, then expand.

---

## 3. PROPOSED FILES

### 3.1 New Files

```
src/state/
  application-state.js       # Main state container
  dashboard-layouts-state.js # Dashboard-specific state

src/repositories/
  dashboard-layouts-repository.js  # Dashboard layout persistence

tests/
  application-state.test.js
  dashboard-layouts-state.test.js
  dashboard-layouts-repository.test.js
```

### 3.2 Modified Files

- `index.html` — Wire dashboard operations through new state layer
- `src/data-layer.js` — No changes (remains as Persistence Adapter)

---

## 4. PROPOSED API

### 4.1 ApplicationState

```javascript
const AppState = {
  // Dashboard
  getDashboardLayouts(tab),
  setDashboardLayouts(tab, layout),
  
  // Future domains (not implemented in Stage 1.1)
  // getTransactions(),
  // setTransactions(data),
  // ...
};
```

### 4.2 DashboardLayoutsRepository

```javascript
const DashboardLayoutsRepository = {
  // Load from persistence
  loadAll(), // → { home: {...}, stats: {...}, report: {...} }
  
  // Save to persistence
  saveTab(tab, layout), // → Promise
  saveAll(layouts), // → Promise
  
  // Remove legacy data
  removeLegacy(), // → Promise
  
  // State access
  getState(),
  setState(layouts),
};
```

### 4.3 DataLayer (unchanged)

```javascript
window.DataLayer = {
  save(key, data, options?),
  load(key, fallback),
  remove(key),
  readOnce(path),
  onValue(path, callback, errCallback?),
  updateUserPaths(updates),
  // ...
};
```

---

## 5. VERTICAL SLICE: DASHBOARD LAYOUTS

### Why Dashboard Layouts?

1. **Isolated domain** — Only touches `dashboardLayouts` global variable
2. **Clear persistence** — Saved to `settings/layouts/<tab>` per tab
3. **Limited UI coupling** — Only dashboard edit mode depends on it
4. **Low risk** — Layout changes are infrequent, easy to verify
5. **Proves the pattern** — Success here validates the architecture for other domains

### Current Flow

```
User drags widget
  → dashboardLayouts[tab].order = [...]
  → saveDashboardLayoutTab(tab, false)
    → save('settings/layouts/' + tab, clean)
    → DataLayer → Firebase
  → applyDashboardLayout(tab) // immediate UI update
```

### Proposed Flow

```
User drags widget
  → DashboardLayoutsState.setOrder(tab, newOrder)
    → DashboardLayoutsRepository.saveTab(tab, layout)
      → DataLayer.save('settings/layouts/' + tab, layout)
      → Firebase
  → applyDashboardLayout(tab) // immediate UI update from state
```

### State Shape

```javascript
// Before
let dashboardLayouts = null; // { home:{order:[...], hidden:[...]}, ... }

// After
AppState.dashboard = {
  layouts: null, // { home:{order:[...], hidden:[...]}, ... }
  editTab: null, // 'home' | 'stats' | 'report' | null
  addModalTab: null, // string | null
  sortable: null, // Sortable instance
};
```

---

## 6. MIGRATION ORDER

### Stage 1.1 (this stage)
1. **Dashboard layouts** — Vertical slice
   - Create `ApplicationState` with dashboard section
   - Create `DashboardLayoutsRepository`
   - Wire `ensureDashboardLayouts()`, `saveDashboardLayoutTab()`, edit mode functions
   - Add tests

### Future stages (not in Stage 1.1)
2. Settings/preferences (theme, privacy, active money place)
3. One simple data collection (e.g., `ruleTargets`)
4. Expand to more complex domains

---

## 7. RISK ASSESSMENT

### Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| Breaking dashboard edit mode | HIGH | Extensive testing of drag-and-drop, save, reload |
| State initialization order issues | MEDIUM | Careful module loading order, null checks |
| Performance regression | LOW | Dashboard layouts are small, infrequent saves |
| Increased complexity | MEDIUM | Clear documentation, minimal API surface |
| Breaking existing `saveDashboardLayoutTab()` callers | LOW | Keep function as compatibility wrapper |

### Rollback Plan

If the new architecture causes issues:
1. Revert `index.html` changes to dashboard functions
2. Keep new modules in place (they're isolated)
3. Fall back to direct `save()` calls

---

## 8. WHAT REMAINS UNCHANGED

- All global arrays (`transactions`, `debtors`, etc.) — NOT migrated in Stage 1.1
- `dbData` — NOT replaced, still used as cache
- `currentUserRef` — NOT abstracted further
- All other domains — NOT touched
- `renderAll()` — NOT modified
- Firebase paths — NOT changed
- Data shapes — NOT changed
- UI behavior — NOT changed

---

## 9. SUCCESS CRITERIA

Stage 1.1 passes if:
1. Dashboard layouts work identically to before
2. All 78 existing tests pass
3. New tests cover the state/repository boundary
4. No direct Firebase calls from dashboard UI code
5. No production data changes
6. No behavior changes

---

## 10. FILES TO CREATE/MODIFY

### New Files
1. `src/state/application-state.js` — Main state container
2. `src/state/dashboard-layouts-state.js` — Dashboard state module
3. `src/repositories/dashboard-layouts-repository.js` — Dashboard repository
4. `tests/application-state.test.js` — State tests
5. `tests/dashboard-layouts-state.test.js` — State tests
6. `tests/dashboard-layouts-repository.test.js` — Repository tests

### Modified Files
1. `index.html` — Wire dashboard functions through new layer

### Unchanged Files
- `src/data-layer.js` — No changes
- All other source files — No changes
