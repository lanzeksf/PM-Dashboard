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

**Permissions note:** Claude Code has been configured (per Lanze's request)
to stop prompting for approval on individual bash commands. This does NOT
relax the git rule below — commit/push still require explicit approval every
time, confirmed separately from the bash-approval change. File edits still
show a diff before being written. If a future session finds bash commands
running without confirmation, that's expected; if git push/commit ever runs
without asking first, that's a regression — stop and flag it.

**FabOS deprioritized (Lanze's call):** FabOS integration is no longer an
active concern shaping OG's design. Priority is simply making OG functional
for the team. The `jobId` forward-compat field described just below is no
longer a live requirement — cheap to still include on new tables if it's
no extra effort, but don't spend design time accommodating a future FabOS
handoff. Jim's Job Anchor mapping is not something to plan around right now.

Visual target: restyled to match FabOS's design tokens (colors, fonts) for
brand consistency — cosmetic only, unaffected by the above. OG's data model,
backend, and API integrations are entirely independent of FabOS. OG's schema
is not adopting FabOS's mirror-table pattern.

The app has a **shell** — real login, password management, and user
management all built and verified (see Auth section below), nav, routing —
wrapping work modules. RFI Dashboard (RFIs + Issues tabs) and Kern Bot are
fully built and live with real data. Submittals tab is in progress. Others
are stubbed as Coming Soon.

**Stack:** React 18, Vite 5, inline CSS-in-JS (no CSS files, no Tailwind),
custom pub/sub state store (no Redux/Zustand). Backend: Postgres + Prisma,
plus a `server/` + `api/auth/*` + `api/users.js` layer for login, password
reset, and user management (see Database and Auth sections below — schema
pushed and seeded, login/password-reset/user-management verified at the API
layer; frontend click-through of the newest pieces pending).

## Commands

```bash
npm run dev       # Start dev server (Vite, localhost:5173) — primary review method during iteration
npm run build     # Production build → dist/
npm run preview   # Preview production build locally
```

No lint or test commands — none are configured.

### Emergency password reset (built and verified)

```bash
node scripts/reset-password.js <email>
# e.g. node scripts/reset-password.js lanze@kernsteel.com
```

For when someone is locked out and the built `admin-reset-password` UI flow
can't be used — either the person locked out is the only admin, or no admin
has completed their first login yet, so nobody can log in to click the
"Reset Password" button. Triggered by a real incident on 2026-08-06 where
Lanze got locked out with no other admin yet through first login, and the
fix had to be improvised on the spot as a one-off script — this is that
script made permanent.

Looks up the `User` by email, generates a new temp password, hashes it with
Argon2, sets `mustChangePassword: true`, deletes that user's existing
`Session` rows, and prints the plaintext temp password once to console —
never persisted. Not a plain SQL UPDATE — passwords are Argon2-hashed in
Node, so this script is the only way anyone can do a manual reset outside
the running app, including Jose (server admin), who already has confirmed
DB access to `pm_dashboard` but can't produce a valid hash via raw SQL.

The reset logic (hash + update + delete sessions) lives once in
`server/resetPassword.js`, shared by this script and
`api/auth/admin-reset-password.js` — the temp-password generator itself
(`server/tempPassword.js`) is shared a third way with `prisma/seed.js`, so
there's exactly one implementation of each, not three. Verified end-to-end
against the real DB: unknown email exits non-zero without creating a user,
a real reset produces a temp password that logs in successfully, and the
target's old password and existing sessions are dead immediately after.

**Open decision, not urgent:** whether this needs a safeguard (confirm
prompt, or restricting which `DATABASE_URL` it can target) before it
becomes something Jose runs directly against the on-prem production DB.

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
DATABASE_URL=postgresql://pm_dashboard:PASSWORD@192.168.0.9:5432/pm_dashboard
```

**Important:** use the network address `192.168.0.9`, not `localhost` — see
Database section below for why. Set frontend vars in **Vercel → Project
Settings → Environment Variables** for production. Backend `.env` vars are
local-only / server-only, never in Vercel.

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

- **`&` in the repo's parent folder path breaks native/binary tooling on
  Windows — hit 3 separate times now, treat as a known recurring cost, not a
  one-off.** `cmd.exe` treats an unescaped `&` (e.g. a folder literally named
  `Gitea&Github`) as a command separator. Confirmed to break: `npm install`
  installing `argon2` (native postinstall via `node-pre-gyp`), `npx prisma
  migrate dev`, and `npm run dev` (vite). Workarounds used each time: invoking
  `node node_modules/prisma/build/index.js` / `node node_modules/vite/bin/vite.js`
  directly instead of through `npx`/npm scripts. Wouldn't happen on Vercel
  (different container/path) — Lanze's local Windows path only. **Worth
  actually renaming the folder** (e.g. to `Gitea-Github`) rather than
  continuing to work around this per-tool; ask if a walkthrough is wanted.
- Stray zombie Vite processes can hold a file lock and block Prisma client
  regeneration — if `prisma generate` hangs or errors oddly, check for and
  kill leftover `node`/vite processes from earlier dev-server runs first.
- `DATABASE_URL` must point to `192.168.0.9`, not `localhost`/`127.0.0.1`/
  `::1` — see Database section immediately below for why.

## Database (schema pushed and seeded)

**Correction to an earlier assumption:** Postgres is not running locally on
Lanze's machine. Confirmed via `psql`'s own server banner
(`server 18.3 (Debian 18.3-1.pgdg13+1)`) — the real database server is a
Debian box elsewhere on the local network, reachable at `192.168.0.9`,
managed by IT (Jose). `localhost` connections were failing simply because no
server was listening there; `192.168.0.9` is the actual address.

**Ownership, confirmed with Jose:** Jose manages the server itself, but the
`pm_dashboard` database on it is dedicated to this app only — not shared.
Other consumers get their own separate databases on the same server. This
matches the original design intent (own dedicated database/schema, no
shared tables) rather than contradicting it. Still open, not blocking:
whether this same box is the eventual `ksf-metric` production server or a
separate one.

`prisma/schema.prisma`: `User` and `Session` models, `Role` and `Department`
enums, plus `User.passwordResetRequestedAt DateTime?` (added for the
forgot-password flow, see Auth section). **Schema is live on the real
database and seeded.** The `pm_dashboard` role doesn't have `CREATEDB`, so
it can't create the shadow database `prisma migrate dev` needs — used
`prisma db push` instead. Trade-off: **no `prisma/migrations/` history file
exists** — the live schema is in sync with `schema.prisma`, but there's no
tracked diff of how it got there. Fine for this initial setup; if/when this
needs proper tracked migrations (e.g. before persisting RFI/Issue/Submittal
data, or before a production deploy), ask Jose for `CREATEDB` or a separate
shadow database at that point, then switch back to `migrate dev` going
forward. `prisma/seed.js` ran clean — all 9 rows created (see Roles section
for emails), each with a random temp password, `mustChangePassword: true`.
Temp passwords were relayed to Lanze directly when the seed ran; not stored
anywhere in code or docs.

**Next planned schema work (not yet started):** persisting RFI/Issue/
Submittal/ChangeOrder data into Postgres instead of always live-fetching
from ProjectSight — targeted for "next week." No FabOS-linkage requirement
on this (see FabOS note above); design purely for OG's own needs.

Deviations from the original design, worth remembering when touching this
area again:

- `User.id` is a plain slug (`"lanze"`, `"loren"`, ...), **not** a generated
  `cuid()`. Confirmed necessary by reading `RFIApp.jsx:1106-1119` directly:
  the "sees all projects" check is `user.id === "lanze" || user.id ===
  "loren"` for the explicit branch, with everyone else falling through to
  `KSF_LEAD_MAP[user.id]` — `null` for Lisbet and `undefined` for JR, both of
  which hit the "see everything" fallback. A generated ID would have
  silently broken this for all four of those accounts. Keep IDs as stable
  slugs matching `USERS_LIST`; don't "clean this up" to a generated ID later
  without updating every one of those checks first.
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
  revocation is just deleting a row. (About to change from short-lived to a
  long-lived sliding window — see Auth section, "stay logged in" work.)
- Local dev needs the Vite middleware added in `vite.config.js` to actually
  execute `api/*.js` — plain `npm run dev` wouldn't otherwise run Vercel-style
  serverless handlers at all. Same handler files run in both dev and
  production; only the dev-only req/res shim differs.

```bash
npx prisma generate       # Regenerate client after schema changes
npx prisma db push        # Push schema directly — what's used here (no CREATEDB on pm_dashboard role)
npx prisma migrate deploy # Apply pending migrations (production) — N/A until migrations/ exists
```

## Data Sourcing

- **ProjectSight** — OG calls the API directly (see `projectsight/projectsightApi.js`).
  `getProjects()`, `getRFIs()`, `getIssues()`, `getSubmittals()` all exist;
  RFIs and Issues are live in the UI, Submittals API call exists but UI
  wiring is in progress. **No database persistence today** — every load
  hits ProjectSight fresh. **In progress:** a short in-memory cache (3-5 min
  TTL) is being added to reduce redundant calls, plus checking whether the
  OAuth token is being refetched per-call instead of reused (suspected part
  of the "slow API calls" issue below). Full persistence into Postgres is
  separate, planned for later (see Database section).
- **Spectrum** — piggybacks off `ksf-metric`'s existing Spectrum calls. Exact
  mechanism (shared table vs. direct endpoint reuse) unconfirmed — pending
  response from the team.
- **FabOS integration** — deprioritized, not currently a design constraint
  (see FabOS note near the top of this file).

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
├── scripts/
│   └── reset-password.js          # Planned — emergency password reset CLI, not yet built.
│                                    # See Commands section above and
│                                    # claude/Emergency-Password-Reset-Script-Spec.md
├── prisma/
│   ├── schema.prisma               # User/Session models, Role/Department enums, passwordResetRequestedAt — pushed and seeded
│   └── seed.js                     # Seeded one row per PM from USERS_LIST with real emails — done
├── server/
│   ├── prisma.js                   # Shared Prisma Client singleton
│   ├── auth.js                     # Cookie parsing/issuing, opaque session token lookup
│   └── userShape.js                # Reshapes a DB User row into the shape the rest of the app
│                                    # expects (derives tier/badge/department tag)
├── api/
│   ├── users.js                    # GET, admin-gated — lists all users for User Management
│   └── auth/
│       ├── login.js
│       ├── logout.js
│       ├── session.js
│       ├── change-password.js
│       ├── forgot-password.js      # Notify-only — flags passwordResetRequestedAt, same response whether email exists or not
│       └── admin-reset-password.js # Admin-gated — generates new temp password, clears the flag, kills existing sessions
└── src/
    ├── main.jsx
    ├── core/
    │   ├── utils.jsx               # C, F, MI (now incl. eye/eyeOff icons), USERS_LIST, ROLE_MODULES, helpers
    │   └── store.js
    ├── components/
    │   ├── UI.jsx
    │   ├── Files.jsx
    │   ├── Chat.jsx
    │   └── Panels.jsx
    ├── shell/
    │   └── Shell.jsx                # LoginForm + ChangePasswordForm (replaced UserPicker) + shared
    │                                 # PasswordInput (show/hide toggle) + "Forgot password?" link,
    │                                 # session restored on load via GET /api/auth/session
    ├── users/
    │   └── UserManagementApp.jsx    # Admin-only (Lanze/Loren) — list all users, Reset Password button
    │                                 # per row, wired into the existing user_mgmt nav slot
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
login/user-management work above also just rewrote large parts of
`Shell.jsx`, `package.json`, and `vite.config.js`. If running more than one
Claude Code session against this repo at once, avoid having two sessions
edit those same files uncommitted at the same time — commit one body of
work first, then start the next, to avoid one session silently overwriting
the other's changes on disk. (Lanze is running a separate chat scoped to
"other modules" alongside this one, which stays scoped to login/database.)

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

### Auth / User State (login, password management, user management — built)

Real login is built: `Shell.jsx`'s `UserPicker` has been replaced with a
`LoginForm` + `ChangePasswordForm`, backed by the `User`/`Session` tables
above — email + password, Argon2 hashing, session restored on page load via
`GET /api/auth/session`, sign-out calls `POST /api/auth/logout`. First login
forces a password reset from an admin-issued temp password
(`mustChangePassword`). No self-service signup. No SSO, no shared auth with
FabOS/Azure AD — standalone by design.

**Status — login core:** schema pushed, seed run clean, all 9 accounts
exist. `POST /api/auth/login` verified directly for lanze/loren/lisbet/jr —
all authenticate and return the correct shape. Lanze has already been
through the real `ChangePasswordForm` in the browser (confirmed via
`mustChangePassword: false` with a changed hash on her account) — the
frontend `mustChangePassword` handoff works.

**Status — password management (built, API-verified, frontend click-through
pending):**
- Show/hide toggle: shared `PasswordInput` component (new `MI.eye`/`MI.eyeOff`
  inline SVGs, none existed before) used on `LoginForm`'s password field and
  both fields on `ChangePasswordForm`. Defaults hidden.
- Forgot password (notify-only, by design — no self-service token/email
  reset flow): `POST /api/auth/forgot-password` sets
  `User.passwordResetRequestedAt`, returns an identical response whether or
  not the email matches (verified with a real and a fake email — same
  response both times, so this can't be used to enumerate valid emails).
  `LoginForm` shows: "If that email is registered, an admin has been
  notified. For anything urgent, reach out to Lanze or Loren directly."
  **Known gap (found via a real incident, 2026-08-06):** "an admin has been
  notified" is not currently true — nothing actually pings Lanze or Loren
  when this fires; it only sets a DB flag. If the person locked out is the
  only admin, or no admin has completed first login yet, this flow is a
  dead end — see the emergency password reset script above/in Open Items
  for the recovery path, and consider surfacing `passwordResetRequestedAt`
  somewhere in User Management as a real fix for the underlying gap.
- User Management module (`src/users/UserManagementApp.jsx`, wired into the
  existing `user_mgmt` nav slot — already admin/sr_pm-gated in
  `ROLE_MODULES`, so this is Lanze and Loren only): lists all 9 users via
  `GET /api/users`, with a "Reset Password" button per row hitting
  `POST /api/auth/admin-reset-password`. Both endpoints check the caller's
  real session server-side (`role === "admin" || "sr_pm"`), not just
  client-side hiding — verified: `loren` gets a 200 with all 9 users, `josh`
  (coordinator) gets 403 on both endpoints. Reset flow verified end-to-end
  against the real DB: resetting `jr` returned a one-time temp password,
  cleared his `passwordResetRequestedAt` flag, invalidated his old temp
  password, and the new one logs in correctly.

**Done — persistent "stay logged in" sessions (Gmail-style):** requested so
users don't have to re-log-in constantly on their own devices.
`SESSION_TTL_SECONDS` raised from 14 to 60 days in `server/auth.js` —
verified via a real login: cookie `Max-Age=5184000`, DB row's `expiresAt`
exactly 60 days out. Cookie was already persistent (explicit `Max-Age`,
`HttpOnly`, `SameSite=Lax`, conditional `Secure` for production). Sliding
window implemented in `getSessionUser()` (now takes `(req, res, prisma)`
instead of `(req, prisma)`) — every successful lookup extends the DB row's
`expiresAt` and reissues the cookie with a fresh Max-Age; all 4 call sites
(`session.js`, `change-password.js`, `users.js`, `admin-reset-password.js`)
updated. Verified live: a `GET /api/auth/session` call visibly pushed both
the cookie and the DB row's expiry forward. `admin-reset-password`'s
existing session wipe reconfirmed correct after this change (`josh`: 1
active session before reset, 0 after) — so it still doubles as a "log this
person out of their device right now" tool.

**Not yet verified (manual click-through, next):** the frontend
`mustChangePassword` handoff is confirmed for one account (Lanze); still
worth a second confirmation on a fresh temp-password account. Also not yet
clicked through: the password show/hide toggle, the forgot-password link,
and the User Management page's UI (verified at the API layer only so far).
No headless-browser tooling (Playwright etc.) set up for this — deliberately
skipped given the same `&`-in-path install risk; revisit only if frequent
regression testing on these flows becomes necessary.

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
`getToken()` already checks `_tokenCache` and only refetches on real expiry
or a 401/403 — confirmed correct by reading the code, no change needed.

**Proxy:** All calls go through `/projectsight-api/...`, rewritten to
`https://api-usw2.trimblepaas.com/...` by Vercel in production and by
`vite.config.js` in local dev.

**Done — cache + prefetch fix:** root cause of the "slow API calls on local
dev" complaint found — a stray, unconditional `getIssues(...)` call sitting
at module scope in `projectsightApi.js` (leftover debug line) was firing a
real Trimble API call on every page load, competing with the real prefetch.
Removed. New `makeCache()` helper (4-min TTL + in-flight de-dup) added,
reused for `getProjects()`, `getRFIs()`, and `getIssues()` — two callers
requesting the same project within the TTL window now get the same promise
instead of firing duplicate requests. `Shell.jsx`'s `prefetchProjectsight()`
now also warms Issues (previously RFIs only), so both RFI Dashboard tabs
open warm after login/session-restore. Manual refresh still bypasses the
cache — new exported `clearProjectsightApiCache()`, wired into
`RFIApp.jsx`'s `handleRefresh`.

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

Login emails for these 9 (seeded into `prisma/seed.js`, accounts created):
lanze@kernsteel.com, loren@kernsteel.com, demetrio@kernsteel.com (JR),
jlopez@kernsteel.com (Josh), antonio@kernsteel.com (Tony),
larrezola@kernsteel.com (Luis), adam@kernsteel.com, lisbet@kernsteel.com,
jtiffany@kernsteel.com (Jacob). Each has a temp password (relayed to Lanze
directly, or via `admin-reset-password` if reset later) and
`mustChangePassword: true` until they set a real one.

Note: `tier` was dropped as a separate field — admin-level access is derived
from `role === "admin" || role === "sr_pm"` directly, avoiding drift between
`tier` and `role`. If any component still checks `user.tier`, update it to
check `user.role` instead. This same `isAdmin` check is what gates the new
User Management module — Lanze and Loren today, automatically extends to
anyone else given `admin`/`sr_pm` in the future.

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
queue access and reply rights, and now also the User Management module.
`user.stdWrite` gates standards editing. "See all projects" visibility
(drives Team Member breakdown rendering) is existing per-role/per-user
logic — Lisbet sees all despite being `apm` role.

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
- **MI** — icon set, now includes `eye`/`eyeOff` (inline SVGs, added for the
  password show/hide toggle) alongside the existing icons
- **USERS_LIST**, **ROLE_MODULES**, **PROJECT_TYPES**, **URGENCY_OPTS**,
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
- **Done:** short in-memory cache (4-min TTL) per project's RFIs/Issues, see ProjectSight Integration section above

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

**This rule stays in force even with bash-command approval prompts turned
off elsewhere (see the Permissions note near the top of this file) — git
commit/push always require explicit approval, no exceptions.**

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

- **Emergency password reset script — planned, spec written, not yet
  built.** Triggered by a real lockout incident on 2026-08-06: Lanze
  couldn't log in, no other admin had completed first login yet, so the
  built `admin-reset-password` UI flow (requires being logged in as admin)
  couldn't be used, and the fix had to be improvised on the spot as a
  one-off script directly against the DB. Fix: `scripts/reset-password.js
  <email>` — full spec at `claude/Emergency-Password-Reset-Script-Spec.md`,
  command documented in the Commands section above. Reuses the existing
  temp-password generator and Argon2 logic from `seed.js`/
  `admin-reset-password.js` rather than duplicating it. Also exposed a
  secondary gap worth fixing: the forgot-password flow's "an admin has
  been notified" message isn't backed by any real notification today (see
  Auth section) — same underlying dead-end for any non-admin PM without a
  Claude Code session to fall back on.
- **PM login + password management — final manual check, then push.**
  Schema pushed, seeded, login/forgot-password/user-management all verified
  at the API layer (see Auth section). Remaining: Lanze click-tests the
  password show/hide toggle, the forgot-password link, and the User
  Management page in the browser. Once confirmed, normal diff-review/
  approval flow before any commit or push.
- **Persistent "stay logged in" sessions** — done, see Auth section (60-day
  sliding-window sessions, persistent cookie, verified live against the
  real DB). Folded into the same pending commit as the rest of the login
  work above.
- **Lightweight ProjectSight cache** — done, see ProjectSight Integration
  section (4-min in-memory TTL cache + in-flight de-dup, stray debug API
  call removed, prefetch now warms Issues too, manual refresh bypasses
  cache). Folded into the same pending commit.
- **Full RFI/Issue/Submittal persistence into Postgres** — planned for
  "next week," separate from the lightweight cache above. No FabOS-linkage
  design constraint anymore (see FabOS note).
- **Submittals tab** — paused mid-planning. Open questions: filter set (Detailer
  vs. "ball in court"), deep-link format (not yet confirmed with a real URL),
  whether Team Member breakdown applies given submittals may sit with parties
  outside your team (architect, sub) rather than a PM.
- **Loren's / everyone's Dashboard build** — paused mid-planning. Regular users
  see their own 3 stat cards (overdue RFI/Issue/Submittal). Overseers see a
  card grid, one per PM. Open questions: card click-through behavior, sort
  order, whether overseers also see their own personal cards separately.
- **Header job-count-by-vertical** — not yet built (see above).
- **Spectrum piggyback mechanism** — still awaiting team response.
- **Rename the local repo folder** to remove the `&` (e.g. `Gitea-Github`) —
  has now broken 3 separate installs/commands; no longer worth treating as
  low-priority.