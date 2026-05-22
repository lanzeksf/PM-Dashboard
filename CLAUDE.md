# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

A React web application serving as an internal tool for **Kern Steel Fabrication (KSF)** in Bakersfield, CA. Currently deployed on **Vercel**, pending on-prem migration with Postgres. The app has a **shell** (user picker, nav, routing) wrapping a set of work modules. **Kern Bot** is the only fully-built module. All others are stubbed as Coming Soon, ready to be built out.

This app is a **module within the larger FabOS platform**. All new modules and significant features must align with FabOS architecture — job anchors, event publishing, action items, and job context threads. See FabOS alignment section below.

**Stack:** React 18, Vite 5, inline CSS-in-JS (no CSS files, no Tailwind), custom pub/sub state store (no Redux/Zustand). No backend yet — all state is in-memory and resets on page reload.

## Commands

```bash
npm run dev       # Start dev server (Vite, localhost:5173)
npm run build     # Production build → dist/
npm run preview   # Preview production build locally
```

No lint or test commands — none are configured.

## Environment

Requires a `.env.local` file with the following variables:
```
VITE_ANTHROPIC_API_KEY=sk-ant-...
VITE_SHELL_USERS=...
VITE_PROJECTSIGHT_CONSUMER_KEY=...
VITE_PROJECTSIGHT_CONSUMER_SECRET=...
VITE_PROJECTSIGHT_USAGE_PLAN_KEY=...
```

Set in **Vercel → Project Settings → Environment Variables** for production.

**Note:** `VITE_PROJECTSIGHT_ACCESS_TOKEN` is no longer used. The app auto-fetches a fresh OAuth token at runtime. Do not re-add the static access token.

## File Structure

```
├── index.html                     # Global CSS reset — margin:0, height:100%, overflow:hidden
├── vite.config.js                 # Vite + React plugin + local dev proxy for ProjectSight
├── vercel.json                    # Rewrite rules for ProjectSight proxy in production
└── src/
    ├── main.jsx                   # ReactDOM.createRoot — wires KSFCommandCenter + KernBotApp
    ├── core/
    │   ├── utils.jsx              # C, MI, USERS_LIST, ROLE_MODULES, helpers, file utils
    │   └── store.js               # Reactive store + useStore hook + seed data
    ├── components/
    │   ├── UI.jsx                 # ConfBadge, UrgBadge, VerBadge, CtxMenu, SourcePanel
    │   ├── Files.jsx              # useAttachments, AttachTray, AttachDisplay, Viewer, PDFViewer
    │   ├── Chat.jsx               # RenderMD, Bubble, RenameModal, EscalateModal
    │   └── Panels.jsx             # ChatRow, QueueRow, StdList, StdEditor
    ├── shell/
    │   └── Shell.jsx              # UserPicker, ShellSidebar, KSFCommandCenter (default export)
    ├── projectsight/
    │   └── projectsightApi.js     # ProjectSight service layer — getProjects, getRFIs, getSubmittals, getIssues
    ├── rfi/
    │   └── RFIApp.jsx             # RFI Dashboard + Issue Triage module (~580 lines)
    ├── kernbot/
    │   ├── KernBotApp.jsx         # Kern Bot root — sidebar, chat/queue/standards state
    │   ├── kernBot.js             # Anthropic API call, system prompt, source + confidence parsing
    │   ├── ChatPane.jsx           # Chat UI — message list, input, quick prompts, drag-drop
    │   └── QueueDetail.jsx        # PM queue thread view, metadata editor, reply composer
    └── dashboard/
        └── DashboardApp.jsx       # Dashboard stub (Coming Soon)
```

## Import Map

| File | Imports from |
|---|---|
| core/store.js | ./utils.jsx |
| components/* | ../core/utils.jsx, ../core/store.js, ./Sibling.jsx |
| shell/Shell.jsx | ../core/utils.jsx |
| kernbot/* | ../core/utils.jsx, ../core/store.js, ../components/X.jsx, ./Sibling |
| rfi/RFIApp.jsx | ../core/utils.jsx, ../projectsight/projectsightApi.js |

## Architecture

### Shell + Module pattern

`src/main.jsx` renders `<KSFCommandCenter KernBotApp={KernBotApp}/>`. The shell owns user auth (a no-password user picker) and tab routing. Each feature is a self-contained module folder. Queue and Standards are **not** shell-level tabs — they are internal KernBotApp views.

To add a new module: create `src/<module>/ModuleApp.jsx`, import it in `Shell.jsx`, add a tab entry to `ALL_NAV_ITEMS`, and add the render case in the `<main>` block. Register the module ID in `ROLE_MODULES` in `core/utils.jsx` to control which roles see it.

### Auth / User State

Login is a user picker — no password. Click your name on the landing screen to enter. Sign-out button in the sidebar footer returns to the picker. The selected user flows into `KernBotApp` as `preloadUser`. When Postgres is connected, replace the picker with real auth and wire `currentUser` to the authenticated session.

### State

`src/core/store.js` exports a single reactive `store` object. Components subscribe via the `useStore()` hook, which increments a tick counter on every `store.notify()` call, triggering a re-render. The store holds `.chats`, `.queue`, and `.standards`. `resolveByPMQ()` / `unresolveByPMQ()` sync both chats and queue atomically.

### Kern Bot

`src/kernbot/kernBot.js` calls the Anthropic API directly from the browser (`anthropic-dangerous-direct-browser-access: true`), model `claude-sonnet-4-5`, max_tokens 1024. Confidence is parsed heuristically from response text (regex on keywords like "certain", "likely", "uncertain") — not returned by the API. Sources are extracted by regex matching AISC 360/303, AWS D1.1, AISC CoSP, KSF SOP patterns in the response. The last 10 non-escalation messages from conversation history are sent as context.

### ProjectSight Integration

`src/projectsight/projectsightApi.js` handles all Trimble API calls.

**Auth:** OAuth2 client_credentials grant. Token is fetched automatically at runtime using `VITE_PROJECTSIGHT_CONSUMER_KEY` and `VITE_PROJECTSIGHT_CONSUMER_SECRET` with `scope=ProjectSight`. Token is cached in memory and refreshed automatically on 401/403. Do NOT use a static access token.

**Proxy:** All calls go through `/projectsight-api/...` which is rewritten to `https://api-usw2.trimblepaas.com/...` by Vercel in production and by `vite.config.js` in local dev.

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

| ID | Name | Position | Role | Tier | canRespond | stdWrite |
|---|---|---|---|---|---|---|
| lanze | Lanze A. | Manufacturing Engineer | admin | admin | true | true |
| loren | Loren C. | Senior PM | sr_pm | sr_pm | true | true |
| tony | Tony S. | Project Coordinator | coordinator | standard | false | false |
| luis | Luis A. | Assistant Project Manager | apm | standard | false | false |
| jillian | Jillian H. | Project Coordinator | coordinator | standard | false | false |
| adam | Adam K. | Assistant Project Manager | apm | standard | false | false |
| jacob | Jacob T. | Field Coordinator | field | standard | false | false |

### ROLE_MODULES (`src/core/utils.jsx`)

| Module | admin | sr_pm | apm | coordinator | field |
|---|---|---|---|---|---|
| kernbot | yes | yes | yes | yes | yes |
| dashboard | yes | yes | yes | yes | yes |
| queue (KB internal) | yes | yes | no | no | no |
| owner | yes | yes | yes | yes | yes |
| scope | yes | yes | yes | yes | yes |
| changes | yes | yes | yes | yes | yes |
| detailing | yes | yes | yes | yes | no |
| rfi | yes | yes | yes | yes | no |
| fab | yes | yes | yes | yes | yes |
| field | yes | yes | yes | yes | yes |
| standards read | yes | yes | yes | yes | yes |
| standards write | yes | yes | no | no | no |
| user_mgmt | yes | yes | no | no | no |
| system_config | yes | no | no | no | no |

Within KernBotApp: `isAdmin` = tier `admin` or `sr_pm` — gates queue access and reply rights. `user.stdWrite` gates standards editing.

## Key Exports

### `core/utils.jsx`
- **C** — color palette: bg `#0a0a0a`, surface `#111111`, surface2 `#1a1a1a`, border, borderHi, text `#ededed`, muted `#aaaaaa`, hint `#777777`, accent `#5b7cfa`, accentDim, accentText `#8eaafe`, success `#34d399`, warning `#fbbf24`, danger `#f87171`, pm `#a78bfa` + Dim variants
- **MI** — SVG icon map: rename, escalate, resolve, unresolve, delete, remove, archive, paperclip, download, expand, close, pdf, file
- **USERS_LIST** — full user array
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
- Icons always from `MI` in `core/utils.jsx`
- Dark theme: bg `#0a0a0a`, surface `#111111`, surface2 `#1a1a1a`
- Accent blue `#5b7cfa` / text on accent `#8eaafe` / PM purple `#a78bfa`
- Font: `-apple-system, BlinkMacSystemFont, Segoe UI, system-ui, sans-serif`
- No external UI component libraries

## FabOS Platform Alignment

This app is a module within the **FabOS platform** — KSF's unified AI-at-the-center operating system. Every module built here must align with FabOS architecture. Sign-off authority for FabOS architectural decisions: **Jim (Operations Manager)**.

### The four requirements for every module:
1. **Link to the Job Anchor** — every meaningful data record must carry a `jobId` tied to a KSF job number
2. **Publish to the Event Bus** — meaningful state changes (submittal approved, RFI opened, milestone hit) must emit a structured event
3. **Create Action Items** — deadlines and pending approvals must generate action items that auto-escalate if overdue
4. **Feed the Job Context Thread** — significant events update the job's running narrative so the system builds memory over time

### Selective context reads — only load what the task requires:

**Before any non-trivial task**, read:
- `C:/Users/lanze/Desktop/GitHub/fabos-knowledge/company/context.md` — who KSF is, what we build
- `C:/Users/lanze/Desktop/GitHub/fabos-knowledge/company/glossary.md` — Strumis terms, industry acronyms
- `C:/Users/lanze/Desktop/GitHub/fabos-knowledge/tech/stack.md` — approved tools and frameworks
- `C:/Users/lanze/Desktop/GitHub/fabos-knowledge/platform/roadmap.md` — FabOS build sequence and priorities

**Before any UI/frontend work**, also read:
- `C:/Users/lanze/Desktop/GitHub/fabos-knowledge/design/design-system.md` — FabOS design tokens, typography, components

**Before building a new module**, also read:
- `C:/Users/lanze/Desktop/GitHub/fabos-knowledge/development/module-guide.md` — step-by-step module build checklist
- `C:/Users/lanze/Desktop/GitHub/fabos-knowledge/architecture/event-bus.md` — how to publish and subscribe to events
- `C:/Users/lanze/Desktop/GitHub/fabos-knowledge/architecture/data-model.md` — database schema and key models

**For bug fixes and small edits** — no FabOS reads required unless the change touches data models or state.

### Keeping the knowledge base current:
The `fabos-knowledge` folder is a local copy of Jim's Gitea repo. Pull updates periodically:
```bash
cd C:/Users/lanze/Desktop/GitHub/fabos-knowledge
git pull
```

## Git & Commit Rules

Never run any git commands (commit, push, add, or any git operation) without completing all of the following steps first:

1. List every file that was changed, added, or deleted in this session
2. Show the proposed commit message
3. Wait for explicit approval from me — I will say "go ahead", "approved", or "yes" to confirm
4. Only after receiving that confirmation, run the git commands

This applies to every session, every commit, no exceptions. Even if I say "make the changes and push" — still pause at step 3 and confirm before executing.

For file edits:
- Always show a diff before applying any change to a file
- Wait for me to accept the diff before writing it
- Never auto-accept edits
