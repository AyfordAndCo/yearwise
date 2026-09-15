# Phase 0 - Foundations

Status: Draft
Depends on: nothing
Target: 1 week

## Goal

A repository where every future phase is cheap to start and expensive to get wrong: one command installs, one command runs the whole stack, one command verifies the code, and every push to `main` is automatically checked and deployed. A signed-in user can reach an empty, branded, protected page in the deployed environment.

Phase 0 builds almost no product. It builds the rails. Every hour spent here is repaid in Phase 1 and later.

## In scope

| ID | Feature | Notes |
|---|---|---|
| FEAT-ACC-01 | Authentication and tenancy | Scaffold only: signup, login, logout, protected route. Profile and settings UI are Phase 1. |
| - | Monorepo tooling | pnpm workspaces, Turborepo, shared TypeScript config |
| - | Continuous integration | Lint, typecheck, test, build - on every pull request |
| - | Continuous deployment | Staging environment, deployed from `main` |
| - | Design tokens | Colour, type scale, spacing, radius, dark theme |
| - | Database connection | Local Postgres, migrations runnable, one trivial table |
| - | Observability floor | Error tracking, structured logs, a health endpoint |

## Out of scope

- Any financial entity: accounts, categories, transactions
- Any page other than the auth screens and an empty dashboard
- Charts, tables, drawers, data grid
- Billing
- Mobile
- Emails beyond an auth message

## Deliverables

- [ ] Root `package.json`, `pnpm-workspace.yaml`, `turbo.json`
- [ ] `packages/config` - shared `tsconfig`, ESLint and Prettier configuration, inherited by every package
- [ ] `packages/types` - created, empty, with the boundary rule documented
- [ ] `packages/logic` - created with `money.ts` and `date.ts` plus unit tests. No consumers yet.
- [ ] `packages/database` - Prisma initialised, one trivial migration applied, client exported
- [ ] `packages/ui` - design tokens and three primitives: `Button`, `Input`, `Card`
- [ ] `apps/web` - Next.js App Router, TypeScript strict, Tailwind, three routes: `/` (public), `/login`, `/dashboard` (protected)
- [ ] `.env.example` documenting every variable; `.env` ignored
- [ ] Local Postgres via Docker Compose, or a hosted branch database
- [ ] CI: a pull request runs lint, typecheck, unit tests and a build, and fails red if any fail
- [ ] Staging deploy on merge to `main`, with the deployment URL posted back to the commit
- [ ] `GET /health` returning build SHA and database connectivity
- [x] Error tracking wired into both server and client. Server capture verified end to end via `onRequestError`; the client DSN is asserted present in the browser bundle. **Source-map upload still needs `SENTRY_AUTH_TOKEN`**, without which production traces are minified.
- [ ] `README.md` install and run instructions that actually work from a clean clone
- [ ] The `main` branch ruleset is satisfied: the three required status checks exist and pass

## Build order

1. **Tooling.** pnpm workspace, Turborepo, TypeScript strict, ESLint and Prettier in `packages/config`. Verify `pnpm lint`, `pnpm typecheck` and `pnpm test` run across the workspace.
2. **The web shell.** Next.js in `apps/web`, Tailwind, design tokens from `packages/ui`, a styled placeholder page.
3. **The database.** Postgres locally, Prisma in `packages/database`, one trivial migration, client import working from `apps/web`.
4. **CI.** GitHub Actions: install, lint, typecheck, test, build. This is what unblocks the `main` ruleset.
5. **Deployment.** Staging environment, environment variables set, `main` deploys. Prove the deployed app reads from the database.
6. **Auth.** Signup, login, logout, session cookie, one protected route that redirects. Workspace auto-created on first signup.
7. **Observability.** Error tracking, structured logging, `/health`.
8. **Hardening.** Clean-clone test, docs, decision log.

## Technical dependencies

- A hosted Postgres instance (staging) and a local one (development)
- An auth provider, or NextAuth with credentials
- A hosting platform with preview deployments
- An error tracking service
- Decisions O2 and O3 in the decision log must be resolved before step 5

## Definition of Done

- [ ] `git clone` on a clean machine, then `pnpm install && pnpm dev` starts the app with no manual steps beyond copying `.env.example`
- [ ] `pnpm lint`, `pnpm typecheck`, `pnpm test` and `pnpm build` all pass from the repo root
- [ ] CI is green on a deliberately broken pull request, then green again once fixed, proving it actually fails
- [ ] Merging to `main` deploys to staging automatically, and the deployment is reachable
- [ ] The `main` ruleset's three required checks exist and pass on a real pull request
- [ ] `money.ts` and `date.ts` have unit tests covering parsing, formatting, rounding direction and naive date arithmetic
- [ ] No secret is present in the repository, verified by a scan of the full history
- [ ] A second developer could be onboarded from the README alone

## Risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Tooling rabbit hole - Turborepo, ESLint and tsconfig consume the whole week | High | Medium | Timebox to two days. If the monorepo is fighting back, collapse to a single Next.js app and revisit. See monorepo.md. |
| CI/deploy set up late, so every later phase is unverified | Medium | High | CI is step 4, before any product code exists |
| Money utilities written late, so Phase 1 reinvents them badly | Medium | High | `money.ts` is written in Phase 0 with tests and no consumers, on purpose |
| Auth provider lock-in chosen too fast | Medium | Medium | Keep auth behind a thin session interface in `apps/web` |
| The `main` ruleset blocks the first real pull request | Certain | Medium | Resolving it is an explicit deliverable, not an assumption |

## Acceptance criteria

1. A clean clone reaches a running local app in under five minutes.
2. Pushing a commit with a deliberate lint error produces a red pull request.
3. Merging a green pull request produces a reachable staging deployment.
4. An unauthenticated request to `/dashboard` redirects to `/login`.
5. Signing up creates exactly one User, one Workspace and one Membership row.
6. `GET /health` reports the deployed commit SHA and a successful database round trip.

## Notes and open questions

- **Resolve O2 and O3 first.** Auth provider and hosting platform determine steps 5 and 6. Everything else in this phase is provider-agnostic.
- **Do not build the design system here.** Three primitives is enough to prove the token pipeline. Phase 1 builds the rest against real screens.
- **`money.ts` before any money.** It is the single highest-leverage file in the repository and it has no dependencies. Writing it first means no later code can accidentally invent its own.