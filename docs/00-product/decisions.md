# Decision Log

Status: Approved

All D-series and A-series entries below were **Accepted** on 2026-09-14. The O-series open decisions remain genuinely open.

Two families: **D-n** product decisions, **A-n** architecture decisions. Once a decision is `Accepted` it is not re-litigated in conversation - it is superseded by a new entry that references the old one.

Status values: `Proposed` | `Accepted` | `Superseded by D-x` | `Rejected`.

---

## Product decisions

### D0 - Product name: Yearwise
**Status:** Accepted
**Decision:** The product is **Yearwise**. Repository `AyfordAndCo/yearwise`. Package scope `@yearwise/*`.
**Rationale:** Confirmed by the owner. The original spreadsheet product used the same spelling, so the name stays recognisable to existing customers while the repository has been renamed to match.
**Consequence:** Every package scope, domain and Stripe product uses `yearwise`.

### D1 - Positioning: finance-first, life OS second
**Status:** Accepted
**Decision:** Build the financial engine first (accounts, ledger, budgets, debt, savings). Tasks, habits and meals follow as independent modules.
**Rationale:** The original product is marketed on the finance engine. Tasks and habits are retention features, not acquisition features. Building all five modules at once is the most common way projects of this scope die.
**Reversal cost:** Low. It is a sequencing choice, not a structural one.

### D2 - Business model: freemium, then subscription
**Status:** Accepted
**Decision:** Move away from the one-time purchase model of the spreadsheet.
**Rationale:** A hosted application has ongoing per-user costs (database, storage, backups, email). A one-time payment cannot fund them.
**Consequence:** "One file. One payment. Yours to keep." is a promise the original makes and we cannot copy verbatim. We will need to replace it with a data-portability promise instead. See D6.
**Reversal cost:** Low before billing is built, high after.

### D3 - First surface: desktop-first responsive web
**Status:** Accepted
**Decision:** Web application designed for a desktop viewport, responsive down to mobile but not mobile-optimised in early phases. Native mobile deferred to Phase 9.
**Rationale:** Transaction entry, budget setup and debt modelling are high-density tasks that suit a large viewport. The original's greatest weakness is that its primary surface is a spreadsheet on a phone.
**Reversal cost:** Medium. Affects every screen design.

### D4 - Tenancy: single user, but modelled as workspaces
**Status:** Accepted
**Decision:** Phase 1 supports one user per workspace. Every table nonetheless carries `workspaceId`.
**Reversal cost:** Low now, very high later. This is why it is being decided now.

### D5 - Currency: single reporting currency per workspace
**Status:** Accepted
**Decision:** One ISO-4217 currency per workspace. No multi-currency accounts, no FX revaluation. All money stored as an integer count of minor units.
**Rationale:** The original advertises "currency-neutral", which means *pick your own symbol*, not *hold multiple currencies*. Multi-currency is a large, distinct product. Being explicit prevents users assuming the latter.
**Reversal cost:** High once there is data.

### D6 - Data portability is a first-class promise
**Status:** Accepted
**Decision:** Export of all user data in an open format is a shipped feature, not a nice-to-have. Importer for the original spreadsheet is an acquisition channel, not an afterthought.
**Rationale:** It replaces the one-time-purchase value proposition (the user "owns" the file) with a comparable one, and it is the single most credible answer to "why should I put my financial data in your database".

### D7 - Brand and visual direction: light and green
**Status:** Accepted
**Decision:** The visual system is **light-first with a single green accent**. Dark ships as a full token swap, but light is the brand and the default. `packages/ui/src/tokens.ts` is the source of truth for every value; `docs/04-design/design-system.md` documents it.
**Rationale:** A ledger is read in daylight, at a desk, for longer than most screens, so a light surface keeps dense figures legible. One accent, used sparingly, is what separates the product from a generic dashboard, and deep green reads as money without being a novelty colour. Green means *interactive or brand* and never *money*; money keeps its own two tokens and always travels with a sign, so direction survives without colour perception.
**Supersedes:** The Phase 1 deliverable previously read "design tokens for the dark and gold brand". That phrase was written before any token existed. When the tokens were built they were light-first green, and the two were never reconciled. The owner confirmed light-and-green as the brand, so the plan was corrected to match the code rather than the code rewritten to match the plan.
**Consequence:** `docs/02-phases/phase-1-financial-core.md`, `docs/04-design/design-system.md` and `docs/04-design/page-and-component-plan.md` were updated. Dark remains a supported theme, so phase 0's "dark theme" deliverable still holds.

---

## Architecture decisions

### A1 - Money is integer minor units, transported as strings
**Status:** Accepted
**Decision:** All monetary values are `BIGINT` minor units in the database, `bigint` in application code, and **strings** in JSON payloads. Never `float`, never `double`, never `Decimal`-in-JS, never a bare JSON number.
**Rationale:** Exact arithmetic. `BigInt` does not survive `JSON.stringify`, so serialisation happens once, at the edge.
**Reversal cost:** Very high once there is data.

### A2 - Sign convention: positive means money in
**Status:** Accepted
**Decision:** `amountMinor > 0` means money into an account; `amountMinor < 0` means money out. Applies to every account type. A credit card you owe on therefore has a **negative** balance. Sign flipping for display happens in the UI layer only.
**Rationale:** It collapses income, expense and transfers into one consistent ledger and makes every aggregate a plain `SUM`.
**Reversal cost:** Very high, and silent when wrong. Every aggregate in the product depends on it.
**Risk note:** This is the most error-prone convention in the schema. Confirm before implementation.

### A3 - No transfers in Phase 1
**Status:** Accepted
**Decision:** `TRANSFER` is reserved in the `kind` enum but is not usable until Phase 2.
**Rationale:** Transfers require paired legs, a shared group id, and a rule preventing one leg being edited or deleted in isolation. That is a feature, not a field.

### A4 - Accounts and Categories are archived; Transactions, Tasks and Habit logs are deleted
**Status:** Accepted
**Decision:** `archivedAt` on Account and Category. Hard delete on Transaction, Task and Habit log.
**Rationale:** Referential history stays intact for things other rows point at, while typo correction - a core, frequent flow - stays genuinely possible.
**Consequence:** No audit trail on transaction deletion. If that becomes a requirement, this decision must be revisited and every aggregate gains a `deletedAt IS NULL` predicate.

### A5 - Categories are capped at two levels
**Status:** Accepted
**Decision:** Parent and child only. No hierarchy beyond depth 2.
**Rationale:** Matches the original's flat list of roughly 50 subcategories while keeping the tree maintainable.

### A6 - Transaction dates are `DATE`, not `TIMESTAMPTZ`
**Status:** Accepted
**Decision:** Transaction dates, due dates, opening dates and habit log dates are naive calendar dates with no timezone. `createdAt` and `updatedAt` are `TIMESTAMPTZ` in UTC.
**Rationale:** A payment on the 3rd happened on the 3rd in every timezone. Only audit metadata is an instant.

### A7 - Recurrence is a closed cadence enum, not RFC 5545 RRULE
**Status:** Accepted
**Decision:** `DAILY`, `WEEKLY`, `BIWEEKLY`, `SEMIMONTHLY`, `MONTHLY`, `BIMONTHLY`, `QUARTERLY`, `SEMIANNUAL`, `ANNUAL`, plus an integer interval.
**Rationale:** Month-end clamping and naive calendar dates are the hard part, and RRULE does not solve them. A closed enum is testable and explainable in a UI dropdown.

### A8 - Derived values are never stored in Phase 1
**Status:** Accepted
**Decision:** Account balances, budget variances, streaks, overdue flags, and dashboard totals are computed on read. No denormalised cache columns.
**Rationale:** At the target scale of 10,000 transactions per user per year, an indexed aggregate is measured in microseconds. A cache is a correctness liability with no benefit yet.
**Exit condition:** Revisit only against a measurement, not a feeling.

### A9 - Every table carries `workspaceId`, with row-level security
**Status:** Accepted
**Decision:** Tenancy key on every table. Authorisation enforced in the database via RLS, not only in application code. Cross-tenant isolation proven by an automated test in CI.
**Rationale:** An authorisation check that lives only in application code is one forgotten `WHERE` clause away from a data breach.

### A10 - Scheduler idempotency via `(recurringRuleId, periodKey)` unique index
**Status:** Accepted
**Decision:** Every materialised occurrence records which rule and which period produced it, protected by a unique index.
**Rationale:** Job runners get retried, deployed twice, or replayed. Without this constraint, occurrences double-post and the user loses trust in the ledger permanently.

---

## Open decisions

| ID | Question | Blocking |
|---|---|---|
| ~~O1~~ | ~~Product name~~ Resolved: **Yearwise**. See D0. | - |
| O2 | Auth provider choice. **Recommendation: Supabase Auth** - see tech-stack.md | Phase 0 |
| O3 | Hosting platform. **Recommendation: Vercel + Supabase** - see tech-stack.md | Phase 0 |
| O4 | Are transactions with `PENDING` status in scope for Phase 2, or deferred with recurrence? | Phase 2 |
| O5 | Is an audit trail on transaction edits and deletions required? | A4 |
| O6 | Business model detail: what is free, what is paid | Phase 9, but affects schema (feature flags) |
| O7 | Is the starter category set locale-aware? | Phase 1 seed |