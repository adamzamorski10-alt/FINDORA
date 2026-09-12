# FINORA — Stage 1.0 Architecture Audit

**File:** `index.html` (~20 002 lines, single-file application)  
**Backend:** Firebase Realtime Database (v10.8.0 compat SDK)  
**Frontend:** Vanilla JS + Tailwind CSS + Chart.js + SortableJS + Lucide icons  
**Audit date:** 2026-09-05  

---

## 1. DATA LAYER

### 1.1 Core Storage Primitives

| Primitive | Location | Purpose |
|-----------|----------|---------|
| `save(key, data)` | L3938–L3958 | Centralized Firebase `.set()` wrapper. Strips `undefined` via `_stripUndefinedDeep`, writes to `currentUserRef.child(key)`. |
| `load(key, fb)` | L3913–L3915 | Synchronous cache lookup: returns `dbData[key]` if present, otherwise fallback `fb`. |
| `_stripUndefinedDeep(value)` | L3926–L3937 | Recursively removes `undefined` properties from objects/arrays before Firebase serialization. |
| `dbData` | L3893 | Single in-memory snapshot of `users/{uid}` from the Firebase `.on('value')` listener. Acts as the local cache for `load()`. |
| `currentUserRef` | L3902 | `db.ref('users/{uid}')` for the active session owner or guest target. All `save()`/`load()` calls route through this. |

### 1.2 `save()` Call Sites (selected)

| Domain | Key (SK.*) | Typical Trigger |
|--------|-----------|-----------------|
| Transactions | `finapp_transactions` | Add/edit/delete transaction, book recurring, debt repayment, loan repayment, goal deposit |
| Debtors | `finapp_debtors` | Add/edit/delete debtor, debt, repayment, share settings |
| Budgets | `finapp_budgets` | Create/update/delete budget limit |
| Goals | `finapp_goals` | Create/update/delete goal, deposit |
| Recurring | `finapp_recurring` | Create/update/delete/toggle recurring transaction |
| Creditors | `finapp_creditors` | Add creditor, loan, repayment |
| Auto-save rules | `finapp_autosave_rules` | Legacy — still written but rendering moved to `finapp_saving_rules` |
| Rule targets | `finapp_rule_targets` | Custom 50/30/20 targets |
| Templates | `finapp_templates` | Save/delete transaction template |
| Income sources | `finapp_income_sources` | Add/delete source (legacy array-based) |
| Dashboard layouts | `settings/layouts/{tab}` | Drag/drop reorder, hide/show widget |
| Resale products | `finapp_resale_products` | CRUD |
| Resale sales | `finapp_resale_sales` | CRUD, status changes |
| Resale tasks | `finapp_resale_tasks` | CRUD, toggle done |
| Resale shipments | `finapp_resale_shipments` | CRUD |
| Resale events | `finapp_resale_events` | Event log entries |
| Resale settings | `finapp_resale_settings` | Thresholds, commissions, shipping rates |
| Giełda ops | `finapp_gielda_ops` | Add/delete operation |
| Strony clients | `finapp_strony_clients` | CRUD, import |
| Income profiles | `incomeProfiles/{id}` | Create new profile (bypasses `save()`, uses `currentUserRef.child().set()` directly) |
| Vinted prices | `finapp_vinted_prices` | Import JSON |
| Vinted meta | `finapp_vinted_meta` | Import timestamp |
| Active money place | `finapp_active_money_place` | Switch Konto/Skarbonka/Giełda sub-tab |
| Privacy mode | `finapp_privacy_mode` | localStorage only (not Firebase) |
| Theme | `finapp_theme` | localStorage only (not Firebase) |
| User nick | `finapp_user_nick` | localStorage + sessionStorage |

### 1.3 Direct Firebase Access Outside `save()`

| Location | Pattern | Risk |
|----------|---------|------|
| L4401 | `currentUserRef.child('incomeProfiles/' + newId).set(newProfile)` | Bypasses `save()` and `_stripUndefinedDeep` |
| L4406 | `currentUserRef.child('incomeProfiles').once('value')` | Direct read |
| L4083–L4114 | `db.ref('users/' + userId + '/incomeProfiles')` in `ensureIncomeProfilesExist()` | Direct `.once('value')` and `.set()` / `.update()` |
| L4537–L4545 | `currentUserRef.child(SK.debtors).on('value', ...)` in guest mode | Direct listener on a sub-node, not `users/{uid}` |
| L3586–L3591 | `currentUserRef.child('settings/layouts/' + tab).set(clean)` in `saveDashboardLayoutTab()` | Uses its own `_stripUndefinedDeep` call but writes directly |
| L3588 | `currentUserRef.child(SK.dashboardLayouts).remove()` | Legacy migration cleanup |

### 1.4 localStorage / sessionStorage

| Key | Where | Purpose |
|-----|-------|---------|
| `finapp_theme` | L16 | Dark/light mode persistence |
| `finapp_privacy_mode` | L3964 | Privacy mode toggle |
| `finapp_user_nick` | L6628, L6671 | Author name for debt edits |
| `finapp_guest_nick_{debtorId}` | L7643 | Guest mode nickname per debtor |

---

## 2. FIREBASE PATHS

### 2.1 SK Key Map → Firebase Path

All keys are stored under `users/{uid}/`:

```
SK.transactions      → finapp_transactions          (array)
SK.debtors           → finapp_debtors               (array of {id, name, debts:[], repayments:[], shareSettings, activityLog})
SK.budgets           → finapp_budgets               (array of {id, category, limit})
SK.goals             → finapp_goals                 (array of {id, name, target, current, deadline, icon, color, autoSave})
SK.reminders         → finapp_reminders             (array)
SK.transfers         → finapp_transfers             (array)
SK.incomeSources     → finapp_income_sources        (array of {id, name, icon, _profileType})
SK.templates         → finapp_templates             (array)
SK.recurring         → finapp_recurring             (array)
SK.creditors         → finapp_creditors             (array of {id, name, icon, loans:[{...}]})
SK.autoSaveRules     → finapp_autosave_rules        (legacy array)
SK.ruleTargets       → finapp_rule_targets          ({needs, wants, savings})
SK.stronyProducts    → finapp_strony_products       (array)
SK.resaleProducts    → finapp_resale_products       (array)
SK.resaleSales       → finapp_resale_sales          (array)
SK.resaleTasks       → finapp_resale_tasks          (array)
SK.resaleShipments   → finapp_resale_shipments      (array)
SK.resaleEvents      → finapp_resale_events         (array)
SK.resaleSettings    → finapp_resale_settings       (object)
SK.gieldaOps         → finapp_gielda_ops            (array)
SK.stronyClients     → finapp_strony_clients        (array)
SK.dashboardLayouts  → finapp_dashboard_layouts     (legacy — migrated to settings/layouts/{tab})
```

### 2.2 Additional Paths

```
users/{uid}/settings/layouts/{tab}     → Current dashboard layout storage (per-tab)
users/{uid}/incomeProfiles/{profileId} → New income profile system (object keyed by ID)
```

### 2.3 Guest Mode Path

```
users/{guestOwnerUid}/finapp_debtors  → Direct listener (NOT users/{uid} generally)
```

---

## 3. GLOBAL STATE

### 3.1 Primary Data Arrays (mutated in place, then saved)

| Variable | Type | Description |
|----------|------|-------------|
| `transactions` | `Array` | All financial transactions with `_sourceId`, `_debtId`, `_goalId`, `_loanId`, `_autoSave`, `_transfer`, `_excluded` flags |
| `debtors` | `Array` | Debtor objects with nested `debts[]`, `repayments[]`, `shareSettings`, `activityLog` |
| `budgets` | `Array` | `{id, category, limit}` |
| `goals` | `Array` | `{id, name, target, current, deadline, icon, color, autoSave}` |
| `reminders` | `Array` | `{id, title, amount, day, repeat, done}` |
| `transfers` | `Array` | `{id, from, to, amount, desc, date}` |
| `incomeSources` | `Array` | Legacy sources with `_profileType` flag (`strony`, `resale`, `gielda`, or custom) |
| `txTemplates` | `Array` | Transaction templates |
| `recurringTx` | `Array` | Recurring transaction rules |
| `creditors` | `Array` | `{id, name, icon, loans:[{id, desc, amount, date, due, dest, interest, paid, repayments}]}` |
| `autoSaveRules` | `Array` | Legacy auto-save rules |
| `ruleTargets` | `Object` | `{needs:50, wants:30, savings:20}` |
| `stronyProducts` | `Array` | `{id, name, price, category, desc, avgTime, notes}` |
| `resaleProducts` | `Array` | `{id, name, buyPrice, weight, link, notes, minStockAlert?, listedAt?, statusHistory?, priceHistory?}` |
| `resaleSales` | `Array` | `{id, productId, price, date, status, soldAt, shippedAt}` |
| `resaleTasks` | `Array` | `{id, title, type, dueDate, productId?, done, createdAt}` |
| `resaleShipments` | `Array` | `{id, name, items:[{productId,qty}], createdAt, ordered, orderedAt}` |
| `resaleEvents` | `Array` | Event log for resale engine |
| `gieldaOps` | `Array` | `{id, type, name, amount, date, where?, createdAt}` |
| `stronaClients` | `Array` | Client leads with extensive contact/status fields |

### 3.2 UI State Variables

| Variable | Type | Description |
|----------|------|-------------|
| `dashboardLayouts` | `Object` | `{home:{order:[],hidden:[]}, stats:{...}, report:{...}}` |
| `dashboardEditTab` | `String|null` | Active tab in edit mode |
| `dashboardSortable` | `Sortable\|null` | Active SortableJS instance |
| `activeMoneyPlace` | `String` | `'konto'` / `'skarbonka'` |
| `selectedDebtorId` | `String|null` | |
| `selectedCreditorId` | `String|null` | |
| `selectedSourceId` | `String|null` | Active income source |
| `activeIncomeProfileId` | `String|null` | Active income profile |
| `incomeProfiles` | `Object\|Array\|null` | Raw profiles from Firebase |
| `isPrivacyModeActive` | `Boolean` | Privacy mode flag |
| `isGuestMode` | `Boolean` | URL-derived flag |
| `guestOwnerUid` | `String\|null` | Owner UID from URL |
| `guestDebtorId` | `String\|null` | Debtor ID from URL |
| `guestAccessCode` | `String\|null` | Access code from URL |
| `guestDebtorRef` | `Object\|null` | Resolved debtor record |
| `_vintedPrices` | `Object\|null` | Vinted price data cache |
| `_resaleShippingToastShown` | `Boolean` | One-time toast flag |
| `initialLoadDone` | `Boolean` | First-load initialization guard |
| `recurringView` | `String` | `'all'` or `'subscriptions'` |
| `resaleSalesSelected` | `Set` | Selected sale IDs for bulk actions |
| `resaleSalesViewMode` | `String` | `'list'` or `'calendar'` |
| `profileSubTab` | `Object` | `{[sourceId]: tab}` for Strony/Resale sub-tabs |
| `earnHistoryFilter` | `Object` | `{[sourceId]: 'all'|'income'|'expense'}` |
| `_incomeActiveModule` | `Object` | `{[profileId]: moduleId}` |
| `_earnMainTab` | `String` | `'sources'` or `'gielda'` |
| `_gieldaSubTab` | `String` | `'ops'` or `'stats'` |
| `_gieldaOpType` | `String` | `'wplata'|'wyplata'|'zarobek'|'strata'` |
| `resaleSettings` | `Object` | Merged settings with defaults |
| `budgetMonthOffset` | `Number` | Month navigation offset |
| `reportsMonthOffset` | `Number` | Month navigation offset |
| `statsMonthOffset` | `Number` | Month navigation offset |

---

## 4. AUTH FLOW

### 4.1 `onAuthStateChanged` (L706–L721)

- Sets `window._currentUser`
- On sign-in: hides auth overlay, updates sidebar badges, calls `window._onUserSignedIn(user)`
- On sign-out: shows auth overlay, resets badges, calls `window._onUserSignedOut()`

### 4.2 Owner Mode Initialization (L4552–L4566)

```javascript
window._onUserSignedIn = function(user) {
  if (currentUid === user.uid) return; // already listening
  stopOwnerListener();
  startOwnerListener(user.uid);
};
window._onUserSignedOut = function() {
  stopOwnerListener();
};
if (window._currentUser) { window._onUserSignedIn(window._currentUser); }
```

### 4.3 `startOwnerListener(uidToWatch)` (L4425–L4520)

1. Sets `currentUid` and `currentUserRef = db.ref('users/' + uidToWatch)`
2. Calls `ensureIncomeProfilesExist(uidToWatch)` (async, non-blocking)
3. Attaches `.on('value')` listener to `currentUserRef`
4. On every Firebase snapshot:
   - Replaces entire `dbData` with `snapshot.val()`
   - Re-populates ALL global arrays from `dbData` via `load()`
   - Resets `dashboardLayouts = null` → forces `ensureDashboardLayouts()` rebuild
   - Calls `ensureResaleDataDefaults()` to backfill new fields
   - Loads `_vintedPrices` if present
   - Shows one-time shipping toast if overdue
   - On first load: auto-creates `incomeSources` entries for Strony/Resale/Giełda if missing
   - Calls `renderAll()`, `applyThemeIcons()`, `scheduleNotifications()`, `autoCheckRecurring()`

### 4.4 `stopOwnerListener()` (L4523–L4530)

- Calls `currentUserRef.off()`
- Sets `currentUserRef = null`, `currentUid = null`
- Calls `resetLocalAppState()` which zeroes all arrays and `dbData`

### 4.5 Guest Mode (L4532–L4551)

- Triggered by `?view=debt` URL param
- Creates `currentUserRef = db.ref('users/' + guestOwnerUid)` — **this enables writes via `save()`**
- Attaches listener **only** to `finapp_debtors` sub-node (not entire user data)
- Resolves `guestDebtorRef` from the debtor list by `id`
- Calls `renderGuestView()`
- If `guestOwnerUid` missing: shows error

### 4.6 Security Note

Guest mode relies on client-side access code validation (`d.shareSettings.accessCode === guestAccessCode`). There is **no Firebase security rule enforcement** for this — the client reads the entire `finapp_debtors` node. The code comments acknowledge this limitation.

---

## 5. RENDER FLOW

### 5.1 `renderAll()` (L21104–L21152)

Master render function called after every data mutation. It renders:

1. `renderHome()` — wealth hero, balances, safe-to-spend, budget summary, today spent, recent transactions
2. `renderTransactions()` — full transaction list with filters
3. `renderDebtors()` — debtor selector + detail
4. `renderGoals()` — goal cards + overview
5. Conditional renders based on active tab:
   - `renderMoneySummary()` if Money tab active
   - `renderCharts()` if Stats tab active
   - `renderBudget()` if Budget tab active
   - `renderRecurring()` if Recurring tab active
   - `renderReminders()` if Reminders tab active
   - `renderReports()` if Reports tab active
   - `renderEarnings()` + `renderGieldaSummary()` if Earn tab active
   - `renderSaving()` if Saving tab active
   - `renderLoans()` if Loans tab active
6. Home rule (50/30/20) widget — always updates
7. `lucide.createIcons()` — refreshes all icons

### 5.2 Selective Render Functions

Many operations call specific render functions instead of full `renderAll()` for performance:

| Operation | Renders Called |
|-----------|---------------|
| `bookRecurring()` | `renderAll()` + `renderRecurring()` |
| `saveDashboardLayoutTab()` | `applyDashboardLayout(tab)` |
| `hideDashboardWidget()` | `applyDashboardLayout(tab)` |
| `toggleRecurringActive()` | `renderRecurring()` |
| `deleteRecurring()` | `renderRecurring()` |
| `toggleRecurringSub()` | `renderRecurring()` |
| `saveSavingRule()` | `renderSaving()` |
| `confirmDeposit()` | `renderGoals()` + `renderHome()` + `renderSaving()` |
| `deleteBudget()` | `renderBudget()` + `renderHome()` |
| `openBudgetModal()` | `renderBudgetCategoryGrid()` |
| `switchMoneyPlace()` | `renderMoneySummary()` + `renderTransactions()` |
| `setTransactionType()` | `renderCategoryGrid()` |

### 5.3 When `renderAll()` Is Called

- After `startOwnerListener` Firebase snapshot (L4512)
- After transaction add/edit/delete (L20631, L20714)
- After debt operations (L6720, L7134, L7341, L7421, L7524)
- After goal operations (L6525, L6533, L6584)
- After budget operations (L6211, L6219)
- After recurring booking (L5231, L5257)
- After creditor/loan operations (L8032, L8458, L8467, L8478)
- After privacy mode toggle (L21201)
- After `resetLocalAppState()` (L4017)

---

## 6. DATA FLOW MAP

### 6.1 Transactions

```
UI: transaction-form submit (L20581)
  → push to transactions[]
  → save(SK.transactions, transactions)
  → applyAutoSaveRules() if income
  → applyGoalAutoRoundSave() if expense
  → renderAll()
  → toast
```

### 6.2 Debtors

```
UI: debtor-form submit (L7142)
  → push to debtors[]
  → save(SK.debtors, debtors)
  → renderAll()

UI: add-debt-form submit (inside renderDebtorDetail, L7081)
  → ensureUserNick(callback)
  → push debt to selected debtor
  → optionally push expense transaction (with _debtId)
  → save(SK.debtors) + save(SK.transactions)
  → renderAll()

UI: general repay (L7292)
  → push repayment to debtor.repayments[]
  → optionally push income transaction (with _debtGeneralRepay)
  → save(SK.debtors) + save(SK.transactions)
  → renderAll()

UI: single repay (L7373)
  → mark debt.paid = true
  → optionally push income transaction (with _debtRepay)
  → save(SK.debtors) + save(SK.transactions)
  → renderAll()

UI: bulk repay (L7473)
  → mark multiple debts paid
  → optionally push one income transaction (with _debtBulkRepay)
  → save(SK.debtors) + save(SK.transactions)
  → renderAll()
```

### 6.3 Creditors / Loans

```
UI: creditor-form submit (L7967)
  → push to creditors[]
  → save(SK.creditors)
  → renderLoans() + renderHome()

UI: loan-form submit (L7998)
  → push loan to selected creditor
  → optionally push income transaction (with _loanId)
  → save(SK.creditors) + save(SK.transactions)
  → renderAll()

UI: repayment-form submit (L8197)
  → push repayment to loan.repayments[]
  → auto-mark paid if fully repaid
  → optionally push expense transaction (with _loanRepay)
  → save(SK.creditors) + save(SK.transactions)
  → renderAll()
```

### 6.4 Budgets

```
UI: budget-form submit (L6201)
  → update or push to budgets[]
  → save(SK.budgets)
  → renderBudget() + renderHome()
```

### 6.5 Goals

```
UI: goal-form submit (L6498)
  → update or push to goals[]
  → save(SK.goals)
  → renderGoals() + renderHome()

UI: confirmDeposit() (L6556)
  → update goal.current
  → save(SK.goals)
  → optionally push expense transaction (with _autoSave, _goalId)
  → save(SK.transactions)
  → renderGoals() + renderHome() + renderSaving()
```

### 6.6 Recurring / Templates

```
UI: recurring-form submit (L5862)
  → update or push to recurringTx[]
  → save(SK.recurring)
  → close modal + renderRecurring() or renderSubscriptions()

UI: bookRecurring() / bookAllDue()
  → push transaction(s) with _recurringId
  → update r.lastBooked
  → save(SK.transactions) + save(SK.recurring)
  → renderAll() + renderRecurring()

UI: saveCurrentAsTemplate() → confirmSaveTemplate()
  → push to txTemplates[]
  → save(SK.templates)
```

### 6.7 Income / Profiles

```
UI: source-form submit (legacy, not shown in excerpt)
  → push to incomeSources[]
  → save(SK.incomeSources)

UI: add-income-profile-form submit (L4363)
  → currentUserRef.child('incomeProfiles/' + newId).set(newProfile)
  → re-read incomeProfiles snapshot
  → selectIncomeProfile(newId)

Firebase: startOwnerListener()
  → ensureIncomeProfilesExist() auto-seeds Strony/Resale/Giełda
```

### 6.8 Resale Module

```
UI: Strony product form (L9836)
  → push to stronyProducts[]
  → save(SK.stronyProducts)
  → renderStronyDetail()

UI: Resale product/sales/tasks/shipments forms
  → mutate respective arrays
  → save(SK.resaleProducts/Sales/Tasks/Shipments)
  → renderResaleDetail()

UI: Resale settings form
  → save(SK.resaleSettings)
```

### 6.9 Giełda Module

```
UI: gielda-op-form submit (L21443)
  → push to gieldaOps[]
  → save(SK.gieldaOps)
  → renderGieldaSummary() + renderGieldaHistory() + renderGieldaStats() if active
```

### 6.10 Dashboard

```
UI: SortableJS onEnd (L3770)
  → persistDashboardOrder(tab)
  → update dashboardLayouts[tab].order
  → saveDashboardLayoutTab(tab, false)

UI: hideDashboardWidget()
  → update dashboardLayouts[tab].order + .hidden
  → saveDashboardLayoutTab(tab, false)
  → applyDashboardLayout(tab)

Migration: ensureDashboardLayouts()
  → reads dbData.settings.layouts
  → falls back to legacy SK.dashboardLayouts
  → migrates legacy to per-tab paths
```

### 6.11 Settings

```
Theme toggle → localStorage['finapp_theme'] → applyThemeIcons()
Privacy toggle → localStorage['finapp_privacy_mode'] → renderAll()
Money place → save('finapp_active_money_place', place) → renderMoneySummary()
```

---

## 7. BEHAVIORAL CONTRACTS

### 7.1 Transactions

- **Fields:** `id, amount, type, category, place, desc, date, createdAt, tags?, note?, _sourceId?, _debtId?, _debtRepay?, _debtGeneralRepay?, _loanId?, _loanRepay?, _goalId?, _autoSave?, _transfer?, _excluded?, _stronyProductId?`
- **Duplicates:** Detection is informational only (non-blocking). Shows a dismissible banner after save.
- **Auto-save rules:** Triggered on income transactions via `applyAutoSaveRules()`
- **Goal auto-round:** Triggered on expense transactions via `applyGoalAutoRoundSave()` — rounds up to nearest złoty/5zł/10zł

### 7.2 Debtors

- **Structure:** `{id, name, debts:[{id, desc, amount, date, source, paid, paidAt, paidDate, paidPlace, history[], lastEditedBy, lastModifiedBy, lastModifiedAt}], repayments:[{id, amount, place, date, note, author, createdAt}], shareSettings:{allowEdit, accessCode}, activityLog:[]}`
- **Remaining calculation:** `activeSum - generalRepayments` (never below 0)
- **Guest edit:** Controlled by `shareSettings.allowEdit` — guest can add/edit/delete/mark-paid only if true
- **Activity log:** Appended on every mutation, not auto-saved (caller must `save()`)

### 7.3 Budgets

- **Structure:** `{id, category, limit}`
- **Spending calculation:** Sum of current month's expenses by category
- **Thresholds:** >85% critical (red), >60% warn (amber), >100% over (red)
- **Suggestions:** Shows categories without a budget limit

### 7.4 Goals

- **Structure:** `{id, name, target, current, deadline, icon, color, autoSave:{enabled, rule, sourcePlace}}`
- **Deposit:** Can create a linked expense transaction (`_autoSave: true, _goalId`) or just update `current`
- **Auto-save:** One rule per goal (single `autoSave` object, not array)
- **ETA:** Calculated from average monthly deposit rate

### 7.5 Recurring

- **Structure:** `{id, type, name, amount, category, place, freq, dayOfMonth, startDate, desc, active, lastBooked, isSubscription}`
- **Booking:** Creates a real transaction with `_recurringId` and updates `lastBooked`
- **Subscriptions:** Detected by `isSubscription` flag OR `category === 'subscription'`
- **Free cash:** `incomeMonthly - expenseMonthly` (active only, normalized to monthly)

### 7.6 Resale

- **Products:** `{id, name, buyPrice, weight, link, notes, minStockAlert?, listedAt?, statusHistory?, priceHistory?}`
- **Sales:** `{id, productId, price, date, status:'listed'|'to_ship'|'shipped', soldAt, shippedAt}`
- **Shipments:** `{id, name, items:[{productId,qty}], createdAt, ordered, orderedAt}`
- **Tasks:** `{id, title, type, dueDate, productId?, done, createdAt}`
- **Events:** Append-only event log
- **Settings:** `{staleThresholdDays, defaultMinStockAlert, shipPerKg, platformCommissions:{vinted, allegro, olx, ebay, facebook, inne}}`
- **Defaults:** Merged with `RESALE_SETTINGS_DEFAULTS` on load

### 7.7 Giełda

- **Operations:** `{id, type:'wplata'|'wyplata'|'zarobek'|'strata', name, amount, date, where?, createdAt}`
- **Balance:** `deposited - withdrawn + earned - lost`
- **Where field:** Only for `wplata`/`wyplata` (links to Konto/Skarbonka/Inne)

### 7.8 Strony (Web Dev Profile)

- **Products:** Standardized website types (landing, ecom, portfolio, blog, corporate, custom, other)
- **Clients:** Full CRM with status pipeline: `znaleziony → kontakt → do_zrobienia → sprzedane`
- **History entries:** Can link to products via `_stronyProductId`

### 7.9 Privacy Mode

- Masks all amounts with `•••••,•• zł` via `formatAmount()`
- Persisted in `localStorage.finapp_privacy_mode`
- Visual fade transition on toggle

### 7.10 Dashboard Layouts

- **Per-tab storage:** `settings/layouts/{tab}` with `{order: [widgetId...], hidden: [widgetId...]}`
- **Migration:** Legacy `finapp_dashboard_layouts` auto-migrated to new structure
- **Edit mode:** SortableJS drag-and-drop, hide/show widgets, add widget modal
- **Guard:** Click on tiles blocked in edit mode (except remove/add buttons)

---

## 8. DEPENDENCY MAP

### 8.1 Render Dependencies

```
renderAll()
  ├── renderHome()
  │     ├── getBalances() → transactions[]
  │     ├── getGieldaBalance() → gieldaOps[]
  │     ├── getTotalDebts() → debtors[]
  │     ├── getTotalLoans() → creditors[]
  │     ├── getMonthTransactions() → transactions[]
  │     ├── getMonthExpenseByCategory() → transactions[]
  │     └── renderSafeToSpend() → recurringTx[], goals[], getBalances()
  ├── renderTransactions() → transactions[], incomeSources[]
  ├── renderDebtors() → debtors[]
  ├── renderGoals() → goals[], transactions[]
  ├── renderMoneySummary() → transactions[], activeMoneyPlace
  ├── renderCharts() → transactions[], budgets[], goals[], debtors[], gieldaOps[]
  ├── renderBudget() → budgets[], transactions[]
  ├── renderRecurring() → recurringTx[], transactions[]
  ├── renderReminders() → reminders[]
  ├── renderReports() → transactions[], budgets[], goals[], debtors[]
  ├── renderEarnings() → incomeSources[], transactions[], gieldaOps[]
  ├── renderGieldaSummary() → gieldaOps[]
  ├── renderSaving() → transactions[], autoSaveRules[], goals[]
  └── renderLoans() → creditors[], transactions[]
```

### 8.2 Save → Render Trigger Map

| save() Key | Immediate Render |
|------------|------------------|
| `finapp_transactions` | `renderAll()` (almost always) |
| `finapp_debtors` | `renderAll()` |
| `finapp_goals` | `renderGoals()` + `renderHome()` |
| `finapp_budgets` | `renderBudget()` + `renderHome()` |
| `finapp_recurring` | `renderRecurring()` or `renderSubscriptions()` |
| `finapp_creditors` | `renderAll()` |
| `finapp_resale_*` | `renderResaleDetail()` |
| `finapp_gielda_ops` | `renderGieldaSummary()` + `renderGieldaHistory()` |
| `settings/layouts/{tab}` | `applyDashboardLayout(tab)` |
| `finapp_income_sources` | `renderEarnings()` (via `renderSourceDetail()`) |
| `finapp_strony_products` | `renderStronyDetail()` |
| `finapp_strony_clients` | `renderStronyClients()` |

---

## 9. RISKS

### 9.1 Tight Coupling

- **Monolithic file:** 20K+ lines in a single HTML file with inline JS. No module system, no separation of concerns.
- **Global state mutation:** All data arrays are global `let` variables. Any function can mutate them, leading to hard-to-trace side effects.
- **DOM-coupled logic:** Business logic is deeply interleaved with DOM manipulation. Functions like `renderDebtorDetail()` both mutate state AND render AND attach event listeners.

### 9.2 Race Conditions

- **Resale sales save ordering:** When creating a resale sale, the code pushes to `resaleSales[]`, then calls `save(SK.resaleSales, resaleSales)`, then may call `save(SK.resaleProducts, resaleProducts)` to update stock. If these overlap (e.g., two rapid sales), the in-memory arrays can diverge from Firebase.
- **Guest mode concurrent edit:** Guest and owner can edit the same `finapp_debtors` node simultaneously. Last write wins; no merge strategy.
- **Firebase listener + local mutation:** `startOwnerListener` replaces all arrays on every snapshot. If a local mutation is in-flight when Firebase pushes a new snapshot, the local mutation can be silently overwritten.

### 9.3 Direct Firebase Access Outside `save()`

- `incomeProfiles` writes bypass `save()` — no `_stripUndefinedDeep`, no error toast
- Guest mode creates a direct `.on('value')` on `finapp_debtors` sub-node, separate from owner listener
- `saveDashboardLayoutTab()` writes directly to `settings/layouts/{tab}` with its own try/catch

### 9.4 Global State Mutation Risks

- **No immutability:** Arrays are mutated in place with `.push()`, `.splice()`, `.filter()`. React-style state management is absent.
- **No optimistic update rollback:** If `save()` fails after local mutation, the UI already reflects the change. Firebase errors only show a toast but don't revert state.
- **`_stripUndefinedDeep` only in `save()`:** If any direct Firebase write (see 9.3) includes `undefined`, it will throw synchronously and potentially crash the handler.

### 9.5 Architectural Concerns

- **No error boundaries:** A single uncaught error in a render function can break the entire UI. Some handlers have try/catch, many don't.
- **Memory leaks:** Event listeners attached inside render functions (e.g., `renderDebtorDetail` attaches form submit handlers) are never explicitly removed. Re-rendering creates new listeners.
- **Chart.js instances:** Charts are created but not always destroyed before re-creation (e.g., `_earnMonthChart`, `_wealthMonthChart` have manual destroy calls, but others may leak).
- **SortableJS instance management:** `dashboardSortable` is destroyed on exit, but if `renderAll()` runs while in edit mode, DOM manipulation could desync the Sortable instance.
- **No input sanitization on guest data:** Guest edits use `prompt()` for values and write directly to shared state.
- **Security:** No Firebase Security Rules are visible in the client code. Guest mode relies entirely on obscurity (access code in URL).
- **Performance:** `renderAll()` re-renders the entire UI on every change. With large datasets (thousands of transactions), this will cause jank. No virtualization or pagination exists.

---

## 10. SUMMARY

FINORA is a feature-rich single-page financial application with approximately **20 global state arrays**, **~30 Firebase paths**, and **~50 render functions**. The architecture follows a simple but fragile pattern:

1. Firebase `.on('value')` → snapshot → populate all globals → `renderAll()`
2. User action → mutate global array → `save()` → `renderAll()`

This works for current scale but creates significant risk for:
- State consistency during concurrent edits
- Performance with large datasets
- Maintainability due to monolithic structure
- Security in guest/shared scenarios

**Recommended refactoring priorities for Stage 1.0:**
1. Extract data layer into a proper store with immutable updates
2. Centralize all Firebase writes through `save()` (fix incomeProfiles bypass)
3. Split monolithic file into modules (data, auth, render, domains)
4. Add optimistic update rollback on Firebase errors
5. Implement proper Firebase Security Rules for guest access
