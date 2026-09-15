# Design System

Status: Draft
Applies to: `apps/web`, `packages/ui`
Sources: `docs/00-product/decisions.md` (D7), `docs/00-product/glossary.md`,
`docs/02-phases/phase-1-financial-core.md`, `docs/03-features/feat-fin-0*.md`

---

## 1. Why this document exists

The product's whole claim is that a number can be trusted. A user who cannot read a
figure at a glance, or who misreads a sign, does not file a bug - they stop believing
the ledger and leave. So the visual system here is not decoration around the product.
It is the last inch of the correctness chain that starts in `packages/logic`.

Two consequences run through everything below:

- **Figures are the interface.** Typography, alignment and colour exist first to make
  a number unambiguous, and only second to make it pretty.
- **Nothing encodes meaning in colour alone.** Colour is always a second signal behind
  a glyph, a sign, a label or a position.

---

## 2. Brand direction

**Light, green, quiet.**

The product was previously a Google Sheets template. A spreadsheet reads as a tool you
operate; this should read as a position you hold. A light, near-white surface keeps the
ledger dense and legible for long sessions, and a single deep green accent gives the
product a mark that survives being screenshotted into a group chat without shouting.

| Decision | Choice | Rationale |
|---|---|---|
| Base theme | Light-first | The default and the brand (D7). A ledger is read in daylight, at a desk, for longer than most screens. |
| Accent | One green | A single accent, used sparingly, is what separates this from a generic dashboard. Deep green reads as money without being a novelty colour. |
| Secondary theme | Dark, shipped | Phase 0 requires a dark theme, so it ships as a full token swap. Light is the default. |
| Density | Dense but airy | Desktop-first (D3). The ledger is a table, not a card wall. |
| Personality | Warm neutrals, sharp corners, serif display | Warmth stops white feeling clinical. Sharp-ish radii read financial rather than playful. |

**What this deliberately is not.** Light does not mean a generic white SaaS dashboard
with a blue primary. Section 13 lists the patterns we refuse.

---

## 3. Design principles

1. **The figure is the interface.** Every screen answers one money question in the first
   glance. Chrome is subordinate to the number.
2. **Evidence over reassurance.** Where a figure is derived, the path to the rows behind
   it is one click away. The dashboard never asks to be trusted.
3. **Calm by default, loud only when it matters.** One accent. Red is reserved for
   money out and destructive actions, so when it appears it means something.
4. **Keyboard-complete.** Every action reachable without a mouse: `n` to add, `Esc` to
   close, `Cmd/Ctrl+Enter` to save, arrows in menus, focusable table rows.
5. **Zero states are designed, not empty.** Empty, loading and error are first-class
   states with their own copy and layout. A zeroed chart over no data is a lie.
6. **Density without clutter.** High information density, generous line-height, strict
   alignment. Dense is not cramped.

---

## 4. Colour

Every value below is the literal value in `packages/ui/src/tokens.ts`. That file is the
source of truth; this table documents it.

### 4.1 Surfaces

| Token | Light (default) | Dark | Use |
|---|---|---|---|
| `background` | `#ffffff` | `#101110` | App background |
| `surface` | `#f7f7f5` | `#1a1b1a` | Cards, panels, table headers |
| `raised` | `#ffffff` | `#232522` | Drawers, popovers, menus |
| `overlay` | `rgba(26,26,26,0.45)` | `rgba(0,0,0,0.60)` | Modal scrim |

Light uses a warm off-white for `surface` rather than pure white, so a card reads as a
panel against the page without needing a heavy border.

### 4.2 Foreground

| Token | Light | Dark | Use |
|---|---|---|---|
| `foreground` | `#1a1a1a` | `#f2f2ef` | Body, figures, headings |
| `muted` | `#6b6b6b` | `#9a9a94` | Labels, captions, table meta |
| `disabled` | `#a3a3a0` | `#5e605c` | Disabled controls |

### 4.3 Lines

| Token | Light | Dark | Use |
|---|---|---|---|
| `border` | `#e2e2dd` | `#2b2c2a` | Default hairlines, table rules |
| `borderStrong` | `#cbc8bd` | `#3d3f3d` | Header rules, focused containers |

### 4.4 Green — brand and interaction

Green means **interactive or brand**. It never means money.

| Token | Light | Dark | Use |
|---|---|---|---|
| `primary` | `#1f6f5c` | `#3a9b83` | Primary buttons, active nav |
| `primaryHover` | `#185a4a` | `#4bb394` | Hover |
| `primaryActive` | `#114438` | `#2d7d69` | Pressed |
| `primaryContrast` | `#ffffff` | `#0b0c0b` | Text on a green fill |
| `focus` | `#1f6f5c` | `#3a9b83` | Focus ring |
| `tint` | `rgba(31,111,92,0.10)` | `rgba(58,155,131,0.16)` | Selected row, active filter chip |

### 4.5 Money semantics

The sign convention is fixed by A2: positive is money in. The UI must be readable
without colour, so colour is paired with a sign glyph and the stored sign.

| Token | Light | Dark | Use |
|---|---|---|---|
| `moneyIn` | `#1e8449` | `#4ade80` | Income, positive delta |
| `moneyInDim` | `rgba(30,132,73,0.10)` | `rgba(74,222,128,0.14)` | Income tint fills |
| `moneyOut` | `#c0392b` | `#f87171` | Expenses, negative delta |
| `moneyOutDim` | `rgba(192,57,43,0.10)` | `rgba(248,113,113,0.14)` | Expense tint fills |

`moneyIn` is a distinctly purer green than `primary`, which is teal-leaning, so a green
button and a green income figure are not mistaken for the same signal. Both are always
accompanied by a sign.

Debt balances (`CREDIT_CARD`, `LOAN`) are stored negative and displayed flipped, with
the word **owed** attached (glossary §3). The flip lives in `MoneyText` and is never
re-implemented per screen.

### 4.6 Status

| Token | Light | Dark | Use |
|---|---|---|---|
| `info` | `#1d6fb8` | `#6fa8dc` | Neutral notices |
| `success` | `#1e8449` | `#4ade80` | Confirmation |
| `warning` | `#9a6212` | `#d9a441` | Advisories, e.g. a transaction before `openingDate` |
| `danger` | `#b03a2e` | `#e0735c` | Destructive confirmations, validation failure |

Each status tone also has a `…Dim` variant (`infoDim`, `successDim`, `warningDim`,
`dangerDim`) at 10–16% opacity, for the subtle `Badge` background. `tint` is the primary
tone's dim variant.

`warning` is a dark amber on light specifically so it passes contrast as text. It is
deliberately not the accent green, so an advisory never reads as a primary action.

### 4.7 Contrast

Every pairing below must pass **WCAG 2.2 AA** and be asserted in a test, not eyeballed:

- `foreground`, `muted` on `background` and `surface` — body text ≥ 4.5:1
- `primary` on `background` — ≥ 4.5:1
- `primaryContrast` on `primary` — ≥ 4.5:1
- `moneyIn`, `moneyOut` on both surface tones — ≥ 4.5:1
- `borderStrong` — ≥ 3:1 where it delimits an interactive control
- Focus ring against both the control and its background — ≥ 3:1

The values above are the intended set. The exact ratios are to be generated and frozen
by a contrast test rather than transcribed here, where they would rot.

### 4.8 Theme mechanism

Tokens are CSS custom properties, consumed three ways:

1. `packages/ui/src/tokens.ts` — the JS source, for primitives that style inline.
2. `apps/web/app/globals.css` — the CSS variable declaration, for Tailwind.
3. `apps/web/tailwind.config.ts` — maps the variables to utilities.

A component never contains a raw hex value. `:root` holds light; `.dark` overrides it.

`tokens.ts` and `globals.css` duplicate these values by hand today. That duplication is
the one piece of debt this document creates, and Phase 1 should collapse it by
generating one from the other. See section 12.

---

## 5. Typography

### 5.1 Families

| Role | Family | Why |
|---|---|---|
| Display / headings | **Fraunces** (variable, OFL) | A serif with real personality and an optical-size axis. Gives the product a voice a grotesque cannot, and is not the default AI-safe choice. |
| UI / body | **IBM Plex Sans** (OFL) | Engineered, slightly technical, excellent at small sizes. Reads as infrastructure, which is what a ledger is. |
| Figures in tables | **IBM Plex Mono** (OFL) | Monospaced so decimal points align down a column without hacks. |

Self-host through `next/font` — no runtime request to a third party, no layout shift.

### 5.2 Scale

Values are `tokens.typeScale`.

| Token | Size | Use |
|---|---|---|
| `xs` | `0.75rem` | Field and section labels, uppercase |
| `sm` | `0.875rem` | Table meta, help text |
| `base` | `1rem` | Body, default |
| `lg` | `1.125rem` | Card title |
| `xl` | `1.5rem` | Page and drawer title |
| `2xl` | `2rem` | Display, KPI value, net worth |

### 5.3 Rules

- **Numerals are tabular everywhere a figure appears.** `font-variant-numeric:
  tabular-nums lining-nums`. Proportional digits make a column of money unreadable.
  `MoneyText` sets this for you.
- **No count-up animation.** A figure that animates from `0` implies it is still
  settling. Money snaps.
- **Uppercase is reserved for labels**, never for figures, names or categories.

---

## 6. Space, radius, elevation

**Space** — `tokens.spacing`, a 4px base: `xs 0.25` · `sm 0.5` · `md 0.75` · `lg 1` ·
`xl 1.5` rem. Layout gutters use 24 (mobile) / 32 (desktop). Table row height 44px.

**Radius** — `tokens.radius`, deliberately restrained:

| Token | Value | Use |
|---|---|---|
| `sm` | `4px` | Badges, tags, inputs |
| `md` | `6px` | Buttons, cards, charts |
| `lg` | `8px` | Drawers, dialogs, sheets |
| `full` | `9999px` | Avatars, legend dots, pills only |

**Elevation** — `tokens.elevation`:

| Token | Light | Dark |
|---|---|---|
| `raised` | `0 1px 2px rgba(16,24,40,0.06)` | `0 1px 2px rgba(0,0,0,0.40)` |
| `floating` | `0 8px 24px rgba(16,24,40,0.12)` | `0 8px 24px rgba(0,0,0,0.45)` |

On light, elevation is a real shadow. On dark it is mostly the `raised` surface plus a
border, because shadows barely register against a dark background.

---

## 7. Motion

Purposeful and short. Motion explains where something came from; it never performs.

| Token | Value |
|---|---|
| `motion.duration.instant` | `80ms` |
| `motion.duration.fast` | `140ms` |
| `motion.duration.base` | `200ms` |
| `motion.duration.slow` | `320ms` |
| `motion.easing.out` | `cubic-bezier(0.16, 1, 0.3, 1)` |
| `motion.easing.inOut` | `cubic-bezier(0.4, 0, 0.2, 1)` |

Named uses: drawer slide `base`/`out`; toast enter `fast`; row insert fade + 4px rise
`base`; menu open `fast`; skeleton shimmer 1.4s loop.

**`prefers-reduced-motion: reduce` collapses every duration to 1ms.** This is enforced
twice: in `usePrefersReducedMotion` for the primitives, and in a global CSS block in
`globals.css` so a third-party chart cannot animate past the user's preference.

---

## 8. Iconography

One set only: **Lucide**, `1.5px` stroke, sized `16 / 20 / 24`.

- Icons never carry meaning alone - always adjacent to a label, or with an
  `aria-label`.
- Category icons are an **icon key**, not an emoji (glossary §4 and the `Category.icon`
  column both require this).
- Money direction uses a glyph (`+` / `−`) in addition to colour.

---

## 9. Data display conventions

These are binding, because each one exists to prevent a specific, observed defect.

### 9.1 Money

- Render **only** through `MoneyText`, which formats through `formatMoney` from
  `@yearwise/logic`. A component must never call `Intl.NumberFormat`, `toFixed` or
  `toLocaleString` on a money value directly.
- The stored sign is the truth. `displayMinor = type ∈ {CREDIT_CARD, LOAN} ? −stored :
  stored` (FEAT-FIN-01). Applied in `MoneyText`, nowhere else.
- **Right-align, tabular.** Decimal points line up down a column.
- Negative uses the minus sign `−` (U+2212), not a hyphen.
- Overdrawn and debt balances read as an amount **owed**, never as a bare negative.
- A large value shrinks rather than wraps (FEAT-FIN-04 edge case).

### 9.2 Ratios and percentages

- Percentages to one decimal place.
- Chart percentages use **largest-remainder allocation** so a legend sums to exactly
  `100.0`, never `99.9` (FEAT-FIN-04).
- A ratio with a zero denominator renders an **em dash** `—`. Never `NaN`, `Infinity`
  or `0%`. This is the single most common dashboard defect in this category.

### 9.3 Zero versus empty

| Situation | Render |
|---|---|
| Real zero in the period | `0.00` |
| No transactions at all in the workspace | Onboarding empty state, never a zeroed dashboard |
| Period with no activity | A "no activity in this period" panel, never an empty axis frame |
| Loading | Skeleton matching the final layout, so nothing shifts |

`ChartFrame`'s `empty` state exists for exactly the third row of that table.

### 9.4 Charts

- One frame (`ChartFrame`) owns title, description, legend, the four states and the
  screen-reader table. Screens compose it; screens never theme it.
- Categorical colours come from `Category.colour` when set, falling back to a
  green-anchored, colour-blind-safe palette assigned by rank (so the same category is
  the same colour across charts in a session).
- Every chart supplies a `dataTable`, and the chart itself is marked `aria-hidden` so
  assistive technology reads the figures once.
- Keyboard focus reaches every interactive mark, with a visible focus ring and a tooltip
  showing the exact amount (FEAT-FIN-04 acceptance criterion).
- No 3D, no gradients, no dual axes.

---

## 10. Accessibility — WCAG 2.2 Level AA

| Requirement | Commitment |
|---|---|
| Contrast | All text pairings ≥ 4.5:1 (3:1 for ≥ 24px or bold ≥ 19px). Asserted in a test. |
| Focus | Always visible: 2px `focus` ring, 2px offset, never removed. |
| Target size | ≥ 24×24 (2.2 minimum); 44×44 for primary controls and all touch targets. |
| Keyboard | `n` new transaction · `Esc` close · `Cmd/Ctrl+Enter` save · arrows in menus, trees and charts · `Tab` order follows visual order · table rows activate on Enter/Space. |
| Dialogs | `role="dialog"`, `aria-modal`, focus moved in and trapped, focus restored on close, body scroll locked. Implemented in `Drawer`. |
| Forms | Visible labels at all times. Errors linked by `aria-describedby`, announced on submit. Never placeholder-as-label. |
| Signalling | Never colour alone. Money carries a sign glyph and an `aria-label` stating direction; charts carry a data table; status carries an icon. |
| Motion | `prefers-reduced-motion` honoured in the primitives **and** in global CSS. |
| Money for AT | `MoneyText` sets an `aria-label` such as `−342.00, out`, so direction survives being read aloud. |
| Zoom | Usable to 200% without loss of function or horizontal scroll on the ledger. |

---

## 11. Component inventory

Three layers, matching the decision rule *low-level visual → `ui`; page/app structure →
`layout`; reusable but application-specific → `common`*.

### 11.1 `packages/ui` — primitives

**Built:** `ThemeProvider` · `useTheme` · `usePrefersReducedMotion` · `useModal` ·
`getFocusable` · `controlStyle` · `useControlFocus` · `Button` · `Input` · `Select` ·
`DateField` · `FormField` · `SegmentedControl` · `MultiSelect` · `AccountMultiSelect` ·
`CategoryMultiSelect` · `Badge` · `Card` · `MoneyText` · `Tooltip` · `Menu` · `Drawer` ·
`ConfirmDialog` · `Table` · `ChartFrame` · `EmptyState` · `Skeleton` · `Toast` ·
`ToastRegion`

**Planned:** `IconButton` · `Textarea` · `Combobox` · `Checkbox` · `Radio` · `Switch` ·
`Label` · `HelpText` · `ErrorText` · `DateRangeField` · `Chip` · `Divider` · `Popover` ·
`Spinner` · `Progress` · `Avatar` · `Tabs` · `Pagination` · `Callout` · `PercentText` ·
`DonutChart` · `BarChart`

Every primitive Phase 1 names now exists. A generic `Dialog` is not planned: `Drawer` and
`ConfirmDialog` cover the two modal shapes the product has, and both share one focus trap
through `useModal`, so a third modal would be a third chance to get the trap wrong.
`DataTable` is `Table` plus the ledger's pagination and grouping; grouping is built,
pagination is the caller's cursor. See
[`packages/ui/README.md`](../../packages/ui/README.md) for props and usage.

### 11.2 `apps/web` — `common/` (reusable, application-aware)

`PageHeader` · `FilterBar` · `FilterChip` · `PeriodSelector` · `KpiCard` ·
`TotalsStrip` · `StatePanel` · `ConfirmDialog` · `ChartLegend` · `AccountPicker` ·
`CategoryPicker` · `TransactionRow` · `AccountRow` · `CategoryRow` · `UndoToast`

### 11.3 `apps/web` — `layout/`

`AppShell` · `Sidebar` · `TopBar` · `PageContainer` · `AuthLayout` · `WizardShell`

---

## 12. Known debt and gaps

| # | Gap | Effect | Action |
|---|---|---|---|
| G2 | Tokens are hand-duplicated between `packages/ui/src/tokens.ts` and `apps/web/app/globals.css`. | Two sources of truth drift silently. | Phase 1: generate the CSS variables from the JS tokens (or vice versa) in the build. |
| G3 | Phase 1's stated primitive set is complete. `Combobox`, `Checkbox`, `Radio`, `SegmentedControl`, `Badge`, `Tooltip`, `Menu` and `Dialog` are not built. | Several components in section 11.2 depend on them. | Build in dependency order as screens need them, not speculatively. |
| G4 | `ChartFrame` frames a chart, but `DonutChart` and `BarChart` do not exist. | The dashboard cannot be built yet. | Choose the charting library (section 14), then build the two charts against `ChartFrame`. |
| G5 | **Resolved for `packages/ui`.** `vitest` + Testing Library in jsdom, with React hook linting on both `packages/ui` and `apps/web`. 107 primitive tests plus 105 domain tests in `packages/logic`. | `apps/web` has no harness of its own, so the accounts flow is verified by typecheck and a production build. | Add a jsdom harness to `apps/web` with the second screen. The conventions are in `packages/ui/README.md` section 7. |
| G6 | Contrast ratios are target values, not measured. | A pairing could fail AA unnoticed. | Add a token contrast test that fails the build. |
| G7 | Inline styling means `:hover`/`:focus-visible` are React-state driven. | A focus ring also appears on pointer focus. | Acceptable; revisit with a CSS layer if it becomes noticeable. |

`monorepo.md` was updated so `packages/ui` may import `logic` - `MoneyText` owns money
formatting, and `logic` is pure and I/O-free, so the presentational boundary holds.

---

## 13. Anti-patterns — what we do not ship

Explicitly refused, so they are not re-proposed:

- Purple-to-blue gradient defaults, gradient meshes, "glassmorphism" panels.
- More than one accent colour competing with green.
- Scroll-triggered or entrance animation on content the user came to read.
- Count-up animation on money.
- A hero that is centred text over a stock gradient.
- Rounded corners on things that should be square (tables, figure blocks).
- Emoji as category icons.
- Colour as the only signal for in/out, up/down, on/off.
- Placeholder-as-label forms.
- Spinners where a layout-matched skeleton belongs.
- Zeroed charts, `0.00` totals or `0%` rates standing in for "no data".
- Fake demo data in an empty state.

---

## 14. Open questions

1. **Charting library.** `tech-stack.md` names Recharts. `ChartFrame` is deliberately
   library-agnostic, so this does not block it. Recharts renders SVG, which makes
   keyboard-focusable marks and a screen-reader fallback achievable; a canvas library
   does not. Confirm Recharts, or choose an accessible alternative.
2. **Typeface hosting.** Fraunces and IBM Plex are both OFL, so self-hosting is
   unencumbered. Confirm `next/font` self-hosting for both.
3. **Does the dark theme need to be offered in the UI?** The tokens exist and
   `setTheme` works, but no control surfaces it. Decide whether Phase 1 exposes a
   toggle or keeps dark as a future option.
4. **Mobile navigation.** Bottom tab bar versus a drawer behind a top-bar control. The
   ledger is desktop-first (D3), but the dashboard is the screen most likely to be
   opened on a phone.

---

## 15. Next step

`docs/04-design/page-and-component-plan.md` applies this system screen by screen:
every component, why it exists, what it displays, and its process flow.
