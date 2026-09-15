# Page and Component Plan

Status: Draft
Applies to: `apps/web`, `packages/ui`
Visual system: `docs/04-design/design-system.md`
Feature sources: `FEAT-ACC-01/02`, `FEAT-UX-01`, `FEAT-FIN-01..04`

---

## 1. How to read this

Every screen below has three parts:

1. **Purpose** — the one question the screen exists to answer.
2. **Component table** — four columns, one row per component:
   - **Why it exists** — the requirement or failure it prevents. A component with no
     answer here should not be built.
   - **Displays** — exactly what is on screen.
   - **Process flow** — where the data comes from, what an interaction triggers, what
     changes as a result.
3. **States** — empty, loading, error. Every screen has all three
   (`phase-1-financial-core.md` Definition of Done).

Wireframes are ASCII and indicative, not pixel specs. They show *what is present and in
what order*, which is the part that is expensive to change later.

Conventions used throughout: `[x]` primary action, `(x)` secondary, `{x}` menu.
Money is always `formatMoney` output (design-system §9.1).

---

## 2. Route map

| Route | Phase | Access | Feature | Screen |
|---|---|---|---|---|
| `/` | 0 | public | — | Landing |
| `/login` | 0 | public | FEAT-ACC-01 | Sign in |
| `/signup` | 0 | public | FEAT-ACC-01 | Sign up |
| `/setup` | 0/1 | auth, onboarding incomplete | FEAT-UX-01 | Setup wizard |
| `/dashboard` | 0 empty → 1 | auth | FEAT-FIN-04 | Cash-flow dashboard |
| `/transactions` | 1 | auth | FEAT-FIN-03 | Ledger |
| `/accounts` | 1 | auth | FEAT-FIN-01 | Accounts |
| `/categories` | 1 | auth | FEAT-FIN-02 | Categories |
| `/settings` | 0/1 | auth | FEAT-ACC-02 | Settings |
| `/health` | 0 | public | — | JSON, not a screen |

**Phase 0 ships the shell only**: `/`, `/login`, `/signup`, `/setup` (currency step
only), and `/dashboard` as a designed empty state. The rest are Phase 1.

Filter state lives in the URL query string, so every filtered view is shareable and
survives a refresh (FEAT-FIN-04 explicitly requires this for the period).

---

## 3. The app shell

Authenticated screens share one frame. It exists so navigation, identity and the global
"record something" action are in the same place on every screen.

```
+--------------------------------------------------------------------------------+
| [+]  Yearwise          [ Workspace name v ]        [ Search ]      { Account }  |  TopBar 56px
+--------------------------------------------------------------------------------+
|  Dashboard    |                                                                 |
|  Transactions |   Page title                              [ Primary action ]    |  PageHeader
|  Accounts     |   Supporting line                                             |
|  Categories   |                                                                 |
|  Settings     |   ------------------------------------------------------------------|
|               |                                                                 |
|  ---          |   Page content                                                  |
|  Net worth    |                                                                 |
|  12,480.00    |                                                                 |
+--------------------------------------------------------------------------------+
   Sidebar 240px
```

### 3.1 Shell components

| Component | Why it exists | Displays | Process flow |
|---|---|---|---|
| `AppShell` | One place that owns the auth boundary, the frame and the global keyboard layer. | Sidebar + TopBar + content slot. | Server layout checks the session; no session → redirect `/login`. No `onboardingCompletedAt` → redirect `/setup`. |
| `Sidebar` | The product has five destinations and a persistent money fact; a top nav wastes the vertical axis a ledger needs. | Nav items (Dashboard, Transactions, Accounts, Categories, Settings), active state in green, net-worth footer, workspace name. | Click → client navigation, no full reload. Active item derived from pathname. Collapses to icons under 1024px; becomes a drawer under 768px. |
| `TopBar` | Identity and the one action a user takes most often must never require navigating first. | Workspace name + switcher, global search, `[+] New transaction`, account menu. | `[+]` and the `n` key open the same `TransactionDrawer` (FEAT-FIN-03 §10). Account menu → Settings, Sign out. |
| `PageHeader` | Gives every screen a consistent title/action contract, and puts the primary action in a predictable place. | Title (Fraunces), supporting line, primary action slot, optional secondary actions. | Presentational. Screens pass title, description and actions. |
| `PageContainer` | Enforces the max width and gutters so screens do not each invent spacing. | Content well, 24px mobile / 32px desktop gutters. | Presentational. |
| `NetWorthStub` | The sidebar footer is where "where do I stand" is always answered. | Net worth (`--text-figure`), excluded-account note when non-zero. | Reads the same grouped aggregate as `/accounts`; refreshes after any mutation that affects balances. |
| `CommandPalette` | Optional in Phase 1: jump to a screen, account or category without the mouse. | Fuzzy list of destinations and recent categories. | `Cmd/Ctrl+K` opens. Phase 1 stretch; do not block the ledger on it. |

**Shell states.** Loading — sidebar and top bar render immediately, content shows a
skeleton. Error — TopBar and Sidebar survive; the content slot shows an error panel with
retry, so navigation never dies with one failed query.

---

## 4. Phase 0 screens

### 4.1 Landing — `/`

**Purpose.** In one screen, say what this is and why a spreadsheet user should move.
This is the only screen written for someone who is not yet a user.

```
+--------------------------------------------------------------------------------+
|  Yearwise                                                    (Sign in) [Start ] |
+--------------------------------------------------------------------------------+
|                                                                                |
|       Every rand, in one place.                                                |
|       Money, budgets, debts and savings - without the spreadsheet.             |
|                                                                                |
|       [ Start free ]   ( See how it works )                                    |
|                                                                                |
+--------------------------------------------------------------------------------+
|  Your ledger, not a grid   |  One number you can trust  |  Your data, exportable |
|  ...                       |  ...                       |  D6: open format, any  |
|                            |                            |  time, no lock-in      |
+--------------------------------------------------------------------------------+
|  Footer: product · privacy · terms                                             |
+--------------------------------------------------------------------------------+
```

| Component | Why it exists | Displays | Process flow |
|---|---|---|---|
| `Hero` | The product has one job to state, and the original's "one file, one payment" promise is gone (D2). | Product name (Fraunces), positioning line, `[Start free]`, `(Sign in)`. | `[Start free]` → `/signup`; `(Sign in)` → `/login`. |
| `ValueProps` | Three claims, each a real differentiator rather than filler. | Three items: *your ledger, not a grid* (D3); *one number you can trust* (correctness first); *your data, exportable* (D6). | Presentational. |
| `DataPortabilityPromise` | D6 makes export a shipped commitment, and it is the honest replacement for "you own the file". | One plain statement of the export promise, linking to the Phase 8 feature. | Presentational; anchors to the value prop. |
| `Footer` | Legal and support surfaces, and a secondary route in for returning users. | Privacy, terms, contact, `(Sign in)`. | Presentational. |

**States.** Static. No data fetching, so no loading or error state. It must render
without a session.

**Deliberately absent.** No fake dashboards, no stock photography, no testimonial
carousel, no metric counters (design-system §13).

---

### 4.2 Sign in — `/login`

**Purpose.** One task: turn credentials into a session with the fewest possible fields.

```
+--------------------------------------------------------------------------------+
|                            Yearwise                                            |
|   +------------------------------------------------------------------------+   |
|   |  Sign in                                                               |   |
|   |  Email   [_______________________________]                            |   |
|   |  Password[_______________________________]  (Forgot?)                  |   |
|   |  [ Sign in ]                                                           |   |
|   |  ---------------- or ----------------                                  |   |
|   |  ( Email me a sign-in link )                                           |   |
|   |  New here? Create an account                                           |   |
|   +------------------------------------------------------------------------+   |
+--------------------------------------------------------------------------------+
```

| Component | Why it exists | Displays | Process flow |
|---|---|---|---|
| `AuthLayout` | Centred, chrome-free frame so nothing competes with the single form. | Wordmark, centred card, no navigation. | Redirects to `/dashboard` when a session already exists. |
| `AuthCard` | One bordered surface for the whole task; separates auth from the app shell. | Title, form slot, alternate path, footer link. | Presentational. |
| `SignInForm` | The primary credential path. | Email, password, submit, per-field and form-level errors. | Submit → Supabase Auth → session cookie → redirect to `/dashboard`, or `/setup` when `onboardingCompletedAt` is null. Failure → inline error, no field clearing. |
| `MagicLinkForm` | The second documented path (tech-stack §3); removes password reset entirely. | Email field, submit, "check your inbox" confirmation. | Submit → magic link email → callback route exchanges the token → session. |
| `FormField` / `ErrorText` | Centralises label, error and `aria-describedby` wiring so accessibility is not per-screen. | Label, control slot, help text, error text. | Errors appear on blur and on submit; the first invalid field takes focus. |
| `AuthFooterLink` | Keeps sign-in and sign-up mutually discoverable. | "New here? Create an account". | → `/signup`. |

**States.** Loading — submit disabled with an inline spinner, never a page-level
spinner. Error — invalid credentials, rate-limited, or network; each has its own copy.

---

### 4.3 Sign up — `/signup`

**Purpose.** Create the user, and in the same breath create the workspace that makes the
account meaningful.

| Component | Why it exists | Displays | Process flow |
|---|---|---|---|
| `AuthLayout` / `AuthCard` | Shared with sign-in, so the flow feels like one door. | As above. | As above. |
| `SignUpForm` | Collects the minimum to create a usable account. | Email, password (with strength hint), submit. | Submit → create `User` → **in one transaction** create exactly one `Workspace`, one `Membership`, and the seeded category tree (FEAT-FIN-02: a workspace without categories is a broken workspace) → redirect `/setup`. Rollback on seed failure. |
| `PasswordRequirements` | `phase-0` acceptance requires a password rule that is stated, not discovered on failure. | Live requirement list. | Updates as the field is typed. |
| `AuthFooterLink` | Mutual discoverability. | "Already have an account? Sign in". | → `/login`. |
| `EmailConfirmationNotice` | If confirmation is required, the user must not be left staring at a form. | "Check your inbox" panel with resend. | Resend → re-issue the message, rate-limited. |

**States.** Loading, error (email in use, weak password, rate-limited), and the
confirmation-pending state.

**Acceptance tie-in.** This screen is where Phase 0's "signup creates exactly one User,
one Workspace and one Membership row" is proven.

---

## 5. Phase 1 screens

### 5.1 Setup wizard — `/setup`

**Purpose.** Get a new workspace to a valid, useful state in three steps, replacing the
original spreadsheet's video walkthrough (FEAT-UX-01). Re-runnable from Settings.

```
+--------------------------------------------------------------------------------+
|  Yearwise                                          Step 2 of 3                  |
|  ●---------●---------○                                                         |
|                                                                                |
|  Your first account                                                            |
|  Where does your money actually sit?                                           |
|                                                                                |
|   Name            [ Main Cheque Account        ]                               |
|   Type            [ Cheque account          v ]                               |
|   Opening balance [        12,480.00         ]   as at [ 01/03/2026 ]          |
|   [x] Include in net worth                                                     |
|                                                                                |
|   ( Back )                                                    [ Continue ]      |
+--------------------------------------------------------------------------------+
```

| Component | Why it exists | Displays | Process flow |
|---|---|---|---|
| `WizardShell` | A first run needs a guided frame without the app chrome, and it must be resumable. | Step indicator, step title, description, body slot, Back/Continue bar. | Reads current step from the URL (`/setup?step=2`), so Back/refresh behave predictably. Persists each step before advancing. |
| `StepIndicator` | Three steps must feel finite; an unknown length is why setup is abandoned. | 3 dots with labels, current step in green, completed steps filled. | Click a completed step to jump back. Forward requires the current step valid. |
| `CurrencyStep` | Currency is workspace-wide and, once a transaction exists, immutable (I12). Getting it wrong early is expensive. | Currency select (ISO-4217, searchable), date-format select, week-start select, locale select. | Loads the 8–12 likely currencies by locale, full list on search. Saves to `Workspace` on Continue. Shows the immutability notice. |
| `FirstAccountStep` | A ledger with no account has nowhere to record anything. | Name, type, opening balance, opening date, include-in-net-worth. | Reuses the same `AccountDrawer` fields as `/accounts` so the two cannot diverge. Creates one `Account`. Opening balance may be negative for a card already owed on. |
| `StarterCategoriesStep` | The seed is the reason a new user can record a coffee without designing a taxonomy. | The seeded tree, editable before commit; add/remove a child. | Seeded at signup; this step lets the user trim rather than create. Confirm → mark `onboardingCompletedAt`. |
| `WizardSummary` | Ends on something concrete, not an empty dashboard. | What was created, with a `[Record your first transaction]` action. | → `/dashboard` with the `TransactionDrawer` open, or `/transactions`. |
| `WizardProgressSave` | A user who closes the tab mid-setup should not lose step 1. | — (behaviour, no chrome). | Each Continue persists before navigation. |

**States.** Empty (fresh), resumed (a partially complete workspace), loading, error with
retry. If the workspace already has `onboardingCompletedAt`, `/setup` requires an
explicit "re-run setup" entry from Settings rather than hijacking the route.

---

### 5.2 Cash-flow dashboard — `/dashboard`

**Purpose.** Turn recording effort into an answer: *what did I earn and spend, and where
did it go?* (FEAT-FIN-04.) This is the screen that decides whether the user returns next
month.

```
+--------------------------------------------------------------------------------+
|  Dashboard                                                                     |
|  [ This month v ]                                   [ < March 2026 > ]         |
+--------------------------------------------------------------------------------+
|  Income             Expenses           Net              Savings rate           |
|  24,543.54          20,972.00          3,571.54         14.6%                  |
|  +8.2% vs Feb       -3.1% vs Feb       +2,100 vs Feb    -                        |
+--------------------------------------------------------------------------------+
|                                    |                                            |
|   Expense breakdown                |   12-month trend                           |
|      (donut)                       |   (grouped bars, income vs expenses)       |
|   legend: amount + %               |                                            |
|                                    |                                            |
+--------------------------------------------------------------------------------+
|  Top expense categories            |   Recent transactions                      |
|  1 Food            4,120.00  19.6% |   14 Mar  Groceries   Food      -342.00    |
|  2 Housing         3,800.00  18.1% |   13 Mar  Salary      Income  +12,000.00   |
|  ...                               |   (view all)                               |
+--------------------------------------------------------------------------------+
```

| Component | Why it exists | Displays | Process flow |
|---|---|---|---|
| `PeriodSelector` | Every figure on the page is meaningless without its period, and "this month" must be one control, not a mental calculation. | Preset dropdown (This month, Last month, This year, Last 12 months, Custom), previous/next arrows, resolved range label. | Change → resolves `[start, end)` in workspace calendar space (never the server clock) → writes to the URL → all five queries re-run. Custom opens `DateRangeField`. |
| `KpiCard` ×4 | The three primary figures plus savings rate are the page's reason to exist. | Label, `--text-figure` value, optional delta against the previous period. | Query 1 (period totals) supplies Income, Expenses, Net; savings rate is derived. Values snap - no count-up. |
| `KpiDelta` | A figure without a direction is only half an answer. | `+8.2% vs Feb`, with an arrow glyph and the money colour. | Computed from the same query run for the previous comparable period. Hidden when the prior period is empty. |
| `MoneyText` | One component owns formatting, alignment and the debt display flip, so no screen re-implements it. | Formatted amount, tabular, right-aligned, `owed` for debt. | Presentational; wraps `formatMoney`. |
| `ExpenseDonut` | Shows *what consumes money* faster than any table. | Donut of expenses by parent category, green-anchored palette, "Other" for slices < 1%. | Query 2. Click a slice → `/transactions` filtered to that category **and its children**, with the period applied. Keyboard: each slice focusable, tooltip gives exact amount. |
| `CategoryLegend` | A donut without a legend is decoration; the legend is where the money is actually read. | Row per category: colour, name, amount, share. | Percentages use largest-remainder allocation so they sum to exactly `100.0`. Click a row → same drill-through as the slice. |
| `TrendBarChart` | A single month cannot show a trend, and a trend is the difference between a number and a direction. | 12 consecutive months, grouped income/expense bars, **zero-filled**. | Query 3; zero-fill happens in SQL so the client never reconstructs a calendar. Click a month → `/transactions` filtered to that month's range. |
| `TopCategoriesList` | Ranks the damage in a form that can be read in two seconds. | Top 5 expense categories: rank, colour dot, name, amount, share. | Query 4. Click → ledger filtered to that category and children. |
| `RecentTransactions` | The dashboard must be a place things happen, not only a place things are read. | 5 most recent: date, payee or notes, category, account, signed amount. | Query 5. `(view all)` → `/transactions`. Row click → `TransactionDrawer` in edit mode. |
| `ChartFrame` | Axes, gridlines, tooltips, keyboard focus and empty states are identical across charts, and per-screen theming is the stated risk. | Chart container with title, description, legend slot, the four states, and the screen-reader data table. | **Built.** Frames whatever chart it is given, so the charting-library decision does not block it. Screens compose it and never theme it. |
| `DashboardEmptyState` | A workspace with no transactions must not be shown a wall of zeros - that reads as broken. | Onboarding prompt and `[Record your first transaction]`. | Shown when the workspace has zero transactions at all, regardless of period. |
| `PeriodEmptyState` | "No activity this period" and "no data at all" are different facts and must look different. | Message plus a `(Show this year)` shortcut. | Shown when the workspace has transactions but none in the period. Replaces the charts, not the KPI row. |
| `DashboardSkeleton` | Skeletons must match the final layout or the page shifts as data lands. | KPI placeholders, donut placeholder, bar placeholders, list placeholders. | Rendered while the five queries resolve. |
| `DashboardError` | One failed query must not blank the page. | Retry control; the rest of the page still renders. | Retry re-issues only the failed query. |

**Query contract (fixed at five, per FEAT-FIN-04):**

| # | Query | Feeds |
|---|---|---|
| 1 | Period totals | `KpiCard` ×3 + savings rate |
| 2 | Expense breakdown by parent category | `ExpenseDonut`, `CategoryLegend` |
| 3 | 12-month zero-filled trend | `TrendBarChart` |
| 4 | Ranked expense categories | `TopCategoriesList` |
| 5 | Recent transactions | `RecentTransactions` |

No query scales with period length or category count. The client never downloads a
transaction set and reduces it in JavaScript.

**States.** Empty (no transactions at all) · Empty (no activity in period) · Loading
(layout-matched skeleton) · Error (partial failure, retry) · Populated. Plus the
documented edge cases: zero income → savings rate em dash; zero expenses → donut
replaced by an empty state; negative net → expense treatment with a sign, not colour
alone; one category at 100% → single-ring donut and a one-row legend.

---

### 5.3 Transaction ledger — `/transactions`

**Purpose.** Record what happened, correct it, and find it again. This is the critical
path of Phase 1: if entry is slow or a figure is ever wrong, the user leaves (FEAT-FIN-03).

```
+--------------------------------------------------------------------------------+
|  Transactions                                       [ + New transaction ]      |
+--------------------------------------------------------------------------------+
|  [1 Mar - 31 Mar] [Accounts v] [Categories v] [Kind: All | In | Out] [Search ] |
|  ( Food × )  ( Main Cheque × )                              ( Clear all )      |
+--------------------------------------------------------------------------------+
|  Income 24,543.54   Expenses 20,972.00   Net 3,571.54                          |
+--------------------------------------------------------------------------------+
|  14 March 2026                                                                 |
|   Groceries        Food > Groceries   Main Cheque              -342.00   {…}   |
|   Fuel             Transport          Credit Card              -680.00   {…}   |
|  13 March 2026                                                                 |
|   Salary           Income > Salary    Main Cheque           +12,000.00   {…}   |
|                                                                                |
|                          ( loading more… )                                     |
+--------------------------------------------------------------------------------+
```

| Component | Why it exists | Displays | Process flow |
|---|---|---|---|
| `TotalsStrip` | The filtered set's totals are the question; the rows are the evidence. | Income, expenses, net for the **entire filtered set**. | One aggregate over the filter, not over the loaded page. Always visible, including when the list is empty. |
| `FilterBar` | Answering "what did I spend on food last month" is the most common reason the ledger is opened. | Date range + presets, account multi-select, category multi-select, kind segmented control, text search. | Any change → URL query → re-query with the keyset cursor reset to the first page. |
| `FilterChip` | Active filters must be visible as objects, or users cannot tell why the list is short. | One chip per active filter, with a remove control. | Remove → drops that filter → URL + query update. `(Clear all)` appears when any filter is set and returns to the identical unfiltered state. |
| `DateRangeField` | The half-open `[from, to)` rule is the most common off-by-one in the product; the control must own it. | Range picker with presets (this month, last month, this year, custom). | A picked "1–31 March" is transmitted as `fromDate=2026-03-01`, `toDate=2026-04-01`. The boundary conversion lives here, once. |
| `AccountMultiSelect` | Filtering by account answers "how is this account doing". | Non-archived accounts with multi-select; archived ones shown greyed only when already selected. | Selection → filter. Account row click elsewhere (`/accounts`) arrives here pre-filtered. |
| `CategoryMultiSelect` | Filtering by parent must include its children, which users expect and code often forgets. | Two-level tree, parent selection implies descendants. | Resolves to an `IN` over the resolved id set, never a recursive query per row. |
| `KindSegmentedControl` | In/out is a two-way question and a dropdown makes it three interactions. | All / Income / Expense. | Filter. `TRANSFER` is reserved and not rendered (A3). |
| `SearchInput` | Payee and notes are how people actually remember a transaction. | Debounced text input. | Case-insensitive match on `payee` or `notes`. Debounced; resets pagination. |
| `TransactionTable` | The ledger itself, and the only place a running total and its rows are shown together. | Date-grouped rows: date header, payee/notes, category, account, right-aligned monospaced amount, row action menu. | Keyset pagination on `(date DESC, id DESC)`, page size 50. `OFFSET` is prohibited. Row click → `TransactionDrawer` (edit). |
| `DateGroupHeader` | Grouping by date is how a ledger is read, and it must not introduce a timezone. | `14 March 2026`. | Groups by the date **string**, never a parsed instant. |
| `TransactionRow` | One row, one fact; the amount treatment lives here so it cannot drift. | Payee or notes (whichever exists), category with parent path, account, signed amount, archived suffixes. | Uses `MoneyText` for sign and colour. Income and expense are distinguished by sign glyph **and** colour. |
| `RowActionsMenu` | Edit, duplicate and delete are per-row facts, and three buttons per row destroys the scan line. | `{…}` menu: Edit, Duplicate, Delete. | Edit → drawer. Duplicate → drawer pre-filled, dated today. Delete → optimistic removal + `UndoToast`. |
| `LoadMoreSentinel` | 10,000 transactions per year must not load as one page, and a "next page" button in a date-grouped list reads as an end. | Inline "loading more" row. | Intersection observer requests the next cursor page. Inserting a row at the top while scrolling must not skip or duplicate (acceptance criterion). |
| `TransactionDrawer` | Entry is the most frequent action in the product and must not cost a navigation. | Slide-over from the right (desktop) / bottom sheet (mobile): amount, kind, account, category, date, payee, notes. | Opened by `[+ New transaction]`, the `n` key, or a row click. `Esc` closes, `Cmd/Ctrl+Enter` saves. Save posts with a client-generated idempotency key; the server returns the row plus updated balances; list and totals refresh **without a full reload**. |
| `AmountInput` | The amount is why the user is here, and it is where precision is lost. | Large, autofocused, prominent field with the currency affixed. | Parses via `parseMoney`. Accepts a positive magnitude only - sign comes from `kind`. Over-precision is rejected, never silently rounded. Zero is rejected in Phase 1. |
| `KindToggle` | Sign is derived, never typed, which is what makes the ledger internally consistent (I7). | Income / Expense. | Sets the sign on save. Filters the category picker. |
| `CategoryPicker` | Filing is the step users skip, so it must be fast and never blocking. | Kind-filtered two-level tree with search; `Uncategorised` always present. | Falls back to `Uncategorised` so a transaction can never be saved without a category. Offers `InlineCategoryCreate` so a missing category does not end the entry. |
| `DateField` | Transaction dates are naive calendar dates (A6) and must not acquire a timezone. | Date input in workspace format. | Defaults to today in the workspace's locale; future dates permitted; dates before an account's `openingDate` permitted with an advisory. |
| `PayeeInput` / `NotesTextarea` | Payee is how a row is recognised later; notes carry the rest. | Single-line payee; notes with a 2,000-character cap. | Free text. Notes truncated in the list with a tooltip. |
| `BalanceDelta` | After a mutation the user must see the balance move, or they will not trust the write. | Affected account(s) before → after. | Returned by the mutation response. Two accounts when an edit changes the account. |
| `UndoToast` | Delete is immediate but forgiveness must be possible (FEAT-FIN-03 open question). | "Transaction deleted · Undo", 10-second countdown. | The row is removed optimistically; the delete is issued **only when the toast expires**. Undo cancels. |
| `LedgerEmptyState` | "Nothing recorded yet" and "nothing matches" are different problems with different fixes. | No transactions: onboarding prompt. Filters active: "no transactions match" + `(Clear filters)`. | Two visually distinct states, never one generic empty box. |
| `TableSkeleton` | Rows must not pop in and reflow the page. | 8 placeholder rows of the correct height. | Shown on first load and on filter change. |

**Interactions.** `n` opens create · `Esc` closes · `Cmd/Ctrl+Enter` saves · row click
edits · filters live in the URL · totals cover the whole filtered set, never the page.

**States.** Empty (no data) · Empty (no matches) · Loading (first load skeleton,
subsequent page inline) · Error (retry, table header retained) · Populated.

---

### 5.4 Accounts — `/accounts`

**Purpose.** Show every place money sits and the single figure that summarises them
(FEAT-FIN-01).

```
+--------------------------------------------------------------------------------+
|  Accounts                                                     [ + New account ] |
+--------------------------------------------------------------------------------+
|  Net worth   12,480.00          2 accounts excluded from net worth             |
+--------------------------------------------------------------------------------+
|  CURRENT                                                                       |
|   Main Cheque Account    Cheque account            12,480.00      (…)          |
|  SAVINGS                                                                       |
|   Emergency Fund         Savings                   8,200.00      (…)          |
|  CREDIT_CARD                                                                   |
|   Visa Platinum          Credit card            1,200.00 owed    (…)          |
|  [ archived ]  Old Cheque Account                  0.00          (…)          |
+--------------------------------------------------------------------------------+
```

| Component | Why it exists | Displays | Process flow |
|---|---|---|---|
| `NetWorthHeader` | One figure answers "where do I stand" across every account. | Net worth (`--text-figure-lg`), count of accounts excluded from net worth when non-zero. | A **single grouped aggregate** joined to the account list - never one query per account (stated requirement, not an optimisation). |
| `AccountGroup` | Grouping by type makes the shape of a person's money legible. | A type heading with its accounts. | Derived from the type enum order: CURRENT, SAVINGS, CREDIT_CARD, CASH, LOAN. |
| `AccountRow` | One account, one line: name, type, derived balance, state. | Name, `TypeBadge`, balance, archived indicator, `{…}` actions. | Row click → `/transactions` filtered to that account. Actions: Edit, Archive, View transactions. |
| `BalanceText` | Balances are derived and display-signed, and both rules must live in one place. | Derived balance, monospaced, `owed` for debt types. | `derived = openingBalanceMinor + SUM(transactions)`. Display flip for `CREDIT_CARD`/`LOAN`. No stored balance exists anywhere (I3). |
| `TypeBadge` | Type changes the sign treatment and the net-worth meaning, so it must be visible. | Localised type label ("Cheque account" for `en-ZA`). | Presentational. Localisation from `Workspace.locale`. |
| `ArchivedIndicator` | Archived accounts still hold history, so they appear but must read as inactive. | Muted row plus an "(archived)" suffix. | Presentational. Archived accounts are never offered in pickers for new transactions. |
| `AccountDrawer` | Create and edit share one surface so the fields cannot diverge. | Name, type, opening balance, opening date, include-in-net-worth. | Create → `POST`; edit → `PATCH`. Inline validation. Opening balance may be negative for a card already owed on. Shared with the setup wizard's first step. |
| `OpeningDateAdvisory` | Entering history backwards is a legitimate flow that must not be blocked. | Warning `Callout`: transactions before the opening date are permitted. | `--status-warning`, advisory only - never an error, never blocking. |
| `ArchiveConfirmDialog` | Archiving changes net worth, which must be stated before it happens. | Confirmation naming the balance and stating it will be excluded from net worth. | Confirm → `archivedAt` is set. Transactions are never touched (I10). Archive is the only path: **delete is not offered**, which is what makes referential integrity a non-issue. |
| `AccountsEmptyState` | With no accounts there is nowhere to record anything. | Prompt and `[Create your first account]`. | → `AccountDrawer`. Also shown after archiving the only account. |

**States.** Empty · Loading (skeleton rows) · Error (retry) · Populated · All-archived.

---

### 5.5 Categories — `/categories`

**Purpose.** Maintain the two-level taxonomy that every chart, budget and report is
built on (FEAT-FIN-02). If the tree is wrong, every downstream figure is wrong and the
user blames the chart.

```
+--------------------------------------------------------------------------------+
|  Categories                                                    [ + New parent ] |
+--------------------------------------------------------------------------------+
|  EXPENSE                                                                       |
|   v Food                                          4 children        (…)        |
|       Groceries            (…)                                                 |
|       Restaurants          (…)                                                 |
|   > Housing                                       3 children        (…)        |
|   · Uncategorised          system                     (disabled)               |
|  INCOME                                                                        |
|   > Salary                                        2 children        (…)        |
+--------------------------------------------------------------------------------+
```

| Component | Why it exists | Displays | Process flow |
|---|---|---|---|
| `CategorySection` | Income and expense are separate trees with the same shape. | Section heading, parent rows. | Split by `type`. |
| `CategoryTree` | Depth is exactly two, and the UI should make that structural rather than a rule. | Parents with children nested one level; no third-level affordance exists. | Selection/filter resolution walks at most one level. |
| `CategoryParentRow` | Parents carry the type, the rollup and the archive propagation. | Expand control, colour, icon, name, child count, `{…}`. | Expand → children. Actions: Add child, Edit, Archive. |
| `CategoryChildRow` | Children are where transactions are actually filed. | Colour, icon, name, `{…}`. | Actions: Edit, Archive. |
| `CategoryEditor` | One editor for both levels keeps type inheritance honest. | Name, type (parents only; **fixed** for children), parent (when editing a child), colour, icon. | A child's type is never an independent choice - it is the parent's type, which is what invariant I4 protects. |
| `ColourIconPicker` | Charts key off `Category.colour`, so it must be user-settable. | Swatch grid, icon key picker. | Icon is an **icon key, not an emoji** (glossary §4). |
| `ArchiveCategoryDialog` | Archiving a parent is a multi-row change that must be stated. | Confirmation naming how many children are affected. | Confirm → parent and **every child** archived in one transaction. Unarchive is the reverse. A child cannot be archived alone while its parent is active without an explicit warning. |
| `SystemCategoryGuard` | `Uncategorised` is undeletable and must never be offered for rename or archive. | Row rendered with controls **disabled, not hidden**. | Enforced again server-side, because a disabled control is not a guard. |
| `InlineCategoryCreate` | A missing category must not end a transaction entry. | Compact create form (name + parent) inside the picker. | Creates the child, returns it, and selects it without leaving the drawer. |
| `CategoryQuickAdd` | Categories are added most often while filing, which is on the ledger. | Same component, hosted in `CategoryPicker`. | Shared with this screen. |

**States.** Empty is not reachable because of seeding (a workspace without categories is
a broken workspace). Loading — skeleton tree. Error — retry.

---

### 5.6 Settings — `/settings`

**Purpose.** Everything about the workspace that is neither a figure nor a record
(FEAT-ACC-02), including the settings that change how every other screen behaves.

```
+--------------------------------------------------------------------------------+
|  Settings                                                                      |
+--------------------------------------------------------------------------------+
|  Workspace | Profile | Data | Sessions                                         |
+--------------------------------------------------------------------------------+
|  Workspace                                                                     |
|   Name              [ Ayford Household            ]                            |
|   Reporting currency[ ZAR v ]   (locked - transactions exist)                  |
|   Week starts on    [ Monday v ]                                               |
|   Date format       [ DD/MM/YYYY v ]                                           |
|   Locale            [ en-ZA v ]                                                |
|                                                    [ Cancel ]  [ Save ]        |
+--------------------------------------------------------------------------------+
```

| Component | Why it exists | Displays | Process flow |
|---|---|---|---|
| `SettingsNav` | Four unrelated concerns in one route need separation. | Section tabs/links: Workspace, Profile, Data, Sessions. | Section in the URL so it is linkable. |
| `WorkspaceSettingsForm` | Locale, week start and date format change how every date and figure renders elsewhere. | Name, currency, week start, date format, locale. | Save → `PATCH` → the shell re-renders date and money formatting for the whole app. |
| `CurrencyLockNotice` | Currency cannot change once a transaction exists (I12), and a silently disabled field is a support ticket. | The field disabled with the reason stated. | Enabled only while the workspace has zero transactions. |
| `ProfileSettingsForm` | Display name is presented throughout the app. | Display name; email shown read-only. | Credentials live in the auth provider, not in this table - email is informational here. |
| `DataSection` | D6 makes portability a shipped promise, and setup must be re-runnable. | Export (Phase 8, shown as coming), Re-run setup wizard. | Export → Phase 8. Re-run → `/setup` with an explicit intent flag. |
| `SessionsSection` | A financial app needs a way to end access. | Sign out; active sessions (later). | Sign out → clears the session cookie → `/login`. |
| `DangerZone` | Destructive, irreversible actions must be physically separated from routine settings. | Delete workspace, with typed confirmation. | Phase 9 / workspace deletion is out of Phase 1 scope; the section is planned, not built. |
| `SaveBar` | A settings form with no dirty indicator invites lost edits. | Appears when the form is dirty: `[Save]` `(Cancel)`. | Cancel restores last-saved values. `Cmd/Ctrl+Enter` saves. |

**States.** Loading, error (retry), saved confirmation, and "unsaved changes" when the
user navigates away.

---

## 6. Cross-cutting process flows

These are the flows that touch more than one screen. They are written out because they
are where feature documents overlap and where contradictions hide.

### F1 — Signup to first transaction (the two-minute criterion)

```
/signup → create User + Workspace + Membership + seeded categories   (one transaction)
        → /setup?step=1  currency          ← immutable once a transaction exists (I12)
        → /setup?step=2  first account     ← opening balance may be negative
        → /setup?step=3  trim seeded tree
        → onboardingCompletedAt set
        → /dashboard (empty state) → [+ New transaction] → drawer → save
        → balance appears, list appears, dashboard figures appear
```

Every step persists before advancing, so abandoning at step 2 resumes at step 2.

### F2 — Create a transaction

```
[+ New transaction] or `n`
  → TransactionDrawer opens, amount autofocused
  → parseMoney(amount) → positive magnitude; kind supplies the sign (I7)
  → category must be non-null (defaults to Uncategorised)
  → save (Cmd/Ctrl+Enter) → POST with client-generated idempotency key
      ├─ first request  → row created
      └─ repeat request → existing row returned, no duplicate
  → response carries the row AND the recomputed account balance(s)
  → list inserts the row in date order; TotalsStrip recomputes; BalanceDelta shows the move
  → drawer closes. No full page reload.
```

### F3 — Edit a transaction

```
Row click → drawer in edit mode
  → edit amount          → balance moves by the delta on the same account
  → edit account         → TWO balances returned: old decreases, new increases
  → edit date across a period boundary
                         → both periods' totals change, in the same month-scoped response
  → edit category        → dashboard breakdown changes on next load
  → archived category    → remains selectable for THIS row only, so an amount edit
                           does not silently recategorise a historical transaction
```

### F4 — Delete with undo

```
Delete → row removed optimistically → UndoToast (10s)
   ├─ Undo pressed      → row restored, nothing was sent
   └─ toast expires     → DELETE issued → balance recomputed → totals refreshed
```

### F5 — Drill-through and back

```
Dashboard slice / legend row / ranked row → /transactions?categoryId=…&from=…&to=…
Dashboard month bar                       → /transactions?from=…&to=…
Account row                               → /transactions?accountId=…
   → the ledger's TotalsStrip must equal the figure that was clicked (acceptance criterion)
```

This is the flow that proves the dashboard and the ledger share period resolution and
filter semantics. It is verified as a test, not assumed.

### F6 — Archive

```
Account archived
  → archivedAt set; transactions untouched (I10)
  → excluded from net worth and from pickers for new transactions
  → still included in every report that covers its history

Parent category archived
  → parent + all children archived in ONE transaction
  → transactions untouched
  → history still renders the category with an "(archived)" suffix
  → excluded from pickers, included in aggregates
```

### F7 — Dashboard load

Five fixed queries, issued in parallel, independent of period length and category count
(see §5.2). Nothing is fetched that the client then reduces.

---

## 7. State matrix

Every screen must satisfy this table. A screen missing a cell is not done.

| Screen | Empty | Loading | Error | Populated |
|---|---|---|---|---|
| Landing | n/a (static) | n/a | n/a | ✓ |
| Sign in / Sign up | ✓ form | submit-only spinner | inline, per cause | ✓ |
| Setup wizard | ✓ fresh | step skeleton | retry per step | ✓ resumed |
| Dashboard | ✓ no data · ✓ no activity in period | layout-matched skeleton | partial + retry | ✓ |
| Transactions | ✓ no data · ✓ no matches | skeleton · inline page load | retry, header kept | ✓ |
| Accounts | ✓ no accounts | skeleton rows | retry | ✓ |
| Categories | not reachable (seeded) | skeleton tree | retry | ✓ |
| Settings | n/a | form skeleton | retry | ✓ · dirty |

---

## 8. Gap analysis against the current code

| # | Current state | Needed | Action |
|---|---|---|---|
| G1 | **Resolved.** Tokens are light-first green (`#1f6f5c`) and now carry the full semantic set: money, status, lines, focus, tint, elevation and motion. | Light and green is the brand (D7). | Closed. `design-system.md` was corrected to match the code, not the reverse. |
| G2 | Primitives now include `MoneyText`, `Drawer`, `Table`, `ChartFrame`, `Select`, `DateField`, `FormField`, `EmptyState` and `Toast` alongside `Button`, `Input`, `Card`. | Still missing: the multi-select pickers (`AccountMultiSelect`, `CategoryMultiSelect`), `SegmentedControl`, `Badge`, `Tooltip`, `Menu`, `ConfirmDialog`, `Skeleton`. | Build in dependency order as screens need them. |
| G3 | `apps/web` routes: `/`, `/login`, `/dashboard` as placeholders. `/dashboard` now renders the money pipeline end to end. | Plus `/signup`, `/setup`, `/transactions`, `/accounts`, `/categories`, `/settings`. | Phase 1 build order in `phase-1-financial-core.md` §Build order. |
| G4 | No `CategoryPicker`, and no concrete chart (`ChartFrame` frames one). | Both, plus the Recharts decision. | Resolve design-system §14.1. |
| G5 | No app shell (no Sidebar / TopBar). | `AppShell` per §3. | Build with the first authenticated screen. |
| G6 | `packages/logic` has money and date helpers; no `categoryTree.ts`. | `categoryTree.ts` (Phase 1 deliverable) for rollup and descendant resolution. | Needed by `CategoryPicker`, category filter and the donut rollup. |
| G7 | Focus ring token now exists (`colours.focus`, used by `Table` rows and `Drawer`). | Contrast test and a `FormField` that centralises focus and error wiring. | design-system G6. |
| G8 | Tokens are duplicated between `tokens.ts` and `globals.css`. | Generated from one source. | design-system G2. |

---

## 9. Open questions

1. **Does `/` (landing) ship in Phase 0 or Phase 1?** Phase 0's deliverable is an empty
   protected page, not a marketing site. Recommendation: a minimal `/` in Phase 0, the
   real landing copy before public launch (Phase 8–9).
2. **Is the sidebar net-worth figure in scope for Phase 1?** It is cheap once the
   accounts aggregate exists, but it adds a query to every screen. Recommendation: yes,
   sourced from the same grouped aggregate, refreshed on mutation.
3. **Growth deltas on the KPI cards** (`+8.2% vs Feb`). Not in FEAT-FIN-04. Valuable,
   but it doubles query 1. Recommendation: defer unless the period comparison is cheap.
4. **Infinite scroll versus explicit pagination** on the ledger. FEAT-FIN-03 permits
   either. Recommendation: infinite scroll, because the ledger is browsed, not paged
   through - with a keyboard-accessible "load more" fallback.
5. **Where does duplicate land?** FEAT-FIN-03 says the create form pre-filled and dated
   today. Confirm it opens the drawer rather than saving immediately.
6. **Bottom sheet on mobile for the drawer.** Agreed in FEAT-FIN-03; confirm the
   breakpoint (recommendation: `< 768px`).
7. **`Uncategorised` renameability.** `feat-fin-02` says it cannot be renamed;
   `data-model.md` says the user can rename it. Contradiction - resolve before building
   the category editor. This is the same class of conflict as the `idempotencyKey` one
   already logged in the Prisma schema.
