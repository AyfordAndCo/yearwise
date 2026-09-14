# Data Model

Status: Approved on 2026-09-14. Unblocks writing schema.prisma.

## 0. Scope of this document

Phase 1 tables are specified in full, at field level.
Phase 2 and later tables are specified at shape level only, enough to prove that Phase 1 does not paint us into a corner. They are marked (later) and are not buildable from this document.

## 1. Foundational decisions

| # | Decision | Rationale |
|---|---|---|
| M1 | Every table has `workspaceId` as the tenancy key. No exceptions. | Sharing becomes additive later. See A9. |
| M2 | Primary keys are UUIDs (v7 preferred). | No enumeration, no collisions across imports, sortable by creation. |
| M3 | Money is `BIGINT` minor units. | Exact arithmetic. `BIGINT` because annual sums exceed `INTEGER`. See A1. |
| M4 | Money crosses the API boundary as a **string**. | `BigInt` does not survive `JSON.stringify`. Serialise once, at the edge. |
| M5 | Percentages are basis points (`INTEGER`). | Integer maths, two decimal places of a percent. |
| M6 | Transaction dates are `DATE`; timestamps are `TIMESTAMPTZ`. | See A6. |
| M7 | Nothing derived is stored in Phase 1. | Balances, streaks, variances, overdue flags are computed on read. See A8. |
| M8 | Accounts and Categories are archived; Transactions are deleted. | See A4. |
| M9 | RLS on every table, scoped by workspace membership. | See A9. |
| M10 | One currency per workspace. | See D5. |

## 2. Entity relationship diagram

```
User ----< Membership >---- Workspace
                                |
              +-----------------+------------------+
              |                 |                  |
           Account           Category         Transaction
              |                 |                  |
              |<----------------+------------------+
              |                                    |
              |                                    |
        (later)                               (later)
     DebtProfile                          RecurringRule
     BudgetPeriod ---< BudgetLine >--- Category
     SavingsGoal
     Project ---< Task
     Habit ---< HabitLog
     MealPlanEntry
```

Legend: `---<` is one-to-many. Arrows point from parent to child.

## 3. Phase 1 tables

### 3.1 User

| Field | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `email` | citext UNIQUE | Case-insensitive. |
| `displayName` | text NULL | |
| `createdAt` | timestamptz | |
| `updatedAt` | timestamptz | |

Credentials live in the auth provider, not here. This table mirrors identity only.

### 3.2 Workspace

| Field | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `name` | text | |
| `currency` | char(3) | ISO-4217. Immutable once a transaction exists. See invariant I13. |
| `weekStartDay` | smallint | 0 = Sunday through 6 = Saturday. Default 1. |
| `dateFormat` | text | Display only. |
| `locale` | text | Display only. |
| `onboardingCompletedAt` | timestamptz NULL | Drives the setup wizard. |
| `createdAt`, `updatedAt` | timestamptz | |

### 3.3 Membership

| Field | Type | Notes |
|---|---|---|
| `workspaceId` | uuid FK | |
| `userId` | uuid FK | |
| `role` | enum | `OWNER`, `EDITOR`, `VIEWER` |
| `createdAt` | timestamptz | |

Primary key is `(workspaceId, userId)`. Phase 1 writes exactly one row at signup.

### 3.4 Account

| Field | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `workspaceId` | uuid FK | |
| `name` | text | Example: "Main Cheque Account". |
| `type` | enum | `CURRENT`, `SAVINGS`, `CREDIT_CARD`, `CASH`, `LOAN` |
| `openingBalanceMinor` | bigint | Signed, per the sign convention. |
| `openingDate` | date | |
| `currency` | char(3) | Denormalised from workspace for safety. Must equal workspace currency (I2). |
| `includeInNetWorth` | boolean | Default true. Lets a user exclude a dormant account. |
| `isArchived`, `archivedAt` | boolean, timestamptz | |
| `sortOrder` | integer | User-controlled display order. |
| `createdAt`, `updatedAt` | timestamptz | |

Index: `(workspaceId, isArchived, sortOrder)`.

**There is no `balance` column.** See invariant I3.

### 3.5 Category

| Field | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `workspaceId` | uuid FK | |
| `parentId` | uuid NULL, self-FK | NULL means a parent category. |
| `name` | text | Unique per `(workspaceId, parentId)`. |
| `type` | enum | `INCOME`, `EXPENSE`. `TRANSFER` reserved. |
| `icon` | text NULL | Icon key, not an emoji. |
| `colour` | text NULL | Hex. Used by charts. |
| `isSystem` | boolean | Protects the Uncategorised rows from deletion. |
| `isArchived`, `archivedAt` | boolean, timestamptz | |
| `sortOrder` | integer | |
| `createdAt`, `updatedAt` | timestamptz | |

Index: `(workspaceId, type, parentId, sortOrder)`.

### 3.6 Transaction

| Field | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `workspaceId` | uuid FK | |
| `accountId` | uuid FK | |
| `categoryId` | uuid FK | Never null. Falls back to Uncategorised. |
| `amountMinor` | bigint | Signed. Positive is in, negative is out. |
| `kind` | enum | `INCOME`, `EXPENSE`, `TRANSFER` |
| `date` | date | |
| `payee` | text NULL | Free text. Distinct from Category. |
| `notes` | text NULL | |
| `recurringRuleId` | uuid NULL FK | Set when materialised. Phase 2. |
| `periodKey` | text NULL | Phase 2. See invariant I9. |
| `status` | enum | `POSTED`, `PENDING`. Phase 1 is always `POSTED`. |
| `transferGroupId` | uuid NULL | Phase 2. |
| `createdAt`, `updatedAt` | timestamptz | Audit only. Never used in any calculation. |

**Indexes. These carry the product's performance. Do not skip them.**

| Index | Serves |
|---|---|
| `(workspaceId, date DESC, id DESC)` | Ledger list, keyset pagination |
| `(workspaceId, categoryId, date)` | Budget actuals, category breakdowns |
| `(workspaceId, accountId, date)` | Account balances |
| `(recurringRuleId, periodKey)` UNIQUE, partial where `recurringRuleId IS NOT NULL` | Scheduler idempotency |

## 4. Invariants

Enforce each one in the database where a constraint can express it, and in a single guarded write path where it cannot. Never only in a UI handler.

| ID | Invariant | Enforcement |
|---|---|---|
| **I1** | Every row carries a `workspaceId` matching a workspace the acting user is a member of. | RLS policy on every table. |
| **I2** | All money in a workspace is in `Workspace.currency`. | `Account.currency` CHECK against workspace; write path validates. |
| **I3** | An account balance is always `openingBalanceMinor + sum(transactions.amountMinor)`. Nothing else may be stored. | No `balance` column exists. |
| **I4** | A child category's `type` equals its parent's `type`. | Trigger, or write path plus CHECK. |
| **I5** | A category's `parentId` chain is at most depth 2. | Write path with a recursive check on insert. |
| **I6** | A category that has a parent is never itself a parent. | Same check as I5. |
| **I7** | `kind = INCOME` implies `amountMinor > 0`. `kind = EXPENSE` implies `amountMinor < 0`. | CHECK constraint. |
| **I8** | `kind` agrees with `Category.type`. | Write path; verified in integration tests. |
| **I9** | At most one materialised transaction exists per `(recurringRuleId, periodKey)`. | UNIQUE index. This is the scheduler's correctness guarantee. |
| **I10** | Archiving an account or a category never mutates historical transactions. | Archive flips a flag only. |
| **I11** | No derived value is stored. | No such columns exist; enforced by code review. |
| **I12** | `Workspace.currency` cannot change once a transaction exists. | Write path. |
| **I13** | All timestamps are UTC. All `DATE`s are naive calendar dates. | Column types, plus a lint rule banning `new Date()` for transaction dates. |

**I7 and I8 together are the reason the ledger can be trusted.** If they drift, every aggregate in the product is wrong in a way that stays invisible until an audit.

## 5. Money representation, worked

```
   12.34  ->  amountMinor =  1234
  -12.34  ->  amountMinor = -1234
```

API shape:

```json
{ "amountMinor": "1234", "currency": "SAR" }
```

- **Write path:** parse `"12.34"` to `1234n` exactly once, on input.
- **Read path:** `formatMoney(1234n, "SAR", "en-SA")` renders `SAR 12.34`.
- **Arithmetic:** all of it happens in `BigInt` inside `packages/logic`.
- **Percentages:** `aprBps = 1950` means `19.50%`. Interest maths uses integer basis points with an explicitly documented rounding mode.

Never compute `amount * 0.15`. Compute `(amount * 15n) / 100n` with a stated rounding direction.

## 6. Later tables - shapes only

### RecurringRule (Phase 2)
`id`, `workspaceId`, `accountId`, `categoryId`, `amountMinor`, `kind`, `cadence`, `interval`, `anchorDayOfMonth`, `anchorDayOfWeek`, `startDate`, `endDate`, `nextRunDate`, `autoPost`, `status` (`ACTIVE`, `PAUSED`, `ENDED`), `payee`, `notes`.
Partial index on `nextRunDate` where `status = 'ACTIVE'`, for the scheduler's scan.

### BudgetPeriod (Phase 2)
`id`, `workspaceId`, `year`, `month`, `strategy`, `createdAt`. UNIQUE `(workspaceId, year, month)`.

### BudgetLine (Phase 2)
`id`, `budgetPeriodId`, `categoryId`, `limitMinor`, `rolloverInMinor`. UNIQUE `(budgetPeriodId, categoryId)`.

### DebtProfile (Phase 3)
`accountId` as PK and FK, `aprBps`, `minimumPaymentMinor`, `originalPrincipalMinor`, `strategy`, `customPriority`.
Separate from Account because a current account has no APR and a debt account has no payoff strategy.

### SavingsGoal (Phase 3)
`id`, `workspaceId`, `name`, `kind` (`GOAL`, `SINKING_FUND`), `targetMinor`, `targetDate`, `accountId` NULL, `sortOrder`.

### Project, Task (Phase 4)
`Project`: `id`, `workspaceId`, `name`, `colour`, `isArchived`.
`Task`: `id`, `workspaceId`, `projectId` NULL, `title`, `notes`, `priority`, `status`, `dueDate`, `completedAt`, `recurrenceRuleId` NULL.

### Habit, HabitLog (Phase 5)
`Habit`: `id`, `workspaceId`, `name`, `targetPerPeriod`, `cadence`, `colour`, `sortOrder`, `isArchived`.
`HabitLog`: `habitId`, `date`, `state`. UNIQUE `(habitId, date)`.

### MealPlanEntry, GroceryItem (Phase 7)
`MealPlanEntry`: `id`, `workspaceId`, `weekStart`, `dayOfWeek`, `mealType`, `text`.
`GroceryItem`: `id`, `workspaceId`, `name`, `category`, `quantity`, `unit`, `isChecked`.

## 7. What we deliberately do not model

| Not modelled | Why |
|---|---|
| `balance` column | Invariant I3. |
| `Debt` table | A debt is an Account plus a DebtProfile. |
| `Bill`, `Subscription` tables | A bill is a `RecurringRule` with an `EXPENSE` category. |
| `Subcategory` table | It is a child Category. |
| `CalendarEvent` table | The calendar is a read model over four other tables. |
| `overdue`, `delayed` column | Derived from `dueDate`. |
| FX tables | Non-goal. See D5. |
| Split transactions | Not planned. |

## 8. Open questions

1. ~~Confirm the sign convention (A2).~~ **Confirmed on 2026-09-14.** Negative means owed. Recorded as accepted, not assumed.
2. **Is an audit trail required on transaction edit and delete?** I have chosen hard delete. An audit trail changes the design and adds a predicate to every aggregate.
3. **Is Uncategorised a real row per workspace, or a nullable `categoryId`?** I have chosen a real row. It keeps aggregates simple and lets the user rename it.