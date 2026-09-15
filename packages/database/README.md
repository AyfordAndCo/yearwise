# @yearwise/database

Prisma schema, migrations and the client for Yearwise. Boundary rule: this
package may import `types`, and must never import `ui`, `logic` or React.

- Schema: [`prisma/schema.prisma`](./prisma/schema.prisma)
- Field-level source of truth: [`docs/01-architecture/data-model.md`](../../docs/01-architecture/data-model.md)

---

## 1. Environment

Both variables are needed. `prisma migrate` uses `DIRECT_URL`; the application
uses `DATABASE_URL`, which goes through the connection pooler.

```bash
# .env at the repository root, and packages/database/.env for the CLI
DATABASE_URL="postgresql://...pooler...:6543/postgres?pgbouncer=true&connection_limit=1"
DIRECT_URL="postgresql://...:5432/postgres"
```

With Supabase, both come from **Project settings → Database → Connection
string**: use the *Transaction pooler* URI for `DATABASE_URL` and the *Direct
connection* URI for `DIRECT_URL`, replacing `[YOUR-PASSWORD]` in each.

Neither file is committed. `.env.example` documents the shape.

**Why the pooler matters.** Serverless functions and Postgres connection limits
are a known friction (tech-stack.md section 4). Connect through the pooler, keep
`connection_limit` low, and watch connection saturation from the first
deployment rather than after the first outage.

---

## 2. Migrations

```bash
pnpm --filter @yearwise/database run validate   # schema syntax, no database needed
pnpm --filter @yearwise/database run generate   # regenerate the client

# against a live database
pnpm --filter @yearwise/database exec prisma migrate deploy
```

`20260914000000_init` was generated offline with
`prisma migrate diff --from-empty --to-schema-datamodel` and then hand-extended.
It has **not been applied to a live database yet** - the local environment has no
running Postgres (see section 4).

### 2.1 What is hand-written, and why

Prisma's schema DSL cannot express these, so they live in the migration. Removing
them silently drops the invariants they enforce.

| Added | Invariant | Why it cannot be in the schema |
|---|---|---|
| `CREATE EXTENSION citext` | - | `User.email` uses `@db.Citext`, and the extension must exist before the table |
| `Transaction_kind_sign_check` | **I7** | Prisma has no `CHECK` support. This is what makes "kind and sign agree" a database fact rather than a convention |
| `Workspace_weekStartDay_check` | 0–6 | Same |
| `Category_..._key` with `NULLS NOT DISTINCT` | unique sibling names | Postgres treats `NULL` as distinct, so two root categories could otherwise share a name. Requires Postgres 15+ |
| `Transaction_recurringRuleId_periodKey_key` (partial) | **I9** | Prisma has no partial-index support. This is the scheduler's correctness guarantee in Phase 2 |

Consequence: the applied database is slightly ahead of what `prisma migrate dev`
would infer from the schema. That is deliberate and documented; do not "fix" it
by dropping the constraints.

---

## 3. Still to do

| # | Gap | Note |
|---|---|---|
| D1 | **No RLS policies.** | A9 requires authorisation enforced in the database, not only in application code, with a cross-tenant test in CI. The tables carry `workspaceId`; the policies do not exist yet. |
| D2 | **The migration has never been applied.** | Needs a live Postgres. |
| D3 | **No seed script.** | Default categories plus a demo workspace (Phase 1 deliverable). |
| D4 | **`idempotencyKey` is unresolved.** | `feat-fin-03` adds it; `data-model.md` does not list it. Logged in the schema header. |
| D5 | **`@yearwise/types` is still empty.** | Zod contracts for the API arrive with the first route handler. |

---

## 4. Why this is not wired into the app yet

`apps/web` reads an in-memory store (`apps/web/lib/workspace-store.tsx`, marked
TEMPORARY). Swapping it for this package requires a running database, and the
development machine has none:

- Docker Desktop's engine will not start, because **WSL2 is not installed**, which
  its Linux engine requires.
- No native Postgres is installed, and nothing listens on 5432.

So the schema, the migration and the client are ready, and the application layer
is deliberately still on the in-memory store rather than on Prisma code that
could not be executed even once.
