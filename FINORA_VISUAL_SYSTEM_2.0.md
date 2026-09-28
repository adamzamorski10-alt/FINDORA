# FINORA VISUAL SYSTEM 2.0

Implementation-ready design specification for the Finora Personal Wealth OS visual redesign.

**Status:** DESIGN SPECIFICATION ONLY — No production code changes.  
**Scope:** UI/UX layer only. Backend, domain, repositories, persistence, state architecture, and business logic are out of scope.

---

## 1. DESIGN NORTH STAR

### Visual Character
Finora should feel like a premium private banking dashboard for an individual, not a public SaaS admin panel. The tone is calm, authoritative, and clear. Think: Bloomberg Terminal distilled for a personal investor, not a trading desk.

### Hierarchy Philosophy
Financial hierarchy over UI-component hierarchy. The most important financial number on any screen should be the most visually dominant element. Sections answer questions in order of user urgency.

### Density
Medium-low density. Generous whitespace. Let key numbers breathe. Avoid card-stacking. One chart per screen section, and only if it answers a real financial question.

### Whitespace Philosophy
Whitespace is a design tool, not filler. Use it to:
- Separate unrelated financial questions
- Group related metrics
- Guide the eye from summary to detail
- Reduce cognitive load during financial decision-making

### Content vs Decoration
Every visual element must justify its existence. Decoration is restricted to: surface layering, focus indicators, and accent color on the primary financial metric. No ornamental gradients, glow effects, or glassmorphism without functional purpose.

### What Finora Must NOT Become
- A crypto/trading interface (no tickers, no neon, no dark-terminal aesthetic)
- A generic admin dashboard (equal cards, dense tables, system-font typography)
- A data visualization showcase (charts used for decoration)
- An "AI dashboard" (no floating orbs, no animated backgrounds, no ambiguous smart-features)
- A mobile app squeezed into desktop width

---

## 2. DESIGN TOKENS

### Typography

**Font Family:** Inter (already loaded). Keep as-is.

**Page Title:** Used in top-bar title and page headers. `text-2xl` (1.5rem), font-weight 700, letter-spacing -0.01em.

**Section Title:** Used within cards and sections. `text-lg` (1.125rem), font-weight 600, color `--color-text-primary`.

**KPI Numbers (Hero):** The single most important metric per section (e.g., Total Balance, Safe-to-Spend). `text-3xl` or `text-4xl` (1.875rem–2.25rem), font-weight 800, tabular nums, tight letter-spacing -0.02em.

**KPI Numbers (Secondary):** Supporting KPIs (income, expenses, transaction count). `text-2xl` (1.5rem), font-weight 700.

**KPI Numbers (Compact):** Inside cards or summary bars. `text-xl` (1.25rem), font-weight 600.

**Labels:** Uppercase micro-labels above values. `text-xs` (0.75rem), font-weight 600, letter-spacing 0.05em, color `--color-text-muted`.

**Body Text:** `text-sm` (0.875rem), font-weight 400, color `--color-text-secondary`.

**Helper / Meta Text:** `text-xs` (0.75rem), color `--color-text-muted`.

**Table / List Text:** `text-sm` (0.875rem), font-weight 400.

**Responsive Scaling:** At viewport widths ≤640px, drop one size tier for KPI numbers only. Body and label scales remain unchanged.

### Spacing

Base unit: 8px. Use the existing `--space-*` scale.

```
--space-1: 0.25rem (4px)  — micro gaps
--space-2: 0.5rem  (8px)  — tight padding, icon gaps
--space-3: 0.75rem (12px) — compact padding
--space-4: 1rem    (16px) — standard padding
--space-5: 1.25rem (20px) — comfortable padding
--space-6: 1.5rem  (24px) — section gaps
--space-8: 2rem    (32px) — page-level rhythm
--space-10: 2.5rem (40px) — major section separators
```

**Rules:**
- Vertical rhythm between sections: `--space-6` (24px) minimum.
- Card internal padding: `--space-5` (20px) or `--space-6` (24px).
- Grid gaps: `--space-5` (20px).
- No random pixel values.

### Radius

```
--radius-sm: 0.375rem (6px)  — small controls, tags
--radius-md: 0.5rem   (8px)  — buttons, inputs, small cards
--radius-lg: 0.75rem  (12px) — cards, containers
--radius-xl: 1rem     (16px) — primary cards, hero surfaces
--radius-2xl: 1.25rem (20px) — large feature surfaces
```

### Borders

**When borders exist:**
- Cards and elevated surfaces: 1px solid `--color-border` (rgba(255,255,255,0.08))
- Active/hover states: `--color-border-strong`
- Inputs: `--color-border-strong` on focus

**When borders should NOT exist:**
- Between visually grouped items inside a single card — use spacing instead
- On flat list rows that are separated by whitespace
- As decorative dividers when a section title already provides separation

### Shadows

Restrained. Two levels maximum.

```
--shadow-sm: 0 1px 3px rgba(0,0,0,0.5)
--shadow-md: 0 4px 14px rgba(0,0,0,0.6)
```

**Rules:**
- No `--shadow-glow` or decorative glow shadows on cards.
- Shadow only on elevated surfaces that need to separate from the background.
- Hover states may increase shadow by one level (sm → md) but never add color to the shadow.

### Surface Hierarchy

```
Page background:    --color-bg (#090D16)        ← deepest layer
Primary surface:    --color-surface (#121827)   ← cards, sidebar, top-bar
Secondary surface:  --color-surface-hover (#19223A) ← hover, active rows
Elevated surface:   --color-surface-elevated (#1E2942) ← dropdowns, modals, floating panels
```

**Rules:**
- Maximum two surface steps above page background in any single composition.
- Never stack three elevated surfaces without a clear functional reason.
- Modals and drawers: elevated surface, with a backdrop of rgba(0,0,0,0.6) — no blur required.

---

## 3. COLOR SYSTEM

### Accent Colors (Existing)

The six accent colors remain as brand-selectable themes. Each accent replaces `--color-primary` and its derived tokens. Accent is NEVER used to communicate financial state.

| Accent | Primary | Hover | Light | Border | Glow (use sparingly) |
|--------|---------|-------|-------|--------|----------------------|
| Purple | #8B5CF6 | #7C3AED | 15% | 40% | 22% |
| Blue | #3B82F6 | #2563EB | 15% | 40% | 22% |
| Emerald | #10B981 | #059669 | 15% | 40% | 22% |
| Amber | #F59E0B | #D97706 | 15% | 40% | 22% |
| Rose | #FB7185 | #F43F5E | 15% | 40% | 22% |
| Cyan | #06B6D4 | #0891B2 | 15% | 40% | 22% |

**Where accent is appropriate:**
- Active navigation item
- Primary CTA buttons
- Focus rings
- The single dominant hero KPI (when it deserves emphasis)
- Selected items, toggles, checkboxes

**Where accent is FORBIDDEN:**
- Replacing positive/negative/warning/neutral semantic colors
- Chart series colors (use semantic palette instead)
- Every card border or header (reserve for the one dominant KPI)

### Semantic Colors (Financial)

These must never be overridden by accent selection.

```
Positive / Income:  --color-positive  #10B981
Negative / Expense: --color-negative  #F43F5E
Warning:            --color-warning   #F59E0B
Neutral / Muted:    --color-text-secondary #94A3B8
```

**Rules:**
- A positive number is always emerald.
- A negative number is always rose/red.
- A warning state is always amber.
- Accent color may frame or highlight a KPI, but the number itself uses semantic color when the value has financial polarity.

### Gradient Usage

**Allowed:**
- The active sidebar link background: a very subtle gradient from `--color-primary-light` to transparent.
- The safe-to-spend hero card: a single linear gradient using accent + a darker tint.
- Button hover transitions (not gradients on buttons).

**Forbidden:**
- Gradients on every card
- Card header gradients
- Background gradients on the page body
- Multi-color gradients as decorative elements
- Any gradient that does not serve a functional hierarchy purpose

---

## 4. LAYOUT SYSTEM

### Desktop Composition (≥1280px)

**App Shell:**
- Sidebar: fixed 260px, full viewport height
- Top-bar: fixed 64px height
- Main content: scrollable, max-width 1400px, centered with gutters

**Content Gutters:**
- Left/right padding: `--space-8` (32px) on the `.app-main` container
- This creates the 1400px max-width content area with consistent breathing room

**Page Header Structure:**
Every view header contains:
- Page title (`text-2xl`, bold)
- Page subtitle (`text-sm`, muted)
- Optional month navigation (inline with header or directly below)
- Primary action button (aligned right or below on mobile)

**Section Spacing:**
- Between major sections: `--space-8` (32px)
- Between related items within a section: `--space-4` to `--space-5` (16–20px)

### Grid Behavior

**1-column:** Single hero KPI, single full-width card, single list, mobile default.

**2-column:** Dashboard middle (cash flow + safe-to-spend), reports summary, settings sections.

**3-column:** Dashboard bottom (recent tx + budgets + goals), accounts grid on wide screens, goals grid.

**4-column:** Dashboard summary KPIs (Total Balance, Income, Expenses, Safe-to-Spend).

**When to span columns:**
- The primary chart or primary list should span 2 columns in a 3-column layout.
- In a 4-column layout, the dominant KPI may span 2 columns with 3 supporting KPIs at 1 column each.

**Whitespace as Composition:**
Do not fill every grid cell. If a section has only two meaningful visualizations, use a 2-column grid with empty space rather than inventing filler cards.

---

## 5. KPI / FINANCIAL NUMBER SYSTEM

### Relative Hierarchy

**Tier 1 — Hero KPI:**
Single number that answers "What is my financial position right now?"
Examples: Total Balance, Safe-to-Spend, Net Worth
Treatment: Largest typography (`text-4xl` on desktop, `text-3xl` on mobile), generous padding, elevated surface, optional accent border-top.

**Tier 2 — Supporting KPIs:**
Secondary numbers that add context.
Examples: Income, Expenses, Budget Usage, Days Left
Treatment: `text-2xl`, in a 2×2 or 4-column grid, compact card.

**Tier 3 — Detail Numbers:**
Numbers inside lists, tables, and breakdowns.
Examples: individual transaction amounts, category totals
Treatment: `text-sm` or `text-base`, tabular nums, semantic color.

### Supporting Labels
Every KPI must have an uppercase micro-label (`text-xs`, `--color-text-muted`, letter-spacing 0.05em) directly above or beside the number.

### Trend / Change Indicators
Display a percentage or absolute change vs. previous period only when the reporting module provides it. Format as:
- `+2,340.00 (+12%)` in positive color for income increases
- `-1,200.00 (-8%)` in negative color for expense increases
Place immediately below the KPI value in `text-xs`.

### When a KPI Deserves Large Treatment
Reserve large KPI treatment for:
- Total Balance
- Safe-to-Spend
- Net Worth
- Monthly Net (on Reports)

Do not elevate every card to hero size. Most KPIs remain in Tier 2.

### When a KPI Should Remain Compact
Inside cards, lists, and summary rows where space is shared with other data. Use Tier 3 treatment.

---

## 6. DATA VISUALIZATION SYSTEM

### Chart Language

Every chart must answer a specific financial question. Do not add charts for decoration.

**Line Chart**
- Question: How has a value changed over time?
- Use: Net worth trend, balance trend, income/expense trend over multiple months
- Where: Reports (primary), Dashboard (compact sparkline variant only)
- Do NOT use: single-month data, category breakdowns, budget progress

**Area Chart**
- Question: What is the cumulative or stacked composition over time?
- Use: Income vs. expense over time
- Where: Reports
- Do NOT use: single-period snapshots

**Bar Chart (Horizontal)**
- Question: Which categories or items are largest?
- Use: Category spending breakdown, account balances comparison
- Where: Reports, Accounts summary
- Do NOT use: time-series data

**Stacked Bar**
- Question: How does a total break down into parts?
- Use: Income composition by category, expense composition by category
- Where: Reports
- Do NOT use: progress indicators (use progress bars instead)

**Donut / Ring Chart**
- Question: What is the proportional share of a whole?
- Use: Expense category share, budget allocation share
- Where: Reports (secondary), Budgets overview
- Do NOT use: when a bar chart or progress bar is more readable (donut is harder to read for precise values)
- If used: always show percentage label and total in the center

**Sparkline**
- Question: What is the recent short-term direction?
- Use: Mini trend inside a KPI card or transaction list item
- Where: Dashboard KPI cards (compact, 60–80px wide)
- Do NOT use: as the primary visualization on any screen

**Progress Bar / Indicator**
- Question: How close am I to a limit or target?
- Use: Budget usage, goal progress
- Where: Budgets, Goals, Dashboard widgets
- Do NOT use: for time-series or composition data

### Chart Library
Do not introduce a chart library in this redesign phase. Implement charts with lightweight inline SVG or Canvas in a future phase after the layout and tokens are stable. For now, refine the existing CSS bar/progress system and add horizontal bar breakdowns.

---

## 7. DASHBOARD COMPOSITION

The Dashboard answers five questions in this order:

1. How much money do I have?
2. What changed recently?
3. What is coming in/out?
4. How much can I safely spend?
5. What deserves my attention?

### Proposed Hierarchy

**Hero Area**
- Single dominant surface spanning full width.
- Contains: Total Balance (Tier 1 KPI) with label, formatted value, and a subtle accent indicator.
- Below the balance: a compact trend indicator if available (e.g., "vs last month: +1,200").
- No four equal cards at this level.

**KPI Row**
- Three to four supporting KPIs in a row.
- Income, Expenses, Safe-to-Spend, Transaction Count.
- Each in a compact card (Tier 2).
- Safe-to-Spend uses semantic color (positive/negative) and may include a small accent detail.

**Primary Visualization**
- Cash flow trend: a simple bar or line visualization showing income vs. expenses for the selected month.
- Answer: "What is coming in/out?"
- Width: spans 2 columns in a 3-column grid, or full width in 2-column layout.

**Secondary Section: Safe-to-Spend Breakdown**
- Compact panel explaining the Safe-to-Spend calculation.
- Shows: free funds, goals requirement, days left in period, daily safe amount.
- Width: 1 column.

**Tertiary Section: What Deserves Attention**
- Two to three compact panels in a row:
  - Recent Transactions (5 items, list format)
  - Budgets at risk (only over-budget or near-limit)
  - Goals closest to target
- Do NOT show empty states for all three if data is sparse. Hide empty panels entirely.

**Avoid:**
- The current "4 equal cards + 3 equal cards" pattern.
- Glassmorphism card backgrounds.
- Decorative glow or gradient headers on every card.

---

## 8. ACCOUNTS

### Account Card Composition

Each account card shows:
- Left accent strip: 4px wide, using the account's assigned color (sanitized).
- Icon: rendered from the icon system, colored to match the accent strip.
- Account name: `text-base`, font-weight 600.
- Account type: `text-xs`, muted, uppercase.
- Balance: `text-xl`, tabular nums, semantic color (positive/negative).
- Actions: Edit and Archive, icon buttons or small text buttons, revealed on hover or always visible on desktop.

### Balance Hierarchy
- Account name and type are grouped visually.
- Balance is separated and emphasized.
- The total balance summary above the grid is Tier 1 for the Accounts page.

### Icon Treatment
- Use the existing `renderIcon()` mapping. Do not expose raw emoji names or IDs to users.
- Icons should be rendered inside a 32–36px container with the account color.

### Account Color Treatment
- Visual control: a row of preset color swatches in the form (NOT a free-text HEX input).
- Colors: 8–10 curated preset values drawn from the existing accent palette plus neutrals.
- The selected color is shown as a filled circle.

### Account Creation / Edit Interaction
- Forms must NOT remain appended below a long scrolling list.
- Use a **modal dialog** for create/edit on desktop.
- On mobile, the modal becomes a bottom sheet.
- Form fields: Name, Type (select), Icon (preset grid), Color (preset swatches), Opening Balance (number, only on create).
- Validation errors appear inline below the relevant field.
- Success feedback: brief toast notification, then modal closes and list refreshes.

---

## 9. TRANSACTIONS

### Desktop List Composition

- Full-width list below the header and controls.
- Each row: icon | description + meta (account, category, date) | amount | actions
- Amount: semantic color, `text-base`, tabular nums.
- Meta: `text-xs`, muted.
- Actions: Edit and Archive, small icon buttons or compact text buttons.
- Separators: subtle bottom border or whitespace, not heavy dividers.

### Mobile Composition

- Stacked cards instead of a wide row.
- Amount aligned right.
- Meta below description.
- Touch targets ≥44px.

### Amount Hierarchy
- Positive: `+` prefix, emerald.
- Negative: `-` prefix, rose.
- Neutral / zero: no prefix, muted.

### Date / Category Presentation
- Format: "Mon DD, YYYY" or existing short format.
- Category: rendered name, not ID.
- Account: rendered name, not ID.

### Search / Filter / Sort Concepts
- Preserve existing month navigation.
- Add a compact filter bar above the list: Account filter (select), Category filter (select), Type filter (All / Income / Expense).
- No full-page re-render on filter change — update the list DOM in place.

### Transaction Creation / Edit Interaction
- Use a **modal dialog** on desktop, **bottom sheet** on mobile.
- Form fields: Account (select), Type (select), Amount (number), Category (select), Description (text), Date (date input), Notes (text, optional).
- The form must not cause whole-view re-render during typing.
- Validation: inline messages, not `alert()`.

---

## 10. BUDGETS

### Budget Hierarchy

- Summary row at top: Total Budgeted | Total Spent | Remaining
- Grid of budget cards below.
- Each card: category name, progress bar, spent text, remaining text.

### Used vs Limit Presentation
- Progress bar fill: positive (green) while under budget, warning (amber) at 80–100%, negative (rose) when over budget.
- Text below bar: "840.00 spent of 1,000.00 — 160.00 remaining" or "Over by 120.00".

### Warning States
- At 80% usage: progress bar transitions to amber.
- At 100%+ : progress bar becomes rose, text changes to "Over by X".
- The summary "Remaining" KPI turns negative color when total remaining < 0.

### Chart / Progress Treatment
- Progress bars are correct here (they answer "how close to limit").
- Do NOT replace with decorative charts.
- Bar height: 8–10px, rounded, smooth transition on width change.

### Category Relationship
- Budgets are tied to expense categories.
- Show the category name (rendered), not the category ID.

### What Should Immediately Draw Attention
- Over-budget items should appear first or have a subtle left border accent.
- Normal items follow in order of highest usage percentage.

---

## 11. GOALS

### Target / Current Hierarchy
- Goal name: `text-base`, font-weight 600.
- Progress: "X.XX of Y.YY — Z.ZZ remaining"
- Deadline: `text-xs`, muted. If past deadline and incomplete, show warning state.

### Progress Visualization
- Horizontal progress bar is preferred over ring/donut for readability and precision.
- Ring chart only if the goal card layout is wide enough to accommodate it without sacrificing label clarity.
- Bar fill: accent color (selected theme), turns positive/green when complete.

### Deadline
- Show remaining days or "Due Mon DD, YYYY".
- Overdue: amber warning indicator.

### Contribution History
- If existing data supports it, show last deposit amount and date inside the card.
- Do NOT invent data; show only when available.

### Goal Status
- In progress: standard accent progress bar.
- Complete: green bar + "Complete" badge.
- Overdue (not complete): amber warning.

---

## 12. REPORTS

Reports is the strongest analytics screen. The difference:

- **Dashboard** = "What is happening right now?"
- **Reports** = "Why / where / how has it changed?"

### Income vs Expenses Visualization
- Side-by-side horizontal bars or a grouped bar chart for the selected month.
- Answer: "How does my income compare to my expenses this month?"

### Category Spending Visualization
- Horizontal bar chart, sorted largest to smallest.
- Each bar labeled with category name and amount.
- Answer: "Where is my money going?"

### Trend Visualization
- Line or area chart showing income and expense over the last 6–12 months.
- Answer: "How has my financial behavior changed over time?"

### Time-Period Controls
- Preserve the existing month navigation.
- Add a range selector (e.g., 3M / 6M / 12M / YTD) only if the reporting module supports it. Flag as dependency if not yet available.

### KPI Hierarchy on Reports
- Top row: Income | Expenses | Net | Transaction Count (Tier 2)
- Below: primary chart area (income vs expense trend)
- Below: category breakdown (horizontal bars)
- Below: optional account distribution

### How Reports Differs from Dashboard
- Dashboard shows current state and immediate activity.
- Reports shows historical context, composition, and trends.
- Reports has larger chart areas, fewer cards, more whitespace.

---

## 13. SETTINGS

### Structure
Grouped sections with clear separation:
1. **Preferences** — currency, theme, accent, privacy mode
2. **Categories** — create and manage categories
3. **Backup & Restore** — export, import, preview

### Visual Hierarchy
- Section titles: `text-lg`, font-weight 600, with `--space-6` below.
- Form fields: standard, compact, 1-column on desktop, full-width on mobile.
- Settings uses a **dedicated page layout** (not modal).

### Accent Selector
- Replace the current select with a row of color swatches.
- Each swatch: 32px circle, filled with the accent color, labeled below or with tooltip.
- Selected state: ring border, checkmark icon.

### Currency
- Replace free-text input with a select of common currencies (PLN, USD, EUR, GBP, etc.).
- If the domain already supports arbitrary currency codes, show the current code as text with a change button that opens a small modal.

### Language Selector
- Add if the domain supports it. Flag as dependency if not.
- Present as a select or flag + name row.

### Backup / Restore
- Keep the existing two-button layout.
- Replace `alert()` calls with inline status banners.
- Restore preview: present as a card with a summary list.

### Technical Fields
- Remove exposure of internal IDs, raw HEX inputs, and emoji-name text fields from user-facing forms.
- Replace with curated controls where domain allows.

---

## 14. FORMS / INTERACTION PATTERN

### Shared Form Architecture

**Desktop:** Modal dialog, centered, max-width 520px.
- Backdrop: rgba(0,0,0,0.6)
- Surface: elevated surface (`--color-surface-elevated`), `--radius-xl`
- Header: title + close button
- Body: form fields, `--space-5` padding
- Footer: primary action (right-aligned) + secondary/cancel (left-aligned or secondary)

**Mobile:** Bottom sheet, slides up.
- Same surface treatment.
- Handle swipe-down-to-close if implementable without framework overhead.

**Inline Editing:**
- Use ONLY for simple single-field edits (e.g., renaming a goal directly in the list).
- Do NOT use inline editing for multi-field forms.

### Focus Behavior
- Opening a modal: focus the first input field.
- Closing a modal: return focus to the triggering button.
- Tab order: trapped within modal while open.

### Validation
- Inline validation below each field.
- Red border + error text on invalid fields after first submit attempt.
- Do NOT use `alert()` for validation errors.

### Save / Cancel
- Primary button: "Save" / "Create"
- Secondary button: "Cancel"
- On create: form closes and new item appears in list with a brief highlight animation.

### Error Presentation
- Inline field errors for validation.
- Global error banner inside the modal for operation failures (network, permissions).
- Toast notification for success (brief, non-blocking).

### Critical: Whole-View Re-Render Bug

**Current problem:** The `application-state.js` factory calls `notify()` on every dispatch, which passes a deep-clone snapshot to all subscribers. The shell's `handleStateChange` re-renders the entire view when relevant data changes. Form input handlers dispatch `SET_*_FORM` on every keystroke, triggering re-render and destroying input focus.

**Required solution (to be implemented later, specified here):**
- Form input handlers must NOT dispatch on every keystroke for form fields.
- Options:
  1. Dispatch form changes to a local in-memory buffer, and only sync to global state on blur or submit.
  2. Introduce a lightweight local form state scoped to the view, and subscribe only the form's DOM to it.
  3. Debounce form dispatches to ~150ms and avoid full-view re-render during typing.
- The eventual implementation must ensure that typing in an input does NOT unmount or replace the input element.

---

## 15. MOBILE SYSTEM

### Mobile Breakpoint: ≤640px

**Navigation:**
- Sidebar becomes a drawer, off-screen by default.
- Hamburger button in top-bar opens drawer.
- Drawer width: 280px, with overlay backdrop.
- Close on overlay tap or link selection.

**Page Header:**
- Title + subtitle stack vertically if needed.
- Action buttons: full-width below header.

**KPI Layout:**
- 4-column summary → 2 columns (at ≤1100px) → 1 column (at ≤640px).
- KPI font sizes drop one tier at ≤640px.

**Cards:**
- Full width, `--space-4` horizontal padding instead of `--space-6`.
- Maintain `--radius-xl` (do not reduce radius on mobile).

**Charts:**
- Full width, min-height 200px.
- Touch-friendly tooltips if implemented later.

**Lists:**
- Convert to stacked cards on mobile.
- Minimum row height: 56px.

**Forms:**
- Single column.
- Inputs: min-height 44px.
- Buttons: min-height 44px, full-width on mobile.

**Action Buttons:**
- Minimum touch target: 44×44px.
- Floating action button (FAB) for primary actions on mobile (e.g., "Add Transaction") is acceptable if it does not obscure content.

---

## 16. ICONOGRAPHY

### Icon Style
- 24px outlined icons for navigation (current inline SVGs).
- 20px icons for buttons and compact UI.
- 32–36px icons for account/category cards.

### Size Hierarchy
- Navigation: 20px
- Buttons: 16–18px
- Cards (account, goal): 32–36px
- Empty states: 48px

### Account / Category Icon Treatment
- Use the existing `renderIcon()` emoji map.
- Present as a colored circle or rounded square with the emoji centered.
- Do NOT show the raw emoji name or ID in any user-facing label.

### Button Icons
- Icon-only buttons: 38–44px square, rounded, subtle background.
- Icon + text buttons: icon left of text, `--space-2` gap.

### Navigation Icons
- Keep existing inline SVG icons.
- Active state: icon color matches `--color-primary`.

---

## 17. MOTION

### Principles
- Motion serves feedback, not decoration.
- Prefer opacity and transform transitions only.
- Duration: fast (150ms) for hover/focus, normal (220ms) for drawer/modal.

### Hover / Focus
- Card hover: translateY(-1px) + shadow increase (sm → md), 150ms.
- Button hover: background/border color transition, 150ms.
- Focus ring: 2px offset ring using `--color-primary`, no animation.

### Drawer / Modal
- Drawer: translateX transition, 220ms.
- Modal: opacity + translateY, 220ms.
- Backdrop: opacity transition, 220ms.

### Chart Transitions
- Bar width transitions: 300–400ms ease-out when data loads.
- No animation on initial page load for charts (prevents layout shift).

### Loading
- Skeleton screens preferred over spinners for data-heavy areas.
- Existing `.loading-message` can remain as a fallback.

### Success / Error Feedback
- Success: subtle border flash on the affected card, or a dismissible banner.
- Error: red banner above the relevant form or section.
- Duration: 3 seconds for toasts, persistent for form errors until corrected.

---

## 18. ACCESSIBILITY

### Contrast
- Text on surfaces must meet WCAG AA (4.5:1 for body text, 3:1 for large text).
- Verify all semantic colors (positive, negative, warning) against `--color-bg` and `--color-surface`.

### Focus States
- Visible focus ring on all interactive elements.
- Focus ring: 2px solid `--color-primary`, offset 2px.
- Never remove focus outline without replacement.

### Keyboard Navigation
- Modal: trap focus, close on Escape.
- Drawer: close on Escape.
- All interactive elements reachable via Tab.
- Month navigation buttons: keyboard accessible.

### Labels
- Every form input has an associated `<label>`.
- Icon-only buttons have `aria-label`.
- Navigation has `aria-label` on the container.

### Touch Targets
- Minimum 44×44px on mobile.
- Spacing between adjacent touch targets: at least 8px.

### Reduced Motion
- Honor `prefers-reduced-motion: reduce`.
- When active: disable all non-essential transitions and animations.
- Keep functional transitions (focus indicators) but remove decorative motion.

---

## 19. IMPLEMENTATION ORDER

Recommended sequence, incremental and low-risk:

1. **Global Visual Tokens & Layout Foundation**
   - Refine `app.css` tokens to match this spec (spacing, radius, shadows, surfaces).
   - Remove decorative gradients, glow shadows, and glassmorphism from `.card` and `.summary-card`.
   - Update sidebar brand from "Finora WEALTH OS" to "FINORA" (with optional small "Personal Wealth OS" descriptor).
   - Update page titles and branding strings.

2. **Shared Form Interaction Foundation**
   - Extract form helpers into a shared module.
   - Replace `alert()` / `confirm()` with inline messages and modal confirmations.
   - Introduce modal/drawer shell for forms.
   - Fix the whole-view re-render on keystroke: buffer form input locally, sync state on blur/submit.

3. **Dashboard**
   - Restructure hero area (dominant balance KPI).
   - Reorganize KPI row (income, expenses, safe-to-spend).
   - Add primary cash flow visualization (bars or line).
   - Add safe-to-spend breakdown panel.
   - Rebuild bottom section (recent tx + attention items).

4. **Accounts**
   - Refactor account cards (accent strip, icon, balance hierarchy).
   - Replace HEX/icon text inputs with preset swatches and icon grid.
   - Move form to modal.

5. **Transactions**
   - Refactor list rows (description, meta, amount hierarchy).
   - Move form to modal.
   - Add filter controls above list.

6. **Budgets**
   - Refactor budget cards (progress bar, warning states, category names).
   - Reorganize summary row.
   - Keep progress bars (correct choice).

7. **Goals**
   - Refactor goal cards (progress bar, deadline, status).
   - Move deposit form inline inside card or to modal.

8. **Reports**
   - Add time-period selector (if supported).
   - Implement horizontal bar charts for category breakdown.
   - Add income vs expense comparison visualization.
   - Add trend line chart (if time-series data is available).

9. **Settings**
   - Restructure into grouped sections.
   - Replace accent select with swatches.
   - Replace currency input with select.
   - Replace all `alert()` with inline status banners.

10. **Responsive Refinement**
    - Audit all screens at 390px, 768px, 1024px, 1440px.
    - Fix any overflow, clipping, or squeezed layouts.
    - Ensure touch targets ≥44px.

11. **Visual / Interaction Final Gate**
    - Run acceptance criteria checklist.
    - Accessibility audit (contrast, focus, keyboard).
    - Performance check (no full-view re-renders during typing).
    - Cross-browser sanity check.

---

## 20. ACCEPTANCE CRITERIA

### Desktop (1440px)
- [ ] No horizontal overflow on any screen
- [ ] No clipped content in cards, lists, or tables
- [ ] KPI hierarchy is immediately readable at a glance
- [ ] Spacing is consistent (8px grid visible in design)
- [ ] All controls are usable with mouse and keyboard
- [ ] Input focus is stable during typing (no blur, no re-render)
- [ ] No console errors in normal operation
- [ ] All interactions (nav, forms, month nav, archive) work correctly
- [ ] Selected accent color applies consistently to nav, buttons, and focus rings
- [ ] Positive/negative/warning colors remain correct regardless of accent

### Tablet / Intermediate (768px–1024px)
- [ ] Sidebar collapses to drawer
- [ ] Grid columns reduce gracefully (4→2→1)
- [ ] No horizontal overflow
- [ ] Touch targets ≥44px
- [ ] Modals remain usable

### Mobile (390px)
- [ ] No horizontal overflow
- [ ] No horizontal scrolling
- [ ] All text is readable (no sub-12px body text)
- [ ] KPI numbers scale down one tier only
- [ ] Forms are single-column with full-width inputs
- [ ] Modals become bottom sheets or full-screen
- [ ] Navigation is accessible via hamburger drawer
- [ ] Tables convert to stacked cards
- [ ] Charts are full-width and touch-friendly

---

## A. VISUAL SYSTEM VERDICT

1. Finora is a calm, premium personal finance tool — not a trading terminal or admin panel.
2. Typography hierarchy is financial-first: the biggest number answers the most important question.
3. The accent color is a brand signal, not a financial semantic — never replace green/red/amber.
4. Whitespace is a structural element, not empty space.
5. Cards are surfaces for grouping, not the primary organizational pattern.
6. Charts exist only to answer real financial questions; no decorative charts.
7. Progress bars are correct for limits and goals; charts are correct for trends and composition.
8. Forms live in modals/drawers, never appended below long content.
9. The re-render-on-keystroke bug is a state-architecture issue, not a styling issue — must be fixed before forms feel premium.
10. Brand is "FINORA" — "Personal Wealth OS" is a descriptor, not a headline.
11. Mobile is a first-class layout, not a shrunk desktop.
12. Motion is restrained and functional: feedback only, no decoration.
13. Shadows and borders are used for hierarchy, not decoration.
14. The dashboard hero answers "how much do I have" in one dominant number.
15. Reports is the analytics screen; Dashboard is the status screen — they serve different mental modes.

---

## B. IMPLEMENTATION SEQUENCE

1. Global visual tokens / layout foundation
2. Shared form interaction foundation (modal, local form state, no alert/confirm)
3. Dashboard
4. Accounts
5. Transactions
6. Budgets
7. Goals
8. Reports
9. Settings
10. Responsive refinement
11. Visual / interaction final gate

---

## C. OPEN QUESTIONS

1. **Reports time-range selector:** Does the reporting module currently support ranges beyond the selected month (e.g., 6M, 12M, YTD)? If not, is adding this a dependency for Reports redesign, or should Reports be limited to single-month + category breakdown in v2?

2. **Trend data availability:** Does `modules.reporting` expose historical monthly data for line/area charts, or is data limited to the current month? This determines whether the Reports trend chart is implementable now.

3. **Account balance real-time updates:** Should balance loading on the Accounts page show skeleton states, spinners, or stale data with a refresh indicator?

4. **Category contribution history for Goals:** Does the goal module expose deposit timestamps and amounts, enabling a mini-timeline visualization inside goal cards?

5. **Currency list:** Should Settings currency selector show a curated list (PLN, USD, EUR, GBP, CHF, etc.) or allow free-text entry? The domain model currently accepts arbitrary strings.

6. **Privacy mode implementation:** How does privacy mode interact with KPI display? Should it blur numbers or replace them with `••••`? Current behavior needs clarification before redesigning Settings.

7. **Language support:** Is there an existing i18n system, or is the app single-language (Polish)? This affects whether a language selector in Settings is meaningful now or a future dependency.

---

## DOCUMENTATION METADATA

- **Created:** 2026-09-24
- **Scope:** Visual System 2.0 specification
- **Constraint:** Design/documentation only. No production code modified.

---

## FILES INSPECTED

- `F:\Projects\finanse\src\ui\app.html`
- `F:\Projects\finanse\src\ui\app.css` (1733 lines)
- `F:\Projects\finanse\src\ui\shell.js`
- `F:\Projects\finanse\src\ui\bootstrap.js`
- `F:\Projects\finanse\src\ui\views\dashboard.js`
- `F:\Projects\finanse\src\ui\views\accounts.js`
- `F:\Projects\finanse\src\ui\views\transactions.js`
- `F:\Projects\finanse\src\ui\views\budgets.js`
- `F:\Projects\finanse\src\ui\views\goals.js`
- `F:\Projects\finanse\src\ui\views\reports.js`
- `F:\Projects\finanse\src\ui\views\settings.js`
- `F:\Projects\finanse\src\ui\utils\icons.js`
- `F:\Projects\finanse\src\state\application-state.js`
- `F:\Projects\finanse\src\state\application-state-factory.js`
- `F:\Projects\finanse\FINORA_MASTER_CONTEXT_v4.0.md`

## FILE CREATED

- `F:\Projects\finanse\FINORA_VISUAL_SYSTEM_2.0.md`

## IMPORTANT DESIGN DECISIONS

1. **No chart library introduced** — charts will use lightweight inline SVG or Canvas in a later phase.
2. **Forms moved to modals** — eliminates the "appended below content" problem and supports focused interaction.
3. **Accent colors preserved** — all six existing accents remain, but their use is constrained to brand/identity, not financial semantics.
4. **Glassmorphism removed from cards** — replaced with flat surfaces and subtle borders.
5. **Progress bars retained for budgets/goals** — they answer "how close to limit" correctly.
6. **Re-render bug flagged as dependency** — the fix requires local form state buffering, which is an interaction architecture change, not a styling change.
7. **Brand simplified to "FINORA"** — "Personal Wealth OS" moves to subtitle/descriptor.
8. **Reports elevated to analytics screen** — different mental model from Dashboard.
9. **Presets replace free-text inputs** for icon and color selection — removes technical field exposure.
10. **`alert()` / `confirm()` eliminated** — replaced with inline messages and modal confirmations.

## OPEN QUESTIONS (repeated from Section C)

1. Reports time-range selector — does the domain support it?
2. Historical trend data — is it available from `modules.reporting`?
3. Account balance loading UX — skeleton vs spinner vs stale.
4. Goal deposit history — does the domain expose timestamps?
5. Currency selector — curated list or free-text?
6. Privacy mode visual behavior — blur vs placeholder?
7. Language/i18n — existing system or future dependency?

## CONFIRMATION

No production code was modified. This document is a design specification only. All changes described require future implementation passes.
