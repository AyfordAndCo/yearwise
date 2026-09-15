# Repository Structure

Status: Draft

## Monorepo, not polyrepo

**Decision:** a single repository containing the web app, the future mobile app, the database package and shared logic.

**Rationale:** the financial calculation engine, the money type, the date helpers and the API types will be used by web, mobile and the backend. In separate repositories these get copied, and copied code diverges. Financial calculations that diverge between the web app and the mobile app produce two different balances for the same user. That is the failure mode this structure exists to prevent.

**Cost:** a build-system learning curve. Accepted deliberately, and mitigated by choosing the lower-complexity tool in each category.

## Tooling

| Concern | Choice | Note |
|---|---|---|
| Package manager | pnpm | Fast, disk-efficient, first-class workspaces |
| Monorepo manager | Turborepo | Simpler than Nx; plays well with Next.js; good task caching |
| Language | TypeScript, strict | `strict: true`, `noUncheckedIndexedAccess: true` |
| Lint / format | ESLint + Prettier in `packages/config` | One configuration, inherited everywhere |

## Layout

```
yearwise/
  apps/
    web/                  Next.js App Router - the main application
    mobile/               Expo app (Phase 9, not created yet)
  packages/
    ui/                   Shared React components and design tokens
    database/             Prisma schema, migrations, client
    logic/                Pure TypeScript domain logic - no framework, no I/O
    types/                Shared API and domain types
    config/               Shared ESLint, TypeScript, Tailwind configuration
  docs/                   This documentation set
  package.json
  pnpm-workspace.yaml
  turbo.json
```

## Package boundaries

These are rules, not suggestions.

| Package | May import | May not import | Why the constraint exists |
|---|---|---|---|
| `apps/web` | everything | - | Leaf consumer |
| `apps/mobile` | `ui`, `logic`, `types` | `database` directly | Mobile talks to the API, never to the database |
| `packages/logic` | `types` only | React, Next.js, Prisma, `database`, `ui` | Must be pure and testable. This is where money maths lives. |
| `packages/database` | `types` | `ui`, `logic`, React | Schema and client only |
| `packages/ui` | `logic`, `types` | `database`, Prisma | Presentational. Never fetches data. `logic` is permitted because it is pure, framework-free and I/O-free - `MoneyText` owns money formatting so no screen re-implements it. |
| `packages/types` | nothing | everything | Zero-dependency leaf |

**`packages/logic` being pure is the load-bearing constraint.** Debt payoff, budget rollover, money parsing, narrowing of recurrence dates and streak calculation all live there, and they must be testable without a database, a browser, or a network.

## Why not a single Next.js app

For a solo developer, `apps/web` alone is simpler. The monorepo is chosen because the mobile app and the shared calculation engine are already known to be required. Creating the structure now costs an afternoon; retrofitting it costs a rewrite of every import path plus a divergence audit.

If the mobile app is definitively dropped from the roadmap, collapse to a single Next.js app. That is the only condition under which this structure is over-engineering.