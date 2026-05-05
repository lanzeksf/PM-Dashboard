# KSF Command Center — Project Summary
> Paste this file at the start of any new session to give Claude full project context.

---

## What This Is

A React web application serving as an internal tool for **Kern Steel Fabrication (KSF)** in Bakersfield, CA. Currently deployed on **Vercel**, pending on-prem migration with Postgres. The app has a **shell** (user picker, nav, routing) wrapping a set of work modules. **Kern Bot** is the only fully-built module. All others are stubbed as Coming Soon, ready to be built out.

**Stack:** React 18, Vite 5, inline CSS-in-JS (no CSS files, no Tailwind), custom pub/sub state store (no Redux/Zustand). No backend yet — all state is in-memory and resets on page reload.

---

## File Structure

```
ksf-final/
├── index.html                     # Global CSS reset — margin:0, height:100%, overflow:hidden
├── vite.config.js                 # Vite + React plugin
├── package.json                   # react 18, react-dom, @vitejs/plugin-react, vite 5
├── vercel.json                    # { buildCommand, outputDirectory, framework }
├── .gitignore                     # Excludes node_modules/, dist/, .env*
├── .env.example                   # Shows VITE_ANTHROPIC_API_KEY (safe to commit)
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
    └── kernbot/
        ├── KernBotApp.jsx         # Kern Bot root — sidebar, chat/queue/standards state
        ├── kernBot.js             # Anthropic API call, system prompt, source + confidence parsing
        ├── ChatPane.jsx           # Chat UI — message list, input, quick prompts, drag-drop
        └── QueueDetail.jsx        # PM queue thread view, metadata editor, reply composer
```

---

## Environment Variables

Set in **Vercel → Project Settings → Environment Variables**.

| Variable | Purpose |
|---|---|
| `VITE_ANTHROPIC_API_KEY` | Kern Bot — required |

---

## Auth / User State

**Login is a user picker — no password.** Click your name on the landing screen to enter. Sign-out button in the sidebar footer returns to the picker. When Postgres is connected, replace the picker with real auth and wire `currentUser` to the authenticated session.

In `shell/Shell.jsx`, the selected user flows into `KernBotApp` as `preloadUser`.

---

## Roles, Users & Permissions

### USERS_LIST (src/core/utils.jsx)

| ID | Name | Position | Role | Tier | canRespond | stdWrite | Badge | Dept Tag |
|---|---|---|---|---|---|---|---|---|
| lanze | Lanze A. | Manufacturing Engineer | admin | admin | true | true | Admin — purple #a78bfa | none |
| loren | Loren C. | Senior PM | sr_pm | sr_pm | true | true | Senior PM — #c4b5fd | none |
| tony | Tony S. | Project Coordinator | coordinator | standard | false | false | none | Structural |
| luis | Luis A. | Assistant Project Manager | apm | standard | false | false | none | Solar |
| jillian | Jillian H. | Project Coordinator | coordinator | standard | false | false | none | Solar |
| adam | Adam K. | Assistant Project Manager | apm | standard | false | false | none | Aero |
| jacob | Jacob T. | Field Coordinator | field | standard | false | false | none | none |

### ROLE_MODULES (src/core/utils.jsx)
Defines which nav tabs each role sees. queue and standards are in this map for permission checking but are internal KernBot views, not shell-level tabs.

| Module | admin | sr_pm | apm | coordinator | mfg_eng | field |
|---|---|---|---|---|---|---|
| kernbot | yes | yes | yes | yes | yes | yes |
| dashboard | yes | yes | yes | yes | yes | yes |
| queue (KB) | yes | yes | no | no | no | no |
| owner | yes | yes | yes | yes | no | yes |
| scope | yes | yes | yes | yes | no | yes |
| changes | yes | yes | yes | yes | no | yes |
| detailing | yes | yes | yes | yes | no | no |
| rfi | yes | yes | yes | yes | no | no |
| fab | yes | yes | yes | yes | yes | yes |
| field | yes | yes | yes | yes | no | yes |
| standards read | yes | yes | yes | yes | yes | yes |
| standards write | yes | yes | no | no | no | no |
| user_mgmt | yes | yes | no | no | no | no |
| system_config | yes | no | no | no | no | no |

---

## Import Map

| File location | Imports from |
|---|---|
| core/store.js | ./utils.jsx |
| components/* | ../core/utils.jsx, ../core/store.js, ./Sibling.jsx |
| shell/Shell.jsx | ../core/utils.jsx |
| kernbot/* | ../core/utils.jsx, ../core/store.js, ../components/X.jsx, ./Sibling |

---

## Key Exports

### core/utils.jsx
- **C** — color palette: bg #0a0a0a, surface #111111, surface2 #1a1a1a, border, borderHi, text #ededed, muted #aaaaaa, hint #777777, accent #5b7cfa, accentDim, accentText #8eaafe, success #34d399, warning #fbbf24, danger #f87171, pm #a78bfa + Dim variants for each
- **MI** — SVG icon map: rename, escalate, resolve, unresolve, delete, remove, archive, paperclip, download, expand, close, pdf, file
- **USERS_LIST** — full user array (see table above)
- **ROLE_MODULES** — role string to allowed module IDs array
- **PROJECT_TYPES** — ["Aero", "Solar", "Structural", "General question"]
- **URGENCY_OPTS** — ["Low", "Medium", "High"]
- **VERTICALS** — ["All", "Structural", "Solar", "Aero"]
- **fmtRel(iso)**, **fmtDate(iso)**, **fmtBytes(b)** — formatting helpers
- **nowStamp()**, **nextId()**, **nextPMQ()** — ID generators
- **makePMQ(n)** — produces PMQ-YYYY-XXXX
- **isImage(f)**, **isPDF(f)**, **readFileAsDataURL(file)** — file helpers
- **MAX_FILE_SIZE** (8MB), **MAX_ATTACHMENTS** (6)

### core/store.js
- **store** — reactive store with .chats, .queue, .standards getters
  - addChat(c), updateChat(id, patch), removeChat(id)
  - addQueue(q), updateQueue(id, patch), removeQueue(id)
  - addStd(s), updateStd(id, patch)
  - resolveByPMQ(pmqId), unresolveByPMQ(pmqId) — syncs chats + queue together
  - subscribe(fn) / notify()
- **useStore()** — React hook, re-renders caller on every store.notify()
- **Seed data:** chats [], queue [], standards has 2 real entries (anchor rod sizing, material substitution approval)

### components/UI.jsx
- **ConfBadge({ s })** — confidence % badge (green 90+, yellow 80+, red below 80)
- **UrgBadge({ u })** — High / Medium / Low urgency pill
- **VerBadge({ v })** — All / Structural / Solar / Aero vertical pill
- **CtxMenu({ items, onClose, style })** — floating menu; items are { icon, label, fn, danger? } or "---"
- **SourcePanel({ source, onClose })** — 320px slide-in citation panel (stub, KB not yet connected)

### components/Files.jsx
- **useAttachments()** returns { attachments, error, openPicker, handleFiles, removeAt, clear, fileInput }
- **AttachTray({ attachments, onRemove })** — composing tray above textarea
- **AttachDisplay({ attachments, onView })** — renders attachments inside a message bubble
- **Viewer({ file, onClose })** — fullscreen lightbox; images native, PDFs via pdf.js from CDN

### components/Chat.jsx
- **RenderMD({ text })** — inline markdown: bold, italic, ul, ol, paragraphs
- **Bubble({ m, isMe, userColor, userInitials, onView, onSourceClick })** — user / bot / pm roles
- **RenameModal({ current, onSave, onClose })**
- **EscalateModal({ msgs, onSubmit, onClose })** — collects project #, type, PS ref, urgency, context

### components/Panels.jsx
- **ChatRow** — sidebar row for a chat with 3-dot context menu
- **QueueRow** — sidebar row for a PMQ queue item
- **StdList({ user, canWrite })** — standards list + StdEditor; edit controls hidden when canWrite=false. Version tracking: A to A.1 to A.2 etc.

### shell/Shell.jsx
- **UserPicker** — avatar card grid landing screen with badges and department tags
- **ShellSidebar** — role-filtered nav via ROLE_MODULES, user footer with sign-out
- **default KSFCommandCenter({ KernBotApp })** — root shell, user state, tab routing
- Queue and Standards are NOT in shell nav — they are internal KernBotApp views

### kernbot/kernBot.js
- **callKernBot(userMessage, conversationHistory, attachments)** returns { text, sources, confidence }
- Model: claude-sonnet-4-5, max_tokens: 1024
- System prompt: KSF domain — AISC/AWS standards, fab procedures, aerospace EO rules, solar AHJ rules
- Confidence: heuristic regex on response text (not from API)
- Sources: regex match for AISC 360/303, AWS D1.1, AISC CoSP, KSF SOP

### kernbot/KernBotApp.jsx
- **KernBotApp({ preloadUser })** — owns all chat/queue/standards state
- isAdmin = tier === "admin" || tier === "sr_pm" — gates queue access and reply rights
- canWrite = user.stdWrite — gates standards edit controls
- Re-exports USERS_LIST from core/utils.jsx

---

## Data Models

### Chat
```js
{ id, owner, title, createdAt, lastActivity, escalated, resolved, unread, pmqId?,
  msgs: [{ id, role, text, confidence?, sources?, attachments?, escalationNotice?, name?, unread? }] }
// role: "user" | "bot" | "pm"
```

### Queue Item
```js
{ id, pmqId, title, from, fromPos, project, projectType, urgency, psRef,
  createdAt, resolved, additionalContext,
  thread: [{ id, role, name, text, confidence? }] }
// role: "issuer" | "bot" | "pm"
```

### Standard
```js
{ id, title, vertical, version, body, updatedBy, updatedAt, status, history: [] }
```

### User
```js
{
  id, name, initials, color, position,
  role,         // maps to ROLE_MODULES key
  tier,         // "admin" | "sr_pm" | "standard"
  canRespond,   // bool — can reply to KB queue
  stdWrite,     // bool — can create/edit standards
  badge,        // { label, color, bg } or null
  department,   // { label, color, bg } or null
}
```

---

## Escalation Flow
1. Standard user asks Kern Bot — bot answers with confidence score
2. If confidence below 80% or user not satisfied — Escalate button appears
3. EscalateModal collects: project #, type, urgency, PS ref, additional context
4. PMQ ticket created in store.queue, escalation notice bubble added to originating chat
5. Lanze or Loren see it in their KB Queue panel with full thread and metadata
6. They reply — role "pm" bubble appears back in originating user's chat thread
7. Either side marks resolved — resolveByPMQ() syncs both chats and queue

---

## Nav Icons (shell/Shell.jsx)

| Tab | Icon |
|---|---|
| Kern Bot | Chat lines |
| Dashboard | Four-quadrant grid |
| Owner Pending | Inbox tray |
| Scope Tracker | Crosshair circle |
| Change Orders | Dollar sign |
| Detailing | Compass rose |
| RFI Log | Circle with question mark |
| Fabrication & Shipping | I-beam cross section |
| Field Needs | Hard hat |
| User Management | People group |
| System Config | Gear |

---

## Style Conventions
- All styling is inline CSS objects — no CSS files, no Tailwind, no CSS modules
- Colors always from C in core/utils.jsx — never hardcode hex values
- Icons always from MI in core/utils.jsx
- Dark theme: bg #0a0a0a, surface #111111, surface2 #1a1a1a
- Accent blue #5b7cfa / text on accent #8eaafe / PM purple #a78bfa
- Font: -apple-system, BlinkMacSystemFont, Segoe UI, system-ui, sans-serif
- No external UI component libraries

---

## Feature Status

| Feature | Status | Notes |
|---|---|---|
| User picker + sign out | Complete | No password — click to enter |
| Role-based nav | Complete | Each user sees only their modules |
| Kern Bot chat (Claude API) | Complete | |
| File attachments | Complete | Images, PDFs, docs up to 8MB |
| PM escalation queue | Complete | Full loop — escalate, reply, resolve |
| Standards library | Complete | Read all, write Admin + Sr PM only |
| Source citation panel | Stub | KB docs not connected yet |
| Standards to bot prompt injection | Not wired | Ready once KB is connected |
| Dashboard | Coming Soon | |
| RFI Log | Coming Soon | |
| Scope Tracker | Coming Soon | |
| Change Orders | Coming Soon | |
| Fabrication & Shipping | Coming Soon | |
| Field Needs | Coming Soon | |
| Owner Pending | Coming Soon | |
| Detailing | Coming Soon | |
| User Management | Coming Soon | Admin + Sr PM only |
| System Config | Coming Soon | Admin only |
| Postgres / persistence | Not built | All state resets on page reload |
| Real auth / login | Not built | Replace UserPicker in Shell.jsx |

---

## Next Steps (priority order)
1. On-prem + Postgres — persistence layer for chats, queue, users, standards, knowledge docs
2. Real auth — replace UserPicker in Shell.jsx with proper login tied to Postgres users table
3. Knowledge base — connect standards + SOPs to SourcePanel and inject into kernBot.js system prompt
4. Module buildout — Dashboard, RFI Log, Scope Tracker, Change Orders, Fabrication, Field Needs, Owner Pending, Detailing — each as its own folder under src/ following the kernbot/ pattern
5. User Management module — CRUD for users, roles, departments (Admin + Sr PM only)
6. System Config module — API keys, bot settings, system prompt tuning (Admin only)
