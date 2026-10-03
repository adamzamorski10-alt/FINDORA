# FINDORA — CURRENT PROJECT STATE
## Version 1.0 — 3 October 2026

> This document is the current-state companion to the historical project context. It describes what is actually present in the repository and supersedes stale implementation-status sections in older planning documents.

## 1. Source of truth

The GitHub repository `adamzamorski10-alt/FINDORA` is the implementation source of truth.

Do not use old roadmap/status documents as evidence that a stage is still pending. Verify the current code and tests first.

Production greenfield path:

`src/ui/app.html` → `bootstrap.js` → `src/application/app-kernel.js` → application modules → repositories → persistence/storage → IndexedDB.

The old monolithic `index.html` is Legacy Reference only.

## 2. Current architecture

The application currently uses:
- Vanilla HTML/CSS/ES modules.
- Application modules as the business/application boundary.
- Repository interfaces for persistence.
- IndexedDB as the local persistence backend.
- `ApplicationTransaction` for atomic multi-repository operations.
- Central application state for UI/session state.
- Pure calculators for derived financial calculations.
- Backup/restore services operating on domain entities.

The current composition root is `src/application/app-kernel.js`.

It wires:
- User
- Account
- Category
- Transaction
- Budget
- Goal
- Safe-to-Spend
- Reporting
- Receivables
- Income Profiles
- Reselling
- Websites
- Global Income
- Backup
- Restore

## 3. Product status

The original finance MVP foundation is implemented and the application has progressed beyond the old G1/G2 roadmap.

Implemented/available areas include:
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
- Localization
- Receivables
- Income Profiles
- Reselling
- Websites
- Global Income
- Appearance/accent system

The premium fintech visual redesign and responsive visual QA were previously completed.

## 4. Recent development

The most recent repository work has concentrated on Websites and its financial integration.

Recent commits include:
- recursive test discovery fix
- explicit ESM scope for domain tests
- explicit CommonJS scope for legacy root tests
- Websites payment transition coverage
- Websites projected-vs-realized analytics coverage
- Websites backup/restore wiring
- Websites financial transaction integration

The current test script is:

`node --test "tests/**/*.test.js"`

Do not claim the complete suite is green unless an actual local or CI run provides evidence.

## 5. Current hardening finding

The Websites module needs an ownership-isolation hardening pass.

Several mutation methods retrieve an entity by ID and then update/archive it without consistently re-validating the object's `userId` and `incomeProfileId`.

Required invariant:

> A Websites operation must never mutate an entity belonging to another user or another income profile.

This must be enforced in the application module, not only in the UI.

Required regression coverage:
- cross-user client update/archive rejection
- cross-user project update/archive rejection
- cross-profile access rejection
- payment/cost ownership isolation
- no mutation after rejected ownership checks

## 6. Ownership hardening status

The Websites mutation boundary has now been hardened in code.

Current implementation:
- the Websites module receives the scoped `userId` from the application composition root
- update/archive operations verify the retrieved entity belongs to that scoped user
- the entity's income profile is revalidated before mutation
- archived entities are rejected for mutation
- ownership rejection occurs before any write
- focused regression tests were added for cross-user client/project/payment/cost update/archive attempts

This closes the previously identified application-level ownership gap. It does not yet prove the complete Websites stage is green.

## 7. Financial integration invariant

Websites payments/costs can create linked financial transactions.

Required invariants:
- paid payment → exactly one income transaction
- paid cost → exactly one expense transaction
- payment/cost edits must not leave stale active linked transactions
- paid → pending archives/reverses the previously linked transaction
- paid → paid changes archive the old linked transaction before creating the replacement
- archive archives the linked transaction
- failures must be atomic

The direct use of repositories by Websites is intentional only if all Transaction-domain invariants required for these integrations are explicitly enforced. This boundary must be reviewed before expanding the integration further.

## 8. Security/data isolation rules

FINDORA is local-first and user-scoped.

Core repositories already enforce user-scoped persistence. Application modules must additionally validate ownership wherever an entity ID can cross a boundary.

Error semantics:
- `NOT_FOUND` may represent absence or ownership mismatch.
- `VALIDATION_FAILED` represents invalid input.
- `STORAGE_UNAVAILABLE` represents persistence failure.

Never expose another user's entity merely because its identifier is known.

## 9. Testing policy

Use staged verification:
1. focused tests during implementation
2. module-level regression
3. full regression only at the stage gate
4. hostile/security audit for security-sensitive stages
5. browser evidence for UI acceptance

Never replace evidence with claims such as "PASS", "100%" or "FINAL".

Kilo reasoning:
- LOW: simple fixes/tests
- MEDIUM: cross-module implementation/debugging
- HIGH: architecture, security, final hostile audit

## 10. Immediate roadmap

### Stage A — Websites Hardening
1. Fix ownership checks.
2. Add cross-user/cross-profile tests.
3. Audit payment/cost transition invariants.
4. Verify atomic rollback behavior.
5. Run focused + Websites regression.

### Stage B — Full integration gate
- Run the complete test suite.
- Fix test-discovery/environment issues.
- Verify no regressions outside Websites.
- Record actual test evidence.

### Stage C — Architecture/security audit
- Review module boundaries.
- Review user isolation.
- Review backup/restore isolation.
- Review direct repository access from business modules.
- Review error handling and atomicity.

### Stage D — Product gap audit
Only after the above gates:
- compare implemented functionality against the real MVP requirements
- identify missing high-value finance workflows
- remove stale roadmap assumptions
- select the next product slice based on evidence

## 11. Documentation rule

Older documents containing statements such as "TransactionRepository not implemented", "UI still lives in index.html", "IndexedDB not implemented", or "start Phase 1 TransactionRepository" are historical unless verified against the current repository.

Do not use those statements as current status.

## 12. Current checkpoint

DONE:
- core greenfield architecture
- persistence/repositories
- core finance modules
- production UI path
- backup/restore
- visual redesign
- business modules through Websites/Global Income
- recent test-runner fixes

CURRENT:
- verify the focused Websites ownership hardening and isolate the remaining legacy calculator/test-environment failures before the full regression gate

NEXT:
- focused ownership/financial integration tests → full regression → security/architecture gate → evidence-based product roadmap

BLOCKERS:
- no known architectural blocker; current priority is verification and hardening.
