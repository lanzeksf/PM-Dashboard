# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

**OG** — Kern Steel Fabrication (KSF)'s internal PM tool. Standalone application,
NOT a module inside FabOS. Deployed via GitHub → Vercel (for visual QA:
https://pm-dashboard-liard.vercel.app), mirrored to internal Gitea
(Kern_Steel/PM-Dashboard) — the copy IT (Jose) uses to scope database work.
Migrating on-prem with its own dedicated PostgreSQL database and schema
(independent of FabOS's schema — no shared tables, no mirror-table pattern).

Visual target: restyled to match FabOS's design tokens (colors, fonts) for
brand consistency — but this is cosmetic only. OG's data model, backend, and
API integrations are entirely independent of FabOS.

The app has a **shell** (user picker → soon real login, nav, routing) wrapping
work modules. Kern Bot and RFI Log are fully built and live with real data.
Others are in progress or stubbed as Coming Soon.

**Stack:** React 18, Vite 5, inline CSS-in-JS (no CSS files, no Tailwind),
custom pub/sub state store (no Redux/Zustand). Backend: Postgres + Prisma
(in progress — see Database section below). Until connected, app state is
in-memory and resets on page reload.

## Commands

```bash
npm run dev       # Start dev server (Vite, localhost:5173)
npm run build     # Production build → dist/
npm run preview   # Preview production build locally
```

No lint or test commands — none are configured.

## Environment

Requires a `.env.local` file (frontend) with:
```
VITE_ANTHROPIC_API_KEY=sk-ant-...
VITE_SHELL_USERS=...
VITE_PROJECTSIGHT_CONSUMER_KEY=...
VITE_PROJECTSIGHT_CONSUMER_SECRET=...
VITE_PROJECTSIGHT_USAGE_PLAN_KEY=...
```

And a `.env` file (backend/Prisma — never prefix these with VITE_, they must
never reach the browser bundle):
```
DATABASE_URL=postgresql://...
```

Set frontend vars in **Vercel → Project Settings → Environment Variables**
for production. Backend `.env` vars are local-only / server-only, never in Vercel.

**Note:** `VITE_PROJECTSIGHT_ACCESS_TOKEN` is no longer used. The app
auto-fetches a fresh OAuth token at runtime. Do not re-add the static token.

## Database (in progress)

Local Postgres is installed on Lanze's machine, being configured. Production
database will be provisioned by IT (Jose) as a dedicated instance — its own
schema, not a copy of FabOS's mirror tables.

Schema is managed via Prisma. Current/planned models:
- **User** — id, email, passwordHash, name, initials, color, position, role
  (enum: admin, sr_pm, apm, coordinator, superintendent, mfg_eng, field),
  department (nullable enum: Structural, Solar, Aero), lastLoginAt, createdAt
- **Session** — id, userId, token, expiresAt, createdAt
- RFI/Issue/Change Order tables — to be designed once ProjectSight/Spectrum
  data-sourcing details are confirmed (see Data Sourcing section)

```bash
npx prisma generate       # Regenerate client after schema changes
npx prisma migrate dev    # Create and apply a migration (local)
npx prisma migrate deploy # Apply pending migrations (production)
```

No shared dev database. Local Postgres only during development.

## Data Sourcing

- **ProjectSight** — OG calls the API directly (see `projectsight/projectsightApi.js`).
  Not routed through any FabOS mirror table.
- **Spectrum** — piggybacks off `ksf-metric`'s existing Spectrum calls. Exact
  mechanism (shared table vs. direct endpoint reuse) unconfirmed — pending
  response from the team.
- **FabOS integration** — explicitly out of scope for this repo. If/when OG's
  data needs to reach FabOS, that's Jim's responsibility on his end.

## File Structure

```
├── index.html                     # Global CSS reset, font links
├── vite.config.js                 # Vite + React plugin + local dev proxy for ProjectSight
├── vercel.json                    # Rewrite rules for ProjectSight proxy in production
├── prisma/
│   └── schema.prisma               # Database schema (in progress)
└── src/
    ├── main.jsx
    ├── core/
    │   ├── utils.jsx               # C, F, MI, USERS_LIST, ROLE_MODULES, helpers
    │   └── store.js
    ├── components/
    │   ├── UI.jsx
    │   ├── Files.jsx
    │   ├── Chat.jsx
    │   └── Panels.jsx
    ├── shell/
    │   └── Shell.jsx                # UserPicker (→ real login once DB connected)
    ├── projectsight/
    │   └── projectsightApi.js
    ├── rfi/
    │   └── RFIApp.jsx
    ├── kernbot/
    │   ├── KernBotApp.jsx
    │   ├── kernBot.js
    │   ├── ChatPane.jsx
    │   └── QueueDetail.jsx
    └── dashboard/
        └── DashboardApp.jsx
```

## Architecture

### Shell + Module pattern

Same as before — `src/main.jsx` renders `<KSFCommandCenter KernBotApp={KernBotApp}/>`.
To add a module: create `src/<module>/ModuleApp.jsx`, import in `Shell.jsx`,
add a tab entry to `ALL_NAV_ITEMS`, add the render case, register the module
ID in `ROLE_MODULES`.

### Auth / User State (transitioning)

Currently a no-password user picker. **Being replaced with real login** backed
by the `User`/`Session` tables above — email + password, Argon2 hashing, first
login forces a password reset from an admin-issued temp password. No self-service
signup. No SSO, no shared auth with FabOS/Azure AD — standalone by design.

### State

Unchanged — `src/core/store.js` reactive store, `useStore()` hook. Holds
`.chats`, `.queue`, `.standards`. `resolveByPMQ()` / `unresolveByPMQ()` sync
both chats and queue atomically.

### Kern Bot

`src/kernbot/kernBot.js` calls the Anthropic API directly from the browser
(`anthropic-dangerous-direct-browser-access: true`), model `claude-sonnet-4-5`,
max_tokens 1024. Confidence is parsed heuristically from response text
(regex on keywords like "certain", "likely", "uncertain") — not returned by
the API. Sources are extracted by regex matching AISC 360/303, AWS D1.1,
AISC CoSP, KSF SOP patterns in the response. The last 10 non-escalation
messages from conversation history are sent as context.

### ProjectSight Integration

`src/projectsight/projectsightApi.js` handles all Trimble API calls.

**Auth:** OAuth2 client_credentials grant. Token fetched automatically at
runtime using `VITE_PROJECTSIGHT_CONSUMER_KEY` and
`VITE_PROJECTSIGHT_CONSUMER_SECRET` with `scope=ProjectSight`. Cached in
memory, refreshed automatically on 401/403. Do NOT use a static access token.

**Proxy:** All calls go through `/projectsight-api/...`, rewritten to
`https://api-usw2.trimblepaas.com/...` by Vercel in production and by
`vite.config.js` in local dev.

### Escalation Flow

1. User asks Kern Bot — bot answers with confidence score
2. If confidence < 80% or user not satisfied — Escalate button appears
3. `EscalateModal` collects: project #, type, urgency, PS ref, additional context
4. PMQ ticket created in `store.queue` + escalation notice bubble added to originating chat
5. Lanze or Loren see it in their KB Queue panel with full thread and metadata
6. They reply — `role: "pm"` bubble appears back in originating user's chat thread
7. Either side marks resolved — `resolveByPMQ()` syncs both chats and queue

## Roles, Users & Permissions

### USERS_LIST (`src/core/utils.jsx`)

| ID | Name | Position | Role | Tier | canRespond | stdWrite | Department |
|---|---|---|---|---|---|---|---|
| lanze | Lanze A. | Manufacturing Engineer | admin | admin | true | true | — |
| loren | Loren C. | Senior PM | sr_pm | sr_pm | true | true | — |
| jr | JR | Superintendent | superintendent | standard | false | false | all |
| josh | Josh | Project Manager | coordinator | standard | false | false | Structural |
| tony | Tony S. | Project Coordinator | coordinator | standard | false | false | Structural |
| luis | Luis A. | Assistant PM | apm | standard | false | false | Solar |
| adam | Adam K. | Assistant PM | apm | standard | false | false | Aero |
| lisbet | Lisbet L. | Intern | apm | standard | false | false | — (sees all) |
| jacob | Jacob T. | Field Coordinator | field | standard | false | false | — |

### ROLE_MODULES (`src/core/utils.jsx`)

| Module | admin | sr_pm | apm | coordinator | superintendent | mfg_eng | field |
|---|---|---|---|---|---|---|---|
| kernbot | yes | yes | yes | yes | yes | yes | yes |
| dashboard | yes | yes | yes | yes | yes | yes | yes |
| queue (KB internal) | yes | yes | no | no | no | no | no |
| owner | yes | yes | yes | yes | yes | no | yes |
| scope | yes | yes | yes | yes | yes | no | yes |
| changes | yes | yes | yes | yes | yes | no | no |
| detailing | yes | yes | yes | yes | yes | no | no |
| rfi | yes | yes | yes | yes | yes | no | no |
| issuetriage | yes | yes | yes | yes | yes | yes | no |
| fab | yes | yes | yes | yes | yes | yes | yes |
| field | yes | yes | yes | yes | yes | no | yes |
| standards read | yes | yes | yes | yes | yes | yes | yes |
| standards write | yes | yes | no | no | no | no | no |
| contracts | yes | yes | yes | yes | no | yes | yes |
| user_mgmt | yes | yes | no | no | no | no | no |
| system_config | yes | no | no | no | no | no | no |

Within KernBotApp: `isAdmin` = tier `admin` or `sr_pm` — gates queue access
and reply rights. `user.stdWrite` gates standards editing.

## Key Exports

### `core/utils.jsx`
- **C** — color palette (FabOS tokens): bg `#0d0e0f`, sidebar `#15171a`,
  surface `#1c1f23`, surface2 `#252a30`, border `rgba(240,237,229,0.08)`,
  borderHi `rgba(240,237,229,0.16)`, text `#f0ede5`, muted `#a8a59a`,
  hint `#6b6964`, accent `#d4af3c` (gold — the only accent),
  accentDim `rgba(212,175,60,0.14)`, accentText `#0d0e0f`,
  success `#7fb582`, warning `#d4a44a`, danger `#c87878`,
  pm `#a78bfa` (role-badge exception only — never nav/buttons/data)
- **F** — font stack: display (Fraunces — dashboard titles/big numbers only),
  head (Inter Tight — card/section titles), body (Inter — running text),
  mono (JetBrains Mono — IDs, dates, money, RFI numbers)
- **MI** — SVG icon map: rename, escalate, resolve, unresolve, delete,
  remove, archive, paperclip, download, expand, close, pdf, file
- **USERS_LIST** — full user array (see table above)
- **ROLE_MODULES** — role string → allowed module IDs array
- **PROJECT_TYPES** — `["Aero", "Solar", "Structural", "General question"]`
- **URGENCY_OPTS** — `["Low", "Medium", "High"]`
- **VERTICALS** — `["All", "Structural", "Solar", "Aero"]`
- **fmtRel(iso)**, **fmtDate(iso)**, **fmtBytes(b)** — formatting helpers
- **nowStamp()**, **nextId()**, **nextPMQ()** — ID generators
- **makePMQ(n)** — produces `PMQ-YYYY-XXXX`
- **isImage(f)**, **isPDF(f)**, **readFileAsDataURL(file)** — file helpers
- **MAX_FILE_SIZE** (8MB), **MAX_ATTACHMENTS** (6)

### `core/store.js`
- **store** — reactive store with `.chats`, `.queue`, `.standards` getters
- **useStore()** — React hook, re-renders caller on every `store.notify()`
- **Seed data:** 2 standards entries (anchor rod sizing, material substitution approval)

### `projectsight/projectsightApi.js`
- **getProjects()** — all projects across both portfolios with `vertical` and `portfolioId`
- **getRFIs(portfolioId, projectId)** — RFIs for a project
- **getSubmittals(portfolioId, projectId)** — submittals for a project
- **getIssues(portfolioId, projectId)** — Issues; tries 3 endpoint patterns, falls back to mock data with `_isMock: true`
- Auth: auto-fetches OAuth token via `client_credentials` with `scope=ProjectSight`, caches in memory, refreshes on 401/403

## Data Models

```js
// Chat
{ id, owner, title, createdAt, lastActivity, escalated, resolved, unread, pmqId?,
  msgs: [{ id, role, text, confidence?, sources?, attachments?, escalationNotice?, name?, unread? }] }

// Queue item
{ id, pmqId, title, from, fromPos, project, projectType, urgency, psRef,
  createdAt, resolved, additionalContext,
  thread: [{ id, role, name, text, confidence? }] }

// Standard
{ id, title, vertical, version, body, updatedBy, updatedAt, status, history: [] }

// User
{ id, name, initials, color, position, role, tier, canRespond, stdWrite, badge, department }
```

## Style Conventions

- All styling is inline CSS objects — no CSS files, no Tailwind, no CSS modules
- Colors always from `C` in `core/utils.jsx` — never hardcode hex values
- Fonts always from `F` in `core/utils.jsx` — never hardcode font names
- Icons always from `MI` in `core/utils.jsx`
- Dark theme only for now (light theme tokens reserved for future use, not implemented)
- No external UI component libraries

## Git & Commit Rules

Never run any git commands (commit, push, add, or any git operation) without
completing all of the following steps first:

1. List every file that was changed, added, or deleted in this session
2. Show the proposed commit message
3. Wait for explicit approval from me — I will say "go ahead", "approved", or "yes" to confirm
4. Only after receiving that confirmation, run the git commands

This applies to every session, every commit, no exceptions. Even if I say
"make the changes and push" — still pause at step 3 and confirm before executing.

For file edits:
- Always show a diff before applying any change to a file
- Wait for me to accept the diff before writing it
- Never auto-accept edits

Pushes go to **both** remotes (GitHub and Gitea) to keep them in sync —
confirm with me before pushing to either, and confirm which remotes to push to.