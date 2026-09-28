# FINORA UI DISCOVERY

Generated: 2026-09-24T19:34:59.538Z

## Screenshots

### Desktop
- Dashboard: `desktop-dashboard.png`
- Accounts: `desktop-accounts.png`
- Transactions: `desktop-transactions.png`
- Budgets: `desktop-budgets.png`
- Goals: `desktop-goals.png`
- Reports: `desktop-reports.png`
- Settings: `desktop-settings.png`
- Account Form: `desktop-account-form.png`

### Mobile
- Dashboard: `mobile-dashboard.png`
- Accounts: `mobile-accounts.png`
- Transactions: `mobile-transactions.png`
- Budgets: `mobile-budgets.png`
- Goals: `mobile-goals.png`
- Reports: `mobile-reports.png`
- Settings: `mobile-settings.png`
- Account Form: `mobile-account-form.png`

---

## Current UI Documentation

### Dashboard
- **Goal**: Personal Financial Health & Overview
- **Main Sections**: Summary cards (Total Balance, Income, Expenses, Safe-to-Spend), Cash Flow bars, Safe-to-Spend Breakdown, Recent Transactions, Budgets, Goals
- **KPIs**: Total Balance, Monthly Income, Monthly Expenses, Safe-to-Spend (daily), Days left in month
- **Charts/Visualizations**: Cash flow bar charts, budget/goal progress bars
- **Components**: Summary cards with hover effects, month navigation, sidebar navigation
- **Responsive**: Grid collapses from 4 columns to 2 to 1; sidebar becomes drawer on mobile
- **Data Source**: Reporting module, Safe-to-Spend module, Account/Transaction/Budget/Goal repositories

### Accounts
- **Goal**: Manage accounts and balances
- **Main Sections**: Total balance summary, accounts grid, create account form
- **KPIs**: Total Balance across all accounts
- **Charts/Visualizations**: None (card-based layout)
- **Components**: Account cards with accent colors, icon badges, balance display, edit/archive actions
- **Responsive**: Grid auto-fill minmax(280px, 1fr); form becomes single column on mobile
- **Data Source**: Account module, Reporting module

### Transactions
- **Goal**: Transaction management and history
- **Main Sections**: Month navigation, transaction list, create transaction form
- **KPIs**: Transaction count, category breakdown
- **Charts/Visualizations**: None (list-based)
- **Components**: Transaction items with type icons, month nav, form with account/category/type selectors
- **Responsive**: Form grid 3 columns -> 1 column on mobile
- **Data Source**: Transaction module, Account/Category repositories

### Budgets
- **Goal**: Spending limit tracking
- **Main Sections**: Budgets summary, budget cards with progress bars, create budget form
- **KPIs**: Budget amount, spent, remaining, over-budget status
- **Charts/Visualizations**: Progress bars for budget utilization
- **Components**: Budget cards with category name, progress track, amount display
- **Responsive**: Summary flex column on mobile; grid auto-fill
- **Data Source**: Budget module, Category repository

### Goals
- **Goal**: Financial goal tracking
- **Main Sections**: Goals grid, goal cards with progress, deposit form, create goal form
- **KPIs**: Target amount, current progress, deadline
- **Charts/Visualizations**: Progress bars, ring progress (if implemented in future)
- **Components**: Goal cards with icon, name, progress bar, deposit form inline
- **Responsive**: Grid auto-fill minmax(320px, 1fr)
- **Data Source**: Goal module

### Reports
- **Goal**: Financial insights and breakdowns
- **Main Sections**: Summary grid, category breakdown, charts
- **KPIs**: Monthly totals, category distribution
- **Charts/Visualizations**: Category breakdown bars, summary cards
- **Components**: Report section cards, breakdown items with bar tracks
- **Responsive**: 4 columns -> 2 columns -> 1 column
- **Data Source**: Reporting module

### Settings
- **Goal**: User preferences and configuration
- **Main Sections**: Profile settings, theme, currency, privacy
- **KPIs**: None
- **Charts/Visualizations**: None
- **Components**: Settings form fields, toggle buttons
- **Responsive**: Single column form layout
- **Data Source**: User module, profile settings

---

## Observed Issues






