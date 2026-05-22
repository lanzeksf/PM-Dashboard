# KSF Command Center — Session Handoff
Last updated: May 22, 2026

## How to use this file
Paste this into any new Claude chat to get full context instantly.
Each module section is updated at the end of every work session.
Do not update mid-session — only on the final commit.

---

## App-wide status
Deployment: https://pm-dashboard-liard.vercel.app
Last confirmed working: May 20, 2026
Anything broken app-wide: Mock data (issue triage items) still multiplying in UI — needs cleanup. Debug console logs still present ([KSF COUNT], [KSF DEDUP], [RFI] Fetching…).

---

## [Module: RFI]
Status: Live
File: src/rfi/RFIApp.jsx
Last built: Full RFI dashboard with live ProjectSight data — 116 projects across Kern Solar Structures and Kern Steel Fabrications portfolios. Project Health Cards sorted worst-first. Stats row (Total Open, Overdue, Due Within 7 Days, Avg Days Open). Search bar with × clear. Show More / Show Less (default 12 cards). Expanded card with All / Open / Closed tabs. Role-based filtering via Territory field. Close-out project logic (hidden if no open RFIs, orange banner if open RFIs remain).
Open issues:
- Mock issue triage items still active and multiplying in UI
- Debug console logs not yet cleaned ([KSF COUNT], [KSF DEDUP], [RFI] Fetching…)
- ProjectSight deep links not yet wired — RFI URL pattern in PS unconfirmed
- Role filtering for Luis and Jillian pending — no Territory tag in ProjectSight yet
- Frank and Ali exist as Territory values with no app users assigned
Blocked on: Loren needs to update Territory field in ProjectSight for all active projects. PS deep link URL pattern needs confirmation.
Next session: Strip mock data, remove debug logs, confirm PS RFI URL pattern, add vertical filter toggle (Structural / Solar / Aero), add active projects only toggle.

---

## [Module: Issue Triage]
Status: Planned — design finalized, API discovery needed before build
File: src/issuetriage/IssueTriageApp.jsx (not yet created)
Last built: —

### What this module does
Detailers (external subcontractors) log Issues in ProjectSight with text descriptions, PDFs, model screenshots, and plan callouts — often with poor English, missing context, or multiple questions bundled in one entry. This module pulls those Issues, runs KernBot analysis automatically, and presents the PM with a pre-processed triage view so no issue ever shows up raw.

### Workflow — locked
1. Detailer logs Issue in ProjectSight (text + attachments)
2. App pulls Issues via API — same Territory filtering logic as RFI module
3. KernBot auto-processes in background:
   - Reads issue text
   - Reads attachments (PDFs, images, model screenshots) if accessible via API
   - Cross-references knowledge docs (AISC standards, KSF SOP, Steel Detailing Standard, etc.)
   - Cleans up language, fills missing context
   - Identifies and splits individual sub-questions within the issue
   - Drafts a preliminary answer or flags what's missing per sub-question
   - Generates a confidence score per sub-question
4. PM opens Triage — every issue already shows as "Processed" with KernBot's analysis
5. PM reviews each sub-question and routes individually:
   - Resolvable → PM posts answer via ProjectSight deep link (opens Issue in PS for PM to comment)
   - Not resolvable → Escalate to RFI (creates RFI in PS via POST if allowed, links back to Issue)
   - Uncertain → "Go to Loren" — flags for Sr PM review, KernBot learns from outcome
   - Needs site info → Routes to Field Needs module
6. All paths end in a response back to the detailer in ProjectSight

### Key design decisions — locked
- Issues show pre-analyzed — never raw. No "Analyze with KernBot" button.
- Multi-question issues are split — each sub-question tracked and routed independently
- KernBot learns from "Go to Loren" resolutions — Loren's answers feed future analysis
- A cleaned-up PDF is generated per issue: professional restatement, numbered questions, KernBot answer or "Escalated to RFI #XXXX" per question
- Deep link to Issue in ProjectSight for PM to comment — POST write access unconfirmed, test first
- Same Territory-based role filtering as RFI module
- Knowledge docs currently are the PDFs in this project. End goal is local vector store — keep abstraction clean and swappable.

### API discovery needed — do this first in next session
We have never hit the Issues endpoint. Steps:

1. Add `getIssues(portfolioId, projectId)` to projectsightApi.js fetching `/{portfolioId}/{projectId}/issues`
2. Log `Object.keys(issues[0])` and a sample issue — same pattern used for RFIs
3. Check if `FileLinks` array comes through like it did on RFIs
4. Test POST to `/{PortfolioID}/{ProjectID}/issues/{IssueID}/comments` — confirm 200 or 403
5. Test POST to `/{PortfolioID}/{ProjectID}/rfis` — confirm 200 or 403

Use a known active project (Kern Steel portfolio + LACCD or BC Student Housing ProjectID).

### Build order after API discovery
1. Confirm Issues endpoint + field names
2. Confirm attachment accessibility
3. Test POST operations
4. Build Triage UI — issue list, KernBot analysis panel, routing buttons per sub-question
5. Wire KernBot auto-processing — split questions, draft answers, confidence scores
6. Wire write operations — POST comment or deep link fallback, create RFI, link Issue
7. Wire to Field Needs module for field clarification routing

---

## [Module: Change Orders]
Status: Live — built and deployed, running on mock data
File: src/changeorders/ChangeOrdersApp.jsx
Last built: Full module live. Summary cards (Proposed, Approved, Follow Up, Escalate) with definition lines and click-to-filter flat table. PM Breakdown row (admin/sr_pm only) — per-PM proposed/approved/escalate stats, click to filter project view to that PM's territory. Project cards sorted by urgency score, expandable with Open/Executed tabs. Rejected COs collapsible panel (collapsed by default) with per-row Clear (session-dismissed; note cleared items reappear if status changes in Spectrum). Search by CO #, job #, description. Spectrum button top-right. Territory-based role filtering. All data mock until IT tunnel is live.

### Design decisions — locked
- Data source: Spectrum (kernsteel.dexterchaney.com) via local Postgres pull (30-min sync already running internally at ksf-metric.kernsteel.local). Mock data until IT exposes tunnel.
- Spectrum is a single-page app — no deep link support. One "Spectrum" button top-right of module header opens https://kernsteel.dexterchaney.com/pages/index.jsp. No per-row links. CO # is plain text.
- Status pipeline pulled from Spectrum status codes:

| Code | Label | Show | Badge color |
|---|---|---|---|
| P | Proposed | Yes — Open tab | Blue |
| A | Approved | Yes — Open tab | Green |
| C | Cost Rev | Yes — Open tab | Amber/distinct — "cost we are eating" |
| RJ | Rejected | Yes — Open tab | Red |
| E | Executed | Executed tab only (last 180 days) | Gray |
| V | Void | Hidden | — |
| N | Non AIA | Hidden | — |
| R | Revised | Hidden | — |

- Project cards sorted by urgency score: (staleCount × 50) + (openCount × 10) + (sum of all open CO ages). Highest score at top.
- No "Clean" pill on projects with no open COs — no badge at all.
- Follow Up threshold: 14 days (yellow). Escalate threshold: 21 days (red + warning icon).
- Summary cards (Proposed, Approved, Follow Up, Escalate) are all clickable — show flat filtered table. Follow Up sorts oldest-first; Escalate sorts most-overdue-first.
- PM Breakdown row visible to admin/sr_pm only. Click a PM card to filter all project cards and stats to that PM's territory. Click again to deselect.
- Rejected COs panel: collapsible below project cards, collapsed by default. Per-row Clear button; dismissed IDs stored in session state. Cleared items reappear if status changes in Spectrum.
- Search bar searches job #, CO #, description.
- Executed tab label: "Executed (last 180 days)" inline in tab.
- Total $ row at bottom of each project's Open tab.
- Role filtering uses same TERRITORY_MAP pattern as RFI module.
- Sub CO workflow (subs emailing COs, logging in Spectrum) deferred — will be built when Microsoft Graph API email integration is ready. No double-entry in app until then.

### Spectrum field mapping (from screenshots)
- Job number: top of screen (e.g. 21613) — matches KSF job number in ProjectSight
- Change request #: `Chg request` column (e.g. 1001, 1002) — row-level ID
- CO #: `Chg order` column (e.g. CO006) — groups multiple change requests
- Status: single-letter code (P/A/C/RJ/E/V/N/R)
- Description: full text field
- Submitted date: `Submitted` column
- Approved date: `Approved` column
- Amount: `Amount` column
- Origination date: `Origination date` field

Open issues:
- Spectrum API connection not yet live externally — all data is mock
- Live data depends on IT tunnel to ksf-metric.kernsteel.local
- Need to confirm exact Postgres table and column names for CO data
Blocked on:
- IT: Cloudflare Tunnel or reverse proxy for ksf-metric.kernsteel.local
- Confirm which Postgres table(s) hold Spectrum CO data and exact column names
Next session: Wire live Spectrum data once IT tunnel is live. Confirm Postgres table structure and column names.

---

## [Module: Dashboard]
Status: Stubbed — Coming Soon
File: src/dashboard/DashboardApp.jsx
Last built: —
Open issues: —
Blocked on: Loren direction needed on module priority
Next session: Build once Loren decides priority vs. other modules

---

## [Module: Kern Bot]
Status: Complete
File: src/kernbot/KernBotApp.jsx, kernBot.js, ChatPane.jsx, QueueDetail.jsx
Last built: Full chat interface, PM escalation queue, standards library. Powered by Anthropic API.
Open issues:
- Source citation panel not wired
- KSF standards documents not yet injected into system prompt
- Migration decision pending: ChatGPT GPT vs built-in Kern Bot — not yet resolved
Blocked on: —
Next session: Wire KB docs to source citation panel. Decide on ChatGPT GPT migration path.

---

## [Module: Detailing Oversight]
Status: Planned
File: not started
Last built: —
Open issues: —
Blocked on: Wire to getSubmittals() from projectsightApi.js — endpoint confirmed working
Next session: Build submittal tracking UI across all three verticals, modeled on RFI module pattern

---

## [Module: Field Needs]
Status: Planned
File: not started
Last built: —
Open issues: —
Blocked on: —
Next session: Jake logs urgent site issues, routes to right PM instantly. Jake's view must be brief, action-oriented, no jargon. Mobile (iPhone) first. Must link to Issue Triage module — field clarification requests from Triage route here.

---

## [Module: Owner Pending]
Status: Planned
File: not started
Last built: —
Open issues: —
Blocked on: —
Next session: Track items waiting on client response, age-tracked, flag red at 5+ days

---

## [Module: Fabrication & Shipping]
Status: Blocked
File: not started
Last built: —
Open issues: —
Blocked on: Strumis MCP — IT needs Cloudflare Tunnel for ksf-metric.kernsteel.local
Next session: Once tunnel is live, explore Strumis MCP connection and production phase tracking UI

---

## IT action items
[ ] Strumis MCP tunnel — Cloudflare Tunnel for ksf-metric.kernsteel.local (blocks Fabrication & Shipping and Change Orders live data)
[ ] Spectrum DB access — confirm CO data table names and column names on ksf-metric.kernsteel.local Postgres (blocks Change Orders live data)
[ ] Microsoft 365 OAuth / SSO — replace user picker with real auth
[ ] Subdomain tools.kernsteel.com → Vercel
[ ] Microsoft Graph API email access — needed for future sub CO auto-detection via Kern Bot

---

## Integrations
| Integration | Status | Notes |
|---|---|---|
| Anthropic API | Live | Powers Kern Bot — VITE_ANTHROPIC_API_KEY in Vercel env |
| GitHub + Vercel | Live | Auto-deploy on push to master. Production URL only — preview URLs do not apply vercel.json rewrite rules |
| ProjectSight (Trimble) | Live | All endpoints working. 116 projects across 2 portfolios. Never use $top/$skip. Always use portfolioId + ProjectID as composite key. |
| Microsoft 365 | Connected (MCP) | Available via MCP — not wired to any module yet |
| Strumis MCP | Blocked | Internal only at ksf-metric.kernsteel.local — IT tunnel needed |
| Spectrum (Viewpoint) | Blocked (partial) | Web app at kernsteel.dexterchaney.com. No deep links. 30-min local Postgres pull already running — accessible once IT exposes tunnel. Future writes via SOAP API. |
| PostgreSQL MCP | Blocked | Same server as Strumis — ksf-metric.kernsteel.local |
| Microsoft Graph API | Planned | Needed for Kern Bot email monitoring (sub CO detection). M365 already connected via MCP — Graph API scope not yet enabled. |

---

## Standing rules (always apply)
- All styling is inline CSS — no CSS files, no Tailwind, no external UI libraries
- Colors always from C in core/utils.jsx — never hardcode hex
- Icons always from MI in core/utils.jsx
- Always produce complete deployable files — no fragments
- All state is in-memory until Postgres is connected — data resets on refresh
- Loren is the decision-maker — route direction questions to Loren
- Jake is field-first — his views are brief, action-oriented, no jargon
- Mobile usability matters — team uses iPhones in the field
- Always test on production URL: https://pm-dashboard-liard.vercel.app (hard refresh Ctrl+Shift+R)
- Never use $top or $skip on Trimble API calls — returns 403
- Always use portfolioId + ProjectID as composite key — ProjectID alone is not unique
- Git: Claude Code must list all changed files and proposed commit message and wait for explicit approval before any git commit or push
- Preview URLs do NOT apply vercel.json rewrite rules — ProjectSight proxy only works on production URL

---

## Key contacts
- Loren C. — Senior PM, decision-maker on all app direction
- Lanze A. — Manufacturing Engineer, owns efficiency/ops and app development
- Jake T. — Field Coordinator, field-first user, iPhone primary
- Tom / Jim — IT, handles infrastructure, Microsoft 365, server access

---

## Users & roles
| ID | Name | Role | Territory | Trimble Name |
|---|---|---|---|---|
| lanze | Lanze A. | admin | — | Lanze Alviar |
| loren | Loren C. | sr_pm | Loren | Loren Castro |
| tony | Tony S. | coordinator | Tony | Antonio Sanabria |
| luis | Luis A. | apm | — (none yet) | Jose Arrezola |
| jillian | Jillian H. | coordinator | — (none yet) | Jillian Hawkins |
| adam | Adam K. | apm | Adam | Adam Kneale |
| jacob | Jacob T. | field | Jake | Jacob Tiffany |

Other Territory values in ProjectSight with no app users: Frank, Ali

---

## ProjectSight — confirmed field names and endpoints
Base URL: /projectsight-api/projectsight-v1.0
Portfolio IDs:
- Kern Solar Structures: 54bfcdfd-5be5-4e20-b70b-ea11f2549510
- Kern Steel Fabrications, Inc.: 5ce1bcb1-c811-49ac-9039-ec36f3e75f78

Endpoints confirmed working:
- GET /accounts
- GET /accounts/{AccountID}/portfolios
- GET /{PortfolioID}/projects (NO query params — ever)
- GET /{PortfolioID}/{ProjectID}/rfis
- GET /{PortfolioID}/{ProjectID}/submittals

Endpoints not yet tested:
- GET /{PortfolioID}/{ProjectID}/issues — needed for Issue Triage module
- POST /{PortfolioID}/{ProjectID}/issues/{IssueID}/comments — needed to post responses
- POST /{PortfolioID}/{ProjectID}/rfis — needed to create RFIs from Issues

Key project fields: ProjectID, Name, Number, ProjectManager, StartDate, FinishDate, Territory, Status
Key RFI fields: RFI_ID, Number, Subject, DateCreated, DateDue, DateResolved, WorkflowStateName, Importance, Discipline, AuthorContactName, ProjectID

RFI WorkflowStateName values: Draft, Open, KSF PM Review, Submitted to GC, Closed
RFI open/closed: open = not Closed, closed = WorkflowStateName === 'Closed'

Issue fields: NOT YET CONFIRMED — API discovery is first step of Issue Triage build

---

## Spectrum — confirmed field names and URL
Web app URL: https://kernsteel.dexterchaney.com/pages/index.jsp
Deep links: NOT supported — single-page app, URL does not change per record
Open Spectrum button: always present top-right of Change Orders module header, opens base URL

Change request fields (from Spectrum screenshots):
- Job number — matches KSF job number (e.g. 21613 = job #26606 in ProjectSight — confirm mapping)
- Chg request — row-level ID (1001, 1002…)
- Chg order — CO number grouping change requests (CO001, CO006…)
- Status — single-letter code: P/A/C/RJ/E/V/N/R
- Description — full text
- Submitted — date
- Approved — date
- Amount — dollar value
- Origination date
- Approved date

Status codes used by KSF:
- P = Proposed (show, blue)
- A = Approved (show, green)
- C = Cost Rev (show, amber — cost KSF is absorbing, not billable)
- RJ = Rejected (show, red)
- E = Executed (Executed tab only, last 180 days, gray)
- V = Void (hide)
- N = Non AIA (hide)
- R = Revised (hide)
