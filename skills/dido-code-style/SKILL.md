---
name: dido-code-style
description: Use when writing, modifying, refactoring, fixing, reviewing or analyzing code in any of Dido's projects (backend, frontend, scripts, config, infra), and when Dido asks to analyze or check a repo, a module or a folder ("analizza il repo", "controlla che sia tutto ok").
---

# Dido's Coding Style & Conventions

You are helping **Dido Marchet** build web applications. Follow these conventions **exactly** — they are validated across Dido's production projects: Nuxt frontends, and a Node backend starter with the projects derived from it.

| Task | Read |
|---|---|
| Writing or changing code | Part 1 + the part for the stack (3 backend, 4 Nuxt) |
| Reviewing a change, "trova bug" | Part 1 + Part 2 "Reviews and bug hunts" |
| Analyzing a repo, a module or a folder | Part 2 "Full analysis" — it runs the workflow `repo-audit.js` next to this file |

When a project's own `CLAUDE.md` is more specific, it wins.

---

# 1. Principles — every project, every language

## Context and continuity

Code is never written in a vacuum: every change starts from what is already there, and leaves the next session (human or AI) knowing what happened and why.

**Before writing code**

- Read the project's `CLAUDE.md`, the docs it points to and the memory: decisions, constraints and known limits live there. Don't re-propose what is documented as rejected or out of scope (e.g. `docs/LIMITI-NOTI.md`), and don't re-open a decision already made.
- Find out what was done before on the area you touch: `git log --oneline -- <path>`, recent commits, the "why" comments, the related tests. Understand why the code is the way it is before changing it.
- Read the whole flow involved, not just the line to change: callers, tests, docs describing it. Look for existing helpers to reuse before writing new ones.
- If the project has twins derived from the same starter, check how they solved the same problem and follow the same convention.
- If something is unclear or contradicts the docs, ask: don't guess, and don't silently override a past decision.

**While and after writing code**

- A non-obvious decision goes in a "why" comment in the code and, when it changes how anyone works on the project, in `CLAUDE.md` / docs — in the same change, not later.
- Docs describe the code as it is after the change: grep the repo for the keywords you touched and update every occurrence (summary tables and diagrams are the usual leftovers).
- Commit messages say what changed and why, in the project's language.
- Facts that code and git can't tell (a decision and its reason, a constraint, a deadline, an external pointer) go to memory.
- The final report says what changed, what was verified and what is still open, so the next step starts from facts.

## Simple and readable

- Write the simplest code that solves **today's** requirement. Not the next one, not the hypothetical one.
- Three similar lines beat a premature abstraction. Extract a helper when there are real repeated call sites, not before.
- No factory, adapter, registry, base class, plugin system or config option with a single implementation or a single consumer. Exception: a second implementation that is concretely planned **and** written down in the project's `CLAUDE.md` (e.g. file storage `local` → `s3`).
- No parameters, options or flags nobody passes. No "generic" version of a specific function.
- Readable at first glance: names that say what a thing is, early returns instead of nested conditions, one job per function, no clever one-liner that needs a comment to decode.

## Scalable by design, no premature scaling

Code keeps working when data and traffic grow — that's design, not optimization:

- Lists that can grow are paginated; queries fetch only the fields they need; no query per item inside a loop (N+1).
- Columns used to filter, join or sort have an index.
- No state in process memory that breaks with more than one worker or container — or the limit is written in the project docs.
- Large files and datasets are streamed; no blocking calls (`*Sync`, sync crypto) in the request path.

Premature is the infrastructure "for when traffic grows": caches, queues, workers, microservices, extra layers. Add them when a measurement or a real incident asks for them. When a cache or an optimization exists, a comment above it says why (what was measured, how much staleness is acceptable): read it before touching it.

## No hidden side effects

- A function does what its name says and nothing else: `get`, `find`, `resolve`, `check`, `validate` don't write.
- Don't mutate arguments or shared module state; return new values.
- Writes that must succeed together run in one transaction.
- External effects (emails, webhooks, third-party calls, file writes) run after the data is committed, never inside a transaction that can roll back.

## No dead code

- No commented-out code, unused functions / exports / imports / variables / dependencies / env vars / config keys / files. Git keeps the history.
- No fallback paths for situations that no longer exist. No TODOs for work nobody plans to do.

## When you change something, remove the old

- Replacing X with Y → delete X **in the same change**: code, tests, env vars (every env file + compose), docs, API spec, config.
- No backward-compatibility shims unless Dido asks: no deprecated aliases, no re-exports of old names, no `_unused` renames, no `// removed X` markers, no dual-read of old and new field.
- Before saying "removed everywhere": word-boundary grep (`grep -rn '\bname\b' src/ tests/ docs/`), not a narrow pattern. Tests and queries/filters are where leftovers hide.

## One protection per problem

- If a bug or a risk is already covered by one mechanism, don't add a second one "just in case".
- No error handling for impossible cases: no null check after a guard that already throws, no try/catch around code that can't throw, no re-validation of data already validated upstream.
- Validate at the boundary (user input, external APIs, env at boot), then trust internal code.

## Minimal changes

- A fix changes the broken lines, not the module. "While I'm here" refactors belong to a separate change, and only if Dido asks.
- Don't reformat, rename or reorder code you weren't asked to touch.
- Match the surrounding code: naming, idioms, file layout, comment language and density.

## Comments

- Comment the **why**, not the what.
- A non-obvious choice that is present gets a comment explaining it (e.g. `// Niente cache: ...`).
- A deliberate absence that someone might "fix" back gets a short comment on why it isn't there (e.g. no transporter cache because of PM2 cluster). This is not a `// removed X` marker: it explains a design decision, not the history.

## Tests

- New behavior and every bug fix come with a test that fails without the change. For a bug, write the test first and watch it fail.
- Test behavior through the public interface (HTTP route, rendered component, CLI output), not internals.
- Don't edit a test just to make it pass. If the behavior change is intended, say so in the change.
- If the project has no test setup, say so in the report; don't add a test framework unasked.

## Security — analyze every change

Every change gets a security pass before it's called done, sized to what it touches: a CSS tweak needs none, a new endpoint needs all of it.

- **Input** — every external input (body, query, params, headers, cookies, uploaded files, webhooks, third-party API responses) is validated at the boundary: type, format, length, allowed values.
- **Authentication and authorization** — who can call this? The check is on the server, never only hidden in the UI. Can a user reach someone else's data by changing an id? Does a deactivated or demoted account lose access right away?
- **Data exposure** — responses return only the fields needed: never password hashes, tokens, OTPs, secrets, stack traces or driver errors in production. Logs never contain passwords, tokens or OTPs.
- **Injection** — no string-built SQL, shell commands or HTML: parameterized queries / ORM, escaped templates, no `v-html` / `innerHTML` on user-controlled content.
- **Secrets** — in env or encrypted at rest; never in code, repo, logs or the client bundle (`runtimeConfig.public` holds only values public by design, e.g. read-only CMS tokens).
- **Abuse** — rate limit on anything that can be brute-forced or spammed (login, OTP, password reset, registration, upload, contact forms). Tokens are random, expiring and single-use. Login and reset responses don't reveal whether an account exists.
- **Files** — check type and size, store under generated names, no user-controlled paths, private content downloaded only behind auth.
- **Transport and browser** — explicit CORS allow-list, cookies `HttpOnly` + `Secure` + the right `SameSite`, HTTPS in production.
- **Dependencies** — a new dependency must be needed (not replaceable by a few lines of code), maintained and free of known critical vulnerabilities (`npm audit` / `pnpm audit`).

Then:

- Before adding a protection, check what already covers that risk (project `CLAUDE.md`, code comments): "one protection per problem" applies to security too.
- A hole introduced by your change is fixed in the same change. A pre-existing hole outside the scope is reported with scenario and severity, not left silently and not "fixed" with an unrequested refactor.
- The final report has one line on the security pass: what was checked and what was found (or "nessun problema").

## Done means verified

- Never say "done" or "works" without running it: tests, lint and format in check mode, build, the real command, the real endpoint. "It parses / compiles" is not "it works".
- After a schema / codegen change, regenerate before running anything (e.g. `npx prisma generate`).
- Report explicitly what was verified and what wasn't, and why (e.g. "DB was off, tests not run — here's how to run them").

## Red flags — stop and fix before going on

| Thought | Reality |
|---|---|
| "I'll keep the old function / field / env var for compatibility" | Nobody asked. Delete it in this change, with its tests and docs. |
| "Let me make it configurable / generic, we might need it" | One consumer = no abstraction. Write the specific version. |
| "Let me add a cache / queue, to be safe" | No measurement, no cache. |
| "I'll add a second check, just in case" | Find what already covers it: one protection per problem. |
| "While I'm here I'll clean this up too" | Separate change, and only if Dido asks. |
| "This looks wrong, I'll change it" | Read the comments, git log and docs first: it may be a decision. |
| "It compiles, so it's done" | Run it, and report what ran. |
| "I'll update the docs later" | Same change, or it never happens. |

---

# 2. Reviews and analysis

## Reviews and bug hunts

For a review of a change, or a request like "trova bug":

- Presume the code works: the burden of proof is on the finding.
- Report only Alta and Media findings (see Severity below). Nothing found → "ok" in one line.
- No cosmetics, naming, micro-simplifications, theoretical races or future-proofing unless Dido asks for them. Never append "a few minor things I also noticed".

## Full analysis — "analizza il repo"

"Analizza il repo con la skill dido-code-style" — or a module, or a folder — is the complete request: Dido doesn't list what to check. It explicitly asks for every category of the checklist below, so the project's audit restrictions on those categories don't apply. Cosmetics stay out.

### Run it

Asking for the analysis with this skill is the opt-in to the multi-agent run.

1. Tell Dido in one line: workflow in background, about how many agents (one per ~3000 lines of code, plus one for the tests and the verifiers). It is long and expensive: tens of minutes and hundreds of thousands of tokens even for a small module, millions for a whole repo.
2. Launch the workflow script that sits next to this file (`${CLAUDE_SKILL_DIR}` is this skill's folder, the base directory shown when the skill loads):
   ```
   Workflow({
     scriptPath: "${CLAUDE_SKILL_DIR}/repo-audit.js",
     args: {
       skill: "${CLAUDE_SKILL_DIR}/SKILL.md",
       memoryDir: "<this project's memory dir, if there is one>",
       scope: "<path or list of paths — only for a module or a folder>"
     }
   })
   ```
   If `scriptPath` is refused, Read the script and pass its content as `script`. If the Workflow tool doesn't exist (another agent or host), run the same phases yourself, in the same order, with subagents if you have them.
3. When it returns, write the report below from its result.

| Phase | Agents | Job |
|---|---|---|
| Contesto | 1 | `CLAUDE.md`, docs, memory, known limits, git log → stack, commands, documented choices, files split into groups of ~2500-4000 lines (with a scope, plus the docs that describe it) |
| Analisi | 1 per group | every file read in full, checked against the checklist; a doc is compared with the code by whoever analyzes the doc |
| Test | 1 | tests, lint and format in check mode, build, typecheck, dependency audit, following the project's safe procedure; one smoke run where there are no automated tests |
| Verifica | 2 per Alta/Media finding (a third when they disagree), 1 per group for the Bassa ones | skeptics try to refute every finding with the criteria below; they may reproduce it outside the repo |
| Completezza | as needed | files not read or not assigned get a second round |

### Checklist

- **Bugs** — wrong logic, cases that do happen but aren't handled, broken error paths, races with a reproducible scenario.
- **Side effects** — the "No hidden side effects" rules of Part 1, plus module-level state shared across requests or workers.
- **Security** — the "Security" checklist of Part 1, applied to every entry point.
- **Overengineering** — abstractions with one implementation or one consumer, options and parameters nobody passes, layers that only forward calls, config nobody sets.
- **Dead code and leftovers** — unused files / exports / functions / dependencies / env vars / config keys, commented-out code, compatibility shims, remains of replaced features in code, tests or docs. Prove it: grep every candidate for real consumers.
- **Simplicity and readability** — code that can be written substantially simpler with the same behavior (show the simpler version), logic duplicating an existing helper, names misleading enough to cause wrong use.
- **Scalability and performance** — the "Scalable by design" rules of Part 1. Real bottlenecks only, not "add a cache / queue just in case".
- **Docs drift** — docs, API spec, client contract, `CLAUDE.md` that no longer match the code.
- **Tests** — failing tests, critical flows (auth, permissions, data writes) without a test, tests that assert nothing.

### Verification — a finding is refuted when

- the code doesn't do what the finding says, or the scenario can't happen;
- it's documented as deliberate, out of scope or a known limit (`CLAUDE.md`, docs, known-limits file, a "why" comment, a decision recorded after a previous analysis);
- the risk is already covered by another mechanism ("one protection per problem");
- it's cosmetic (naming, ordering, formatting, comment style), a micro-simplification without a concrete gain, or "not identical to file Y";
- it's a theoretical race or edge case without a reproducible scenario, or future-proofing;
- the evidence is missing or doesn't reproduce.

In doubt: refuted. A finding that holds gets the severity below, whatever the finder said. Alta and Media survive with 2 confirmations out of 3.

### Severity

| Severity | What |
|---|---|
| Alta | data loss or corruption, security hole, error visible to users, lost sessions or credentials, lock-out |
| Media | inconsistent state in documented scenarios, broken retry or idempotency, real bottleneck, failing test, API docs that mislead a client |
| Bassa | overengineering, dead code and leftovers, simplification with a concrete gain, other docs drift, critical flow without a test |

### Report

In Italian, in this order:

1. **Intestazione** — repo or scope, date, stack.
2. **Copertura** — files analyzed out of tracked (excluded patterns with their reason), every command with ✓ / ✗ / non eseguito (reason and how to run it), what wasn't checked and why.
3. **Alta**, **Media**, **Bassa** — one entry per finding: `[file:line](link)` — problem — evidence — minimal fix. The same problem found twice is one entry.
4. **Categorie senza problemi** — one line listing them.
5. **Verifica** — how many findings were refuted (details on request) and the unverified ones with the reason.

Nothing confirmed: intestazione, "ok", copertura.

The analysis changes no code. Afterwards, fix what Dido picks following Part 1.

### After the report — continuity

- A finding Dido rejects is recorded with its reason where the next analysis reads it: a "why" comment next to the code when it's local, otherwise the project's known-limits file or the review rules in `CLAUDE.md` (create `docs/LIMITI-NOTI.md` if the project has neither). The Contesto phase reads them, so it isn't proposed again.
- Fixes follow Part 1: regression test first, minimal fix, old code removed, commit that says what and why.

---

# 3. Backend — Node / Express / Prisma

Reference implementation: Dido's Node backend starter. Projects derived from it keep the same structure.

## Stack

| Concern | Tool |
|---|---|
| Runtime | Node 22 (Alpine in Docker) |
| Package manager | npm (`package-lock.json`) |
| Language | Pure JavaScript, ESM (`"type": "module"`) — no TypeScript except `prisma.config.ts` |
| HTTP | Express 5 |
| Database | PostgreSQL 15 + Prisma 7 with `@prisma/adapter-pg` |
| Validation | Zod |
| Process manager | PM2 cluster (`pm2-runtime`) |
| Shared store | Redis, optional (rate-limit counters) |
| Mail | nodemailer + Handlebars |
| API docs | OpenAPI served at `/docs` and `/openapi.json` |
| Tests | vitest + supertest, E2E on a real Postgres |
| Deploy | Docker Compose — Coolify in production, Traefik + Dockge locally |
| Lint / format | ESLint + Prettier defaults (double quotes, semicolons) |

Comments, error messages and docs are in **Italian**.

## Project Structure

```
app/node/
├── src/
│   ├── app.js                 # buildApp(): middleware, health, /v1 router, 404 JSON, error handler — no listen
│   ├── index.js               # connect + listen + periodic jobs
│   ├── <module>/
│   │   ├── <module>.routes.js
│   │   ├── <module>.schema.js
│   │   ├── <module>.controller.js
│   │   └── <module>.service.js
│   ├── middleware/            # authenticate, error-handler, rate-limit
│   ├── config/                # permissions, api-version, runtime config resolvers
│   ├── database/postgres/     # Prisma client
│   ├── docs/                  # OpenAPI spec, paths/, schemas/
│   └── utils/                 # errors.js (HttpError), shared Zod fields, pagination
├── tests/                     # E2E tests — not under src/
└── prisma/                    # schema.prisma + migrations/
```

`buildApp()` is separate from `index.js` so tests import the app without starting the listener.

## Layers

`routes → controller → service → Prisma → PostgreSQL`. **No repository layer**: services import Prisma directly.

| File | Does | Never |
|---|---|---|
| `*.routes.js` | endpoints + middleware; header comment listing the endpoints | logic |
| `*.schema.js` | Zod schemas for the request body | business rules that need the DB |
| `*.controller.js` | `schema.parse(req.body)` at the top, calls the service, builds the response | Prisma calls |
| `*.service.js` | business logic, throws `HttpError` for domain errors | `req` / `res`, Zod, `res.status().json()` |

```js
// controller — Express 5 forwards rejected promises to the error handler: no try/catch
export const putFrontendUrl = async (req, res) => {
  const { url } = frontendUrlSchema.parse(req.body);
  await upsertFrontendUrl(url, req.auth.sub);
  res.json({ status: "ok", data: await resolveFrontendUrl() });
};
```

```js
// service — domain errors only
if (!user) throw new HttpError(404, "Utente non trovato");
```

## Responses and Status Codes

- Success: `{ "status": "ok" }`, plus `data` when there is something to return (paginated lists also `pagination`) or `message` for an informational answer.
- Error: `{ "status": "error", "error": "..." }` — also for unknown routes (404 JSON) and 429.
- `400` wrong input (also with a valid token), `401` only for token / account / credentials, `403` permission denied, `404` not found, `409` conflict.
- One global error handler maps: `ZodError` → 400, `HttpError` → its status, Prisma `P2002` and `P2034` → 409, `P2025` → 404, everything else → 500 with a generic message in production.

## Conventions

- **Constants in one place**: roles and permissions in `config/permissions.js`, API version in `config/api-version.js`. Never hardcode role strings or the `/v1` prefix.
- **Versioned routes**: every domain route is mounted on the `/v1` sub-router; health and docs routes stay unversioned.
- **Shared Zod fields** (`utils/zod-fields.js`): reuse `emailField` (trim + lowercase) and `passwordField`, don't re-implement them.
- **Env vars**: the same name in `.env.local`, `.env.production` and `.env.example`. Required production vars fail fast at boot. A var nobody reads anymore is removed from all three files and from the compose files.
- **Prisma**: schema changes only through migrations, never by hand in SQL. `npx prisma generate` after every `schema.prisma` change.
- **Adapters**: `<module>/storage/index.js` (factory) + `<driver>.js` only when a second driver is real or written down as planned.
- **API change** → in the same change update the OpenAPI spec, the client contract file (`CLAUDE-ADMIN-CONTEXT.md`) and the affected docs.

## Security

Mechanisms already in place — use them, don't duplicate them:

- **Every non-public route** uses `authenticate()` (staff, the default) or `authenticate({ type: PRINCIPAL_TYPES.CUSTOMER })`: the JWT `type` claim separates the audiences and the principal is reloaded from the DB on every request, so deactivation and role changes apply immediately. No cache in front of that lookup.
- **Permissions** narrower than `FULL_ACCESS_ROLES` are asserted at the top of the controller (403), because full-access roles bypass the `roles` check of `authenticate()`.
- **Ownership** — a self-service route takes the principal id from `req.auth.sub`, never from the body or the URL.
- **Prisma `select`** with an explicit field list (e.g. `STAFF_SELECT`, `CUSTOMER_SELECT`): `passwordHash`, `otpHash` and tokens never reach a response.
- **Credentials** — passwords with bcrypt (`auth/core/crypto.js`); OTPs and email tokens stored only as sha256; login against a non-existent user still runs bcrypt on a dummy hash (same timing, no account enumeration).
- **Rate limiters** in `middleware/rate-limit.js` on every endpoint that can be brute-forced or spammed; shared Redis store when more than one process runs.
- **Secrets** come from env; runtime secrets saved in DB are encrypted (AES-256-GCM, `config/runtime-crypto.js`) and the API returns only `hasPassword: bool`. `NODE_JWT_SECRET` and CORS are validated at boot in production (fail fast).
- **Errors in production** — generic message on 500, driver details only in the server log.
- **Audit log** for security-relevant events (logins and failures, role and status changes, config changes, deletions); every new event type documented.

## Tests

- E2E via supertest against `buildApp()` with full paths (`/v1/...`) and a real Postgres — preferably a throwaway container on another port, not the dev DB.
- Each test file uses a unique `test-<uuid>-` prefix and `afterAll` deletes only what matches it.
- No parallelism (`fileParallelism: false`): unique constraints would clash.

---

# 4. Frontend — Nuxt / Vue

## Stack

| Concern | Tool |
|---|---|
| Framework | Nuxt 4 (`nuxt: ^4.x`) |
| Package manager | pnpm |
| Language | JS for composables/plugins, TS for config files |
| State | Pinia — composition store style |
| GraphQL | @nuxtjs/apollo + custom `useGraphql()` |
| REST API | custom `useApiFetch()` composable |
| Forms | FormKit + @formkit/nuxt |
| Animations | GSAP + Lenis |
| Maps | Leaflet (client-only) |
| Carousel | Swiper |
| i18n | @nuxtjs/i18n |
| CSS reset | the-new-css-reset |
| Error tracking | Sentry (@sentry/vue + @sentry/vite-plugin) |
| Analytics | GTM via @saslavik/nuxt-gtm |
| Performance | nuxt-delay-hydration |
| SEO extras | nuxt-schema-org |
| SCSS libs | `scss-react` + `scss-slamp` (authored by Dido) |
| Deployment | Netlify Edge + ISR |

---

## Project Structure (Nuxt 4)

In Nuxt 4 all source files live inside `app/`. Config modules stay at the project root.

```
project/
├── app/                                  ← ALL source files
│   ├── app.vue
│   ├── app.config.ts
│   ├── error.vue
│   ├── assets/
│   │   ├── js/
│   │   │   ├── utils.js                  # debounce, misc helpers
│   │   │   └── page-transitions/         # one GSAP file per page
│   │   │       ├── home.js
│   │   │       └── product.js
│   │   └── styles/scss/
│   │       ├── _core.scss                # @forward vars + mixins → injected globally
│   │       ├── vars/
│   │       │   ├── _index.scss           # @forward all
│   │       │   ├── _colors.scss
│   │       │   ├── _fonts.scss
│   │       │   ├── _spacing.scss
│   │       │   └── _timings.scss
│   │       ├── mixins/
│   │       │   ├── _index.scss
│   │       │   ├── _utility.scss         # scss-react + scss-slamp setup
│   │       │   ├── _fonts.scss
│   │       │   ├── _buttons.scss
│   │       │   ├── _links.scss
│   │       │   └── _input.scss
│   │       ├── layout/
│   │       │   ├── _setup.scss
│   │       │   ├── _layout.scss          # .row-*, .flex utilities
│   │       │   ├── _paddings.scss
│   │       │   ├── _margins.scss
│   │       │   ├── _images.scss
│   │       │   └── _visibility.scss
│   │       ├── typo/
│   │       │   ├── _setup.scss
│   │       │   ├── _heading.scss
│   │       │   ├── _text.scss
│   │       │   └── _cta.scss
│   │       └── globals/
│   │           ├── _lenis.scss
│   │           └── _formkit.scss
│   ├── bucket/                           # Static data: nav, filters, lists
│   │   └── navigations.js
│   ├── components/
│   │   └── [category]/
│   │       └── [name]/
│   │           ├── index.vue
│   │           └── style.scss
│   ├── composables/
│   │   ├── graphql.js
│   │   ├── api-fetch.js
│   │   ├── helpers.js
│   │   ├── lenis.js
│   │   └── seo.js
│   ├── graphql/
│   │   └── [cms]/                        # craft/, dato/, etc.
│   │       ├── queries/
│   │       │   ├── index.js              # re-exports all queries
│   │       │   └── [content-type].js
│   │       └── fragments/
│   │           └── [fragment-name].js
│   ├── layouts/
│   │   └── default.vue
│   ├── middleware/
│   │   ├── netlify-redirects.global.ts
│   │   └── remove-trailing-slash.global.ts
│   ├── pages/
│   │   ├── index.vue
│   │   └── [content-type]/[slug]/index.vue
│   ├── plugins/
│   │   ├── apollo.js
│   │   ├── animation-directives.client.js
│   │   ├── leaflet.client.js
│   │   └── sentry.client.js
│   ├── public/
│   ├── server/
│   │   └── api/
│   │       └── sitemap.js
│   ├── stores/                           # Pinia — always plural
│   │   └── [store-name].js
│   └── utils/
├── configuration/                        # Nuxt config split by concern — root level
│   ├── apollo.ts
│   ├── app.ts
│   ├── build.ts
│   ├── css.ts
│   ├── delayHydration.ts
│   ├── devtools.ts
│   ├── experimental.ts
│   ├── formkit.ts
│   ├── gtm.ts
│   ├── i18n.ts
│   ├── modules.ts
│   ├── nitro.ts
│   ├── runtimeConfig.ts
│   ├── site.ts
│   ├── sitemap.ts
│   ├── sourcemap.ts
│   ├── ssr.ts
│   └── vite.ts
├── i18n/locales/
│   ├── it.js
│   └── en.js
├── nuxt.config.ts                        # thin — only spreads ./configuration/*
├── formkit.config.js
├── i18n.config.ts
├── tsconfig.json
├── eslint.config.mjs
├── stylelint.config.mjs
└── vite.config.js                        # Sentry vite plugin
```

---

## nuxt.config.ts — always thin

```ts
import apollo from './configuration/apollo'
import app from './configuration/app'
import build from './configuration/build'
import css from './configuration/css'
import delayHydration from './configuration/delayHydration'
import devtools from './configuration/devtools'
import experimental from './configuration/experimental'
import formkit from './configuration/formkit'
import gtm from './configuration/gtm'
import i18n from './configuration/i18n'
import modules from './configuration/modules'
import nitro from './configuration/nitro'
import runtimeConfig from './configuration/runtimeConfig'
import site from './configuration/site'
import sitemap from './configuration/sitemap'
import ssr from './configuration/ssr'
import vite from './configuration/vite'

export default defineNuxtConfig({
  ...apollo,
  ...app,
  ...build,
  ...css,
  ...delayHydration,
  ...devtools,
  ...experimental,
  ...formkit,
  ...gtm,
  i18n: {
    vueI18n: './i18n.config',
    ...i18n.i18n,
  },
  ...modules,
  ...nitro,
  ...runtimeConfig,
  ...site,
  ...sitemap,
  ...ssr,
  ...vite,
  compatibilityDate: '2025-xx-xx',
})
```

Each `configuration/*.ts` exports a plain object. **Never** put config inline in `nuxt.config.ts`.

---

## Configuration File Patterns

```ts
// configuration/modules.ts
export default {
  modules: [
    '@nuxt/devtools',
    '@nuxtjs/i18n',
    '@nuxtjs/sitemap',
    'nuxt-schema-org',
    '@nuxtjs/apollo',
    '@pinia/nuxt',
    '@formkit/nuxt',
    'nuxt-delay-hydration',
    '@saslavik/nuxt-gtm',
  ],
}
```

```ts
// configuration/experimental.ts
export default {
  experimental: {
    payloadExtraction: true,
    renderJsonPayloads: true,
  },
}
```

```ts
// configuration/runtimeConfig.ts
export default {
  runtimeConfig: {
    public: {
      enviroment: process.env.NODE_ENV,
      baseURL: process.env.SITE_URL,
      siteName: process.env.SITE_NAME,
      sentryURL: process.env.SENTRY_URL,
      gqlURL: process.env.GQL_URL,
      gqlApiKey: process.env.GQL_API_KEY,
    },
  },
}
```

```ts
// configuration/vite.ts
export default {
  vite: {
    css: {
      preprocessorOptions: {
        scss: {
          additionalData: `@use '~/assets/styles/scss/core' as *;`,
        },
      },
    },
    build: {
      sourcemap: process.env.NODE_ENV !== 'production',
    },
  },
}
```

```ts
// configuration/css.ts
export default {
  css: [
    'the-new-css-reset/css/reset.css',
    '~/assets/styles/scss/typo/index.scss',
    '~/assets/styles/scss/layout/index.scss',
    '~/assets/styles/scss/globals/index.scss',
  ],
}
```

```ts
// configuration/nitro.ts
export default {
  nitro: {
    routeRules: {
      '/**': { isr: true },                // ISR on all routes — no TTL, revalidate on deploy
      '/sitemap.xml': { prerender: true },
      // redirects:
      '/it/old-path/**': { redirect: { to: '/it/new-path', statusCode: 301 } },
    },
    prerender: {
      autoSubfolderIndex: true,
      concurrency: 1,
      interval: 1,
      failOnError: false,
      crawlLinks: true,
      routes: ['/', '/sitemap.xml'],
      retries: 4,
      retryDelay: 1000,
    },
    preset: 'netlify-edge',
  },
}
```

```ts
// configuration/i18n.ts
// NOTE: this is the only config file that types its export explicitly
import type { NuxtI18nOptions } from '@nuxtjs/i18n'

const i18n: { i18n: NuxtI18nOptions } = {
  i18n: {
    baseUrl: process.env.SITE_URL ?? '',
    defaultLocale: 'it',
    langDir: 'locales',
    locales: [
      { code: 'it', language: 'it-IT', name: 'Italiano', file: 'it.js' },
      { code: 'en', language: 'en-US', name: 'English', file: 'en.js' },
    ],
    strategy: 'prefix_except_default',  // default locale has no URL prefix
    detectBrowserLanguage: false,
    pages: {
      contacts: { it: '/contatti', en: '/contacts' },
      'projects/index': { it: '/progetti', en: '/projects' },
      'projects/[slug]/index': { it: '/progetti/[slug]', en: '/projects/[slug]' },
    },
  },
}

export default i18n
```

---

## Component Convention

Every component lives in its own folder — always two files:

```
components/widget/accordion/index.vue
components/widget/accordion/style.scss
```

**Dual script blocks** — intentional pattern:

```vue
<template>
  <!-- markup -->
</template>

<script>
export default {
  name: 'WidgetAccordion',
}
</script>

<script setup>
const props = defineProps({
  items: Array,
})
</script>
```

Rules:
- **No `<style>` tag** in `.vue` — styles always in sibling `style.scss`
- **No TypeScript** in `.vue` files or composables — intentional
- **`Lazy` prefix** for heavy components: `<LazyPagesHomeProjects />`
- **Auto-imported** — never import components manually

---

## app.vue

```vue
<template>
  <div>
    <NuxtLayout>
      <NuxtLoadingIndicator :color="'#000'" />
      <NuxtPage />
    </NuxtLayout>
  </div>
</template>

<script setup>
// Init smooth scroll and provide to all children
const { lenis } = useLenis()
provide('lenis', lenis)

// Fetch global CMS config — always use an explicit key
await useAsyncData('site-configuration', () => useStore().fetchConfiguration())

const { locale } = useI18n()
watch(() => locale.value, async () => {
  await useAsyncData('site-configuration', () => useStore().fetchConfiguration())
})
</script>
```

---

## error.vue

```vue
<template>
  <div>
    <NuxtLayout>
      <div class="page page-error">
        <div v-html="error.statusCode === 500 ? $t('errors.500.text') : $t('errors.404.text')" />
        <NuxtLink :to="$localePath({ name: 'index' })" external>Home</NuxtLink>
      </div>
    </NuxtLayout>
  </div>
</template>

<script setup>
const props = defineProps({
  error: { type: Object, required: true },
})

console.error(props.error)  // keep — required to surface the error

const { lenis } = useLenis()
provide('lenis', lenis)
</script>
```

---

## layouts/default.vue

```vue
<template>
  <main class="layout-default">
    <NavigationMenu />
    <SeoTemplatePreset>
      <slot />
    </SeoTemplatePreset>
    <FooterMain />
  </main>
</template>

<script setup></script>
```

Single layout for the entire app. Navigation, cursor, footer all live here.

---

## SCSS Architecture

### scss-react — breakpoints

Repo: https://github.com/DidoMarchet/scss-react

```scss
/* mixins/_utility.scss */
@use 'sass:list';
@use 'sass:string';
@use 'scss-react/dist/index';
@use 'scss-slamp/dist/index';

$react_breakpoints: (
  '<medium':   (max-width: 749px),
  '<large':    (max-width: 999px),
  'landscape': (orientation: landscape),
  'portrait':  (orientation: portrait),
);
```

Usage:
```scss
.component {
  width: 100%;

  @include react('<medium') {
    width: 50%;
  }

  @include react('landscape') {
    height: auto;
  }
}
```

### scss-slamp — fluid sizing

Repo: https://github.com/DidoMarchet/scss-slamp

Scales a value fluidly between `min` and `max` based on viewport width. Defaults: root=16px, min-vp=480px, max-vp=1600px.

```scss
font-size:  slamp(18px, 32px);
padding:    slamp(16px, 100px);
margin-top: slamp(40px, 120px);
gap:        slamp(8px, 24px);
```

### Module system — `@use` / `@forward` (never `@import`)

```scss
/* vars/_index.scss */
@forward 'colors';
@forward 'fonts';
@forward 'spacing';
@forward 'timings';

/* mixins/_index.scss */
@forward 'utility';
@forward 'fonts';
@forward 'buttons';
@forward 'links';
@forward 'input';

/* _core.scss — injected globally via Vite additionalData */
@forward 'vars/index';
@forward 'mixins/index';
```

Component `style.scss` files get vars and mixins automatically — no import needed.

### Layout system

```scss
/* layout/_layout.scss */
%row {
  box-sizing: content-box;
  margin-left: auto;
  margin-right: auto;
}

.row-1 {
  @extend %row;
  padding-left: slamp(16px, 100px);
  padding-right: slamp(16px, 100px);
  max-width: 1600px;

  .row-1 { padding: 0; width: 100%; }  // nested row resets its own padding
}

.row-2 {
  @extend %row;
  padding-left: slamp(16px, 400px);
  padding-right: slamp(16px, 400px);
  max-width: 1170px;
}

.row-3 {
  @extend %row;
  padding-left: slamp(16px, 800px);
  padding-right: slamp(16px, 400px);
  max-width: 700px;
}

.flex { display: flex; align-items: flex-start; }
.flex.--column                { flex-direction: column; }
.flex.--align-center          { align-items: center; }
.flex.--align-right           { align-items: flex-end; }
.flex.--justify-space-between { justify-content: space-between; }
.flex.--justify-center        { justify-content: center; }
.flex.--justify-end           { justify-content: flex-end; }
.flex-1 { flex: 1; }
```

### Typography

```scss
/* typo/_heading.scss */
.title-xl { font-size: slamp(40px, 75px); }
.title-l  { font-size: slamp(32px, 60px); }
.title-m  { font-size: slamp(24px, 48px); }
.title-s  { font-size: slamp(18px, 32px); }
```

---

## Composables

All composables are `.js` — no TypeScript. Intentional choice.

### useGraphql — GraphQL query wrapper

```js
// composables/graphql.js
export const useGraphql = async (query, variablesInput, options = { executeSSR: true }) => {
  const data = ref(null)
  const loading = ref(false)

  // Accept both reactive and plain objects
  const variables = isRef(variablesInput) ? variablesInput : ref(variablesInput)

  const executeQuery = async (vars) => {
    try {
      loading.value = true
      const result = await useAsyncQuery(query, vars, { fetchPolicy: 'cache-and-network' })
      data.value = result.data.value
    } catch (e) {
      console.error(e)
    } finally {
      loading.value = false
    }
  }

  if (options.executeSSR) await executeQuery(variables.value)

  watch(() => variables.value, (newVars) => executeQuery(newVars))

  return { data, loading }
}
```

### useApiFetch — REST API with retry + token refresh

```js
// composables/api-fetch.js

// Retry only network errors of idempotent methods: a POST or PATCH may have reached
// the server before the connection dropped, and once a response has arrived the
// request already happened — repeating it would duplicate it.
const RETRYABLE_METHODS = ['GET', 'HEAD', 'PUT', 'DELETE']

export const useApiFetch = ({ endpoint = '', initialToken = null, refreshTokenFunction = null } = {}) => {
  const data = ref(null)
  const error = ref(null)
  const loading = ref(false)
  const authToken = ref(initialToken)

  const fetchWithRetry = async (url, options, retries = 3) => {
    loading.value = true
    error.value = null
    try {
      const response = await fetch(url, options).catch((e) => {
        if (retries > 0 && RETRYABLE_METHODS.includes(options.method)) return null
        throw e
      })
      if (!response) return await fetchWithRetry(url, options, retries - 1)
      if (!response.ok) {
        if (response.status === 401 && retries > 0 && refreshTokenFunction) {
          await refreshTokenFunction()
          options.headers.Authorization = `Bearer ${authToken.value}`
          return await fetchWithRetry(url, options, retries - 1)
        }
        error.value = response
        return response
      }
      const contentType = response.headers.get('Content-Type') || ''
      if (contentType.includes('application/pdf')) return await response.blob()
      const result = await response.json()
      data.value = result
      return result
    } catch (e) {
      error.value = e
      return e
    } finally {
      loading.value = false
    }
  }

  const request = async ({ method = 'GET', api = '', params = {}, headers = {}, token = null } = {}) => {
    const usedToken = token || authToken.value
    const opts = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(usedToken ? { Authorization: `Bearer ${usedToken}` } : {}),
        ...headers,
      },
      body: ['POST', 'PUT', 'PATCH'].includes(method) ? JSON.stringify(params) : null,
    }
    const base = endpoint.replace(/\/+$/, '')
    const path = api.replace(/^\/+/, '')
    const url = method === 'GET' && Object.keys(params).length
      ? `${base}/${path}?${new URLSearchParams(params)}`
      : `${base}/${path}`
    return fetchWithRetry(url, opts)
  }

  return {
    data, error, loading, request,
    setToken: (t) => (authToken.value = t),
    clearToken: () => (authToken.value = null),
  }
}
```

### useLenis — smooth scroll

```js
// composables/lenis.js
export const useLenis = () => {
  const lenis = ref(null)

  onMounted(() => {
    lenis.value = new Lenis()
    lenis.value.on('scroll', ScrollTrigger.update)
    window.lenis = lenis.value  // intentional: page transition files use window.lenis (non-Vue context)
    gsap.ticker.add((time) => lenis.value.raf(time * 1000))
    gsap.ticker.lagSmoothing(0)
  })

  onUnmounted(() => lenis.value?.destroy())

  return { lenis }
}
```

### useSeo — SEO + hreflang

```js
// called in page <script setup>
useSeo({
  title: 'Page Title',
  meta: [{ name: 'description', content: '...' }],
  link: [],
  localeParams: { it: { slug: 'slug-it' }, en: { slug: 'slug-en' } },
  market: [{ slug: 'it' }, { slug: 'en' }],  // hreflang fallback (CMS-driven)
})
```

Output: `"${title} | ${siteName} ${market}"` + OG tags + hreflang + `setI18nParams()`.

---

## State Management — Pinia composition style

```js
// stores/index.js
import { defineStore } from 'pinia'
import queries from '@/graphql/craft/queries/index.js'

export const useStore = defineStore('store', () => {
  const { locale } = useI18n()
  const configuration = ref(null)

  const fetchConfiguration = async () => {
    const { data } = await useAsyncQuery(queries.site.getConfig, { locale: locale.value })
    configuration.value = data.value
  }

  return { configuration, fetchConfiguration }
})
```

---

## Page Structure

```vue
<!-- pages/product/[slug]/index.vue -->
<template>
  <div class="page page-product">
    <div class="page__wrap" data-animate="page-wrap">
      <PagesProductHeader :header="product.header[0]" />
      <div data-animate="page-content">
        <LazyPagesProductSpecifications :specs="product.specifications" />
      </div>
    </div>
  </div>
</template>

<script>
export default { name: 'PageProduct' }
</script>

<script setup>
import queries from '@/graphql/craft/queries/index.js'
import { onBeforeEnter, onEnter, onLeave } from '~/assets/js/page-transitions/product.js'

definePageMeta({
  layout: 'default',
  pageTransition: {
    onBeforeEnter: (el) => onBeforeEnter(el),
    onEnter: async (el, done) => {
      const tl = onEnter(el, done)
      await tl.delay(0.5).play()
      done()
    },
    onLeave: async (el, done) => {
      const tl = onLeave(el)
      await tl.play()
      window.lenis.scrollTo(0, { immediate: true })
      done()
    },
  },
})

// storeToRefs keeps it reactive: app.vue refetches the configuration on locale change
const { configuration } = storeToRefs(useStore())
const variables = computed(() => ({
  site: configuration.value.site,
  slug: useRoute().params.slug,
}))

const { data } = await useGraphql(queries.product.getProduct, variables)

if (!data.value?.productEntries?.[0]) throw createError({ statusCode: 404 })

const product = computed(() => data.value.productEntries[0])

useSeo({
  ...product.value.seo,
  meta: [{ name: 'description', content: product.value.seo?.description }],
})
</script>
```

---

## Page Transitions

One file per page in `assets/js/page-transitions/`. Standard targets: `data-animate="page-wrap"` and `data-animate="page-content"`.

```js
// assets/js/page-transitions/product.js
import { gsap } from 'gsap'

export const onBeforeEnter = (el) => {
  gsap.set('[data-animate="page-wrap"]', { opacity: 0 })
}

export const onEnter = (el, done) => {
  return gsap.timeline({ paused: true })
    .to('[data-animate="page-wrap"]', { opacity: 1, duration: 0.5, ease: 'power2.out' })
}

export const onLeave = (el) => {
  return gsap.timeline({ paused: true })
    .to('[data-animate="page-wrap"]', { opacity: 0, duration: 0.3, ease: 'power2.in' })
}
```

---

## Animation Directives — client-only plugin

```js
// plugins/animation-directives.client.js
import { revealText } from '~/plugins/animation-directives/reveal-text.js'
import { scrollSpeed } from '~/plugins/animation-directives/scroll-speed.js'
import { parallaxElement } from '~/plugins/animation-directives/parallax-element.js'

export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.vueApp.directive('anim-reveal-text', {
    mounted(el) { revealText(el) },
  })
  nuxtApp.vueApp.directive('anim-scroll-speed', {
    mounted(el, binding) { scrollSpeed(el, binding) },
  })
  nuxtApp.vueApp.directive('anim-parallax-element', {
    mounted(el, binding) { parallaxElement(el, binding) },
  })
})
```

Usage: `v-anim-reveal-text`, `v-anim-scroll-speed`, `v-anim-parallax-element`.

---

## Sentry Plugin — client-only

```js
// plugins/sentry.client.js
import * as Sentry from '@sentry/vue'
import { browserTracingIntegration } from '@sentry/vue'

export default defineNuxtPlugin((nuxtApp) => {
  const router = useRouter()
  const { public: { sentryURL, enviroment } } = useRuntimeConfig()

  if (!sentryURL) { console.warn('Missing Sentry dsn'); return }

  Sentry.init({
    app: nuxtApp.vueApp,
    environment: enviroment,
    dsn: sentryURL,
    integrations: [browserTracingIntegration({ router })],
    tracesSampleRate: 1.0,
  })
})
```

---

## GraphQL — query organization

```js
// graphql/craft/queries/index.js
import * as home from './home.js'
import * as product from './product.js'
import * as news from './news.js'

export default { home, product, news }
```

```js
// graphql/craft/queries/product.js
import { seoFragment } from '../fragments/seo.js'

export const getProduct = gql`
  ${seoFragment}
  query GetProduct($site: [String], $slug: [String]) {
    productEntries(site: $site, slug: $slug) {
      id
      title
      slug
      seo { ...SeoFragment }
    }
  }
`
```

Apollo fetch policy: always `cache-and-network`.

---

## Static Data — `bucket/`

Nav links, filter arrays, country lists, static config → `app/bucket/` as plain JS exports. Never in stores, never in the CMS.

```js
// bucket/navigations.js
export const navMenu = {
  linksMain: [
    { key: 'products', route: { name: 'products' } },
    { key: 'projects', route: { name: 'projects-index' } },
  ],
}
```

---

## Linting

### eslint.config.mjs

```js
import { createConfigForNuxt } from '@nuxt/eslint-config/flat'
import prettierPlugin from 'eslint-plugin-prettier'
import prettierConfig from 'eslint-config-prettier'

export default createConfigForNuxt({})
  .append(
    {
      files: ['**/*.js', '**/*.ts', '**/*.vue'],
      plugins: { prettier: prettierPlugin },
      rules: {
        'vue/multi-word-component-names': 'off',
        'no-console': 'off',
        'no-undef': 'off',
        'prettier/prettier': 'error',
        '@typescript-eslint/no-explicit-any': 'off',
      },
    },
    prettierConfig,
    { ignores: ['node_modules/**', '.nuxt/**', '.output/**', 'dist/**', 'public/**'] }
  )
```

### stylelint.config.mjs

```js
export default {
  ignoreFiles: ['node_modules/**', 'dist/**', 'public/**', '.nuxt/**', '.output/**'],
  extends: [
    'stylelint-config-standard-scss',
    'stylelint-config-standard-vue/scss',
  ],
  rules: {
    'selector-max-compound-selectors': 6,
    'selector-class-pattern': null,
    'function-name-case': null,
    'selector-id-pattern': null,
    'selector-pseudo-element-no-unknown': null,
    'keyframes-name-pattern': null,
    'custom-property-no-missing-var-function': null,
    'color-function-notation': 'legacy',
    'selector-no-qualifying-type': null,
    'alpha-value-notation': 'number',
    'no-descending-specificity': null,
  },
}
```

---

## Nuxt Quick Reference

1. **Thin `nuxt.config.ts`** — config in `configuration/`, never inline
2. **Nuxt 4: source in `app/`** — pages, components, composables, stores all inside `app/`
3. **`stores/` plural** — Nuxt convention
4. **Component = folder** — `category/name/index.vue + style.scss`, no `<style>` in `.vue`
5. **Dual script block** — `<script>` for `name`, `<script setup>` for logic — intentional
6. **`.js` composables/plugins** — no TypeScript in composables/plugins — intentional
7. **`@use`/`@forward` SCSS** — never `@import` (deprecated in Dart Sass)
8. **`slamp()` for sizing** — fluid, never hardcoded px for anything that should scale
9. **`@include react()`** — max 2 breakpoints (`<medium`, `<large`) + 2 orientations
10. **`.row-1/2/3` layout** — standard content widths, not custom wrappers
11. **`window.lenis`** — set by `useLenis()`, used in page transitions (non-Vue context) — correct
12. **`bucket/` for static data** — nav, filters, lists: not stores, not CMS
13. **`.client.js` suffix** — for leaflet, sentry, animation directives
14. **Page transitions** — `assets/js/page-transitions/[page].js`, one per page
15. **`useAsyncData` with explicit key** — always, to avoid SSR hydration mismatches
16. **ISR without TTL** — `{ isr: true }` intentional, revalidate on redeploy
17. **`cache-and-network`** — Apollo fetch policy everywhere
