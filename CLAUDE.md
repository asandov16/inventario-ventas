# CLAUDE.md — Project rules

Inventory and sales PWA for a small family business in Costa Rica: cash and installment sales (up to 3 months), collections, inventory and a simple dashboard. React + TypeScript + Vite static site on Cloudflare Pages; Supabase (Postgres, Auth, Realtime) holds every business rule.

**Read before working:** `docs/plan-implementacion.md` (stages, architecture, conventions) and the stage's section in `docs/roadmap.md`. Requirements: `docs/requerimientos-funcionales.md`, `docs/requerimientos-tecnicos.md`. Decisions: `docs/decisiones/` (an ADR overrides the roadmap where they differ). UI and behaviour reference: `docs/prototipo/v2.html`.

## ⚠️ This repository is PUBLIC (ADR-020)

Treat every file, commit message, PR, issue and CI log as published to the internet.

- **Never commit secrets.** No keys, tokens, passwords or connection strings anywhere, including tests, docs and examples. Secrets live only in GitHub Environments or Supabase. If one leaks, it is compromised: rotate it, then tell the user. Deleting the commit is not enough.
- **Never commit real data.** No real customers, phones, emails, sales, costs or database dumps. Seeds and fixtures use fictional names and phones in the `8000-00NN` range.
- **Never write the business's real name** in code, docs or commits (D-19). The business name lives in the database.
- Only public values may use the `VITE_` prefix (the Supabase URL and anon key). The service role key never reaches `web/`.
- GitHub Actions: never use `pull_request_target`; pin third-party actions by full commit SHA; default `permissions: contents: read`; never print secrets or query results in logs.
- Backup and restore workflows live only in the private `inventario-backups` repo (ADR-021).
- `gitleaks` runs in pre-commit and CI. Never bypass it (`--no-verify` is forbidden).

## Language (ADR-027)

- **English:** code, identifiers, SQL, comments, commit messages, PR titles and descriptions.
- **Spanish:** all user-facing text, docs in `docs/`, ADRs, runbooks, visible routes (`/vender`), URL params (`?venta=`) and catalog data.
- UI copy lives only in `messages.es.ts` files, never inline in components.
- Business ↔ code terms: `docs/glosario.md`. Add any new term there in the same PR.
- Spanish copy follows the house language: plain words ("Cobrar", "Abono", "Quedan 3"); never "transacción", "SKU" or error codes.

## Commands

| Command                                            | What it does                                                                        |
| -------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `pnpm install`                                     | Install deps; also installs git hooks (lefthook)                                    |
| `pnpm dev`                                         | Local Supabase (if not running) + frontend on http://localhost:5173                 |
| `pnpm dev:web`                                     | Frontend only, without the database                                                 |
| `pnpm check`                                       | Lint + typecheck + unit tests. **Must pass before you finish any task.**            |
| `pnpm build`                                       | Production build of `web/`                                                          |
| `pnpm format`                                      | Prettier                                                                            |
| `pnpm lint:sql`                                    | sqlfluff on `supabase/`                                                             |
| `pnpm secrets:scan`                                | gitleaks over the full git history                                                  |
| `pnpm db:start` / `pnpm db:reset` / `pnpm db:test` | Local Supabase (Docker); reset with seed; reset + pgTAP (always from a known state) |
| `pnpm gen:types`                                   | Regenerate `web/src/shared/api/database.types.ts` after any SQL change              |
| `pnpm test:db`                                     | Concurrency tests (parallel transactions) against local Supabase                    |
| `pnpm gen:installment-tests`                       | Regenerate the installment pgTAP tests from the shared fixture (ADR-034)            |
| `pnpm db:demo`                                     | Narrated Spanish walkthrough of the business rules in the local database            |

Node 24 is pinned by `devEngines.runtime`; pnpm downloads it automatically.

## Architecture (ADR-028, plan §5.2)

Feature-first vertical slices with layers; dependencies point down only. ESLint (`eslint-plugin-boundaries`) enforces it, so a wrong import fails CI.

```
web/src/
  app/                 router, providers, Track, TabBar, AuthGate      → may use features' index.ts and shared/*
  features/<feature>/
    index.ts           public API of the feature (the only cross-feature entry point)
    messages.es.ts     Spanish UI copy
    components/        presentation: render + capture input. No rules, no network.
    hooks/             application: use cases, TanStack Query, feedback messages
    api/               data access: repositories + Zod schemas; map rows to domain models
    domain/            pure functions and types. No React, no network, no I/O.
  shared/
    ui/                generic components (Button, BusyButton, Sheet, Dialog, Toast…)
    hooks/             generic hooks (usePermission…)
    api/               GATEWAY: supabaseClient, useRpcMutation, errors.ts, database.types.ts
    domain/            money, phone, dates, installments, whatsapp
    styles/tokens.css  design tokens from prototype v2
```

- components → hooks → api → shared/api (gateway) → Supabase. Domain is pure and importable from every layer.
- Only `web/src/shared/api` may import `@supabase/supabase-js`.
- Cross-feature imports go through the other feature's `index.ts`, and only from components or hooks.
- **Reads** go through views (`v_*`) or read RPCs. **Writes** go only through RPC, via `useRpcMutation` (the single write gateway, so F10 can add an offline queue underneath).
- The frontend never decides a business rule. The TS installment calculation is a preview only; after saving, show what the database returned.

## Non-negotiable rules

1. **The database is the authority.** Stock, installments, balances and permissions are validated in Postgres.
2. **One action, one transaction.** Each use case that writes is one `SECURITY DEFINER` RPC.
3. **No direct table writes.** `authenticated` has no INSERT/UPDATE/DELETE grants on any table.
4. **Migrations are forward-only.** Never edit a merged migration; create one with `supabase migration new <snake_case>`.
5. **Money is integer colones** (`int`), with a `CHECK` on every amount. Never floats or `numeric`.
6. **Nothing is deleted** (RN-12). Use void columns, adjustments or `active = false`.
7. **Every new table has RLS** and a pgTAP test proving who can and cannot read it.
8. **Every save ends in visible feedback** (RN-17): a success message with the key fact, or an error that says what to do, with the button disabled while saving.
9. **Offline-ready (D-05).** Create-RPCs accept `p_id` and `p_client_created_at`; every create carries `p_idempotency_key`; the folio is assigned only by the database.
10. **Dates:** `timestamptz` for instants, `date` for due dates; "today" is computed in the business time zone (`America/Costa_Rica`). Phones are stored as E.164 (`+506XXXXXXXX`) and shown as `8811-2233`.

## Checklist: new RPC

- [ ] `SECURITY DEFINER`, `SET search_path = ''`, fully qualified names (`public.sales`).
- [ ] First statement: `PERFORM private.require_permission('<code>')`. Exceptions only per ADR-023.
- [ ] `REVOKE EXECUTE ... FROM public, anon; GRANT EXECUTE ... TO authenticated`.
- [ ] Returns `jsonb` with `status` (`ok` | `replay` | `possible_duplicate` | `similar` | `exists`).
- [ ] Business errors: `RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = '<snake_case_code>', DETAIL = '<json>'`; the code is added to `web/src/shared/api/errors.ts` with its Spanish message.
- [ ] pgTAP: one happy path and one rejection per rule it enforces.
- [ ] `pnpm gen:types`, and the regenerated types are committed.

## Naming

SQL: lowercase keywords (sqlfluff enforces it), `snake_case`; plural tables; `_at` timestamps, `_date` dates, `_id` references; functions `verb_object` with `p_` params; views `v_`; indexes `idx_<table>_<cols>`; triggers `trg_<table>_<action>`. TS: components `PascalCase.tsx`, hooks `useX.ts`, functions and variables `camelCase`, constants `UPPER_SNAKE_CASE`, types `PascalCase` (no `I` prefix), booleans `is/has/can`, money names carry the unit (`totalColones`). Tests: `*.test.ts` (Vitest), `*.spec.ts` (Playwright), `NN_topic.sql` (pgTAP).

## Workflow

- Work stage by stage (`docs/plan-implementacion.md` §2). Never start the next stage without the user's approval.
- Plan first, then implement task by task. Write tests first for business rules.
- Branch: `<type>/stage-<n>-<topic>` (e.g. `feat/stage-2-sales-checkout`). Small PRs, one task or group of 2–4 tasks.
- Commits: Conventional Commits in English (`feat(sales): add customer picker`), enforced by a commit-msg hook.
- Stay in scope: no unrequested refactors, dependencies or files.
- Before finishing: `pnpm check` green (plus `pnpm db:test` when SQL changed), then mark the task `[x]` in `docs/roadmap.md`.
- Closing a stage: formal DoD review (`docs/planes/etapa-<n>-revision-dod.md`), then update `docs/avance.md` and the progress deck as its "Cómo se actualiza" section says.
- New dependency: exact version, justified in the PR; prefer what is already installed.
