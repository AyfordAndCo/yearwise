# Yearwise

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

## Stack

See [`docs/01-architecture/tech-stack.md`](./docs/01-architecture/tech-stack.md) for the reasoning.

| Layer | Choice |
|---|---|
| Language | TypeScript, strict |
| Web | Next.js, App Router |
| Styling | Tailwind CSS, shadcn/ui |
| Data | PostgreSQL, Prisma, row-level security |
| Auth | Supabase Auth |
| Charts | Recharts |
| Monorepo | pnpm workspaces, Turborepo |
| Hosting | Vercel plus Supabase |
| Mobile | Deferred to Phase 9 |

## House style

Documentation and code use **South African English**: `organise`, `colour`, `behaviour`, `cancelled`, `modelling`, `instalment`. Never `-ize` forms. Enum values follow the same rule, so the account type is `CURRENT`, not `CHECKING`. See [`docs/README.md`](./docs/README.md).

## Getting started

Not yet applicable. Phase 0 has not been built - see [`docs/02-phases/phase-0-foundations.md`](./docs/02-phases/phase-0-foundations.md).

## Status detail

| Area | State |
|---|---|
| Product decisions | Accepted (D0 to D6) |
| Architecture decisions | Accepted (A1 to A10) |
| Data model | Approved, `schema.prisma` not yet written |
| Tech stack | Recommended (O2, O3), pending confirmation |
| Phase 0 | Specified, not started |
| Phase 1 | Fully specified, not started |
| Application code | None |