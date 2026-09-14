# Yearwize

A life operating system: money, budgets, debts, savings, tasks, habits and meals in one place.

> Previously delivered as a single Google Sheets template (one file, 16 linked tabs, 12 monthly and 52 weekly tabs).
> This repository rebuilds it as a real application.

## Status

Planning phase. No application code yet. The schema is not written. Nothing here is built.

## Documentation

| Folder | Contents |
|---|---|
| [`docs/00-product`](./docs/00-product/) | Vision, glossary, decision log |
| [`docs/01-architecture`](./docs/01-architecture/) | Tech stack, monorepo layout, data model, ADRs |
| [`docs/02-phases`](./docs/02-phases/) | Execution roadmap - **when** things get built |
| [`docs/03-features`](./docs/03-features/) | Functional specifications - **what** gets built |
| [`docs/04-design`](./docs/04-design/) | Design system and UI conventions |

Start at [`docs/README.md`](./docs/README.md).

## Intended stack (provisional, see decisions log)

- **Web:** Next.js (App Router), TypeScript, Tailwind CSS
- **Data:** PostgreSQL, Prisma, row-level security
- **Auth:** provider TBD
- **Monorepo:** pnpm workspaces + Turborepo
- **Mobile:** deferred to Phase 9

## Getting started

Not yet applicable. See `docs/02-phases/phase-0-foundations.md` once written.