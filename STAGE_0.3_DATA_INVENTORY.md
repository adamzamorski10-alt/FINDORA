# STAGE 0.3 — DATA INVENTORY

## Canonical Data Map

| key | storage | type | active | source | sensitive | legacy | backup-required | restore-required |
|-----|---------|------|--------|--------|-----------|--------|-----------------|------------------|
| finapp_transactions | Firebase RTDB | Array | YES | SK.transactions / save() / load() | YES | NO | YES | YES |
| finapp_debtors | Firebase RTDB | Array | YES | SK.debtors / save() / load() | YES | NO | YES | YES |
| finapp_budgets | Firebase RTDB | Array | YES | SK.budgets / save() / load() | NO | NO | YES | YES |
| finapp_goals | Firebase RTDB | Array | YES | SK.goals / save() / load() | NO | NO | YES | YES |
| finapp_reminders | Firebase RTDB | Array | YES | SK.reminders / save() / load() | NO | NO | YES | YES |
| finapp_transfers | Firebase RTDB | Array | YES | SK.transfers / save() / load() | NO | NO | YES | YES |
| finapp_income_sources | Firebase RTDB | Array | YES | SK.incomeSources / save() / load() | NO | NO | YES | YES |
| finapp_templates | Firebase RTDB | Array | YES | SK.templates / save() / load() | NO | NO | YES | YES |
| finapp_recurring | Firebase RTDB | Array | YES | SK.recurring / save() / load() | NO | NO | YES | YES |
| finapp_creditors | Firebase RTDB | Array | YES | SK.creditors / save() / load() | YES | NO | YES | YES |
| finapp_autosave_rules | Firebase RTDB | Array | YES | SK.autoSaveRules / save() / load() | NO | NO | YES | YES |
| finapp_rule_targets | Firebase RTDB | Object | YES | SK.ruleTargets / save() / load() | NO | NO | YES | YES |
| finapp_strony_products | Firebase RTDB | Array | YES | SK.stronyProducts / save() / load() | NO | NO | YES | YES |
| finapp_resale_products | Firebase RTDB | Array | YES | SK.resaleProducts / save() / load() | NO | NO | YES | YES |
| finapp_resale_sales | Firebase RTDB | Array | YES | SK.resaleSales / save() / load() | NO | NO | YES | YES |
| finapp_resale_tasks | Firebase RTDB | Array | YES | SK.resaleTasks / save() / load() | NO | NO | YES | YES |
| finapp_resale_shipments | Firebase RTDB | Array | YES | SK.resaleShipments / save() / load() | NO | NO | YES | YES |
| finapp_resale_events | Firebase RTDB | Array | YES | SK.resaleEvents / save() / load() | NO | NO | YES | YES |
| finapp_resale_settings | Firebase RTDB | Object | YES | SK.resaleSettings / save() / load() | NO | NO | YES | YES |
| finapp_gielda_ops | Firebase RTDB | Array | YES | SK.gieldaOps / save() / load() | NO | NO | YES | YES |
| finapp_strony_clients | Firebase RTDB | Array | YES | SK.stronyClients / save() / load() | NO | NO | YES | YES |
| incomeProfiles | Firebase RTDB | Object | PARTIAL | ensureIncomeProfilesExist() / currentUserRef.child('incomeProfiles') | NO | NO | YES | YES |
| settings/layouts/{tab} | Firebase RTDB | Object | YES | currentUserRef.child('settings/layouts/' + tab).set() | NO | NO | YES | YES |
| finapp_dashboard_layouts | Firebase RTDB | Object | NO | SK.dashboardLayouts — legacy migration only | NO | YES | NO | NO |
| finapp_theme | localStorage | String | YES | localStorage.getItem/setItem | NO | NO | NO | YES |
| finapp_privacy_mode | localStorage | String | YES | localStorage.getItem/setItem | NO | NO | NO | YES |
| finapp_user_nick | localStorage/sessionStorage | String | YES | localStorage/sessionStorage | NO | NO | NO | YES |
| finapp_guest_nick_{id} | sessionStorage | String | YES | sessionStorage | NO | NO | NO | NO |
| finapp_active_money_place | localStorage | String | YES | localStorage | NO | NO | NO | YES |

## Summary

- Total Firebase collections: 23
- Total localStorage keys: 4
- Total sessionStorage keys: 1 pattern
- Active collections: 22
- Legacy collections: 1 (dashboardLayouts)
- Sensitive collections: 3 (transactions, debtors, creditors)
- Backup required: 22 Firebase collections + 5 local settings
- Restore required: 22 Firebase collections + 5 local settings

## Data Characteristics

- All user data stored under `users/{uid}/` in Firebase RTDB
- No cross-user data links in application code
- Guest mode uses `owner` URL param to access specific user's data
- All writes go through `save()` which targets `currentUserRef.child(key)`
- All reads go through `load()` which reads from `dbData[key]` populated by `currentUserRef.on('value')`
