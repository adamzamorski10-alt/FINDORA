# STAGE 5D DISCOVERY

## 1. Executive Summary

Stage 5D Discovery inspected the current greenfield Finora UI (`src/ui/`), all seven views, UI shell, form handling, state management, loading/error/empty states, and the underlying application modules. The goal was to identify concrete UX/functional gaps in the existing MVP flow before adding new product domains.

**Verdict:** The core greenfield architecture is sound and frozen contracts are respected. However, several concrete UX/functional issues prevent the MVP from being considered fully coherent and reliable. The most critical finding is a **data integrity gap** where transaction type and category type are not validated to match, allowing logically impossible records (e.g., an income transaction tagged with an expense category).

## 2. Current MVP UX Flow

The current flow is:

1. **Bootstrap** (`src/ui/bootstrap.js`): Hardcoded `dev-user` ID, creates `AppKernel` with `IndexedDBStorageAdapter`, loads/creates profile, seeds system categories, loads accounts/transactions/budgets/goals, mounts shell.
2. **Shell** (`src/ui/shell.js`): Subscribes to application state, renders active tab view, handles navigation clicks.
3. **Views**: Each view reads from `state.getState()`, renders DOM, handles form submissions by calling `modules.*` and refreshing state.
4. **Settings**: Profile editing, category creation, backup/restore.

The views are functional but incomplete. Several application operations exist without corresponding UI affordances, and some UI behaviors contradict domain invariants.

## 3. Findings

### F-5D-01 (CRITICAL) — Transaction type/category mismatch not validated

**File:** `src/application/transaction/transaction-module.js:78-86`

**Current behavior:** `createTransaction` validates that the category exists and is not archived, but does **not** validate that `category.type === transaction.type`. This allows creating an income transaction with an expense category, or vice versa.

**Why it is a problem:** This violates the domain invariant that transaction type and category type must align. It produces logically impossible records that corrupt reporting (e.g., an "income" tagged as "Food" expense category will be excluded from income reports but counted as an expense if the type is corrected).

**Evidence:**
```javascript
// transaction-module.js:81-86
if (resolvedCategoryId !== null) {
  const category = await validateReference(categoryRepo, resolvedCategoryId, userId, 'category');
  if (category.archived) {
    throw new Error('VALIDATION_FAILED');
  }
  // NO CHECK: category.type must === type
}
```

**Recommended minimal fix:** Add `if (category.type !== type) throw new Error('VALIDATION_FAILED');` inside the category validation block.

---

### F-5D-02 (HIGH) — No month navigation in any view

**File:** `src/ui/shell.js`, `src/ui/views/transactions.js`, `src/ui/views/reports.js`, `src/ui/views/budgets.js`

**Current behavior:** `state.ui.monthKey` exists but there is no UI component to change months. Transactions, reports, and budget progress are all locked to the current month.

**Why it is a problem:** Users cannot review past months' transactions, reports, or budget performance. This is a fundamental finance workflow gap.

**Evidence:** No month selector rendered in any view. `monthKey` is read from state but never dispatched as `SET_MONTH_KEY` from UI.

**Recommended minimal fix:** Add a simple month navigation component (previous/next or month picker) to the shell or each affected view, dispatching `SET_MONTH_KEY` and re-rendering.

---

### F-5D-03 (HIGH) — No account balance display in Accounts view

**File:** `src/ui/views/accounts.js:59-67`

**Current behavior:** The account list shows `name` and `type` only. No balance is displayed.

**Why it is a problem:** Users cannot see their account balances without navigating to Dashboard or Reports. For a finance app, balance visibility on the accounts list is a core expectation.

**Evidence:** Account item renders only `.account-name` and `.account-type`. No `.account-balance` element.

**Recommended minimal fix:** Compute and display `getAccountBalance` for each account in the list, or show the cached balance if available from state.

---

### F-5D-04 (HIGH) — Budget edit UI missing

**File:** `src/ui/views/budgets.js`, `src/application/budget/budget-module.js:98-119`

**Current behavior:** The budget view supports create and archive only. The `updateBudget` module operation exists and is tested, but the UI has no edit form or edit button.

**Why it is a problem:** Users cannot adjust budget amounts without deleting and recreating budgets.

**Evidence:** No `editingId` form logic in `budgets.js`. No "Edit" button rendered in budget items.

**Recommended minimal fix:** Add edit mode to budget form, pre-populated with existing budget data, dispatching `updateBudget` on submit.

---

### F-5D-05 (HIGH) — Goal edit UI missing

**File:** `src/ui/views/goals.js`, `src/application/goal/goal-module.js:97-152`

**Current behavior:** The goal view supports create, deposit, and archive only. The `updateGoal` module operation exists and is tested, but the UI has no edit button.

**Why it is a problem:** Users cannot modify goal targets, deadlines, or names without deleting and recreating goals.

**Evidence:** Goal items render only Deposit and Archive buttons. No "Edit" button exists.

**Recommended minimal fix:** Add edit mode to goal form with "Save Changes" button, dispatching `updateGoal`.

---

### F-5D-06 (HIGH) — Archived categories appear in transaction and budget dropdowns

**File:** `src/ui/views/transactions.js:192-221`, `src/ui/views/budgets.js:241-268`

**Current behavior:** `refreshCategoryOptions` and budget category select populate from `modules.category.getCategories()`, which returns **active** (non-archived) categories. However, after a category is archived, existing views do not re-fetch categories. More importantly, the `getCategories` module method filters out archived categories, but the UI doesn't handle the case where a selected category becomes archived between renders.

**Why it is a problem:** If a user archives a category that was previously selected in a transaction form, the form may retain the stale archived category ID. While the module would reject using an archived category on create/update, the UI should not present archived categories as options.

**Evidence:** `refreshCategoryOptions` calls `modules.category.getCategories()` which filters archived. However, after archiving a category, the transaction/budget views are not re-rendered, so the select may still contain the archived option if it was already in the DOM.

**Recommended minimal fix:** After category mutations, refresh category selects in active views, or filter out archived categories in the select population logic.

---

### F-5D-07 (HIGH) — Dashboard `Promise.all` error handling is all-or-nothing

**File:** `src/ui/views/dashboard.js:30-57`

**Current behavior:** Five parallel fetches are wrapped in a single `Promise.all`. If any one fails (e.g., `getActiveAccounts`), the entire dashboard shows "Error loading dashboard" and all other data is discarded.

**Why it is a problem:** A transient failure in one data source prevents the user from seeing all other dashboard data. This is fragile and degrades the entire view for a partial failure.

**Evidence:**
```javascript
Promise.all([...])
  .then(([summary, accounts, budgets, goals, safeToSpend]) => { ... })
  .catch(e => {
    summaryEl.textContent = 'Error loading dashboard: ' + e.message;
  });
```

**Recommended minimal fix:** Use `Promise.allSettled` and render partial data, showing per-module errors inline.

---

### F-5D-08 (HIGH) — Duplicate submission protection missing

**File:** `src/ui/views/accounts.js:176`, `src/ui/views/transactions.js:257`, `src/ui/views/budgets.js:200`, `src/ui/views/goals.js:249`, `src/ui/views/settings.js:76`

**Current behavior:** All form submit handlers call `e.preventDefault()` but do not disable the submit button or track submission state. Rapid double-clicks or accidental resubmissions can fire multiple identical mutations.

**Why it is a problem:** Users can create duplicate accounts, transactions, budgets, goals, or settings saves with a double-click.

**Evidence:** No `disabled` attribute set on submit buttons during async operations. No `OPERATION_START`/`OPERATION_STOP` checks in UI before submitting.

**Recommended minimal fix:** Disable submit button on submit, re-enable in `finally` block.

---

### F-5D-09 (HIGH) — Settings optimistic state not reverted on secondary failure

**File:** `src/ui/views/settings.js:76-100`

**Current behavior:** On profile update failure, the view catches the error and tries to reload the persisted profile. If the reload **also** fails, the optimistic state changes remain in the UI. The user sees stale/incorrect settings with no way to recover.

**Why it is a problem:** The UI can display settings that were never persisted, and the user has no indication that the local state is corrupt.

**Evidence:**
```javascript
// settings.js:88-95
} catch (err) {
  state.dispatch({ type: 'OPERATION_ERROR', key: 'updateProfile', error: err.message });
  try {
    const reloaded = await modules.user.getProfile({ userId: currentProfile.id });
    state.dispatch({ type: 'SET_USER_PROFILE', profile: reloaded });
  } catch (_reloadErr) {
    // If reload also fails, keep the existing error state and let the user retry.
  }
  alert('Failed to save settings: ' + err.message);
}
```

**Recommended minimal fix:** On reload failure, reset profile state to `null` or a known-safe default, and surface a clear error message.

---

### F-5D-10 (MEDIUM) — Transaction list lacks account name and category name

**File:** `src/ui/views/transactions.js:53-76`

**Current behavior:** Each transaction item shows date, description, type (+/-), and amount. Account name and category name are not displayed.

**Why it is a problem:** Users cannot identify which account a transaction belongs to or what category it uses without clicking Edit. This is a core readability gap.

**Evidence:** Transaction item renders `.transaction-date`, `.transaction-description`, `.transaction-type`, `.transaction-amount` only.

**Recommended minimal fix:** Add `.transaction-account` and `.transaction-category` elements, populated from the accounts/categories maps.

---

### F-5D-11 (MEDIUM) — Budget category names shown as raw IDs initially

**File:** `src/ui/views/budgets.js:99-118`

**Current behavior:** Budget items render with `.budget-category` set to `categoryMap.get(budget.categoryId) || budget.categoryId`. Since `categoryMap` is populated asynchronously after render, budget categories appear as raw UUIDs until the categories load.

**Why it is a problem:** Users see opaque IDs instead of human-readable category names on initial load.

**Evidence:**
```javascript
// budgets.js:111
if (nameEl) nameEl.textContent = categoryMap.get(budget.categoryId) || budget.categoryId;
```

**Recommended minimal fix:** Show "Loading..." or hide category names until the category map is populated.

---

### F-5D-12 (MEDIUM) — No client-side amount validation in forms

**File:** `src/ui/views/accounts.js:152-155`, `src/ui/views/transactions.js:164`, `src/ui/views/budgets.js:178`, `src/ui/views/goals.js:212`

**Current behavior:** Amount fields accept any input including `0`, negative numbers, and non-numeric strings. The application module validates these, but the UI allows users to submit invalid forms and only shows a generic `alert('Please fill in all fields.')` after the fact.

**Why it is a problem:** Poor UX — users submit forms expecting success, then get a generic alert. Zero or negative amounts should be caught before submission.

**Evidence:** `const amount = currentForm.amount === '' ? undefined : Number(currentForm.amount);` — `Number('')` is `0`, which passes the `!accountId || !amount || !type` check only if `amount` is `0` (falsy). Actually `0` is falsy so it would be caught. But negative amounts pass through and are rejected by the module.

**Recommended minimal fix:** Add `min="0.01"` and `step="0.01"` to number inputs, and check `amount > 0` before calling the module.

---

### F-5D-13 (MEDIUM) — Goal deposit form uses fragile DOM queries

**File:** `src/ui/views/goals.js:108-121`

**Current behavior:** The deposit form reads account selection, amount, and date from DOM queries (`goalActions.querySelector('select')`, `depositForm.querySelector('input[type="number"]')`). If the goal list re-renders while the form is open, the DOM references become stale.

**Why it is a problem:** If any state change triggers a re-render of the goals view while a user is filling out a deposit form, the form silently stops working or submits with empty values.

**Evidence:** Direct DOM queries instead of reading from state form object.

**Recommended minimal fix:** Use a state-backed form object (like other views do) or prevent re-renders while deposit forms are open.

---

### F-5D-14 (MEDIUM) — No visual indicators for budget overage or goal progress

**File:** `src/ui/views/budgets.js:129-134`, `src/ui/views/goals.js:64-67`

**Current behavior:** Budgets show text "Over by: X" or "Remaining: X" with no color coding. Goals show `current/target` as raw numbers with no progress indicator.

**Why it is a problem:** Users must parse numbers to understand status. Visual indicators (color, progress bars) make status instantly scannable.

**Evidence:** No CSS classes for over-budget or goal-progress states. No inline styles or conditional classes.

**Recommended minimal fix:** Add `.over-budget` / `.on-track` CSS classes, and a simple progress bar for goals.

---

### F-5D-15 (MEDIUM) — Category colors not displayed in UI

**File:** `src/ui/views/transactions.js`, `src/ui/views/budgets.js`, `src/ui/views/goals.js`

**Current behavior:** Categories have `color` fields but no view renders category colors.

**Why it is a problem:** Color is a primary visual discriminator for categories. Without displaying it, the UI loses a key affordance.

**Evidence:** No `category.color` usage in any view.

**Recommended minimal fix:** Add colored dots or badges next to category names in transaction list, budget list, and category dropdowns.

---

### F-5D-16 (MEDIUM) — Transaction notes not displayed

**File:** `src/ui/views/transactions.js:64-66`

**Current behavior:** Transaction list shows description but not notes.

**Why it is a problem:** Notes contain supplementary context that users may need to reference.

**Evidence:** Only `.transaction-description` is rendered. `tx.notes` is never accessed.

**Recommended minimal fix:** Show notes in transaction list items, perhaps as a secondary line or tooltip.

---

### F-5D-17 (MEDIUM) — Account type confusion (savings excluded from safe-to-spend)

**File:** `src/application/safe-to-spend/safe-to-spend-module.js:54`, `src/ui/views/dashboard.js:49`

**Current behavior:** Safe-to-Spend excludes `savings` accounts from `freeFunds`. The dashboard shows "Safe-to-Spend" but does not explain this exclusion.

**Why it is a problem:** Users who deposit money into a "Skarbonka" (savings) account will see their safe-to-spend drop, with no explanation that savings accounts are intentionally excluded.

**Evidence:** `computeFreeFunds` filters `a.type === 'bank' || a.type === 'cash'`. Dashboard shows only the number.

**Recommended minimal fix:** Add a small note or tooltip explaining that savings accounts are excluded from safe-to-spend calculations.

---

### F-5D-18 (MEDIUM) — Reports show only categories with transactions

**File:** `src/ui/views/reports.js:64-68`, `src/application/reporting/reporting-module.mjs:105-116`

**Current behavior:** Category breakdown shows only categories that have transactions in the selected month. Categories with zero spending are omitted.

**Why it is a problem:** Users cannot see a complete picture of all their categories in a month — only active ones.

**Evidence:** `getMonthCategoryBreakdown` iterates over transactions only. No zero-entry categories are injected.

**Recommended minimal fix:** Include all non-archived expense categories with zero totals in the breakdown.

---

### F-5D-19 (MEDIUM) — No way to cancel long-running operations

**File:** All view form handlers

**Current behavior:** Once a mutation starts (`OPERATION_START`), there is no abort mechanism. If the user navigates away or the network hangs, the operation continues in the background.

**Why it is a problem:** Users can trigger multiple concurrent operations, leading to race conditions or wasted resources.

**Evidence:** No `AbortController` or cancellation token used in any module or view.

**Recommended minimal fix:** Add a cancellation mechanism or at minimum disable navigation/forms during operations.

---

### F-5D-20 (LOW) — Dark mode / privacy mode settings have no UI effect

**File:** `src/ui/views/settings.js:45-60`, `src/ui/app.css`

**Current behavior:** Settings form allows selecting `theme` (light/dark/system) and `privacyMode`, but the CSS does not implement theme switching and no view respects `privacyMode`.

**Why it is a problem:** Settings appear functional but have no visible effect, confusing users.

**Evidence:** `app.css` contains no theme classes or privacy-mode rules.

**Recommended minimal fix:** Either implement theme switching and privacy mode, or remove the non-functional settings from the UI until they are implemented.

---

### F-5D-21 (LOW) — Goal deposit description hardcoded

**File:** `src/ui/views/goals.js:140`

**Current behavior:** Goal deposits always create transactions with `description: 'Goal deposit'`. Users cannot customize the description.

**Why it is a problem:** Users may want to track different deposits with different descriptions (e.g., "Monthly savings", "Bonus allocation").

**Evidence:** Hardcoded string in deposit handler.

**Recommended minimal fix:** Add a description field to the deposit form.

---

### F-5D-22 (LOW) — Opening balance transactions not visually distinguished

**File:** `src/ui/views/transactions.js:53-76`

**Current behavior:** Opening balance transactions are rendered identically to normal transactions. No icon, badge, or visual distinction indicates they are system-generated opening balances.

**Why it is a problem:** Users may be confused by opening balance entries appearing alongside regular transactions.

**Evidence:** No check for `tx.metadata?.openingBalance` in transaction list rendering.

**Recommended minimal fix:** Add a badge or label (e.g., "Opening Balance") for transactions with `metadata.openingBalance === true`.

---

### F-5D-23 (LOW) — Default account seeding silent and confusing

**File:** `src/application/account/account-module.js:68-88`, `src/ui/bootstrap.js:82`

**Current behavior:** `createAccount` automatically seeds default accounts (Konto, Skarbonka, Inne) if they don't exist. The UI does not communicate this. If a user creates an account named "Konto" manually, the module silently creates another "Konto" because it checks for existing names after save.

**Why it is a problem:** Users may end up with duplicate accounts or be confused by sudden additional accounts appearing.

**Evidence:** Default seeding happens inside `appTx.run` after the user's account is saved.

**Recommended minimal fix:** Show a toast/notification when default accounts are auto-created, or move default seeding to bootstrap only.

---

### F-5D-24 (LOW) — No progress bars for goals or budgets

**File:** `src/ui/views/goals.js:64-67`, `src/ui/views/budgets.js:63-71`

**Current behavior:** Goal progress and budget progress are shown as text numbers only.

**Why it is a problem:** Text-based progress is harder to scan visually than progress bars.

**Evidence:** No CSS or inline styles for progress bars.

**Recommended minimal fix:** Add simple CSS-based progress bars for goal current/target and budget spent/amount.

---

## 4. What Already Works Correctly

- **Frozen architecture**: G1.1, G1.2, G1.3 unchanged. StorageAdapter contract intact.
- **Shell/navigation**: Tab switching works, lifecycle management works, `data-tab` navigation is clean.
- **Form state management**: Views use `SET_*_FORM` dispatches correctly. Forms reset after successful mutations.
- **Data refresh after mutations**: All views refresh their lists after create/archive operations.
- **Loading/error/empty states**: All views show loading messages, error messages, and empty state messages.
- **Backup/restore**: Full export/import/preview/confirm flow works in Settings.
- **Safe-to-Spend**: Correctly computed and displayed on Dashboard.
- **Reports**: Monthly summary and category breakdown work correctly.
- **System categories**: Correctly seeded and excluded from user-facing category selection where appropriate.
- **Goal contributions**: Deposit flow works, Goal.current is correctly adjusted.
- **Budget progress**: Computed correctly for the current month.
- **Opening balance**: Created atomically with account, correctly excluded from reporting and safe-to-spend freeFunds.
- **Cross-view isolation**: Views don't import repositories or storage directly.
- **Archive semantics**: Archived entities are excluded from active lists and appropriate dropdowns.

## 5. Test Coverage Gaps

| Area | Existing Coverage | Gap |
|---|---|---|
| UI Views | `tests/ui/views.test.js` — renders without state only | No tests for interactive behavior, form submission, state dispatch, or DOM updates after mutations |
| Shell | `tests/ui/shell.test.js` | No tests for navigation, lifecycle transitions, or view rendering with real state |
| Bootstrap | `tests/ui/bootstrap.test.js` | No browser-based integration tests for the full bootstrap flow |
| Month navigation | None | No tests for month switching in transactions/reports/budgets |
| Account balance display | None | No tests for balance rendering in accounts view |
| Budget edit | None | UI has no edit form, so no coverage |
| Goal edit | None | UI has no edit button, so no coverage |
| Transaction type/category validation | Module-level tests exist | No UI-level test for dropdown behavior or form validation |
| Duplicate submission | None | No test for double-click protection |
| Settings rollback | Unit test exists | No UI test for failed save + reload flow |
| Dashboard partial failure | None | No test for `Promise.allSettled` behavior |
| Category archiving effect on dropdowns | None | No test for stale category selects after archive |
| Dark mode / privacy mode | None | No implementation, no tests |

## 6. Explicitly Deferred Items

The following are **intentionally out of scope** for Stage 5D Discovery and do not block MVP closure:

- Recurring transactions
- Auto-Save / goal auto-deposit
- Tags / labels
- Investments / net worth tracking
- Cloud sync
- CSV export
- Undo/redo
- Keyboard shortcuts
- Mobile responsiveness
- Accessibility (aria labels, screen readers)
- Charts / graphs in reports
- Budget rollover / multi-period budgets
- Transaction search / filter
- Account reordering / favorites
- Data import (partial)
- Multi-currency support
- Bill reminders

## 7. Recommended Stage 5D Implementation Scope

Based on severity, the recommended implementation order is:

**Phase 1 — Must fix before MVP can be considered complete:**
1. F-5D-01: Add transaction type/category alignment validation
2. F-5D-02: Add month navigation to transactions, reports, and budgets
3. F-5D-03: Display account balances in accounts view
4. F-5D-08: Add duplicate submission protection (disable buttons during operations)

**Phase 2 — Important UX functional gaps:**
5. F-5D-04: Add budget edit UI
6. F-5D-05: Add goal edit UI
7. F-5D-07: Fix dashboard error handling with `Promise.allSettled`
8. F-5D-09: Fix settings optimistic state rollback on secondary failure
9. F-5D-06: Filter archived categories from dropdowns after mutations

**Phase 3 — Polish and completeness:**
10. F-5D-10: Show account/category names in transaction list
11. F-5D-11: Show loading state for budget category names
12. F-5D-12: Add client-side amount validation
13. F-5D-13: Fix goal deposit form state management
14. F-5D-14: Add visual indicators for budget overage/goal progress
15. F-5D-15: Display category colors in UI
16. F-5D-16: Show transaction notes
17. F-5D-17: Explain safe-to-spend savings exclusion
18. F-5D-18: Show zero-spend categories in reports

**Phase 4 — Low priority:**
19. F-5D-20: Implement or remove dark mode/privacy mode settings
20. F-5D-21: Add goal deposit description field
21. F-5D-22: Distinguish opening balance transactions visually
22. F-5D-23: Communicate default account seeding
23. F-5D-24: Add progress bars
24. F-5D-19: Add operation cancellation (deferred to later stage)

---

`STAGE_5D_DISCOVERY_COMPLETE`
