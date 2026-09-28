# FINDORA — MASTER PROJECT CONTEXT, ARCHITECTURE, ROADMAP & OPERATING MANUAL
## Version 4.1 — 28 September 2026

> This is the canonical context package for Findora. Give this file to another AI coding agent/architect when you want it to understand the product, architecture, history, current status, roadmap, testing rules and AI workflow.
>
> **Important:** the last explicitly confirmed Git checkpoint is below in section 33. The repository MUST be inspected before any changes.

---

# 1. PRODUCT — NORTH STAR

**FINDORA — Personal Wealth OS** is a private, local-first personal-finance application intended to become a polished professional fintech product.

Core brand:
- brand name: **FINDORA**
- product descriptor: Personal Wealth OS

Core goals:
- reliable personal finance management
- local-first/private storage
- clear financial calculations
- professional fintech UX
- modular architecture
- strong testability
- future extensibility without rebuilding the core

Current MVP domains:
- Accounts
- Transactions
- Categories
- Budgets
- Goals
- Safe-to-Spend
- Reports
- Dashboard
- Settings
- Backup/Restore
- IndexedDB persistence
- Appearance/accent themes

The product should feel like a finished fintech/SaaS product, not a school project, CRUD demo or generic AI dashboard.

---

# 2. DEVELOPMENT PRINCIPLE

## PRZYSPIESZAMY ROZWÓJ, ALE NIE OBNIŻAMY JAKOŚCI

Speed comes from smaller coherent stages, avoiding unnecessary work, using the right AI for the right job, LOW reasoning for simple tasks, MEDIUM for difficult implementation/debugging, HIGH only for architecture/security/final hostile audits, focused tests during implementation and complete regression at stage gates.

Never speed up by:
- skipping tests
- skipping hostile audits
- weakening security
- changing frozen contracts casually
- claiming evidence that was not actually produced
- combining unrelated work into giant prompts

---

# 3. AI TEAM MODEL

## ChatGPT — ARCHITECT / STRATEGIST / PROJECT MANAGER

ChatGPT decides:
- architecture direction
- stage order
- scope and priorities
- what should NOT be built
- quality gates
- which AI should perform a task
- interpretation of AI reports
- product/UX direction
- roadmap

The user mainly pastes exact prompts into coding AIs and accepts/rejects recommendations.

## Kilo Code — TECHNICAL IMPLEMENTATION ENGINE

Use Kilo primarily for:
- implementation
- refactoring
- application modules
- repositories
- persistence
- domain logic
- calculators
- tests
- integration work
- state/kernel work
- backup/restore internals
- theme infrastructure
- CSS implementation when visual inspection is not required
- bug fixes
- code-level hostile audits
- regression suites

## Antigravity — PRODUCT/UI/BROWSER SPECIALIST

Antigravity has the special ability to physically run the application, click through it, inspect screenshots and evaluate real UI. Its limited usage should therefore be reserved for tasks where this advantage matters.

Use Antigravity mainly for:
- physical browser inspection
- screenshots
- visual composition
- spacing/typography/color review
- real forms and interactions
- responsive/mobile inspection
- UX/product critique
- visual consistency
- final visual acceptance
- testing themes physically

Do not waste its limited budget on ordinary backend implementation.

---

# 4. STANDARD DEVELOPMENT WORKFLOW

Normal stage:
1. ChatGPT defines exact scope.
2. Discovery if needed.
3. Kilo implements.
4. Kilo runs focused tests.
5. Kilo runs relevant regression.
6. Antigravity physically tests if UI/interaction evidence is required.
7. Antigravity reports concrete evidence/screenshots.
8. ChatGPT decides acceptance/remediation.
9. Only then move on.

Visual stage:
1. Kilo prepares implementation/infrastructure.
2. Antigravity opens the real production path.
3. Antigravity interacts and captures screenshots.
4. Concrete findings are fixed.
5. Targeted re-check.
6. ChatGPT final acceptance.

AI reports are evidence, not automatic truth. "PASS", "FINAL" or "100%" does not override contradictory evidence.

---

# 5. FAST/EFFICIENT PROMPT STANDARD

Every Kilo prompt should state a recommended reasoning level.

**LOW** — simple implementation, small UI changes, tests, straightforward fixes.

**MEDIUM** — difficult implementation, debugging, cross-module behavior, persistence, harder UI logic.

**HIGH** — architecture, hard security, final hostile audits.

Do not combine discovery + huge implementation + full regression + hostile audit into one unnecessarily large prompt.

---

# 6. GREENFIELD STRATEGY

The old monolithic `index.html` is **Legacy Reference**, not the implementation template.

It is useful for:
- historical behavior
- business rules
- data shapes
- edge cases
- old functionality
- migration knowledge

The new Findora is greenfield. Do not endlessly rewrite the old monolith. Legacy data migration is a separate future problem after the new architecture is stable.

Greenfield production path:
`src/ui/app.html` → `bootstrap.js` → `app-kernel.js` → application modules → repositories → IndexedDB.

The legacy application must not be part of the greenfield runtime path.

---

# 7. DISCOVERY G0

G0 discovery is complete.

## G0.1 Product discovery
Legacy capabilities were inventoried across transactions, balances, Safe-to-Spend, transfers, budgets, goals, debts, creditors/loans, income, Strony, Resale, Giełda, recurring, Auto-Save, reports, reminders, backup/restore, privacy, themes, search and export.

## G0.2 Data model inventory
A 24-entity legacy inventory was created with fields, relations, persisted/derived status and deprecated fields.

## G0.3 Business rules
Important preserved rules include balance formulas, Safe-to-Spend, Goal ETA, shipping deadline behavior, duplicate detection behavior and other financial edge cases.

## G0.4 Product scope
**CORE/MVP-1:** Accounts, Transactions, Categories, Budgets, Goals, Basic Reports, Safe-to-Spend.

**NEXT/MVP-2:** Recurring, Auto-Save, Tags/Notes, Privacy Mode, Import, Backup/Restore, Theme. Backup/Restore was moved earlier because it is an important safety feature.

**OPTIONAL/V1+:** Debtors, Creditors, Giełda, Strony, Resale, Reminders, Global Search, Cloud Sync.

**REDESIGN:** Dashboard, Transfers, Auto-Save engine, Guest Mode, Resale, Strony, Giełda, Income model.

**DROP:** Vinted tracker, legacy Guest Mode, inline base64 labels, isSubscription, global state, uid generator.

---

# 8. G1.1 DOMAIN MODEL — FROZEN

Freeze commit: `f148d52afdf302aa13fe31e2f60d1026438f9858`

MVP-1:
- UserProfile
- Account
- Transaction
- Category
- Budget
- Goal

MVP-2:
- RecurringRule
- SavingsRule
- Tag

Advanced V1+:
- Transfer
- Debtor/Debt/DebtRepayment
- Creditor/Loan/LoanRepayment
- Investment/InvestmentTransaction

Plugins later:
- Resale
- Strony

Dropped:
- dual incomeSources/incomeProfiles
- underscore flags
- paired transfer hacks
- base64 labels
- isSubscription
- activeMoneyPlace global
- uid generator

## UserProfile
`id`, dates, `settings.currency`, `settings.theme`, `settings.privacyMode`, `settings.excludeInvestmentsFromNetWorth`.

## Account
`id,userId,name,type,icon,color,archived,createdAt,updatedAt`.
MVP types: `cash`, `bank`, `savings`. Investment is V1+.

Default accounts are seeded idempotently and must never overwrite user data:
- Konto bank
- Skarbonka
- Inne

## Category
`id,userId,name,type,icon,color,parentId,isSystem,systemRole,archived,createdAt,updatedAt`.
MVP is flat: `parentId=null`.
System roles: `savings`, `opening-balance`, null.
Archive is blocked if active budgets reference the category; no cascade.

## Transaction
`id,userId,accountId,amount,type,categoryId,description,date,notes,metadata,archived,createdAt,updatedAt`.
Amount is positive; type determines income/expense.
Controlled metadata keys include transferId, recurringRuleId, savingsRuleId, goalId, sourceId, debtId, debtRepaymentId, loanId, loanRepaymentId, openingBalance.

Opening balance:
- positive → income transaction
- negative → expense transaction using absolute value
- marked `metadata.openingBalance === true`
- included in account balance
- excluded from normal income/expense reporting
- excluded from budget progress
- excluded from Safe-to-Spend

## Goal
`current` is a persisted, rebuildable cache. Authoritative rule:
`current = sum of qualifying non-archived goal-contribution transactions`.
GoalModule is the sole authoritative owner. No arbitrary clamping. Over-target deposit is rejected. Initial funding uses `depositToGoal`.

---

# 9. DERIVED VALUES / SAFE-TO-SPEND

Derived:
- account balance
- Safe-to-Spend
- budget progress
- goal progress
- goal ETA
- net worth
- monthly income/expense/category breakdown

MVP-1 Safe-to-Spend:
`sum spendable balances - goalRequirements`

Opening-balance transactions are excluded from Safe-to-Spend, although they still affect account balance.
MVP-2 may later add recurring bills.
Pure calculator output is exactly `{safeTotal, perDay}`. Application service may return a wider envelope.
`daysLeft` is finite and clamped to at least 1.

Goal required deposit uses the established ceiling rule:
`ceil((target-current)/monthsLeft)`.

---

# 10. G1.2 APPLICATION CONTRACTS — FROZEN

Exactly 31 operations:
- 16 commands
- 15 queries

Frozen rules:
- Goal creation starts with current 0.
- Initial goal funding uses `depositToGoal`.
- Negative opening balances are supported.
- Safe-to-Spend is greenfield and dependency-injected.
- `archiveBudget`, not hard delete.
- transaction update cannot archive; use `archiveTransaction`.
- storage failures use explicit error codes.
- omitted categoryId normalizes to null.
- no MVP-1 transaction tags.

Error codes:
- `NOT_FOUND` = absent OR belongs to another user
- `VALIDATION_FAILED`
- `STORAGE_UNAVAILABLE`

---

# 11. REPOSITORY CONTRACTS — FROZEN

UserRepository:
- findById
- save

AccountRepository:
- loadAll
- findById
- save
- archive

CategoryRepository:
- loadAll
- findById
- findSystem
- save
- archive

TransactionRepository:
- loadAll
- findById
- findByMonth
- findByAccount
- save
- archive

BudgetRepository:
- findAll
- findById
- findByCategory
- save
- archive

GoalRepository:
- loadAll
- findById
- save
- archive

Do not casually add listeners, saveMany, findActive, findUser, updateMany, listenRoot or hard delete.

---

# 12. G1.3 MODULE ARCHITECTURE — FROZEN

Eight modules:
1. UserModule
2. AccountModule
3. CategoryModule
4. TransactionModule
5. BudgetModule
6. GoalModule
7. SafeToSpendModule
8. ReportingModule

Dependency direction:
`UI → Application Modules → Repository Interfaces / Pure Calculators → StorageAdapter → concrete storage`

Goal.current belongs to GoalModule. TransactionModule uses a one-way `IGoalCurrentAdjuster`.

Five multi-repository atomic commands:
1. createAccount
2. createTransaction when goal contribution
3. updateTransaction when goal contribution
4. archiveTransaction when goal contribution
5. depositToGoal

`rebuildGoalCurrent` must not introduce nested transaction behavior.

---

# 13. STORAGE / PERSISTENCE — FROZEN

Canonical base StorageAdapter contract:
- get
- set
- update
- remove

Do NOT add public `keys()` to the base adapter.
Concrete infrastructure may expose key enumeration internally; the current composition uses injected `listKeys`.

IndexedDB:
- DB name `finora`
- store `kv`
- keyPath `key`
- records `{key,value}`
- DB version 1
- no indexes

Infrastructure includes:
- MemoryStorageAdapter
- IndexedDBStorageAdapter
- ApplicationTransaction

Transactions buffer writes/deletes, commit atomically, abort safely, reject overlapping transactions and validate transaction context identity.

Repository keys:
- `user:{userId}`
- `account:{userId}:{accountId}`
- `category:{userId}:{categoryId}`
- `transaction:{userId}:{transactionId}`
- `budget:{userId}:{budgetId}`
- `goal:{userId}:{goalId}`

Repositories are user-scoped. Mismatched entity.userId on save must fail.

`createPersistence({storageAdapter,userId})` returns storage, userId, repositories, initialize(), and listKeys.

---

# 14. APPLICATION STATE / KERNEL

State is UI/session state, not a domain database.

Shape:
```js
{
  lifecycle: 'initial'|'initializing'|'ready'|'error',
  initializationError: string|null,
  session: { userId, profile, profileLoading, profileError },
  ui: {
    activeTab, privacyMode, theme, currentView,
    selectedAccountId, selectedCategoryId, selectedGoalId, monthKey
  },
  operations: { [key]: { loading, error } }
}
```

`createAppKernel({storageAdapter,userId,openingBalanceCategoryId})` creates persistence, transaction coordination, GoalModule, all modules and state. UI should use modules, not bypass them.

---

# 15. COMPLETED DEVELOPMENT STAGES

Major completed work:

- Stage 0.3: backup/restore/schema foundation, 28/28 tests.
- Stage 1.0–1.0C: data-layer separation, 78/78.
- Stage 1.1–1.1B: application state/dashboard layout repository, 125/125.
- Stage 1.2–1.2E: StorageAdapter + adapters + composition, 171/171.
- Stage 1.3: generic schema framework, hostile PASS.
- Stage 1.4: Safe-to-Spend calculator/service, hardened tests.
- Stage 1.5: pure calculators/services, 839 tests.
- Stage 1.6B: SessionManager/UserDataLoader/repository transitional work.
- G0: discovery complete.
- G1.1: domain model frozen.
- G1.2: application contracts frozen.
- G1.3: architecture frozen.
- G3.1: storage closed.
- G3.2: repositories closed.
- G3.3: persistence closed.
- G4.1 UserModule closed.
- G4.2 AccountModule closed, including default account seeding.
- G4.3 CategoryModule closed.
- G4.4 TransactionModule closed, including null goalId bug fix.
- G4.5 BudgetModule closed.
- G4.6 GoalModule closed.
- G4.7 SafeToSpendModule closed, including opening-balance exclusion correction.
- G4.8 ReportingModule closed.
- G4 final gate closed; 31/31 operations verified.
- Application State stages 1–2 closed.
- Stage 3 UI Shell closed.
- Stage 4 core UI closed.
- Stage 5A production bootstrap + IndexedDB closed.
- Stage 5B first-use/core finance UX closed.
- Stage 5C backup/export/import/restore closed with real browser proof.
- Stage 5D-1 core usability closed.
- Stage 5D-2 budget/goal/settings/dashboard/transaction usability closed.
- Final MVP hostile gate passed after correcting a test-only dashboard selector bug.
- UI-1 through UI-8 visual redesign and browser verification closed.
- Appearance/accent system implemented and final gate closed.
- Final MVP hardening passed; no P1 blockers remain.

---

# 16. BACKUP / RESTORE

Greenfield backup uses domain entities, not raw storage.

Properties:
- versioned envelope
- validation
- integrity checksum
- real SHA-256 via `crypto.subtle.digest`
- preview
- explicit confirmation
- pre-restore backup
- userId lock
- cross-user protection
- atomic full replacement
- Goal.current rebuild
- derived values not authoritative backup data

No current cloud backup, merge restore, incremental backup, CSV migration or legacy migration.

A real Chromium E2E flow verified:
- export via actual download
- import via file input
- preview
- confirm restore
- full replace semantics
- refresh persistence
- Goal.current rebuild
- Safe-to-Spend/report/account behavior
- all seven views
- zero browser errors

---

# 17. MVP STATUS

**MVP_HARDENING_PASS**

The MVP is functionally ready. No current P1 MVP blockers remain.

Core components:
- Accounts
- Transactions
- Categories
- Budgets
- Goals
- Reports
- Safe-to-Spend
- Dashboard
- Settings
- Backup/Restore
- IndexedDB
- Appearance/accent themes

Production entry point:
`src/ui/app.html`

Do NOT use legacy `index.html` as the production app.

---

# 18. LOCAL RUNTIME NOTE

On the user's Windows environment, Python's built-in HTTP server mapped `.mjs` to `text/plain`, so browsers rejected module scripts. This caused an `Initializing...` state even though the app itself was correct.

Recommended local server:
```bash
npx serve .
```
Then:
`http://localhost:3000/src/ui/app.html`

A `dlnk.one` failed request seen during manual testing was caused by a browser extension/content script, not Findora.

---

# 19. UI DESIGN DIRECTION

Final art direction:

## FINDORA PREMIUM ANALYTICS / PREMIUM DATA-RICH FINTECH

It combines:
1. Premium Data-Rich Fintech
2. Modern SaaS Analytics Dashboard
3. Professional Financial Analytics
4. Whitespace-Oriented Professional UI

This is a **premium fintech + SaaS analytics + personal finance** combination, with emphasis on:
**whitespace + large numbers + data + charts + visualizations + elegant composition.**

Visual identity:
- calm premium fintech feeling
- data-oriented but not overwhelming
- professional analytics dashboard feel
- high information hierarchy
- strong KPI visibility
- elegant chart surfaces
- controlled, sophisticated gradients
- modern SaaS/analytics atmosphere

Desired feeling:
- premium
- calm
- modern
- trustworthy
- data-oriented
- polished
- professional
- sophisticated

Avoid:
- generic admin-panel appearance
- school-project appearance
- excessive glassmorphism
- neon overload
- random gradients
- card-everything layouts
- AI-dashboard syndrome
- visual chaos
- crypto/trading aesthetics as primary style
- overly dense tables
- decorative gradients everywhere
- too many small elements
- tiny texts and numbers
- overly decorative surfaces
- "AI-generated dashboard" appearance
- charts created only to have charts

Design rules:
- whitespace is a design tool, not wasted space
- large, clear KPI numbers for primary financial indicators
- elegant chart surfaces with specific purpose
- gradients are refined visual tools, not decorations everywhere
- every visualization must have a clear financial decision purpose
- strong hierarchy between primary and secondary information
- rich but not dense data presentation
- modern SaaS/analytics professional feel
- desktop-first with mobile-compatible layouts

Design tokens:
- background `#090D16`
- surface around `#121827`
- elevated surface around `#1E2942`
- primary violet `#8B5CF6`
- additional violet tones `#A855F7`, `#7C3AED`, `#C084FC`
- secondary blue `#3B82F6`
- positive `#10B981`
- negative `#F43F5E`
- warning `#F59E0B`

Typography: Inter with tabular numeric formatting.
Effects: selective aura/glow, never excessive.

## Main inspirations

### 1. Dribbble — B2B SaaS Sales Dashboard (primary)
Focus on:
- whitespace and composition
- large number hierarchy
- section layout
- chart elegance
- data presentation simplicity
- modern SaaS/analytics feel

### 2. Dribbble — Premium Finance Dashboard
Focus on:
- premium fintech character
- financial data elegance
- professional chart surfaces
- financial data credibility

### 3. Dribbble — All-in-One Crypto Dashboard (visual-only)
Focus on:
- modern dashboard character
- visualization elegance
- gradient refinement
- NOT crypto/trading aesthetics

## Branding note

Primary brand: **FINDORA**
Product descriptor: Personal Wealth OS

"FINDORA WEALTH OS" should be replaced with "FINDORA" in the main brand position.
"Wealth OS" / "Personal Wealth OS" may remain as product descriptor in appropriate places.

## New data visualization philosophy

Findora should visualize financial data, not just display it.

Every major section should use appropriate visualizations where they genuinely help the user.

### Dashboard
- Total Balance (large KPI)
- Safe-to-Spend (large KPI)
- Cash Flow
- Income vs Expenses
- Spending Breakdown
- Budget Overview
- Goals Overview
- Recent Transactions

### Accounts
- Total Assets / Balance
- Account count
- Visual account cards
- Asset breakdown by type
- Simple structure charts

### Transactions
- Income / Expenses / Net
- Monthly trend
- Income vs expenses chart
- Clear transaction list/table

### Budgets
- Budget / Spent / Remaining
- Category progress
- Spending trend
- Plan vs actual comparison

### Goals
- Progress visualization
- Current / Target / Remaining
- ETA
- Visual progress representation

### Reports
Most analytical screen:
- Spending overview
- Category breakdown
- Income vs expenses
- Monthly trends
- Account breakdown
- Top spending categories
- Other valuable visualizations from existing data

### Settings
Settings should remain a clear configuration screen.
Do not add charts merely to match the new direction.

## Chart rule

Do not add charts for visual effect only.

Before adding any visualization it must be clear:
**What financial decision / information can the user understand faster thanks to this chart?**

Visualizations should use existing data and existing application/reporting modules.
Do not create new business logic only to power UI.

## Form UX audit

Accounts revealed potential form issues:
- Account Name focus loss during input
- Opening Balance focus loss during input
- Account Icon shows technical identifier instead of visual picker
- Account Color shows raw hex instead of visual picker

Plan a form-level audit across all Findora forms for:
- focus loss during input
- unnecessary form re-rendering during input
- controlled/uncontrolled input issues
- value resetting
- unnecessary DOM refresh
- mobile issues

## Mobile visual QA

Add responsive/mobile visual QA as a final stage of any visual redesign.
Verify:
- readability on mobile viewports
- touch target sizes
- form usability
- chart readability
- spacing and hierarchy
- navigation usability

---

# 20. UI HISTORY

## UI-1
Design system + shell, desktop sidebar, top bar, mobile drawer, reusable primitives, typography, accessibility, responsive layout. Closed after visual verification.

## UI-2
Dashboard redesign: financial summary, cash flow, Safe-to-Spend, recent transactions, budgets and goals. Closed after real-data browser verification.

## UI-3
Accounts redesign: total balance, cards, account form, archive, empty state, responsive layout. Closed.

## UI-4–UI-8
Transactions, Budgets, Goals, Reports and Settings had been implemented; later physical redesign work further refined their appearance.

## UI-9 — Appearance / Accent System
Accent theme system implemented: 6 accents (Purple, Blue, Emerald, Amber, Rose, Cyan), runtime switching, persistence, verified with tests and visual QA. Appearance final gate closed.

---

# 21. RECENT PHYSICAL VISUAL AUDIT

Antigravity generated and inspected screenshots at:
- 1920x1080
- 1440x900
- 1280x720
- 390x844
- 375x667

It inspected Dashboard, Accounts, Transactions, Budgets, Goals, Reports and Settings, including populated data.

It also fixed/verified:
- desktop shell flex layout
- duplicate month navigation
- account icon rendering
- dashboard hierarchy
- mobile behavior
- content width/space usage

One real remaining polish observation:
Goal icons such as `vault` and `piggy-bank` can still render as raw identifier strings instead of unified glyphs. This should be fixed rather than ignored.

Important: an Antigravity statement such as "no issues" is not itself proof. Evidence must be checked.

---

# 22. TESTING PHILOSOPHY

Tests are evidence, not decoration.

For each claim, establish:
- what was tested
- which environment
- which code path
- which data
- which browser
- which viewport
- whether errors were monitored
- whether persistence was real
- whether actual UI interaction occurred

Browser gates should ideally verify:
- 0 console errors
- 0 page errors
- 0 unhandled promise rejections
- 0 failed application requests
- no horizontal overflow
- real IndexedDB persistence
- refresh behavior
- actual UI interactions

Historical infrastructure caveat: some older tests were CommonJS inside an ESM project or browser-only tests run under Playwright rather than Node. Reports must distinguish executed tests, skipped tests, runner incompatibilities and production failures. Never claim "100%" when some tests were not actually executed.

---

# 23. KNOWN HISTORICAL BUGS — REGRESSION TARGETS

Previously found and fixed:
- wrong desktop shell flex layout
- stale UI after persisted mutations
- missing default account seeding
- null goalId transition bug
- Safe-to-Spend including opening balance incorrectly
- duplicate submissions
- dashboard all-or-nothing Promise.all failure handling
- settings rollback
- missing budget edit UI
- missing goal edit UI
- archived category selection
- raw category IDs in UI
- missing client-side amount validation
- backup key enumeration issue
- backup listKeys composition issue
- test-only dashboard selector bug
- duplicate month navigation
- raw account icon identifiers

Do not reintroduce them.

---

# 24. ARCHITECTURAL DO-NOTS

Do not:
- add `keys()` to the base StorageAdapter
- bypass repositories from UI
- bypass application modules for financial operations
- reintroduce `window.dbData`
- reintroduce legacy Firebase persistence into the greenfield path
- make Goal.current independently authoritative
- create parallel sources of truth
- add arbitrary repository APIs
- turn UI state into domain state
- put financial logic into visual/theme code
- introduce nested transaction behavior casually

Legacy directories may remain in the repository. Do not delete them broadly just because they are old. The key requirement is that greenfield production code does not depend on them.

---

# 25. CURRENT NAVIGATION / UX

Primary navigation:

**Overview**
- Dashboard

**Money**
- Accounts
- Transactions
- Budgets
- Goals

**Insights**
- Reports

**Preferences**
- Settings

Keep navigation clear and uncluttered.

Dashboard hierarchy should emphasize:
1. Total Balance
2. Safe-to-Spend
3. Income/Expenses
4. Cash Flow
5. Recent Transactions
6. Budgets
7. Goals

Accounts: balance summary, cards, type, color/icon, edit/archive/create, opening balance, empty state.

Transactions: month navigation, account/category names, amount, type, date, description, notes where available, create/edit/archive, validation, duplicate protection and clear states.

Budgets: budgeted/spent/remaining, category, progress, warnings, edit/archive/create.

Goals: target/current/remaining/progress/priority/ETA/deposit/edit/archive/over-target validation/proper icons.

Reports: monthly summary, income, expense, net result, category breakdown and account balances where supported. Charts should consume existing reporting data; do not alter ReportingModule merely to make charts prettier.

Settings: profile, currency, appearance, accent color, privacy, categories, backup and restore. Never expose a fake setting.

---

# 26. RESPONSIVE / ACCESSIBILITY RULES

Desktop targets:
- 1920x1080
- 1440x900
- 1280x720

Mobile targets:
- 390x844
- 375x667

Must have:
- no horizontal scrolling
- usable touch targets
- mobile drawer
- readable financial values
- stacked cards where appropriate
- usable forms
- clear controls
- semantic HTML
- aria labels/current/expanded
- focus-visible states
- reduced-motion support
- adequate contrast

---

# 27. APPEARANCE / THEMES — IMPLEMENTED

Appearance / accent themes are implemented and verified.

System accent themes:
- Purple (default)
- Blue
- Emerald
- Amber
- Rose
- Cyan

Implementation details:
- accent is stored in `UserProfile.settings.accent`
- runtime switching works
- selection persists after refresh
- Purple remains the default accent
- semantic financial colors are independent of accent
- one Findora Design System + multiple accent themes, not six separate designs

Accent affects:
- active sidebar state
- primary buttons
- focus states
- progress bars
- selected controls
- charts where appropriate
- decorative glow
- dashboard accents

Semantic colors remain semantic:
- income/positive = green
- expense/negative = red
- warning = amber

Semantic colors do not change when the user changes accent.

Visual QA:
- Appearance has been visually verified
- Appearance final gate is closed

## Not implemented: Dark/Light/System modes

The Settings view includes a Theme selector (Light / Dark / System), but no CSS rules currently respond to `data-theme`. These modes are **not implemented**. Do not document them as completed.

Potential Dark/Light/System modes can come later. Do not implement them merely because they are possible.

## Form UX — Accounts

Observed form issues in Accounts:
- Account Name: focus is lost after each character is entered
- Icon: displays technical identifier (e.g., `landmark`) instead of visual picker
- Color: displays raw hex (e.g., `#0000FF`) instead of visual picker
- Opening Balance: potential focus loss during input

Planned fixes:
- Account Icon: visual icon picker (not technical ID)
- Account Color: visual color picker / palette
- Account Name: investigate and fix focus loss
- Opening Balance: investigate and fix focus loss
- Form audit: check all Findora forms for focus loss and unnecessary re-rendering

---

# 28. SECURITY / PRIVACY — CLOSED FOR CURRENT SCOPE

Security remediation for current scope is complete and verified.

Completed security work:
- XSS in backup preview: fixed and verified
  - backup preview now uses safe DOM APIs (`textContent`)
  - no more `innerHTML` with user-controlled backup data
- UserRepository ownership: hardened
  - `findById` returns `null` for entities belonging to different user
  - `save` throws `OWNERSHIP_VIOLATION` for mismatched entity/user ID
  - `findById` validates input (not empty, not whitespace-only)
- F-02 / F-03: fixed and verified
- Security final gate: closed

Current security status:
- local data ownership is enforced at repository layer
- backup preview is safe from XSS via backup data
- user-scoped data isolation is in place
- security is verified with tests and browser proof

Remaining hardening items:
- low/medium priority hardening items may remain documented as future hardening
- they should NOT be presented as currently blocking MVP stage, unless the repository confirms they do
- future cloud boundaries will require separate security architecture review

Never imply that a cosmetic privacy setting provides encryption or strong security unless it actually does.

---

# 29. KNOWN TECHNICAL DEBT

Known P2 items:

1. Legacy global service files attach unused `window.*Service` patterns in legacy directories (not in greenfield `src/`).
2. Obsolete Playwright specs hardcode `localhost:3006`:
   - `tests/e2e/ui3-debug.spec.mjs`
   - `tests/e2e/ui3-screenshot.spec.mjs`
   - `tests/e2e/ui4-debug.spec.mjs`
   - `tests/e2e/ui4-screenshot.spec.mjs`
   These are excluded from active regression and can be removed or updated.

Known P3:
- no hard delete because archive-only is the current design
- dead/meaningless expense-class ternary if it still exists (verify before removing)

---

# 30. POST-MVP ROADMAP

The visual redesign stages listed in older roadmaps have been completed. They are historical, not future work.

### Immediate

- Post-MVP planning / user manual validation / MVP closure

### Near-term candidates

Only include items that are actually justified by the current product and existing roadmap:
- recurring transactions
- Auto-Save / savings rules
- tags/notes
- import
- additional analytics
- UX refinements
- form UX fixes (icon/color pickers, focus fixes)

### Longer-term

- transfers
- debts/loans
- investments
- reminders
- search
- cloud sync
- bank integrations
- AI integration
- i18n foundation (Polski default + English)

Keep these clearly marked as future possibilities, not committed implementation.

---

# 31. AI INTEGRATION / OPERATOR

Findora should not become tightly coupled to an AI provider right now.

The user plans to connect Findora to a separate personal AI Manager/AI Operator later.

The broader AI Operator is intended eventually to manage computer, phone, devices, email, calendar, cloud, messaging, purchases and online accounts, with controlled permissions and eventual autonomy.

For finances, the initial AI boundary is data management inside the application. Real-world transfers/payments are explicitly deferred and require a separate security architecture.

---

# 32. DATA MIGRATION / CLOUD

Legacy-data migration is deferred until the new architecture is stable.

Cloud/sync is future work. Current product is local-first. Do not add a cloud provider to solve problems that can be solved locally.

---

# 33. GIT CHECKPOINT

Last explicitly confirmed checkpoint:
`6a9c8a9b723229f68bf330c0b8e89a9472c4c05c`

Commit message:
`feat(ui): redesign goals, reports, and settings views`

Branch: `main`
Status: **dirty** — 39 modified files, 4 deleted files, multiple untracked files present.

Working tree contains uncommitted hardening and UI work:
- Budget N+1 regression fix
- Cross-screen mutation integration tests (7 tests)
- UserRepository ownership hardening
- Goal ETA calculator updates
- UI view redesigns (dashboard, accounts, transactions, budgets, goals, reports, settings)
- CSS expansion
- E2E test updates
- deleted legacy characterization tests

**Any AI receiving this file MUST run `git status`, inspect the current diff and establish a new baseline before modifying anything.**

---

# 34. IMMEDIATE NEXT ACTION

**Post-MVP closure / user manual validation.**

The application is at the final user/manual validation point before MVP closure. Automated hostile audits and hardening have passed.

After closure, near-term candidates include:
1. Recurring transactions
2. Auto-Save / savings rules
3. Tags/notes
4. Import
5. Additional analytics
6. UX refinements (form UX, focus fixes)
7. i18n foundation

Do not begin these simply because they exist on a list. Each complex domain requires its own discovery/architecture decision.

Production architecture (G1.1, G1.2, G1.3, repositories, persistence, application logic) remains frozen unless a concrete blocker is demonstrated.

---

# 35. PRODUCT QUALITY GATE

A stage is not accepted merely because tests pass or an AI says PASS.

Acceptance must answer:
- Does it work?
- Does it persist?
- Does it look professional?
- Is it intuitive?
- Is mobile usable?
- Are internal IDs hidden?
- Are icons consistent?
- Are there duplicate controls?
- Are semantic colors correct?
- Is architecture intact?
- Is the evidence internally consistent?
- Do forms maintain focus correctly?
- Is there no XSS vulnerability?
- Is there no unnecessary re-rendering?
- Do charts serve a clear purpose?
- Does the data hierarchy lead with primary KPIs?

Hostile audits should look for:
- false-positive tests
- placeholder assertions instead of real data
- internal implementation assertions instead of user behavior
- missing edge cases
- cross-user leakage
- stale UI
- persistence failures
- rollback failures
- duplicate submissions
- missing validation
- archived data leaking into active UI
- raw identifiers in UI
- architecture violations
- legacy dependencies
- misleading UI claims
- focus loss during input
- unnecessary form re-rendering during input
- XSS vulnerabilities via backup preview or other user-controlled data
- visual chaos
- crypto/trading aesthetics as primary style (when inappropriate)

---

# 36. WHEN TO STOP

Do not endlessly polish.

Stop a stage when:
- requirements are met
- tests prove behavior
- browser evidence proves user flow where required
- visual quality meets the product target
- no important defects remain
- architecture remains clean

Later polish should be a deliberate stage, not an excuse to keep reopening completed foundations.

---

# 37. CURRENT CHECKPOINT

## DONE
- Greenfield architecture
- frozen domain/application contracts
- repositories
- IndexedDB
- application modules
- application state
- app kernel
- MVP
- backup/restore
- production bootstrap
- core finance UX
- Dashboard
- Accounts
- Transactions
- Budgets
- Goals
- Reports
- Settings
- Appearance/accent themes implemented (6 accents, runtime switching, persistence)
- Security remediation closed for current scope
  - XSS in backup preview fixed and verified
  - UserRepository ownership hardened
  - security final gate closed
- physical browser visual QA
- responsive verification
- final hostile MVP audit passed
- final MVP hardening passed
  - Budget N+1 fixed
  - Cross-screen mutation coverage added (7 tests)
  - Archived-account semantics documented and tested
  - No P1 blockers remain

## CURRENT
- User manual validation before MVP closure

## NEXT
1. Post-MVP closure
2. Near-term: recurring transactions, Auto-Save, tags/notes, import, additional analytics, UX refinements, i18n foundation

---

# 38. FINAL INSTRUCTION TO ANY AI READING THIS FILE

Do not blindly trust this file either. It is the project context, not a substitute for repository inspection.

Before changing anything:
- inspect the actual repository
- verify current branch/HEAD/status
- inspect current production code
- verify tests
- identify what changed since the last checkpoint

Treat G1.1, G1.2, G1.3, StorageAdapter boundaries, repository APIs, module boundaries, Goal.current authority and Safe-to-Spend contract as frozen unless a concrete blocker is demonstrated.

If an architectural change seems necessary, first explain:
1. why the current architecture cannot support the requirement
2. the concrete problem
3. why a smaller solution is insufficient
4. affected contracts
5. migration/testing burden

Never invent evidence. Never claim browser verification without actually running the browser. Never call unexecuted tests passed. Never make the product more complex merely because it is possible.

## ONE-LINE CURRENT STATE

**FINDORA is a greenfield local-first personal finance MVP with frozen domain/application architecture, real IndexedDB persistence, backup/restore, core financial workflows, implemented accent theme system, closed security remediation, final hostile MVP audit passed, final MVP hardening passed, no MVP-blocking P1 findings remain, and the project is now at the final user/manual validation point before MVP closure; post-MVP development comes after closure.**
