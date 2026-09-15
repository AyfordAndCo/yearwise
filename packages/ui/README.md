# @yearwise/ui

Presentational primitives and design tokens for the Yearwise web app.

Everything here is **visual**. Nothing here fetches, queries or mutates. A component
receives data and callbacks through props and renders them.

- Visual system: [`docs/04-design/design-system.md`](../../docs/04-design/design-system.md)
- Component plan: [`docs/04-design/page-and-component-plan.md`](../../docs/04-design/page-and-component-plan.md)

---

## 1. Boundary rule

From [`docs/01-architecture/monorepo.md`](../../docs/01-architecture/monorepo.md):

| | |
|---|---|
| **May import** | `@yearwise/logic`, `@yearwise/types` |
| **May not import** | `@yearwise/database`, Prisma, or any data access |

`logic` is permitted because it is pure, framework-free and I/O-free. `MoneyText` uses
`formatMoney` from it so that no screen re-implements money formatting.

This package must never:

- Fetch data, call an API, or read a database.
- Import `@yearwise/database` or `@prisma/client`.
- Hold application state. It renders what it is given.

---

## 2. Consuming it

Consumed as **TypeScript source**, not a built artefact - the same convention as
`@yearwise/logic`. There is no build step.

```jsonc
// package.json
{
  "dependencies": { "@yearwise/ui": "workspace:*" }
}
```

The consumer's Next.js config must transpile it:

```ts
// next.config.ts
const nextConfig: NextConfig = {
  transpilePackages: ['@yearwise/ui', '@yearwise/logic'],
};
```

Components that use hooks carry a `'use client'` directive, so they can be rendered from
a server component without any extra wiring.

---

## 3. Theming

Wrap the app once. Every primitive reads its colours from context.

```tsx
import { ThemeProvider } from '@yearwise/ui';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-ZA">
      <body>
        <ThemeProvider defaultTheme="light">{children}</ThemeProvider>
      </body>
    </html>
  );
}
```

```tsx
import { useTheme } from '@yearwise/ui';

const { theme, colours, elevation, setTheme } = useTheme();
```

| Export | Returns |
|---|---|
| `theme` | `'light' \| 'dark'` |
| `colours` | The current theme's semantic colour set |
| `elevation` | The current theme's shadow values |
| `setTheme` | Switches theme. Light is the default (decision D7). |

`usePrefersReducedMotion()` reports the user's motion preference. Every animated
primitive consults it and collapses to a 1ms transition.

### 3.1 Tokens

`tokens` holds the raw scale. Reach for the semantic colour names, not the numbers.

```ts
import { tokens } from '@yearwise/ui';

tokens.colour.light.primary;   // '#1f6f5c'
tokens.colour.dark.moneyIn;    // '#4ade80'
tokens.spacing.md;             // '0.75rem'
tokens.radius.md;              // '0.375rem'
tokens.typeScale.base;         // '1rem'
tokens.elevation.light.floating;
tokens.motion.duration.base;   // '200ms'
```

**Colour roles.** Green means *interactive or brand*, never *money*. Money has its own
two tokens and always travels with a sign.

| Group | Tokens |
|---|---|
| Surfaces | `background` `surface` `raised` `overlay` |
| Text | `foreground` `muted` `disabled` |
| Lines | `border` `borderStrong` |
| Brand / interaction | `primary` `primaryHover` `primaryActive` `primaryContrast` `focus` `tint` |
| Money | `moneyIn` `moneyInDim` `moneyOut` `moneyOutDim` |
| Status | `info` `success` `warning` `danger` |

Scales: `radius` (`sm` `md` `lg` `full`), `spacing` (`xs` `sm` `md` `lg` `xl`),
`typeScale` (`xs` `sm` `base` `lg` `xl` `2xl`), `motion.duration`
(`instant` `fast` `base` `slow`), `motion.easing` (`out` `inOut`).

### 3.2 CSS variables

`apps/web/app/globals.css` restates the same values as CSS custom properties for
Tailwind. The two representations are hand-maintained today; keeping them in step is
required, and generating one from the other is tracked debt
(design-system section 12).

---

## 4. Components

### 4.1 `MoneyText`

The only sanctioned way to render money.

```tsx
<MoneyText amountMinor={2454354n} currency="ZAR" showSign />          {/* +24,543.54 */}
<MoneyText amountMinor={-2097200n} currency="ZAR" />                  {/* −20,972.00 */}
<MoneyText amountMinor={-120000n} currency="ZAR"
           accountType="CREDIT_CARD" owed />                          {/* 1,200.00 owed */}
```

| Prop | Type | Default | Notes |
|---|---|---|---|
| `amountMinor` | `bigint` | required | Signed minor units (A1) |
| `currency` | `string` | required | ISO-4217 |
| `locale` | `string` | `'en-ZA'` | Display only |
| `accountType` | `MoneyAccountType` | — | `CREDIT_CARD`/`LOAN` display flipped |
| `tone` | `'auto' \| 'neutral' \| 'in' \| 'out'` | `'auto'` | `auto` follows the displayed sign |
| `showSign` | `boolean` | `false` | Prefixes `+` on positive |
| `owed` | `boolean` | `false` | Appends " owed" for debt accounts |

Three rules are enforced here so no screen repeats them: formatting goes through
`formatMoney`; debt displays flipped; the sign glyph and the colour always agree, so
direction survives for a user who cannot distinguish the two colours. It also sets
`tabular-nums`, a `−` (U+2212) rather than a hyphen, and an `aria-label` that spells the
direction out.

### 4.2 `Drawer`

A modal slide-over with the full keyboard contract.

```tsx
<Drawer
  open={open}
  onClose={() => setOpen(false)}
  title="New transaction"
  description="Recorded against Main Cheque Account"
  side="right"                       // 'bottom' for the mobile sheet
  footer={<Button onClick={save}>Save</Button>}
>
  {/* fields */}
</Drawer>
```

| Prop | Type | Default |
|---|---|---|
| `open` | `boolean` | required |
| `onClose` | `() => void` | required |
| `title` | `string` | required |
| `description` | `string` | — |
| `side` | `'right' \| 'bottom'` | `'right'` |
| `children` | `ReactNode` | required |
| `footer` | `ReactNode` | — |

Behaviour: renders into a portal; `role="dialog"` with `aria-modal`; focus moves in on
open and is trapped; `Tab`/`Shift+Tab` cycle; `Escape` and overlay click close; focus
returns to whatever opened it; body scroll is locked. Animations honour reduced motion.

Screens pick `side` by breakpoint rather than the component guessing.

### 4.3 `Table`

Generic, presentational, and never fetching.

```tsx
<Table
  label="Transactions"
  rows={transactions}
  getRowKey={(row) => row.id}
  groupBy={(row) => row.dateLabel}          // ledger groups by date string, never an instant
  onRowActivate={(row) => openDrawer(row)}
  loading={isLoading}
  empty={<EmptyState title="No transactions match" />}
  columns={[
    { key: 'payee', header: 'Payee', render: (row) => row.payee },
    { key: 'category', header: 'Category', render: (row) => row.categoryName },
    {
      key: 'amount',
      header: 'Amount',
      align: 'right',
      render: (row) => <MoneyText amountMinor={row.amountMinor} currency="ZAR" />,
    },
  ]}
/>
```

| Prop | Type | Default | Notes |
|---|---|---|---|
| `columns` | `TableColumn<Row>[]` | required | `{ key, header, align?, width?, render }` |
| `rows` | `Row[]` | required | |
| `getRowKey` | `(row) => string` | required | |
| `label` | `string` | required | Visually hidden caption |
| `groupBy` | `(row) => string` | — | Renders a full-width group header |
| `onRowActivate` | `(row) => void` | — | Pointer + Enter/Space |
| `loading` | `boolean` | `false` | Renders `skeletonRows` skeleton rows |
| `skeletonRows` | `number` | `8` | |
| `empty` | `ReactNode` | — | Shown when there are no rows and not loading |

Rows with `onRowActivate` are focusable and carry a visible focus outline. The row
itself carries no ARIA `role` - a `role="button"` on a `tr` is invalid - so screens
needing an explicit affordance place a real control in a cell.

### 4.4 `ChartFrame`

Owns everything charts share, so charts are never themed per screen.

```tsx
<ChartFrame
  title="Expense breakdown"
  description="By parent category"
  state={state}                                   // 'ready' | 'loading' | 'empty' | 'error'
  onRetry={refetch}
  legend={legend}
  dataTable={{
    caption: 'Expenses by category',
    columns: ['Category', 'Amount', 'Share'],
    rows: [['Food', '4,120.00', '19.6%']],
  }}
>
  <MyChart aria-hidden="true" />
</ChartFrame>
```

| Prop | Type | Default |
|---|---|---|
| `title` | `string` | required |
| `description` | `string` | — |
| `legend` | `ChartLegendItem[]` | — |
| `children` | `ReactNode` | required |
| `dataTable` | `ChartDataTable` | required |
| `state` | `'ready' \| 'loading' \| 'empty' \| 'error'` | `'ready'` |
| `emptyMessage` | `string` | `'No activity in this period'` |
| `errorMessage` | `string` | `'This chart could not be loaded'` |
| `onRetry` | `() => void` | — |
| `minHeight` | `number` | `240` |

It is **chart-library agnostic**: it renders whatever it is given, so the Recharts
decision does not block it. Supply `aria-hidden="true"` on the chart itself when you pass
`dataTable`, so assistive technology reads the table once rather than both.

**A chart must always supply `dataTable`.** An accessible mirror is not optional.

### 4.5 `Select`

A single-choice control over a known, short option list.

```tsx
<Select
  value={accountType}
  onChange={(event) => setAccountType(event.target.value)}
  placeholder="Choose a type"
  options={[
    { value: 'CURRENT', label: 'Cheque account' },
    { value: 'SAVINGS', label: 'Savings' },
    { value: 'CREDIT_CARD', label: 'Credit card' },
  ]}
/>
```

| Prop | Type | Default |
|---|---|---|
| `options` | `{ value, label, disabled? }[]` | required |
| `placeholder` | `string` | — |

Deliberately a **native `select`**: it is keyboard- and screen-reader-correct for free
and works on touch without custom code. The chevron is a themed data-URI SVG, so the
control needs no icon dependency. Searchable and multi-select pickers are a different
problem and a different component (`Combobox`, `AccountMultiSelect`,
`CategoryMultiSelect`) - still to build.

### 4.6 `DateField`

A naive calendar date, as `YYYY-MM-DD`.

```tsx
<DateField value={date} onValueChange={setDate} min="2026-03-01" />
```

| Prop | Type | Notes |
|---|---|---|
| `value` | `string` | `YYYY-MM-DD` |
| `onValueChange` | `(value: string) => void` | |

**Never a `Date`, never a timestamp, never an epoch number.** Transaction dates have no
timezone (A6), and `new Date()` at this boundary is exactly the bug that decision exists
to prevent. A native date input already speaks and returns `YYYY-MM-DD`, so nothing is
parsed and nothing is converted.

### 4.7 `FormField`

Label, control, hint and error in one component.

```tsx
<FormField label="Payee" hint="Who was paid" error={errors.payee} required>
  {(field) => <Input {...field} value={payee} onChange={(e) => setPayee(e.target.value)} />}
</FormField>
```

| Prop | Type | Default |
|---|---|---|
| `label` | `string` | required |
| `children` | `(control: FormFieldControlProps) => ReactNode` | required |
| `hint` | `string` | — |
| `error` | `string` | — |
| `required` | `boolean` | `false` |

`children` is a **render prop**, not an element. It receives `{ id, 'aria-describedby',
'aria-invalid', 'aria-required' }` and you spread them onto the control. That is the only
way to guarantee the label, hint and error are linked on whatever control is used -
hand-wiring `aria-describedby` per screen is precisely the failure this component exists
to prevent.

It owns the accessibility contract: a visible label at all times (never
placeholder-as-label), `aria-describedby` linking both hint and error, `aria-invalid` on
failure, and `role="alert"` so a validation message is announced when it appears.

Works with `Input`, `Select` and `DateField`, all of which accept and spread `...rest`.

### 4.8 `EmptyState`

```tsx
{/* First run: there is nothing here yet, and the fix is an action. */}
<EmptyState
  variant="no-data"
  title="No transactions yet"
  description="Record your first one to see it here."
  action={<Button>Record a transaction</Button>}
/>

{/* Filtered to nothing: there is data, the filter excluded it. */}
<EmptyState
  variant="no-matches"
  title="No transactions match"
  description="Try widening the date range."
  action={<Button variant="secondary">Clear filters</Button>}
/>
```

| Prop | Type | Default |
|---|---|---|
| `title` | `string` | required |
| `description` | `string` | — |
| `action` | `ReactNode` | — |
| `icon` | `ReactNode` | — |
| `variant` | `'no-data' \| 'no-matches'` | `'no-data'` |

FEAT-FIN-03 requires these to be **different states that look different**. They are
separate variants rather than one padded box with different copy: `no-data` is a tinted,
bordered prompt; `no-matches` is an unstyled, dashed container. The two need different
actions and different emphasis.

### 4.9 `Toast` and `ToastRegion`

```tsx
<ToastRegion>
  {toasts.map((toast) => (
    <Toast
      key={toast.id}
      open
      onDismiss={() => dismiss(toast.id)}
      title="Transaction deleted"
      description="This cannot be undone after the timer."
      action={{ label: 'Undo', onClick: () => undo(toast.id) }}
      duration={10_000}
    />
  ))}
</ToastRegion>
```

| `Toast` prop | Type | Default |
|---|---|---|
| `open` | `boolean` | required |
| `onDismiss` | `() => void` | required |
| `title` | `string` | required |
| `description` | `string` | — |
| `tone` | `'info' \| 'success' \| 'warning' \| 'danger'` | `'info'` |
| `action` | `{ label, onClick }` | — |
| `duration` | `number` (ms; `0` = sticky) | `0` |

The toast owns its own timer and pause behaviour: the countdown **pauses while the
pointer or focus is inside it**, so an undo affordance can always be reached before the
deadline. Pausing restarts the full duration on resume, which is deliberately lenient.
`danger` renders `role="alert"`; everything else is `role="status"`.

The toast does **not** own a queue - which toasts exist is application state, and this
package holds none. `ToastRegion` is the fixed bottom-right region, kept separate because
a live region must exist in the DOM before its content changes for screen readers to
announce the change.

### 4.10 `Button`, `Input`, `Card`

| Component | Props |
|---|---|
| `Button` | `variant?: 'primary' \| 'secondary' \| 'ghost'` (default `primary`), plus `ButtonHTMLAttributes`. `type` defaults to `button`. |
| `Input` | `InputHTMLAttributes`. Full width, token-styled, focus-ringed. |
| `Card` | `HTMLAttributes<HTMLDivElement>`. `style` is merged, so callers can extend it. |

### 4.11 Shared control internals

Exported so application-level controls (a future `Textarea`, a date-range field) cannot
diverge from the built-in ones:

| Export | Purpose |
|---|---|
| `controlStyle(colours)` | The shared visual base for text-entry controls |
| `useControlFocus(colours)` | Focus state + ring style, and the `onFocus`/`onBlur` handlers |

`Input`, `Select` and `DateField` are all built on these. A divergent control is the most
visible kind of design-system failure, so the base lives in one place.

### 4.12 `Badge`

```tsx
<Badge tone="primary">Cheque account</Badge>
<Badge tone="warning" variant="solid">Archived</Badge>
```

| Prop | Type | Default |
|---|---|---|
| `tone` | `'neutral' \| 'primary' \| 'info' \| 'success' \| 'warning' \| 'danger'` | `'neutral'` |
| `variant` | `'subtle' \| 'solid'` | `'subtle'` |

A short status label. Not for money and not for actions - a badge that needs a click is a
`Button`. Use `solid` for one badge at a time.

### 4.13 `Skeleton`

```tsx
<Skeleton width="12rem" />
<Skeleton height="2rem" radius="md" />
```

| Prop | Type | Default |
|---|---|---|
| `width` | `string \| number` | `'100%'` |
| `height` | `string \| number` | `'0.75rem'` |
| `radius` | `'sm' \| 'md' \| 'lg' \| 'full'` | `'sm'` |

Shape it like the content it replaces. A skeleton that does not match the final layout is
worse than a spinner, because the page shifts as data lands. The shimmer keyframe
(`yw-shimmer`) is declared by the consuming app; without it the block still renders, it
just does not animate.

### 4.14 `SegmentedControl`

```tsx
<SegmentedControl
  label="Transaction kind"
  value={kind}
  onValueChange={setKind}
  options={[
    { value: 'ALL', label: 'All' },
    { value: 'INCOME', label: 'Income' },
    { value: 'EXPENSE', label: 'Expense' },
  ]}
/>
```

| Prop | Type | Default |
|---|---|---|
| `label` | `string` | required |
| `options` | `{ value, label, disabled? }[]` | required |
| `value` | `string` | required |
| `onValueChange` | `(value: string) => void` | required |
| `size` | `'sm' \| 'md'` | `'md'` |

A radio group, not a set of toggle buttons: `role="radiogroup"` with `role="radio"`,
`aria-checked`, arrow-key navigation and a single tab stop.

### 4.15 `Tooltip`

```tsx
<Tooltip content="Balances are derived, never stored">
  <Badge>Derived</Badge>
</Tooltip>
```

| Prop | Type | Default |
|---|---|---|
| `content` | `ReactNode` | required |
| `children` | `ReactNode` | required |
| `placement` | `'top' \| 'bottom'` | `'top'` |

Shown on hover **and** focus, so it is reachable by keyboard. The trigger is cloned to
receive `aria-describedby`, because an attribute on a wrapping span is not announced for
the control inside it. Never make a tooltip the only home for information a user needs -
it is unreachable on touch.

### 4.16 `Menu`

```tsx
<Menu
  label="Row actions"
  items={[
    { key: 'edit', label: 'Edit', onSelect: () => open(row) },
    { key: 'duplicate', label: 'Duplicate', onSelect: () => duplicate(row) },
    { key: 'delete', label: 'Delete', tone: 'danger', onSelect: () => remove(row) },
  ]}
/>
```

| Prop | Type | Default |
|---|---|---|
| `label` | `string` | required |
| `items` | `{ key, label, onSelect, tone?, disabled? }[]` | required |
| `trigger` | `ReactNode` | `⋯` |
| `align` | `'start' \| 'end'` | `'end'` |

Rendered into a portal with fixed positioning, because the ledger's rows live in a
scrolling, clipped container and an absolutely positioned menu would be cut off at the
table edge. `ArrowDown` opens, arrows and Home/End move within, `Escape` closes and
returns focus to the trigger, `Tab` closes, an outside click closes.

### 4.17 `ConfirmDialog`

```tsx
<ConfirmDialog
  open={confirming}
  onClose={() => setConfirming(false)}
  onConfirm={archive}
  title="Archive this account?"
  description="Its transactions stay in the ledger, but the balance stops counting toward net worth."
  confirmLabel="Archive"
  tone="danger"
/>
```

| Prop | Type | Default |
|---|---|---|
| `open` | `boolean` | required |
| `onClose` | `() => void` | required |
| `onConfirm` | `() => void` | required |
| `title` | `string` | required |
| `description` | `string` | — |
| `confirmLabel` | `string` | `'Confirm'` |
| `cancelLabel` | `string` | `'Cancel'` |
| `tone` | `'default' \| 'danger'` | `'default'` |

`role="alertdialog"`, because the user must respond before doing anything else. Cancel
renders first so it takes initial focus - the safe default when the action is
destructive. The modal contract comes from the same `useModal` as `Drawer`.

### 4.18 `MultiSelect`

```tsx
<MultiSelect
  label="Accounts"
  options={[{ value: 'a1', label: 'Main Cheque' }]}
  value={accountIds}
  onValueChange={setAccountIds}
  placeholder="All accounts"
/>
```

| Prop | Type | Default |
|---|---|---|
| `label` | `string` | required |
| `options` | `{ value, label, depth?, disabled? }[]` | required |
| `value` | `string[]` | required |
| `onValueChange` | `(value: string[]) => void` | required |
| `placeholder` | `string` | `'All'` |
| `maxLabels` | `number` | `2` |

Native checkboxes inside a `<label>`, so selection is keyboard- and screen-reader-correct
without custom key handling. The trigger is a single button that summarises the selection
as text - removable chips are `FilterChip`'s job, because a button containing buttons is
invalid. `depth: 1` indents an option under the one above it.

### 4.19 `AccountMultiSelect` and `CategoryMultiSelect`

Thin domain adapters over `MultiSelect`, taking structural props so they need no domain
type from `@yearwise/types` (which is deliberately still empty).

```tsx
<AccountMultiSelect accounts={accounts} value={accountIds} onValueChange={setAccountIds} />
<CategoryMultiSelect categories={categories} value={categoryIds} onValueChange={setCategoryIds} />
```

Two rules live here rather than in the generic primitive:

- **Archived accounts stay selectable** in the account filter, labelled `(archived)`.
  Filtering to an archived account is how a user reads its history, which archiving
  preserves (A4). The "never offered for a new transaction" rule applies to entry forms.
- **`CategoryMultiSelect` does not rewrite `value`** to include children. The selection is
  what the user made; the expansion happens in the query layer through
  `resolveCategoryIds` from `@yearwise/logic`, which is what makes "Food" match Food and
  every child of Food (FEAT-FIN-03).

---

## 5. Conventions

1. **Never render money by hand.** Use `MoneyText`. Never call `Intl`,
   `toFixed` or `toLocaleString` on a money value in a component.
2. **Never signal with colour alone.** Pair it with a sign, a glyph or a label.
3. **Never hardcode a colour.** Take it from `useTheme()` or `tokens`.
4. **Never style via CSS files.** Primitives style inline so the package needs no
   build step and no CSS loader. Pseudo-class states (`:hover`, `:focus-visible`) are
   therefore driven by React state - see the limitation in section 7.
5. **Always keep targets at least 44×44** and focus visible.
6. **Always honour reduced motion** through `usePrefersReducedMotion`.

---

## 6. Adding a component

1. Check it is not already in the inventory in
   [`docs/04-design/design-system.md`](../../docs/04-design/design-system.md) section 11.
2. Confirm it belongs here rather than in `apps/web`:
   *low-level visual building block → here; page or app structure → `layout`; reusable
   but application-specific → `common`.*
3. Write `src/<name>.tsx`. Add `'use client'` only if it uses hooks, state or events.
4. Props in, callbacks out. No data access, no application state.
5. Style from `useTheme()` and `tokens`. No hardcoded values.
6. Export the component and its prop types from `src/index.ts`.
7. Add it to the catalogue in section 4 of this README.
8. Add a test under `tests/` covering the rule it exists to enforce, not just that it
   renders (section 7).
9. Verify: `pnpm --filter @yearwise/ui typecheck && pnpm --filter @yearwise/ui lint && pnpm --filter @yearwise/ui test`.

---

## 7. Testing

`vitest` + Testing Library, in **jsdom**, with React hook linting on.

```bash
pnpm --filter @yearwise/ui test          # once
pnpm --filter @yearwise/ui test:watch    # watch
```

`vitest.config.ts` sets `environment: 'jsdom'` and compiles JSX through esbuild with the
automatic runtime, so no Babel or React plugin is needed. `tests/setup.ts` registers the
jest-dom matchers and calls `cleanup()` after each test - globals are off, so Testing
Library's automatic cleanup does not register itself, and without it every render leaks
into the next test.

### What is covered, and why these three

| File | Covers |
|---|---|
| `tests/money-text.test.tsx` | The minus sign is U+2212; the debt flip renders a card balance as positive and "owed"; the tone mapping for in/out/zero; an explicit tone wins; the `aria-label` states direction; digits survive past 2^53. |
| `tests/drawer.test.tsx` | Dialog semantics, `Escape`, overlay click, focus moves in, an `autoFocus`ed field is not overridden, the trap wraps in both directions, focus returns to the opener, body scroll is locked and released. |
| `tests/table.test.tsx` | Header and row counts, right-alignment, one group header per group (not per row), group header spans every column, skeleton rows while loading, the empty slot only when not loading, click and Enter/Space activation, rows focusable only when activatable. |

These are the three highest-risk behaviours in the package: money rendered wrong is the
product's worst defect, a broken focus trap locks a keyboard user inside a drawer, and a
table that groups per row instead of per group quietly misreads the ledger.

### Writing a test

```tsx
import { render, screen } from '@testing-library/react';
import { ThemeProvider } from '../src/theme';

render(<ThemeProvider>{ui}</ThemeProvider>);
```

Two rules:

1. **Always wrap in `ThemeProvider`** - every primitive reads colours from context and
   throws without it.
2. **Never assert an exact `Intl` string.** `formatMoney` output varies with the ICU
   build, which is why the logic package asserts digits only. Assert digits, signs, tone
   and structure - the things that are actually rules.

Prefer `fireEvent.keyDown` over `userEvent.tab()` for the focus trap: user-event computes
its own focusable set, which need not agree with ours, so it can mask a regression.

---

## 8. Known limitations

| # | Limitation | Consequence |
|---|---|---|
| L1 | Styling is inline, so `:hover` and `:focus-visible` are driven by React state. | Hover and focus are applied via `onMouseEnter`/`onFocus` rather than CSS, so a focus ring appears on pointer focus too. A CSS layer with `data-*` hooks is the fix if that matters. |
| L2 | Test coverage is three components deep. | `MoneyText`, `Drawer` and `Table` are covered. `Toast` timing, `Menu` keyboard navigation, `ConfirmDialog`, `FormField` wiring and the multi-selects are not. |
| L3 | Form primitives are partial. | `Select`, `FormField` and `DateField` exist. `Combobox`, `Checkbox`, `Radio`, `Switch`, `Textarea` and `DateRangeField` are planned (design-system section 11) and not built. `SegmentedControl` and `Badge` are built. |
| L4 | Tokens are duplicated between `tokens.ts` and `globals.css`. | The two can drift. Generate one from the other in Phase 1. |
| L5 | No chart implementations. | `ChartFrame` frames a chart; `DonutChart` and `BarChart` do not exist yet, pending the charting-library decision. |
| L6 | Contrast ratios are intended, not measured. | Add a token contrast test that fails the build (design-system G6). |
| L7 | The `Skeleton` shimmer depends on a keyframe the app declares. | `packages/ui` cannot declare CSS keyframes, so `yw-shimmer` lives in `apps/web/app/globals.css`. Without it the skeleton renders static. |
| L8 | `Menu` and `MultiSelect` position by measuring on open only. | They do not reposition on scroll or resize while open. Acceptable for Phase 1; a floating-position library is the fix if it becomes visible. |
