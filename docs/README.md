# Documentation

Two axes, deliberately kept separate.

| Axis | Folder | Question it answers | Lifespan |
|---|---|---|---|
| **Phases** | `02-phases/` | *When* are we building it? | Chronological. Rewritten as schedule changes. |
| **Features** | `03-features/` | *How is it supposed to behave?* | Permanent. Outlives the schedule. |

A phase document links to feature IDs. A feature document does not link to phases - it only names the phase it is currently planned for. When Budgeting slips a sprint, `phase-2-*.md` changes and `feat-fin-06-budgets.md` does not.

## Structure

```
docs/
  00-product/
    glossary.md          Domain vocabulary. Binding. Read before coding.
    decisions.md         Decision log (D-n = product, A-n = architecture).
  01-architecture/
    monorepo.md          Repo layout and package boundaries.
    data-model.md        ERD, tables, invariants. Approve before writing schema.prisma.
    tech-stack.md        (to write)
    adr/                 Architecture decision records.
 02-phases/
    README.md            The roadmap table.
    _template.md         Copy this to start a phase.
    phase-N-*.md
 03-features/
    README.md            The feature registry - every ID, one row each.
    _template.md         Copy this to start a feature.
    feat-*.md
 04-design/
    design-system.md     (to write)
```

## Conventions

**Status values.** Every document carries one: `Draft` | `Review` | `Approved` | `In build` | `Shipped` | `Frozen`.

**Feature IDs.** `FEAT-<MODULE>-<NN>`. Modules: `ACC` account, `FIN` finance, `PRD` productivity, `LIF` lifestyle, `CAL` calendar, `DAT` data, `PLT` platform, `UX` experience.

**One feature, one document.** If a feature needs two documents, it is two features.

**Markdown only.** No wikis, no Notion, no external trackers. Everything lives in git, next to the code, reviewed in pull requests.

**Decisions are logged, not remembered.** If a choice is made in conversation and not written to `00-product/decisions.md`, it will be re-litigated.

**Terminology is binding.** Every domain noun used in code, schema, API, or UI must appear in `00-product/glossary.md`. If it is missing, add it before using it.

## Reading order for a new contributor

1. `00-product/glossary.md`
2. `00-product/decisions.md`
3. `01-architecture/data-model.md`
4. `02-phases/README.md`
5. The feature document for whatever they are building