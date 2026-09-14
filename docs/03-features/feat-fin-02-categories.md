# FEAT-FIN-02 - Categories

| | |
|---|---|
| Module | Finance |
| Phase | 1 |
| Status | Draft |
| Depends on | FEAT-ACC-01 |
| Doc owner | |

## Problem

An amount alone says nothing. `-342.00` is only useful once it is known to be groceries rather than a car repair. Categories are the entire basis of every breakdown, budget and report in the product. If the category tree is wrong, every chart downstream is wrong, and the user blames the chart.

## User stories

- As a user, I want a sensible set of categories before I do anything, so that I do not have to design a taxonomy to record a coffee.
- As a user, I want to rename and add categories, so that the structure matches how I actually think about my money.
- As a user, I want at most two levels, so that filing a transaction is fast.
- As a user, I want to stop using a category without losing the history attached to it.

## Functional requirements

1. On workspace creation, seed a starter set of parent and child categories for both income and expense.
2. The user can create a parent category of type income or expense.
3. The user can create a child category under any parent of the same type.
4. The user can rename a category at any time.
5. The user can change a category's colour and icon.
6. The user can archive a category. Archiving a parent archives its children.
7. Archiving a category never modifies the transactions that reference it.
8. Two system-owned Uncategorised categories exist from creation, one per type. They cannot be renamed, archived or deleted.
9. The user can reorder categories for display.
10. The category picker in the transaction form shows parents and children, filtered by the transaction kind.

## Rules and calculations

**Tree depth is exactly two.** A parent has `parentId = null`. A child has a non-null `parentId`, and may not itself be a parent. Enforced as invariants I4, I5 and I6.

**Type inheritance.** A child's type is not an independent choice; it is the parent's type. The schema stores it anyway, so that aggregates can filter without a join. Invariant I4 keeps the two in step.

**Seeding.** Applied once, on workspace creation, inside the same transaction that creates the workspace. Approximately 12 parents and 40 children. The seed is data, not code - it should be a versioned fixture so it can be extended without rewriting history.

**Archive propagation.** Archiving a parent sets `archivedAt` on the parent and every child in one transaction. Unarchiving does the reverse. A child cannot be independently archived while its parent is active without an explicit warning - the transaction form would otherwise offer an orphaned child.

**Uncategorised.** The fallback for imports and quick entry. Exactly one per type per workspace, marked `isSystem = true`. It appears in the picker so that a transaction can be deliberately filed there.

**Visibility in pickers.** `WHERE isArchived = false`. Historical transactions referencing an archived category display it with an "(archived)" suffix. Aggregates include archived categories, because the history is real.

**Rollup.** Charts aggregate by parent by default, with a toggle to show children. A transaction on a child counts toward its parent. A transaction on a parent with no child counts toward that parent only. No transaction is counted twice.

**Deletion.** Not offered. Archive only.

## Data model impact

Creates `Category`. Fields as specified in `docs/01-architecture/data-model.md` section 3.5.

Adds seed data. No structural change to any other table.

## UI surfaces

**Categories screen.** Two sections, Income and Expense. Each shows parents with their children nested one level. Rows are draggable for ordering in a later phase; ordering is by `sortOrder` in Phase 1 with no drag affordance.

**Category editor.** Name, type (parents only, fixed for children), parent (when editing a child), colour, icon.

**Inline create.** Adding a child from within the transaction picker, so the user is never blocked mid-entry by a missing category.

**States.** Empty is not reachable, because of seeding. Loading shows skeletons. Error shows a retry.

## Edge cases

- **Renaming a parent.** Children are unaffected. Historical transactions display the new name.
- **Archiving a parent with children.** Children archive with it, in one transaction. The confirmation states how many children are affected.
- **Attempting to archive a system category.** Blocked. The control is disabled, not hidden.
- **Creating a child under an archived parent.** Blocked.
- **Duplicate names.** Unique per `(workspaceId, parentId)`. Two different parents may each have a child named "Other". A parent and a child may share a name.
- **A category with transactions, being archived.** Permitted. History is preserved. This is the whole point of archive over delete.
- **A transaction whose category was archived, being edited.** The archived category remains selectable for that transaction only, so that editing an amount does not silently recategorise the row.
- **Seed failure.** The workspace creation transaction rolls back entirely rather than producing a workspace with no categories. A workspace without categories is a broken workspace.

## Out of scope

- More than two levels
- Merging two categories
- Bulk recategorisation of existing transactions
- Rules-based auto-categorisation
- Category budgets (Phase 2, FEAT-FIN-06)
- Importing or exporting the category tree
- Shared or global category libraries

## Acceptance criteria

- [ ] A newly created workspace has income and expense categories, each with at least one child, plus one Uncategorised per type.
- [ ] A transaction cannot be saved without a category; the Uncategorised default is always available.
- [ ] A child category cannot be created under a child category.
- [ ] A child category's type always equals its parent's type, verified by attempting to violate it through the API.
- [ ] Archiving a parent with 3 children archives all 4 rows in a single transaction, and leaves every transaction intact and visible.
- [ ] The Uncategorised categories cannot be renamed, archived or deleted through any API call.
- [ ] A category breakdown chart totals to the same figure as the sum of its transactions, with no double counting between parent and child.

## Open questions

- **Is the seed locale-aware?** A workspace defaulted to Saudi Arabia plausibly expects different categories than one defaulted to the United States. See decision O7. Recommendation: ship one neutral seed in Phase 1 and make it locale-aware in Phase 8, when import lands.
- **Should `Uncategorised` be a real row or a nullable `categoryId`?** Decision recorded: a real row. Keeps aggregates simple and lets the user rename it. Recorded in `data-model.md` open questions as resolved.