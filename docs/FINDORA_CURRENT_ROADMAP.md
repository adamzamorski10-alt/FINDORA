# FINDORA — CURRENT ROADMAP
## Version 1.0 — 3 October 2026

This roadmap replaces the stale execution order in older G1.8 planning material.

## Phase 0 — Verification baseline
- Confirm current repository state.
- Confirm test discovery.
- Record real test evidence.
- Treat GitHub code as source of truth.

## Phase 1 — Websites Hardening
- Enforce user ownership on every Websites mutation.
- Enforce income-profile ownership.
- Add cross-user and cross-profile regression tests.
- Verify payment/cost transaction lifecycle.
- Verify atomic rollback.

## Phase 2 — Full Regression Gate
- Run all discovered tests.
- Fix failures rather than suppressing them.
- Verify test runner behavior.
- Record exact evidence.

## Phase 3 — Security & Architecture Gate
Review:
- user isolation
- repository boundaries
- application-module boundaries
- direct financial transaction integration
- backup/restore isolation
- atomicity
- error contracts
- stale/archived entity handling

## Phase 4 — Product Gap Audit
After technical gates, inspect the real application and requirements to determine:
- missing MVP workflows
- incomplete UX flows
- duplicated functionality
- unnecessary complexity
- high-value improvements

No large new feature should be selected before this audit.

## Phase 5+ — Adaptive product development
Select the next vertical slice based on actual user value and repository evidence.

Every future feature follows:
1. scoped discovery
2. focused implementation
3. focused tests
4. relevant regression
5. security review when applicable
6. browser/UI verification when applicable
7. stage-gate full regression

## Explicitly not current
Do NOT restart:
- G1.8 repository creation
- initial IndexedDB implementation
- initial AppKernel work
- legacy UI migration
- initial core finance module extraction

Those areas are already substantially implemented.

## Documentation principle

Historical planning documents remain useful as design history, but current execution must follow this roadmap plus verified repository state.
