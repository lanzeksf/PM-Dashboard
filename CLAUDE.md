# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

**OG** — Kern Steel Fabrication (KSF)'s internal PM tool. Standalone application,
NOT a module inside FabOS. Deployed via GitHub → Vercel
(https://pm-dashboard-liard.vercel.app), mirrored to internal Gitea
(Kern_Steel/PM-Dashboard) — the copy IT (Jose) uses to scope database work.
Migrating on-prem with its own dedicated PostgreSQL database and schema
(independent of FabOS's schema — no shared tables, no mirror-table pattern).

**Current workflow note:** during active iteration, work stays local only.
Vercel auto-deploys on any push to GitHub (inherent to the Vercel-GitHub
integration — there's no way to push to GitHub without triggering a deploy),
so pushing to GitHub is treated as equivalent to "push to Vercel" and requires
the same explicit go-ahead. Review changes via `npm run dev` (or `npm run build
&& npm run preview`) locally instead of relying on a Vercel preview URL. Only
push (to GitHub, Gitea, or both) when Lanze explicitly asks. Absent that
explicit instruction, all work stays uncommitted or committed-but-unpushed
locally.

Visual target: restyled to match FabOS's design tokens (colors, fonts) for
brand consistency — cosmetic only. OG's data model, backend, and API
integrations are entirely independent of FabOS. Forward-compat note: future
job-linked tables (Rfi, Issue, Submittal, ChangeOrder) should carry a `jobId`
field even though OG doesn't use it for anything itself yet — it's the field
Jim will need to map OG's records to FabOS's Job Anchor if/when he integrates.
Cheap to include now, expensive to backfill later. OG's schema is not
adopting FabOS's mirror-table pattern.

The app has a **shell** — real login (built, not yet migrated/seeded — see
Auth section below), nav, routing — wrapping work modules. RFI Dashboard
(RFIs + Issues tabs) and Kern Bot are fully built and live with real data.
Submittals tab is in progress. Others are stubbed as Coming Soon.

**Stack:** React 18, Vite 5, inline CSS-in-JS (no CSS files, no Tailwind),
custom pub/sub state store (no Redux/Zustand). Backend: Postgres + Prisma,
plus a small `server/` + `api/auth/*` layer for login (see Database and Auth
sections below — schema and endpoints are written, migration/seed not yet
run). Until migrated, app state is in-memory and resets on page reload.

## Commands

```bash
npm run dev       # Start dev server (Vite, localhost:5173) — primary review method during iteration
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

**Note:** some local `.env` files also carry a `JWT_SECRET` value and a
non-`VITE_`-prefixed `ANTHROPIC_API_KEY` — both currently unused. The auth
implementation uses opaque random session tokens looked up in the `Session`
table, not signed JWTs, so there's nothing to key `JWT_SECRET` for. The
server-side `ANTHROPIC_API_KEY` is reserved for a possible future server-side
Kern Bot. Safe to leave either value in `.env`; neither is read by any code
path today.

## Known local dev gotchas

- `argon2`'s native-binary postinstall shells out through `cmd.exe` on
  Windows. If the repo's parent folder path contains an unescaped `&` (e.g.
  a folder literally named `Gitea&Github`), `cmd.exe` treats it as a command
  separator and `npm install` fails installing `argon2` specifically.
  Workaround used: run `node-pre-gyp` directly instead of through npm's
  script wrapper. Wouldn't happen on Vercel (different container/path) — this
  is Lanze's local Windows path only. Long-term fix: rename the local folder
  to remove the `&`, since other native-module installs could hit the same
  wall later.

## Database (schema + login layer written, not yet migrated)

Local Postgres 18 is installed on Lanze's machine (Windows). Production
database will be provisioned by IT (Jose) as a dedicated instance on
ksf-metric — its own schema, not a copy of FabOS's mirror tables.

`prisma/schema.prisma` is written: `User` and `Session` models, `Role` and
`Department` enums. **Not yet migrated or seeded** — as of this writing,
blocked on getting a working local Postgres password (the `pm_dashboard`
role's password isn't authenticating; a direct `psql` connection with the
same credentials also fails, so it's not a client-side/encoding issue —
being re-confirmed with Jose). `prisma/seed.js` is written — one row per
person in `USERS_LIST`, guarded to refuse running until real email
addresses replace the placeholders currently in the file.

Deviations from the original design, worth remembering when touching this
area again:

- `User.id` is a plain slug (`"lanze"`, `"loren"`, ...), **not** a generated
  `cuid()`. Several components (`RFIApp.jsx`, `DashboardApp.jsx`) do
  `user.id === "lanze"`-style checks for "sees all projects" visibility — a
  generated ID would silently break those. Keep IDs as stable slugs matching
  `USERS_LIST`; don't "clean this up" to a generated ID later without
  updating every one of those checks first.
- `Department` enum is `Structural | Solar | Aero | All` — JR (superintendent)
  needed `All` to represent seeing every job; the original three-value
  Structural/Solar/Aero-only enum couldn't express that.
- `tier` and `badge` are not DB columns — both derived from `role` at the API
  layer (`server/userShape.js`), same reasoning as the existing `tier`/`role`
  drift note further below. `department` is similarly reshaped there from
  the DB's plain enum string into the `{label, color, bg}` tag object the UI
  already expects.
- No `SESSION_SECRET` / JWTs. Sessions are opaque random tokens stored in the
  `Session` table and looked up on each request — nothing to sign, so
  revocation is just deleting a row.
- Local dev needs the Vite middleware added in `vite.config.js` to actually
  execute `api/*.js` — plain `npm run dev` wouldn't otherwise run Vercel-style
  serverless handlers at all. Same handler files run in both dev and
  production; only the dev-only req/res shim differs.

```bash
npx prisma generate       # Regenerate client after schema changes
npx prisma migrate dev    # Create and apply a migration (local)
npx prisma migrate deploy # Apply pending migrations (production)
```

No shared dev database. Local Postgres only during development.

## Data Sourcing

- **ProjectSight** — OG calls the API directly (see `projectsight/projectsightApi.js`).
  Not routed through any FabOS mirror table. `getProjects()`, `getRFIs()`,
  `getIssues()`, `getSubmittals()` all exist; RFIs and Issues are live in the UI,
  Submittals API call exists but UI wiring is in progress.
- **Spectrum** — piggybacks off `ksf-metric`'s existing Spectrum calls. Exact
  mechanism (shared table vs. direct endpoint reuse) unconfirmed — pending
  response from the team.
- **FabOS integration** — explicitly out of scope for this repo. If/when OG's
  data needs to reach FabOS, that's Jim's responsibility on his end.

### Cross-record linking (RFI ↔ Issue)

Confirmed real, structured data — not free text. Both RFI and Issue API
responses carry a top-level `RecordToRecordLinks` array (sibling to
`FileLinks`/`RecordComments`, not nested inside them). Each entry:

```js
{
  TableType, RecordLinkID, ParentRecordID, LinkedRecordID,
  LinkedTableType, RecordNumber, RecordTitle,
  CreatedByDisplayName, WhenCreated, Deleted, DeleteRequested, ...
}
```

Confirmed table type codes (verified on one real linked pair — treat as
provisional if extending to new record types): `8` = RFI, `75` = Issue,
`15` = the link record itself. Filter on `LinkedTableType` to find links of a
given type; always exclude entries where `Deleted`/`DeleteRequested` are true.
Both RFIs and Issues for a project are already fetched, so resolving a link
needs no extra API call — just a client-side match on `LinkedRecordID`.

"Linked Issue" column exists on the RFIs tab; "Linked RFI" column exists on
the Issues tab. Both render as a chip (record number, title as tooltip) that
deep-links directly to ProjectSight.

### ProjectSight deep links (confirmed, per record type)

Each record type has its own URL path AND its own `PDT`/`PKID` pair — this is
NOT one shared path with a different PDT per type:

```
Issue: https://prod.projectsightapp.trimble.com/Web/app/Issues?orgid={portfolioGUID}&projid={projectID}&Action=Open&PDT=75&PKID={issueID}&OALD=1

RFI:   https://prod.projectsightapp.trimble.com/Web/app/RFI?orgid={portfolioGUID}&projid={projectID}&Action=Open&PDT=8&PKID={rfiID}&OALD=1
```

Submittal's deep-link pattern is NOT yet confirmed — don't assume it follows
either pattern above until a real URL is pulled from ProjectSight the same way
(open a submittal directly, or click a cross-reference link to one, and copy
the resulting URL).

The old list-level link pattern (`/Web/app/Project?listid=-4075...` for Issues
list, `listid=-4008...` for RFIs list) opens the record's tab/list, not the
specific record — do not use this for single-record links.

## File Structure

```
├── index.html                     # Global CSS reset, font links
├── vite.config.js                 # Vite + React plugin + local dev proxy for ProjectSight
│                                    # + dev middleware that runs api/*.js handlers under
│                                    # `npm run dev` (no `vercel dev` needed locally)
├── vercel.json                    # Rewrite rules for ProjectSight proxy in production
├── prisma/
│   ├── schema.prisma               # User/Session models, Role/Department enums — written, not yet migrated
│   └── seed.js                     # Seeds one row per PM from USERS_LIST — refuses to run until
│                                    # real emails replace placeholders
├── server/
│   ├── prisma.js                   # Shared Prisma Client singleton
│   ├── auth.js                     # Cookie parsing/issuing, opaque session token lookup
│   └── userShape.js                # Reshapes a DB User row into the shape the rest of the app
│                                    # expects (derives tier/badge/department tag)
├── api/
│   └── auth/
│       ├── login.js
│       ├── logout.js
│       ├── session.js
│       └── change-password.js
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
    │   └── Shell.jsx                # LoginForm + ChangePasswordForm (replaced UserPicker),
    │                                 # session restored on load via GET /api/auth/session
    ├── projectsight/
    │   └── projectsightApi.js
    ├── rfi/
    │   └── RFIApp.jsx               # "RFI Dashboard" module — RFIs + Issues tabs,
    │                                 # shared RecordCards/RecordTable components
    │                                 # driven by a per-tab `kind` config (rfi/issue),
    │                                 # not duplicated implementations
    ├── kernbot/
    │   ├── KernBotApp.jsx
    │   ├── kernBot.js
    │   ├── ChatPane.jsx
    │   └── QueueDetail.jsx
    └── dashboard/
        └── DashboardApp.jsx          # Stub — real build planned (per-PM overdue
                                       # counts across RFI/Issue/Submittal; overseer
                                       # view shows a card grid, one per PM)
```

## Architecture

### Shell + Module pattern

Same as before — `src/main.jsx` renders `<KSFCommandCenter KernBotApp={KernBotApp}/>`.
To add a module: create `src/<module>/ModuleApp.jsx`, import in `Shell.jsx`,
add a tab entry to `ALL_NAV_ITEMS`, add the render case, register the module
ID in `ROLE_MODULES`.

**Heads up for parallel work:** adding a module touches `Shell.jsx`, and the
login work above also just rewrote large parts of `Shell.jsx`, `package.json`,
and `vite.config.js`. If running more than one Claude Code session against
this repo at once, avoid having two sessions edit those same files
uncommitted at the same time — commit one body of work first, then start the
next, to avoid one session silently overwriting the other's changes on disk.

### RFI Dashboard module (RFIs / Issues / Submittals tabs)

Module nav label: "RFI Dashboard." Internal tabs: "RFIs" and "Issues" (both
live), "Submittals" (in progress). All three tabs render through the SAME
shared components (`RecordCards` for the searchable/expandable project card
grid, `RecordTable` for the flat filterable table) — each tab passes a `kind`
config (data accessors/labels) rather than having its own component
implementation. Any structural fix to one tab's cards/table should apply to
all tabs automatically; do not fork these components per record type.

Per-tab filter bar differs by relevance: RFIs keeps all filters (Job #,
Project, Detailer, Discipline, Status, Importance, Age Band). Issues drops
Detailer and Discipline. Submittals filter set not yet finalized — likely
needs "ball in court" instead of Detailer, TBD.

Stat cards (Total Open, Overdue, Due Within 7 Days, Avg Days Open) and
age-band coloring logic are shared/identical across all tabs.

### Team Member overview (overseer feature, not role-gated with a new flag)

On both RFIs and Issues tabs: a "By team member" breakdown table (Name,
Department, Open, Overdue, Avg Days Open, Oldest — single oldest, not
averaged) sits above the project cards. Default sort: Overdue descending
(worst first), toggleable, same header-click sort pattern as the table's
existing "DUE ↑" convention. A "Team member" filter also exists in the main
filter bar; clicking a breakdown-table row applies the same filter.

This section renders automatically for any user whose existing role already
grants "see all projects" visibility (admin, sr_pm, and any apm/other role
flagged to see all, e.g. Lisbet) — no separate permission flag was added.
Everyone else simply doesn't have that visibility already, so the section
doesn't render for them; this is existing logic, not new gating.

Dashboard (planned): the overseer's main Dashboard will show this same
per-person data as a card grid (one card per PM, their overdue RFI/Issue/
Submittal counts) rather than a table — reusing the same underlying data,
different presentation. Not yet built. Open questions before building:
whether cards are clickable (jump to that person's filtered tab view), sort
order, and whether overseers also see their own personal 3 stat cards
separately from the "everyone else" grid.

### Header job-count-by-vertical (planned, not yet built)

The "Live from ProjectSight · N projects" subtitle should break down by
vertical (Structural: x, Solar: y, Aero: z), sourced from the same field
already driving the Structural/Solar/Aero tags on project cards (set at job
setup in ProjectSight) — no new classification field needed.

### Auth / User State (built, not yet live)

Real login is built: `Shell.jsx`'s `UserPicker` has been replaced with a
`LoginForm` + `ChangePasswordForm`, backed by the `User`/`Session` tables
above — email + password, Argon2 hashing, session restored on page load via
`GET /api/auth/session`, sign-out calls `POST /api/auth/logout`. First login
forces a password reset from an admin-issued temp password
(`mustChangePassword`). No self-service signup. No SSO, no shared auth with
FabOS/Azure AD — standalone by design.

**Not yet live:** no migration has been run, no seed data exists yet.
Blocked on (1) a working local Postgres password (in progress with Jose) and
(2) real email addresses for all 9 PMs, which unblock `prisma/seed.js`. See
Database section above for the schema deviations from the original design
(plain-slug `User.id`, `Department.All`, no `SESSION_SECRET`).

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

**Known issue, under investigation:** API calls feel slow on local dev.
Not yet root-caused — check whether calls run sequentially vs. in parallel,
whether the OAuth token is being refetched per-call instead of cached, and
whether this is dev-server-specific or would also affect production, before
applying any fix.

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

| ID | Name | Position | Role | canRespond | stdWrite | Department |
|---|---|---|---|---|---|---|
| lanze | Lanze A. | Manufacturing Engineer | admin | true | true | — |
| loren | Loren C. | Senior PM | sr_pm | true | true | — |
| jr | JR | Superintendent | superintendent | false | false | all |
| josh | Josh | Project Manager | coordinator | false | false | Structural |
| tony | Tony S. | Project Coordinator | coordinator | false | false | Structural |
| luis | Luis A. | Assistant PM | apm | false | false | Solar |
| adam | Adam K. | Assistant PM | apm | false | false | Aero |
| lisbet | Lisbet L. | Intern | apm | false | false | — (sees all) |
| jacob | Jacob T. | Field Coordinator | field | false | false | — |

Login emails for these 9 (for `prisma/seed.js`): lanze@kernsteel.com,
loren@kernsteel.com, demetrio@kernsteel.com (JR), jlopez@kernsteel.com (Josh),
antonio@kernsteel.com (Tony), larrezola@kernsteel.com (Luis),
adam@kernsteel.com, lisbet@kernsteel.com, jtiffany@kernsteel.com (Jacob).

Note: `tier` was dropped as a separate field — admin-level access is derived
from `role === "admin" || role === "sr_pm"` directly, avoiding drift between
`tier` and `role`. If any component still checks `user.tier`, update it to
check `user.role` instead.

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

Within KernBotApp: `isAdmin` = `role === "admin" || role === "sr_pm"` — gates
queue access and reply rights. `user.stdWrite` gates standards editing.
"See all projects" visibility (drives Team Member breakdown rendering) is
existing per-role/per-user logic — Lisbet sees all despite being `apm` role.

## Key Exports

### `core/utils.jsx`
- **C** — color palette, light-content / dark-sidebar theme:
  - Sidebar/permanently-dark surfaces: `sidebar` `#0d0e0f`, plus the
    `onDark*` family (`onDarkSurface`, `onDarkSurface2`, `onDarkText`,
    `onDarkMuted`, `onDarkHint`, `onDarkBorder`, `onDarkBorderHi`) — reused
    exact old dark-theme hex values, for anything sitting on a permanently
    dark surface (Shell sidebar, KernBotApp internal sidebar, Files.jsx
    fullscreen Viewer)
  - Light-content tokens: `bg` `#f2f3f5`, `surface` `#ffffff`, `surface2`
    `#f8f9fb`, `border`/`borderHi` (dark-on-light hairlines), `text`
    `#14171a`, `muted` `#5b6066`, `hint` `#8b8f94`
  - `accent` `#d4af3c`-family (darkened variant for light-background
    contrast where needed), `accentText`, `success`/`warning`/`danger`
    (darkened for light-background contrast), `pm` (role-badge exception
    only — never nav/buttons/data)
- **F** — font stack: `display` (Fraunces — reserved for actual dashboard
  titles/headlines, not currently used for stat numbers), `head` (Inter
  Tight — card/section titles), `body` (Inter), `mono` (JetBrains Mono —
  IDs, dates, money, RFI numbers), `stat` (Outfit — RFI/day-count numbers
  specifically: stat cards, per-project numbers, breakdown table numbers)
- **MI**, **USERS_LIST**, **ROLE_MODULES**, **PROJECT_TYPES**, **URGENCY_OPTS**,
  **VERTICALS**, formatting/ID helpers — unchanged in shape from prior version

### `core/store.js`
- **store** — reactive store with `.chats`, `.queue`, `.standards` getters
- **useStore()** — React hook, re-renders caller on every `store.notify()`
- **Seed data:** 2 standards entries (anchor rod sizing, material substitution approval)

### `projectsight/projectsightApi.js`
- **getProjects()** — all projects across both portfolios with `vertical` and `portfolioId`
- **getRFIs(portfolioId, projectId)** — RFIs for a project, includes `RecordToRecordLinks`
- **getSubmittals(portfolioId, projectId)** — submittals for a project
- **getIssues(portfolioId, projectId)** — Issues, includes `RecordToRecordLinks`; tries 3 endpoint patterns, falls back to mock data with `_isMock: true`
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
{ id, name, initials, color, position, role, canRespond, stdWrite, badge, department }
```

## Style Conventions

- All styling is inline CSS objects — no CSS files, no Tailwind, no CSS modules
- Colors always from `C` in `core/utils.jsx` — never hardcode hex values
- Fonts always from `F` in `core/utils.jsx` — never hardcode font names
- Icons always from `MI` in `core/utils.jsx`
- Light-content / dark-sidebar theme: `C.sidebar` (and the `C.onDark*` family)
  stay permanently dark for the nav rail and the fullscreen file viewer;
  `C.bg`/`C.surface`/`C.text`/`C.muted`/`C.hint` are the light-content tokens
  used everywhere else. A single full light theme (flipping the sidebar too)
  is not implemented.
- Record-type tabs (RFIs/Issues/Submittals) share components via `kind` config
  — do not fork RecordCards/RecordTable per record type
- No external UI component libraries

## Git & Commit Rules

**Default workflow is local-only.** Do not push to GitHub or Gitea unless
Lanze explicitly asks (e.g. "push this to Vercel," "push to Gitea for
Jose," "go ahead and push"). Absent that explicit instruction, changes stay
committed locally at most — verified via `npm run dev` locally, never via a
Vercel preview URL. Pushing to GitHub always triggers a Vercel deploy
automatically (inherent to the Vercel-GitHub integration, cannot be pushed
without deploying) — treat "push to GitHub" and "deploy to Vercel" as the
same action requiring the same explicit go-ahead.

Never run any git commands (commit, push, add, or any git operation) without
completing all of the following steps first:

1. List every file that was changed, added, or deleted in this session
2. Show the proposed commit message
3. Wait for explicit approval from me — I will say "go ahead", "approved", or "yes" to confirm
4. Only after receiving that confirmation, run the git commands

This applies to every session, every commit, no exceptions. Even if I say
"make the changes" — that authorizes editing files and committing locally
at most, never a push, unless push is explicitly named.

For file edits:
- Always show a diff before applying any change to a file
- Wait for me to accept the diff before writing it
- Never auto-accept edits

When a push IS requested, confirm which remote(s) — GitHub (→ Vercel),
Gitea, or both — before running it.

## Open Items / Paused Work

- **PM login migration/seed** — schema and code written (see Auth/Database
  sections above). Blocked on a working local Postgres password from Jose,
  then real emails feed `prisma/seed.js`, then migrate + seed + test locally
  before any push.
- **Submittals tab** — paused mid-planning. Open questions: filter set (Detailer
  vs. "ball in court"), deep-link format (not yet confirmed with a real URL),
  whether Team Member breakdown applies given submittals may sit with parties
  outside your team (architect, sub) rather than a PM.
- **Loren's / everyone's Dashboard build** — paused mid-planning. Regular users
  see their own 3 stat cards (overdue RFI/Issue/Submittal). Overseers see a
  card grid, one per PM. Open questions: card click-through behavior, sort
  order, whether overseers also see their own personal cards separately.
- **Header job-count-by-vertical** — not yet built (see above).
- **Slow local API calls** — under investigation, not yet root-caused.
- **Spectrum piggyback mechanism** — still awaiting team response.