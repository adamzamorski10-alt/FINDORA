# STAGE 1.4 DISCOVERY AUDIT

## 1. GIT BASELINE

- **HEAD**: `8e3ad698e76a5d18758de6e20c2b744fa0f30cf8`
- **Working tree**: dirty (pre-existing from earlier stages)
- **No files modified during this audit**

Current architecture layers verified:
- `src/data-layer.js` — persistence facade, unchanged
- `src/state/application-state.js` — UI/session state, unchanged
- `src/state/dashboard-layouts-state.js` — dashboard state, unchanged
- `src/repositories/dashboard-layouts-repository.js` — only existing repository, unchanged
- `src/schema/` — schema/migration foundation, unchanged
- `src/storage/` — storage boundary, unchanged
- All tests pass: 222/222

---

## 2. CURRENT ARCHITECTURE

### A. Data Layer

**File**: `src/data-layer.js`

**API surface**:
- `save(key, data, options)` — writes to active StorageAdapter
- `remove(key)` — removes from active StorageAdapter
- `readOnce(path)` — reads from active StorageAdapter
- `onValue(path, callback, errCallback)` — subscribes to active StorageAdapter
- `updateUserPaths(updates)` — atomic multi-path update via active StorageAdapter
- `load(key, fb)` — returns `window.dbData[key]` or fallback
- `stripUndefinedDeep(value)` — sanitizes data before persistence

**State**:
- `window.dbData = {}` — legacy in-memory cache
- `window.currentUserRef` — global Firebase ref
- `window.currentUid` — global user ID
- `window.SK` — collection key constants

**Coupling**: Infrastructure-coupled (creates `window.firebase.database()`), but persistence-agnostic (all writes go through active StorageAdapter).

### B. State Layer

**ApplicationState** (`src/state/application-state.js`):
- Dashboard layouts, UI state (activeTab, privacyMode, theme, activeMoneyPlace), session state
- Event emitter pattern (`on`, `off`, `emit`)
- Deep-clone getters for immutability
- No Firebase knowledge

**DashboardLayoutsState** (`src/state/dashboard-layouts-state.js`):
- Single source of truth for dashboard layouts
- `mergeWithSaved()`, `initialize()`, `setLayouts()`, `updateTab()`
- Syncs with AppState via events
- Depends on `window.WIDGET_REGISTRY` and `window.DEFAULT_LAYOUTS` (global config)

### C. Repository Layer

**Only existing repository**: `DashboardLayoutsRepository`
- `saveTab(tab, showToast)` — reads from DashboardLayoutsState, writes via StorageAdapter
- `removeLegacy()` — removes legacy layout key
- `getFirebaseKey(tab)` — returns storage path
- NO knowledge of Firebase, DataLayer, dbData, currentUserRef

**No other repositories exist.** All other financial domains (transactions, budgets, goals, etc.) are accessed directly via DataLayer or global arrays.

### D. Schema/Migration Layer

**Files**: `src/schema/*.js`

**Public API**:
- `migrateData(data, options)` — migrates a single data object
- `getDataVersion(data)` — detects embedded schema version
- `getRegistry()` — returns raw migration registry
- `CURRENT_SCHEMA_VERSION = '2.0.0'`

**Status**: Pure foundation, no default migrations, not wired to production code.

---

## 3. FINANCIAL BUSINESS-LOGIC INVENTORY

### Data Model (from actual code)

The application operates on these in-memory arrays (populated from Firebase via `currentUserRef.on('value')`):

| Array | Firebase Path | Shape |
|-------|--------------|-------|
| `transactions` | `finapp_transactions` | `{ id, type, amount, category, place, date, desc, _excluded, _transfer, _autoSave, _goalId, _debtId, ... }` |
| `debtors` | `finapp_debtors` | `{ id, name, debts: [{id, amount, paid, ...}], repayments: [{amount, date, ...}] }` |
| `creditors` | `finapp_creditors` | `{ id, name, loans: [{id, amount, paid, repayments}] }` |
| `budgets` | `finapp_budgets` | `{ id, category, limit }` |
| `goals` | `finapp_goals` | `{ id, name, target, current, deadline, icon, color, autoSave }` |
| `recurringTx` | `finapp_recurring` | `{ id, name, type, amount, category, place, freq, dayOfMonth, startDate, active, lastBooked }` |
| `autoSaveRules` | `finapp_autosave_rules` | `{ id, sourceId, pct, dest, label, active }` |
| `ruleTargets` | `finapp_rule_targets` | `{ needs: 50, wants: 30, savings: 20 }` |
| `incomeSources` | `finapp_income_sources` | `{ id, name, icon, _profileType }` |
| `transfers` | `finapp_transfers` | `{ id, from, to, amount, desc, date }` |
| `templates` | `finapp_templates` | transaction templates |
| `gieldaOps` | `finapp_gielda_ops` | `{ id, type, amount, date, desc }` |
| `stronaProducts` | `finapp_strony_products` | products for sale |
| `resaleProducts` | `finapp_resale_products` | resale inventory |
| `resaleSales` | `finapp_resale_sales` | sales records |
| `resaleTasks` | `finapp_resale_tasks` | tasks |
| `resaleShipments` | `finapp_resale_shipments` | shipments |
| `resaleEvents` | `finapp_resale_events` | events |
| `resaleSettings` | `finapp_resale_settings` | settings |

### Pure Financial Calculation Functions

These functions operate on global arrays but contain NO Firebase, DOM, or persistence logic:

| Function | Input | Output | Business Logic |
|----------|-------|--------|----------------|
| `getBalances()` | `transactions` | `{ konto, skarbonka, gielda }` | Sums income/expense by place |
| `getDebtorGeneralRepaid(d)` | debtor | number | Sums all repayments |
| `getDebtorRemaining(d)` | debtor | number | Active debts minus general repayments |
| `getTotalDebts()` | `debtors` | number | Sum of all debtor remaining amounts |
| `getLoanRemaining(l)` | loan | number | Loan amount minus repayments |
| `getLoanRepaid(l)` | loan | number | Sum of repayments |
| `getTotalLoans()` | `creditors` | number | Sum of all unpaid loan remaining amounts |
| `getMonthTransactions(offset)` | `transactions` | array | Filters by month and exclusion |
| `getMonthExpenseByCategory(offset)` | `transactions` | object | Groups expenses by category |
| `getMonthIncomeByCategory(offset)` | `transactions` | object | Groups income by category |
| `getGieldaBalance()` | `gieldaOps` | number | Deposits - withdrawals + earnings - losses |
| `getDaysLeftInMonth()` | none | number | Calendar calculation |
| `getUpcomingBillsThisMonth()` | `recurringTx` | number | Sum of due recurring expenses |
| `getRequiredGoalDepositsThisMonth()` | `goals` | number | Required monthly deposits to meet deadlines |
| `computeSafeToSpend()` | multiple | object | Daily safe spending amount |

### Business Operations with Side Effects

| Function | Operations | Side Effects |
|----------|-----------|--------------|
| `bookRecurring(id)` | Creates transaction from recurring rule | Pushes to `transactions`, updates `recurringTx.lastBooked`, calls `save()`, `renderAll()`, `toast()` |
| `bookAllDue()` | Books all due recurring transactions | Same as above, for all due |
| `applyAutoSaveRules(sourceId, amount, date)` | Creates auto-save transactions and/or updates goals | Pushes to `transactions`, updates `goals.current`, calls `save()`, `toast()` |
| `recIsDue(r)` | Checks if recurring rule is due | Pure calculation |
| `recNextDate(r)` | Computes next occurrence date | Pure calculation |

### UI/Render Functions (High Coupling)

These functions directly manipulate DOM and global state:
- `renderHome()`, `renderSafeToSpend()`, `renderMoneySummary()`
- `renderTransactions()`, `renderBudgets()`, `renderGoals()`
- `renderRecurring()`, `renderDebtors()`, `renderCreditors()`
- `renderReports()`, `renderStats()`
- All `open*Modal()`, `close*Modal()` functions
- All form submission handlers

---

## 4. DOMAIN VS UI VS PERSISTENCE CLASSIFICATION

### Pure Domain Logic (no Firebase, no DOM, no global state mutation)

These are the best extraction candidates:

1. **Balance calculations**
   - `getBalances()` — pure aggregation
   - `getDebtorRemaining(d)` — pure calculation
   - `getTotalDebts()` — pure aggregation
   - `getLoanRemaining(l)` — pure calculation
   - `getTotalLoans()` — pure aggregation
   - `getGieldaBalance()` — pure aggregation

2. **Time-based filtering**
   - `getMonthTransactions(offset)` — pure filter
   - `getMonthExpenseByCategory(offset)` — pure aggregation
   - `getMonthIncomeByCategory(offset)` — pure aggregation

3. **Budget/projection calculations**
   - `getDaysLeftInMonth()` — pure date math
   - `getUpcomingBillsThisMonth()` — pure calculation (depends on `recurringTx`)
   - `getRequiredGoalDepositsThisMonth()` — pure calculation (depends on `goals`)
   - `computeSafeToSpend()` — pure orchestration of above

4. **Recurring date logic**
   - `recNextDate(r)` — pure date calculation
   - `recIsDue(r)` — pure boolean check
   - `recFreqLabel(freq)` — pure string mapping

5. **Auto-save rule logic**
   - `applyAutoSaveRules(sourceId, amount, date)` — **MIXED**: contains pure calculation (`Math.round(amount * r.pct) / 100`) but also mutates `transactions`, `goals`, and calls `save()`/`toast()`

### Application Orchestration (mixed domain + persistence + UI)

- `bookRecurring(id)` — domain logic (creates transaction) + persistence + UI
- `bookAllDue()` — same
- `ensureIncomeProfilesExist()` — data initialization + persistence

### Persistence/Storage

- `save()`, `remove()`, `readOnce()`, `onValue()`, `updateUserPaths()` — DataLayer
- `DataLayer.currentUserRef` setter — context propagation
- All `save(SK.xxx, ...)` calls throughout the code

### UI/Rendering

- All `render*()` functions
- All DOM manipulation
- All event handlers
- All modal operations

---

## 5. CANDIDATE VERTICAL SLICES

### Candidate 1: Safe-to-Spend Calculation Service

**Scope**: Extract `computeSafeToSpend()` and its dependencies into a pure domain service.

**Why suitable**:
- Pure calculations, no side effects
- Well-defined inputs and outputs
- High user-visible value (daily budget widget)
- Easy to test deterministically
- No Firebase coupling in the calculations themselves

**Coupling**: Medium — depends on `transactions`, `recurringTx`, `goals` arrays, and date functions

**Files affected**:
- `index.html` lines 4710-4755 (calculation functions)
- `index.html` lines 4757-4800 (render function — stays in UI)

**Required APIs**:
- Domain: `SafeToSpendCalculator.compute(inputs)`
- Repository: not needed for calculations (read-only)
- Application Service: optional orchestrator

**Tests**: Pure unit tests with synthetic data

**Risks**: Low — calculations are pure, but the surrounding code mutates global state

### Candidate 2: Recurring Transaction Booking

**Scope**: Extract `bookRecurring()` and `bookAllDue()` into an application service.

**Why suitable**:
- Clear business rule: "when a recurring rule is due, create a transaction"
- Well-defined inputs (recurring rule) and outputs (transaction + updated rule)
- Currently mixed with persistence and UI

**Coupling**: High — depends on `transactions`, `recurringTx`, `save()`, `renderAll()`, `toast()`

**Files affected**:
- `index.html` lines 5163-5210 (booking functions)
- `index.html` lines 5133-5157 (date helpers)

**Required APIs**:
- Domain: `RecurringRule.isDue()`, `RecurringRule.nextDate()`
- Repository: `TransactionRepository.createFromRecurring(rule)`
- Application Service: `RecurringService.bookDue(ruleId)`

**Tests**: Need mock repository, test due detection, test booking, test persistence

**Risks**: Medium — mutates global state, calls `save()` and `renderAll()`

### Candidate 3: Auto-Save Rule Execution

**Scope**: Extract `applyAutoSaveRules()` into a domain service.

**Why suitable**:
- Clear business logic: percentage-based savings allocation
- Well-defined rules: `{ sourceId, pct, dest, label }`
- Currently mixed with transaction creation, goal updates, and persistence

**Coupling**: High — depends on `incomeSources`, `autoSaveRules`, `goals`, `transactions`, `save()`, `toast()`

**Files affected**:
- `index.html` lines 17889-17953

**Required APIs**:
- Domain: `AutoSaveRule.calculateAmount(income)`, `AutoSaveRule.apply(target)`
- Repository: `TransactionRepository.createAutoSave(...)`, `GoalRepository.updateProgress(...)`
- Application Service: `AutoSaveService.applyAll(incomeEntry)`

**Tests**: Complex — needs mock repositories, tests for goal vs account destinations

**Risks**: High — mutates multiple arrays, creates transactions, updates goals, calls persistence

---

## 6. RECOMMENDED SLICE

### **Candidate 1: Safe-to-Spend Calculation Service**

**Reasoning**:
1. **Smallest scope**: Only ~30 lines of pure calculation code
2. **Zero side effects**: The core calculations are pure functions
3. **Zero Firebase coupling**: Calculations operate on plain arrays/objects
4. **Zero DOM coupling**: No rendering in the calculation logic
5. **High architectural value**: Demonstrates the pattern without risk
6. **Easy to test**: Deterministic inputs → deterministic outputs
7. **Low blast radius**: Extraction won't break existing functionality
8. **Progressive**: Can be extracted, tested, and wired in without changing UI

### What gets extracted

```
src/domain/safe-to-spend/
  ├── safe-to-spend-calculator.js    (pure domain logic)
  └── safe-to-spend-types.js         (optional: input/output types)

src/application/safe-to-spend/
  └── safe-to-spend-service.js       (orchestration: accepts data, calls calculator)

src/repositories/                     (no new repository needed for read-only calculations)
```

### What stays in index.html

- `renderSafeToSpend()` — UI rendering, stays in UI layer
- `getBalances()` — can be moved to domain later, but for now stays as it's used by many render functions
- All global array mutations stay in legacy layer

---

## 7. PROPOSED TARGET ARCHITECTURE

### Conceptual model

```
UI (index.html render functions)
  ↓ calls
Application Service (safe-to-spend-service.js)
  ↓ uses
Domain Service (safe-to-spend-calculator.js)
  ↓ operates on plain data objects
```

### Responsibilities

**Domain Service** (`safe-to-spend-calculator.js`):
- `compute(inputs)` → `SafeToSpendResult`
- Pure function: no side effects, no I/O, no global state
- Inputs: `{ balances, recurringExpenses, goals, daysLeft }`
- Outputs: `{ daysLeft, freeFunds, bills, goalsReq, safeTotal, perDay }`

**Application Service** (`safe-to-spend-service.js`):
- `computeForCurrentState()` — reads current in-memory state, calls domain calculator
- This is the ONLY place that knows about global arrays (`transactions`, `recurringTx`, `goals`)
- Returns result to UI

**No Repository needed** for this slice because:
- Calculations are read-only
- No persistence operations
- Data is provided as function arguments

### What this slice does NOT need

- No new repository (read-only calculations)
- No StorageAdapter changes
- No DataLayer changes
- No schema/migration changes
- No Firebase changes

---

## 8. REQUIRED APIS

### Domain API

```javascript
// src/domain/safe-to-spend/safe-to-spend-calculator.js

function compute(inputs) {
  // inputs: { balances: { konto, skarbonka, gielda }, recurringExpenses: number, goals: [{target, current, deadline}], daysLeft: number }
  // returns: { daysLeft, freeFunds, bills, goalsReq, safeTotal, perDay }
}
```

### Application Service API

```javascript
// src/application/safe-to-spend/safe-to-spend-service.js

function computeForCurrentState() {
  // reads global arrays: transactions, recurringTx, goals
  // calls domain calculator
  // returns SafeToSpendResult
}
```

### UI Integration (future)

```javascript
// In index.html renderSafeToSpend()
const result = window.SafeToSpendService.computeForCurrentState();
// Use result.daysLeft, result.perDay, etc. for rendering
```

---

## 9. TEST STRATEGY

### Domain Unit Tests

**File**: `tests/safe-to-spend-calculator.test.js`

| Test | Purpose |
|------|---------|
| `compute()` with zero values | Edge case: no money, no bills, no goals |
| `compute()` with positive safe total | Normal case |
| `compute()` with negative safe total | Over-budget case |
| `compute()` with future goal deadline | Monthly requirement calculated |
| `compute()` with past goal deadline | Full remaining amount urgent |
| `compute()` with no goals | goalsReq = 0 |
| `compute()` with zero days left | Division by zero guard |
| `compute()` deterministic | Same inputs → same outputs |

### Application Service Tests

**File**: `tests/safe-to-spend-service.test.js`

| Test | Purpose |
|------|---------|
| `computeForCurrentState()` with empty arrays | Edge case |
| `computeForCurrentState()` with sample data | Integration with global state |
| `computeForCurrentState()` does not mutate inputs | Immutability |

### Regression Tests

- Existing `renderSafeToSpend()` behavior must remain unchanged
- All 222 existing tests must continue passing

---

## 10. HIDDEN COUPLING / RISKS

### Global State Dependencies

The calculation functions depend on global arrays:
- `transactions` — populated by legacy listener
- `recurringTx` — populated by legacy listener
- `goals` — populated by legacy listener
- `budgets` — populated by legacy listener
- `debtors`, `creditors`, `gieldaOps` — populated by legacy listener

**Risk**: These arrays are mutated by many unrelated functions throughout `index.html`.

**Mitigation**: The domain calculator receives data as arguments, not by reading globals. The application service reads globals but is the ONLY bridge.

### Date/Time Dependencies

- `getDaysLeftInMonth()` uses `new Date()` — non-deterministic
- `computeSafeToSpend()` uses `getDaysLeftInMonth()`

**Risk**: Tests involving dates need to either:
- Inject current date
- Or test with fixed `daysLeft` input

**Mitigation**: Domain calculator should accept `daysLeft` as input, not compute it internally.

### Legacy Listener Coupling

All financial arrays are populated by `currentUserRef.on('value')` in `index.html`. If the listener fails or populates incomplete data, calculations operate on stale/empty arrays.

**Risk**: Not a domain extraction risk, but a pre-existing architectural concern.

### `dbData` Cache

`DataLayer.load()` reads from `window.dbData`. The calculation functions do NOT use `load()` — they read global arrays directly.

**Risk**: If arrays are not synchronized with `dbData`, calculations may be inconsistent.

### UI Tight Coupling

`renderSafeToSpend()` directly calls `computeSafeToSpend()` and then manipulates DOM. This is the expected coupling for UI code.

**Risk**: None for this slice — UI stays in UI layer.

---

## 11. WHAT MUST REMAIN UNTOUCHED

1. **All existing financial data operations** — transaction CRUD, budget CRUD, goal CRUD, etc. remain in `index.html` for now
2. **Legacy listener** (`currentUserRef.on('value')`) — populates global arrays
3. **DataLayer** — no changes
4. **StorageAdapter** — no changes
5. **DashboardLayoutsRepository** — no changes
6. **All render functions** — no changes
7. **Firebase Security Rules** — no changes
8. **Backup/restore** — no changes
9. **Schema/migration** — no changes
10. **All existing tests** — must continue passing

---

## 12. EXISTING TEST RESULTS

### Full test suite

```bash
node tests/storage-adapter.test.js && \
node tests/firebase-storage-adapter.test.js && \
node tests/listener-lifecycle.test.js && \
node tests/production-wiring.test.js && \
node tests/data-layer.test.js && \
node tests/dashboard-layouts-repository.test.js && \
node tests/dashboard-state-boundary.test.js && \
node tests/dashboard-layouts-state.test.js && \
node tests/application-state.test.js && \
node tests/characterization.test.js && \
node tests/backup-restore.test.js && \
node tests/owner-bootstrap.test.js && \
node tests/schema-migration.test.js
```

| Suite | Tests | Pass | Fail |
|-------|-------|------|------|
| StorageAdapterContract | 13 | 13 | 0 |
| MockStorageAdapter | 13 | 13 | 0 |
| FirebaseStorageAdapter | 13 | 13 | 0 |
| Listener Lifecycle | 6 | 6 | 0 |
| Production Wiring | 5 | 5 | 0 |
| DataLayer Adapter | 33 | 33 | 0 |
| DashboardLayoutsRepository | 12 | 12 | 0 |
| Dashboard State Boundary | 8 | 8 | 0 |
| DashboardLayoutsState | 13 | 13 | 0 |
| ApplicationState | 15 | 15 | 0 |
| Characterization | 17 | 17 | 0 |
| Backup/Restore | 28 | 28 | 0 |
| Owner Bootstrap Integration | 5 | 5 | 0 |
| Schema Versioning & Migration | 29 | 29 | 0 |
| **TOTAL** | **222** | **222** | **0** |

- **0 failures**
- **0 unhandled rejections**
- **0 unexpected warnings**

No pre-existing test failures.

---

## 13. GIT/WORKTREE VERIFICATION

- **No files modified** during this audit
- **No new files created** during this audit
- **Working tree unchanged** before and after audit
- **No commit performed**

---

## 14. HOSTILE SELF-REVIEW

### Challenge 1: Is this really domain logic?

Yes. `computeSafeToSpend()` and its dependencies perform financial calculations:
- Balance aggregation
- Recurring expense projection
- Goal requirement calculation
- Daily budget computation

These are pure math operations on financial data. They don't persist, render, or authenticate.

### Challenge 2: Is the proposed slice actually smaller than it appears?

The core domain slice is ~30 lines of pure calculation. The application service bridge is ~10 lines. Total: ~40 lines of new code. This is genuinely small.

### Challenge 3: Does it secretly depend on global state?

The domain calculator accepts data as arguments — NO global state dependency.
The application service reads globals — YES, but this is the intentional bridge.

### Challenge 4: Does it secretly depend on DOM?

No. The domain calculator returns data. The UI renders it.

### Challenge 5: Does it secretly depend on Firebase?

No. The calculations operate on plain JavaScript arrays/objects.

### Challenge 6: Would extracting it risk changing current behavior?

No. The extraction is additive. Existing `computeSafeToSpend()` in `index.html` can remain until the new implementation is verified.

### Challenge 7: Can it be tested deterministically?

Yes. All inputs are explicit. No `Date.now()`, no `Math.random()`, no Firebase.

### Challenge 8: Does it create unnecessary abstractions?

No. The three-layer structure (Domain → Application Service → UI) is the minimum viable architecture for this slice.

### Challenge 9: Is there an even smaller safer slice?

The absolute smallest would be a single function like `getDaysLeftInMonth()`. But that has too little architectural value. Safe-to-spend is the smallest slice that demonstrates the full pattern with real business value.

### Challenge 10: Does this prepare for IndexedDB/local-first?

Yes. By extracting domain calculations from persistence and UI, the domain layer remains usable regardless of storage backend.

---

## 15. RECOMMENDATION FOR IMPLEMENTATION

```text
STAGE_1.4_READY_FOR_IMPLEMENTATION
```

### Rationale

1. **Clear scope**: ~40 lines of pure calculation code
2. **Zero risk**: No persistence, no UI, no Firebase changes
3. **High value**: Demonstrates the Domain/Application Service pattern
4. **Testable**: Deterministic, pure functions
5. **Reversible**: Existing code remains untouched
6. **Foundational**: Establishes pattern for future financial domain extraction

### Next Steps (for future stage, not this task)

1. Create `src/domain/safe-to-spend/safe-to-spend-calculator.js`
2. Create `src/application/safe-to-spend/safe-to-spend-service.js`
3. Add unit tests
4. Add integration test proving `renderSafeToSpend()` can use the new service
5. Wire into `index.html` without breaking existing code
6. Verify all 222+ tests still pass

---

*This is a READ-ONLY audit. No code was modified. No tests were added. No commit was made.*
