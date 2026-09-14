# Tech Stack

Status: Draft - resolves open decisions O2 and O3, pending confirmation.

## 1. Constraints driving every choice

These come from the decision log and are not negotiable here.

| Constraint | Source |
|---|---|
| Exact money arithmetic, `bigint` in the database and in application code | A1 |
| Authorisation enforced in the database, not only in application code | A9 |
| Shared calculation logic across web, mobile and the API | monorepo.md |
| Single Postgres, relational, transactional | data-model.md |
| Solo developer or small team, optimising for shipping speed | D2 |
| Mobile app on the roadmap, so the API must not be web-specific | D3 |

## 2. The stack

| Layer | Choice | Why |
|---|---|---|
| Language | TypeScript, `strict`, `noUncheckedIndexedAccess` | Non-negotiable for money handling |
| Web framework | Next.js, App Router | Server components keep aggregate queries off the client; one deployment target |
| Styling | Tailwind CSS | Fast, and the design token pipeline in Phase 0 depends on it |
| Components | shadcn/ui | Owned source, not a dependency. Accessible primitives we can restyle. |
| Forms | react-hook-form + Zod | Zod schemas are shared with the API, so a form rule and a server rule cannot diverge |
| Validation and contracts | Zod in `packages/types` | One schema, inferred types, used by client, server and tests |
| API | Next.js Route Handlers, REST, Zod-validated | See section 6 |
| Database | PostgreSQL | Relational, transactional, `BIGINT`, RLS |
| ORM | Prisma | Typed queries, first-class migrations, good DX |
| Auth | Supabase Auth | See section 3 |
| Charts | Recharts | Composable React components, works with server-rendered data |
| Dates | date-fns plus hand-rolled calendar-date helpers | Tree-shakeable, no timezone magic. See section 5. |
| Money | Hand-rolled `BigInt` helpers in `packages/logic` | No dependency earns its place. See section 5. |
| Unit tests | Vitest | Fast, TS-native, works across workspace packages |
| End-to-end tests | Playwright | Real browser, required to prove RLS isolation from outside |
| CI | GitHub Actions | Already available; also satisfies the `main` ruleset |
| Hosting, web | Vercel | See section 4 |
| Hosting, database | Supabase | See section 4 |
| Errors | Sentry | Both server and client |
| Logs | Vercel structured logs, upgraded later | Not worth a tool on day one |

## 3. O2 resolved - authentication

**Recommendation: Supabase Auth.**

| Option | Strength | Why not chosen |
|---|---|---|
| **Supabase Auth** | Email and password, magic link and OAuth out of the box. Integrates directly with Postgres RLS through `auth.uid()`. Free tier covers early development. | Couples auth to the database vendor |
| Clerk | Best developer experience, organisations and sessions handled | No native RLS integration. You inject the identity yourself, which is more code and more places to get it wrong. |
| Auth.js (NextAuth) | No vendor lock-in, self-hosted | You own password reset, email delivery, rate limiting, session rotation and account recovery. That is weeks of work that produces no product differentiation. |

**Rationale.** Invariant I1 requires authorisation to be enforced in the database. Supabase Auth is the only option where the authentication system and the authorisation mechanism are designed to work together. Choosing Clerk means hand-plumbing the identity into every query, which is precisely the failure mode A9 exists to prevent.

**Consequence to accept.** Supabase becomes a dependency for both data and identity. Escape route: it is standard Postgres, so leaving is a `pg_dump` and a migration of the auth users.

## 4. O3 resolved - hosting

**Recommendation: Vercel for the web app, Supabase for Postgres and Auth.**

**Why Vercel.** First-class Next.js support, preview deployments per pull request, cron jobs available when Phase 2 needs them, and near-zero operations work.

**Why not a single container on Railway or Fly.io.** It is a legitimate alternative and removes the vendor split. It is not chosen because it costs operations attention that Phase 0 through Phase 3 should spend on the product.

**The one thing to watch.** Serverless functions and Postgres connection limits are a well-known friction. Mitigation: connect through the pooler, set a low `connection_limit` in the Prisma connection string, and monitor connection saturation from the first deployment rather than after the first outage.

## 5. Two libraries we are deliberately not using

**No money library.** `dinero.js`, `big.js` and `decimal.js` are all reasonable, and all of them are a wrapper around the same idea. The idea is: represent money as an integer, convert at the edges, and never let a float exist. That is about 80 lines in `packages/logic/money.ts` with tests, and it has zero dependencies, zero version churn, and no learning curve for anyone reading the code. A dependency here buys almost nothing and adds a supply-chain surface to the most sensitive code in the product.

**No timezone library.** Transaction dates are naive calendar dates (A6). They have no timezone, so `luxon`, `moment` and timezone-aware helpers solve a problem this product does not have - while introducing exactly the class of bug that A6 exists to prevent, because they invite `new Date()` at the boundaries. `date-fns` handles display formatting; the calendar-date arithmetic (start of month, add months, clamp to last day) lives in `packages/logic/date.ts` and is tested.

## 6. API style - REST, not tRPC

**Recommendation: Next.js Route Handlers speaking REST, with Zod-validated request and response shapes defined in `packages/types`.**

tRPC is genuinely faster to build with inside a single Next.js application, and if the mobile app were removed from the roadmap it would be the better choice. It is not chosen because the mobile app is on the roadmap, and tRPC's value depends on sharing the router's TypeScript types between client and server - which a React Native app cannot consume directly without an adapter that would undo the benefit.

REST with shared Zod contracts gives the mobile client, the web client and any future integration the same interface, and the contracts remain type-safe on both sides.

## 7. Background jobs

Not needed in Phase 1. Required from Phase 2 for recurring rules.

| Option | Note |
|---|---|
| Vercel Cron | Free and simple, but fire-and-forget: no automatic retry, no built-in idempotency, limited observability |
| Inngest or Trigger.dev | Durable steps, automatic retries, scheduled runs, good observability |

**Recommendation:** start with Vercel Cron for the first iteration because it is already paid for, and move to Inngest or Trigger.dev when recurrence lands as a real feature. Whichever is chosen, invariant I9 - the unique index on `(recurringRuleId, periodKey)` - is the actual correctness guarantee. A retry-safe scheduler without a database constraint is still wrong.

## 8. Testing strategy

| Layer | Tool | What it proves |
|---|---|---|
| Unit | Vitest | Money parsing, formatting, rounding, date arithmetic, payoff schedules, rollover. Pure functions in `packages/logic`. |
| Integration | Vitest against a real Postgres | Invariants I2 through I13, including the ones enforced by constraint |
| End-to-end | Playwright | Signup through transaction entry; and critically, that user A cannot read user B's rows through the real API |

The end-to-end tenancy test is mandatory in CI. RLS misconfiguration is silent, and a silent authorisation failure in a financial application is the worst possible defect.

## 9. What this document does not decide

- Product name (O1)
- Free versus paid feature split (O6)
- Whether the starter category seed is locale-aware (O7)
- Whether transaction edits and deletions need an audit trail (O5)

## 10. Open questions

- **Is Supabase already in use?** There is a local Supabase configuration directory on this machine, which suggests prior familiarity and would settle O2 immediately.
- **Does the data need to be region-pinned?** If the target market is the Gulf, choose the Supabase region deliberately at project creation. Region cannot be changed later without a migration.