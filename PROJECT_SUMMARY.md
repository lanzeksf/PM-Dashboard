# KSF Command Center — Project Summary
> Use this file as context at the start of any new session to get Claude up to speed immediately.

---

## What This Is

A React web application serving as an internal tool for **Kern Steel Fabrication (KSF)** in Bakersfield, CA. It has two layers: a **shell** (auth, nav, routing) wrapping a set of work modules, and **Kern Bot** — the only fully-built module — an AI assistant powered by the Anthropic API.

**Stack:** React 18, Vite 5, plain CSS-in-JS (inline styles throughout), custom pub/sub state store (no Redux/Zustand). No backend — all state is in-memory and resets on page reload. Deployed on Vercel.

---

## File Structure

```
ksf-final/
├── index.html                    # Entry HTML with global CSS reset (margin:0, height:100%, overflow:hidden)
├── vite.config.js                # Vite + React plugin config
├── package.json                  # React 18, react-dom, @vitejs/plugin-react, vite 5
├── vercel.json                   # { buildCommand, outputDirectory, framework }
├── .gitignore                    # Excludes node_modules/, dist/, .env*, users.config.json
├── .env.example                  # Template showing required env vars (safe to commit)
├── users.config.example.json     # Legacy template (no longer used by app)
└── src/
    ├── main.jsx                  # ReactDOM.createRoot — wires KSFCommandCenter + KernBotApp
    ├── core/
    │   ├── utils.jsx             # Theme (C), helpers, users (USERS_LIST), icons (MI)
    │   └── store.js              # Reactive store + useStore hook + seed data
    ├── components/
    │   ├── UI.jsx                # ConfBadge, UrgBadge, VerBadge, CtxMenu, SourcePanel
    │   ├── Files.jsx             # useAttachments hook, AttachTray, AttachDisplay, Viewer, PDFViewer
    │   ├── Chat.jsx              # RenderMD, Bubble, RenameModal, EscalateModal
    │   └── Panels.jsx            # ChatRow, QueueRow, StdList, StdEditor
    ├── shell/
    │   └── Shell.jsx             # SHELL_USERS, NAV_ITEMS, ComingSoon, LoginScreen,
    │                             #   ShellLogin, ShellSidebar, KSFCommandCenter (default export)
    └── kernbot/
        ├── KernBotApp.jsx        # Root of Kern Bot feature, sidebar state, escalation logic
        ├── kernBot.js            # Anthropic API call, system prompt, source/confidence parsing
        ├── ChatPane.jsx          # Chat UI — message list, input, quick prompts, drag-drop
        └── QueueDetail.jsx       # PM queue thread view, inline metadata editing, reply composer
```

---

## Environment Variables (Vercel)

Set in **Vercel → Project Settings → Environment Variables**. No `.env` file needed for deployment.

| Variable | Value | Purpose |
|---|---|---|
| `VITE_ANTHROPIC_API_KEY` | `sk-ant-...` | Kern Bot API calls |
| `VITE_LOGIN_PASSWORD` | any string | Shared password for all shell logins |

### How auth works
- `SHELL_USERS` array is hardcoded in `Shell.jsx` (emails, names, colors — not secret)
- `VITE_LOGIN_PASSWORD` is the single shared password checked against all logins
- When a real auth backend is added: replace the `handleLogin()` lookup in `Shell.jsx` with an API call

---

## Import Map (quick reference)

| From | To reach |
|---|---|
| `core/store.js` | `./utils.jsx` |
| `components/*` | `../core/utils.jsx`, `../core/store.js`, `./SiblingComponent.jsx` |
| `shell/Shell.jsx` | `../core/utils.jsx` |
| `kernbot/*` | `../core/utils.jsx`, `../core/store.js`, `../components/X.jsx`, `./SiblingFile` |

---

## Key Exports

### `core/utils.jsx`
- **`C`** — color palette (bg, surface, surface2, border, borderHi, text, muted, hint, accent, accentDim, accentText, success/Dim, warning/Dim, danger/Dim, pm/Dim)
- **`MI`** — SVG icon map (rename, escalate, resolve, unresolve, delete, remove, archive, paperclip, download, expand, close, pdf, file)
- **`USERS_LIST`** — 7 team members: `{ id, name, initials, color, position, tier, canRespond }`
- **`PROJECT_TYPES`**, **`URGENCY_OPTS`**, **`VERTICALS`** — dropdown option arrays
- **`fmtRel(iso)`**, **`fmtDate(iso)`**, **`fmtBytes(b)`** — formatting helpers
- **`nowStamp()`**, **`nextId()`**, **`nextPMQ()`** — ID generators
- **`makePMQ(n)`** — produces `PMQ-YYYY-XXXX`
- **`isImage(f)`**, **`isPDF(f)`**, **`readFileAsDataURL(file)`** — file utilities
- **`MAX_FILE_SIZE`** (8MB), **`MAX_ATTACHMENTS`** (6)

### `core/store.js`
- **`store`** — reactive store with `.chats`, `.queue`, `.standards` getters + CRUD methods
  - `addChat(c)`, `updateChat(id, patch)`, `removeChat(id)`
  - `addQueue(q)`, `updateQueue(id, patch)`, `removeQueue(id)`
  - `addStd(s)`, `updateStd(id, patch)`
  - `resolveByPMQ(pmqId)`, `unresolveByPMQ(pmqId)` — syncs both chats and queue
  - `subscribe(fn)` / `notify()`
- **`useStore()`** — React hook, re-renders caller on any `store.notify()`

### `components/UI.jsx`
- **`ConfBadge({ s })`** — confidence % badge (green ≥90, yellow ≥80, red <80)
- **`UrgBadge({ u })`** — urgency pill (High/Medium/Low)
- **`VerBadge({ v })`** — vertical pill (All/Structural/Solar/Aero)
- **`CtxMenu({ items, onClose, style })`** — floating context menu; items are `{ icon, label, fn, danger? }` or `"---"`
- **`SourcePanel({ source, onClose })`** — 320px slide-in citation panel (knowledge base stub)

### `components/Files.jsx`
- **`useAttachments()`** — hook returning `{ attachments, error, openPicker, handleFiles, removeAt, clear, fileInput }`
- **`AttachTray({ attachments, onRemove })`** — composing tray above textarea
- **`AttachDisplay({ attachments, onView })`** — renders attachments inside a bubble
- **`Viewer({ file, onClose })`** — fullscreen image/PDF lightbox (pdf.js loaded from CDN)

### `components/Chat.jsx`
- **`RenderMD({ text })`** — inline markdown renderer (bold, italic, ul, ol, paragraphs)
- **`Bubble({ m, isMe, userColor, userInitials, onView, onSourceClick })`** — message bubble for user/bot/pm roles
- **`RenameModal({ current, onSave, onClose })`**
- **`EscalateModal({ msgs, onSubmit, onClose })`** — collects project#, type, PS ref, urgency, context

### `components/Panels.jsx`
- **`ChatRow`** — sidebar row for chat conversations, with 3-dot context menu
- **`QueueRow`** — sidebar row for PMQ queue items
- **`StdList({ user })`** — Standards library list + inline `StdEditor` (versioned, A → A.1 → A.2…)

### `shell/Shell.jsx`
- **`SHARED_PASSWORD`** — reads from `import.meta.env.VITE_LOGIN_PASSWORD`
- **`SHELL_USERS`** — hardcoded array of 7 users (no passwords — auth uses `SHARED_PASSWORD`)
- **`NAV_ITEMS`** — 9 nav tabs: kernbot, dashboard, rfi, scope, changes, fab, field, owner, detailing
- **`ComingSoon({ label })`** — placeholder for unbuilt modules
- **`LoginScreen({ onLogin })`** — avatar-picker login (used inside KernBot sub-app)
- **`default KSFCommandCenter({ KernBotApp })`** — root shell; takes KernBotApp as prop to avoid circular imports

### `kernbot/kernBot.js`
- **`callKernBot(userMessage, conversationHistory, attachments)`** — async, returns `{ text, sources, confidence }`
- System prompt tuned to KSF domain: AISC/AWS standards, fab procedures, aerospace EO rules, solar AHJ rules
- Confidence scored heuristically from response text (not from API)
- Sources parsed via regex for AISC 360/303, AWS D1.1, AISC CoSP, KSF SOP
- Model: `claude-sonnet-4-5`

### `kernbot/KernBotApp.jsx`
- **`KernBotApp({ preloadUser })`** — root of Kern Bot, manages all chat/queue/standards state
- Also re-exports **`USERS_LIST`** from `core/utils.jsx` for Shell compatibility

---

## Data Models

### Chat
```js
{ id, owner, title, createdAt, lastActivity, escalated, resolved, unread, pmqId?,
  msgs: [{ id, role, text, confidence?, sources?, attachments?, escalationNotice?, name?, unread? }] }
```
- `role`: `"user"` | `"bot"` | `"pm"`

### Queue Item
```js
{ id, pmqId, title, from, fromPos, project, projectType, urgency, psRef,
  createdAt, resolved, additionalContext,
  thread: [{ id, role, name, text, confidence? }] }
```
- `role`: `"issuer"` | `"bot"` | `"pm"`

### Standard
```js
{ id, title, vertical, version, body, updatedBy, updatedAt, status, history: [] }
```

### User (USERS_LIST — used by KernBot inner app)
```js
{ id, name, initials, color, position, tier: "admin"|"standard", canRespond: bool }
```

### Shell User (SHELL_USERS — used by shell login)
```js
{ id, name, role, initials, color, email }
// No password field — auth uses shared VITE_LOGIN_PASSWORD env var
```

---

## Business Rules (enforced in bot system prompt)
- **Aerospace** (Lockheed/USAF): any field modification requires written Engineering Order — no exceptions
- **Material substitutions**: written EOR approval before fabrication — no verbals
- **Solar carports**: AHJ permit confirmed before construction
- **Confidence < 80%**: UI shows warning and escalation prompt
- **Only Loren C.** (`canRespond: true`) can reply to queue items

---

## Team
| Name | Role | ID | Color |
|---|---|---|---|
| Loren C. | Senior PM (admin, decision-maker) | loren | #a78bfa |
| Lanze A. | Manufacturing Engineer | lanze | #22c55e |
| Tony S. | Structural Coordinator | tony | #38bdf8 |
| Luis A. | Solar APM | luis | #f59e0b |
| Jillian H. | Solar Coordinator | jillian | #f472b6 |
| Adam K. | Aerospace Engineer | adam | #fb923c |
| Jacob T. | Field Coordinator | jacob | #4ade80 |

---

## What's Built vs Stubbed

| Module | Status | Location |
|---|---|---|
| Shell auth (email + shared password) | ✅ Complete | `shell/Shell.jsx` |
| Kern Bot chat (Claude API) | ✅ Complete | `kernbot/` |
| File attachments (image, PDF, docs) | ✅ Complete | `components/Files.jsx` |
| PM escalation queue | ✅ Complete | `kernbot/QueueDetail.jsx` |
| Standards library (versioned) | ✅ Complete | `components/Panels.jsx` |
| Source citation panel | 🔧 UI stub | `components/UI.jsx → SourcePanel` |
| Standards → prompt injection | 🔧 Not wired | `kernbot/kernBot.js` |
| Dashboard | 🚧 ComingSoon | — |
| RFI Log | 🚧 ComingSoon | — |
| Scope Tracker | 🚧 ComingSoon | — |
| Change Orders | 🚧 ComingSoon | — |
| Fabrication & Shipping | 🚧 ComingSoon | — |
| Field Needs | 🚧 ComingSoon | — |
| Owner Pending | 🚧 ComingSoon | — |
| Detailing | 🚧 ComingSoon | — |

---

## Style Conventions
- All styling is inline CSS objects — no CSS files, no Tailwind, no CSS modules
- Color tokens always come from `C` in `core/utils.jsx` — never hardcoded
- Icons always come from `MI` in `core/utils.jsx`
- Dark theme: bg `#0a0a0a`, surface `#111111`, surface2 `#1a1a1a`
- Accent blue: `#5b7cfa` / PM purple: `#a78bfa`
- Font: `-apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif`
- No external UI libraries

---

## Known Issues / Next Steps
- `SourcePanel` is a stub — knowledge base documents not yet connected
- Standards library entries are not injected into the Kern Bot system prompt
- All state is in-memory — resets on page reload (no persistence layer yet)
- Single shared password for all users — replace with real auth (Supabase, Clerk, etc.) when ready
