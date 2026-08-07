import React, { useState, useEffect, useMemo, useRef } from "react";
import { C, F, MI } from "../core/utils.jsx";
import { store } from "../core/store.js";
import { getProjects, getIssues, getAllRFIs, getAllIssues, getSyncStatus, triggerProjectsightSync, postIssueComment, postRFIFromIssue, clearProjectsightApiCache } from "../projectsight/projectsightApi.js";

// Set true to run API discovery calls once — flip back to false after
const RUN_ISSUE_DISCOVERY = false;

// ── KSF team → Territory filter mapping ──────────────────────────────────────

export const KSF_LEAD_MAP = {
  lanze:   null,
  loren:   null,
  jacob:   null,
  tony:    'Tony S.',
  luis:    'Luis A.',
  lisbet:  null,
  adam:    'Adam K.',
};

// ── Team-member roster for the admin "Team Member" dropdown/breakdown ────────
// Excludes lanze/loren (the two overseer roles) — they're the viewers, not a
// team member to drill into. Real current names from USERS_LIST (core/utils.jsx),
// replacing a stale legacy roster (Antonio S./Jake/Frank/Ali) that no longer
// matched anyone and silently hid Tony, JR, Josh, Lisbet, and Jacob from this
// view.
export const TEAM_MEMBER_OPTS = ["All", "Tony S.", "Luis A.", "Adam K.", "JR C.", "Josh L.", "Lisbet L.", "Jacob T."];

// Tony/Luis/Adam own jobs (matched via ProjectSight's TypeOfBuilding field,
// same as KSF_LEAD_MAP above) — for them, "their jobs" means every record on
// every project tagged as theirs. Everyone else in the roster doesn't own
// jobs this way, so for them "their view" instead means "records they're
// CC'd on" — see CC_ONLY_MEMBERS/TEAM_MEMBER_EMAIL/ccEmailsOf below.
const CC_ONLY_MEMBERS = ["JR C.", "Josh L.", "Lisbet L.", "Jacob T."];

// Real login emails per CLAUDE.md's roster — used only to match against a
// record's CourtesyCopies (see ccEmailsOf) for the CC_ONLY_MEMBERS above.
const TEAM_MEMBER_EMAIL = {
  "Tony S.":   "antonio@kernsteel.com",
  "Luis A.":   "larrezola@kernsteel.com",
  "Adam K.":   "adam@kernsteel.com",
  "JR C.":     "demetrio@kernsteel.com",
  "Josh L.":   "jlopez@kernsteel.com",
  "Lisbet L.": "lisbet@kernsteel.com",
  "Jacob T.":  "jtiffany@kernsteel.com",
};

// CourtesyCopies is ProjectSight's CC list — same shape on both RFIs and
// Issues (confirmed via api/data/debug-fields.js against real data: a real
// RFI's CourtesyCopies included Luis's actual login email). Excludes
// deleted/delete-requested entries, same convention as linkedIssuesOf/
// linkedRFIsOf elsewhere in this file. NOT the same as Assignees (the
// record's primary responsible party) — CC'd is specifically what was asked
// for here.
const ccEmailsOf = r => (r.CourtesyCopies || [])
  .filter(cc => !cc.Deleted && !cc.DeleteRequested)
  .map(cc => (cc.ContactEMail || "").toLowerCase());

// ── Constants ─────────────────────────────────────────────────────────────────

// Stable empty object passed as RecordCards' loading/errors props now that
// projects+RFIs+Issues load in one bulk request instead of per-project.
const EMPTY_MAP = {};

const BAND_C = {
  overdue: "#c84040",
  soon3:   "#c88030",
  soon7:   "#e8a020",
  ontrack: "#30a060",
  nodate:  "#4a5878",
};
const BAND_LABEL = {
  overdue: "Overdue",
  soon3:   "Due ≤ 3d",
  soon7:   "Due ≤ 7d",
  ontrack: "On Track",
  nodate:  "No Date",
};

/* KernBot analysis — disabled, restore when training is ready */
/*
const ISSUE_SYSTEM_PROMPT = `You are Kern Bot, an internal AI assistant for Kern Steel Fabrication (KSF) in Bakersfield, CA.
KSF fabricates structural steel, solar carport structures, and aerospace maintenance stands.
You are analyzing a raw issue submitted by an overseas steel detailer. Their English may be unclear.
Standards that apply: AISC 303 (Code of Standard Practice), AISC 360 (Structural Steel Specification), AWS D1.1 (weld inspection), KSF Steel Detailing Standard.

Your job:
1. Rewrite the issue in clear, professional English — preserve all technical content, fix grammar and clarity
2. Identify and number each distinct sub-question or concern within the issue
3. For each sub-question: draft a preliminary answer OR state exactly what information is missing
4. Assign a confidence score per sub-question: "High" | "Medium" | "Low"
5. Note any references to drawing numbers, grid lines, spec sections, or member sizes
6. Recommend overall routing: "KSF Can Answer" | "Submit as RFI" | "Needs Sr. PM Review"
7. Provide 1-2 sentences of reasoning

Respond ONLY in this JSON format, no preamble, no markdown:
{
  "cleanText": "...",
  "subQuestions": [
    {
      "id": 1,
      "question": "...",
      "answer": "...",
      "missingInfo": "...",
      "confidence": "High | Medium | Low"
    }
  ],
  "recommendation": "KSF Can Answer | Submit as RFI | Needs Sr. PM Review",
  "reasoning": "...",
  "references": ["drawing numbers, grid lines, etc."]
}`;
*/
/* end KernBot analysis */

// ── RFI field accessors ───────────────────────────────────────────────────────

const rfiSubject   = r => r.Subject ?? r.title ?? r.subject ?? r.description ?? "(No subject)";
const rfiStatusVal = r => r.Status ?? r.status ?? r.statusName ?? "Unknown";
const rfiSubmitted = r => {
  const d = r.DateCreated ?? r.submittedDate ?? r.dateSubmitted ?? r.createdDate ?? null;
  return (d && !String(d).startsWith("0001")) ? d : null;
};
const rfiDue = r => {
  const d = r.DateDue ?? r.dueDate ?? r.dateRequired ?? r.responseDueDate ?? null;
  return (d && !String(d).startsWith("0001")) ? d : null;
};
const rfiNum      = r => r.Number ?? r.number ?? r.rfiNumber ?? r.sequenceNumber ?? r.id ?? "—";
const rfiIdVal    = r => String(r.RFI_ID ?? r.RFIID ?? r.id ?? r.rfiId ?? r.Number ?? r.number ?? "");
const rfiImp      = r => r.Importance ?? r.importance ?? r.priority ?? r.urgency ?? null;
const rfiDisc     = r => r.Discipline ?? r.discipline ?? r._project?.vertical ?? "Unknown";

// ── Helpers ───────────────────────────────────────────────────────────────────

const vcol = v => ({
  Structural: { color: "#38bdf8", bg: "rgba(56,189,248,0.12)"  },
  Solar:      { color: "#fbbf24", bg: "rgba(251,191,36,0.12)"  },
  Aero:       { color: "#a78bfa", bg: "rgba(167,139,250,0.12)" },
}[v] || { color: C.muted, bg: C.surface2 });

function ageBand(dueDateStr) {
  if (!dueDateStr) return "nodate";
  const days = Math.floor((new Date(dueDateStr) - Date.now()) / 86400000);
  if (days < 0)  return "overdue";
  if (days <= 3) return "soon3";
  if (days <= 7) return "soon7";
  return "ontrack";
}

const daysOpenCalc = d => d ? Math.max(0, Math.floor((Date.now() - new Date(d)) / 86400000)) : 0;

function normalizeStatus(r) {
  const s = rfiStatusVal(r).toLowerCase();
  if (s.includes("draft"))                            return "Draft";
  if (s.includes("submit"))                           return "Submitted";
  if (s.includes("review"))                           return "Under Review";
  if (s.includes("answer") || s.includes("respond")) return "Answered";
  if (s.includes("close")  || s.includes("void"))    return "Closed";
  return rfiStatusVal(r);
}

export const isOpenRFI = r => r.WorkflowStateName !== "Closed" && r.WorkflowStateName !== "Void";

// Project-level status (ProjectSight's `Status` field, e.g. "Active"/"Closed"
// on the job itself) — distinct from a record's WorkflowStateName. A job
// marked Closed in ProjectSight should disappear from the tool entirely.
export const isActiveProject = p => (p.Status ?? "").trim().toLowerCase() !== "closed";

// Detailer is a project-level attribute, not a per-record one — confirmed
// with Lanze there's no dedicated "Detailer" field in ProjectSight's API.
// KSF repurposes the built-in "Project Manager" key-contact slot to record
// the Detailer (ProjectSight lets the display label be customized per org;
// KSF relabeled several of these slots — e.g. some projects use it for
// Architect instead). `ProjectManagerID` is a contact ID that resolves to a
// company via `ProjectContactLinks` (the project's team-members list) — the
// same contact/company relationship RFI records use for AuthorContactID/
// AuthorCompanyName. Falls back to the raw person name, then "Unknown", if
// no team-member link matches (e.g. that contact was removed from the job).
const detailerCompanyOf = project => {
  if (!project) return null;
  const links = project.ProjectContactLinks || [];
  const contactId = project.ProjectManagerID;
  const companyId = project.ProjectManagerCompanyID;
  const byContact = contactId != null && links.find(l => l.ContactID === contactId && !l.Deleted);
  if (byContact?.CompanyName) return byContact.CompanyName;
  const byCompany = companyId && links.find(l => l.CompanyID === companyId && !l.Deleted);
  if (byCompany?.CompanyName) return byCompany.CompanyName;
  return project.ProjectManager || null;
};
const recordDetailer = r => detailerCompanyOf(r._project) ?? "Unknown";

const fmtD = d => d
  ? new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
  : "—";

function relTime(ts) {
  if (!ts) return null;
  const mins = Math.floor((Date.now() - ts) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  return `${Math.floor(mins / 60)} hr ago`;
}

const wfnChipStyle = s => ({
  "Draft":           { color: C.muted,   bg: C.surface2 },
  "Open":            { color: C.warning, bg: "rgba(251,191,36,0.12)"  },
  "KSF PM Review":   { color: C.hint,    bg: C.surface2 },
  "Submitted to GC": { color: C.danger,  bg: "rgba(248,113,113,0.12)" },
  "Closed":          { color: C.success, bg: "rgba(52,211,153,0.12)"  },
}[s] || { color: C.muted, bg: C.surface2 });

const statusChipStyle = s => {
  const ls = (s || "").toLowerCase();
  if (ls.includes("draft"))                             return { color: C.hint,    bg: C.surface2 };
  if (ls.includes("submit"))                            return { color: C.warning, bg: "rgba(251,191,36,0.12)" };
  if (ls.includes("review"))                            return { color: C.accent,  bg: "rgba(91,141,184,0.12)" };
  if (ls.includes("answer") || ls.includes("respond")) return { color: C.success, bg: "rgba(52,211,153,0.12)" };
  if (ls.includes("close")  || ls.includes("void"))    return { color: C.hint,    bg: C.surface2 };
  return { color: C.muted, bg: C.surface2 };
};

const recStyle = rec => ({
  "Submit as RFI":       { color: C.warning, bg: "rgba(251,191,36,0.12)"  },
  "KSF Can Answer":      { color: C.success, bg: "rgba(52,211,153,0.12)"  },
  "Needs Loren Review":  { color: C.pm,      bg: "rgba(167,139,250,0.12)" },
  "Needs Sr. PM Review": { color: C.pm,      bg: "rgba(167,139,250,0.12)" },
}[rec] || { color: C.muted, bg: C.surface2 });

// Confirmed single-record deep links — each record type has its own path,
// PDT, and PKID; NOT a shared path with just a different PDT (do not assume
// this pattern for other record types without confirming individually).
// Both take the raw PKID (not a record object) so RFI/Issue kinds share one shape.
const psRFILink   = (pid, projId, id) => `https://prod.projectsightapp.trimble.com/Web/app/RFI?orgid=${pid}&projid=${projId}&Action=Open&PDT=8&PKID=${id}&OALD=1`;
const psIssueLink = (pid, projId, id) => `https://prod.projectsightapp.trimble.com/Web/app/Issues?orgid=${pid}&projid=${projId}&Action=Open&PDT=75&PKID=${id}&OALD=1`;

// Confirmed project landing page (no listid/PDT/PKID — just the project
// overview) — pulled directly from a real ProjectSight URL, e.g.
// .../web/app/Project?orgid=5ce1bcb1-...&projid=21 for "25694 Fresno Cafeteria".
const psProjectLink = (pid, projId) => `https://prod.projectsightapp.trimble.com/web/app/Project?orgid=${pid}&projid=${projId}`;

// RecordToRecordLinks entries where LinkedTableType === 75 (Issue), excluding
// deleted/delete-requested links. A single RFI can have more than one.
const linkedIssuesOf = r => (r.RecordToRecordLinks || []).filter(
  l => l.LinkedTableType === 75 && !l.Deleted && !l.DeleteRequested
);

// Reverse of linkedIssuesOf — RecordToRecordLinks entries where LinkedTableType === 8 (RFI).
const linkedRFIsOf = i => (i.RecordToRecordLinks || []).filter(
  l => l.LinkedTableType === 8 && !l.Deleted && !l.DeleteRequested
);

// ── Issue accessors used by the shared RecordCards/RecordTable ───────────────
// Mirrors the RFI accessors above — Issues and RFIs share almost the same
// schema, confirmed via Section 4's investigation.
const issSubject = i => i.Subject ?? "(No subject)";
const issSubmitted = i => {
  const d = i.DateCreated ?? null;
  return (d && !String(d).startsWith("0001")) ? d : null;
};
const issDue = i => {
  const d = i.DateDue ?? null;
  return (d && !String(d).startsWith("0001")) ? d : null;
};
const issNum    = i => i.Number ?? i.number ?? i.id ?? "—";
const issIdVal  = i => String(i.IssueID ?? i.id ?? i.issueId ?? i.Number ?? i.number ?? "");
const issImpVal = i => i.Importance ?? i.importance ?? null;
const isOpenIssueRecord = i => i.WorkflowStateName !== "Closed" && i.WorkflowStateName !== "Void";

// ── Record-kind config shared by RecordCards/RecordTable ─────────────────────
const RECORD_KINDS = {
  rfi: {
    labelPlural: "RFIs", numColLabel: "RFI #",
    isOpen: isOpenRFI, due: rfiDue, submitted: rfiSubmitted, num: rfiNum, idVal: rfiIdVal,
    subject: rfiSubject, detailer: recordDetailer, discipline: rfiDisc, importance: rfiImp,
    link: (pid, projId, r) => psRFILink(pid, projId, rfiIdVal(r)),
    linkedLabel: "Linked Issue",
    linkedOf: linkedIssuesOf,
    linkedLink: (pid, projId, linkedId) => psIssueLink(pid, projId, linkedId),
  },
  issue: {
    labelPlural: "Issues", numColLabel: "Issue #",
    isOpen: isOpenIssueRecord, due: issDue, submitted: issSubmitted, num: issNum, idVal: issIdVal,
    subject: issSubject, detailer: recordDetailer,
    discipline: i => i._project?.vertical ?? "Unknown", importance: issImpVal,
    link: (pid, projId, i) => psIssueLink(pid, projId, issIdVal(i)),
    linkedLabel: "Linked RFI",
    linkedOf: linkedRFIsOf,
    linkedLink: (pid, projId, linkedId) => psRFILink(pid, projId, linkedId),
  },
};

/* KernBot analysis — disabled, restore when training is ready */
/*
// ── Kern Bot analysis call ────────────────────────────────────────────────────

async function analyzeIssue(text, apiKey) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type":  "application/json",
      "x-api-key":     apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      system: ISSUE_SYSTEM_PROMPT,
      messages: [{ role: "user", content: text }],
    }),
  });
  if (!res.ok) throw new Error(`API ${res.status}`);
  const data = await res.json();
  const raw  = data.content?.[0]?.text || "{}";
  return JSON.parse(raw.replace(/^```json\n?/, "").replace(/\n?```$/, "").trim());
}
*/
/* end KernBot analysis */

// ── Micro-components ──────────────────────────────────────────────────────────

function VertBadge({ v }) {
  const vc = vcol(v);
  return (
    <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 7px", borderRadius: 20,
      background: vc.bg, color: vc.color, border: `1px solid ${vc.color}33`, whiteSpace: "nowrap" }}>
      {v}
    </span>
  );
}

function BandDot({ band }) {
  return <div style={{ width: 8, height: 8, borderRadius: "50%", background: BAND_C[band], flexShrink: 0 }} title={BAND_LABEL[band]} />;
}

function BandPill({ band }) {
  return (
    <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 7px", borderRadius: 20,
      background: BAND_C[band] + "22", color: BAND_C[band], border: `1px solid ${BAND_C[band]}44`, whiteSpace: "nowrap" }}>
      {BAND_LABEL[band]}
    </span>
  );
}

function StatusChip({ status }) {
  const sc = statusChipStyle(status);
  return (
    <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 7px", borderRadius: 20,
      background: sc.bg, color: sc.color, whiteSpace: "nowrap" }}>
      {status}
    </span>
  );
}

function Spinner({ label = "Loading…" }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, color: C.hint, fontSize: 11 }}>
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"
        style={{ animation: "ksf-spin 1s linear infinite" }}>
        <path d="M21 12a9 9 0 11-6.219-8.56" strokeLinecap="round" />
      </svg>
      {label}
    </span>
  );
}

function StatCard({ label, value, color }) {
  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10,
      padding: "14px 18px", flex: 1, minWidth: 120 }}>
      <p style={{ margin: "0 0 4px", fontSize: 10, fontWeight: 700, letterSpacing: "0.07em",
        textTransform: "uppercase", color: C.hint }}>{label}</p>
      <p style={{ margin: 0, fontSize: 28, fontWeight: 700, fontFamily: F.stat, color: color || C.text,
        letterSpacing: "-0.04em", lineHeight: 1 }}>{value}</p>
    </div>
  );
}

// ── Team member breakdown ─────────────────────────────────────────────────────

function TeamBreakdownTable({ projects, records, kind }) {
  // NOTE: this only counts projects tagged with a matching `TypeOfBuilding`
  // value — i.e. team members who directly own jobs (Tony/Luis/Adam today).
  // JR, Josh, Lisbet, and Jacob don't own jobs this way, so they'll always
  // show 0 here until CC'd-based visibility is built (pending — see Lanze).
  const leads = TEAM_MEMBER_OPTS.filter(o => o !== "All");
  const rows = leads.map(lead => {
    const projIds = new Set(
      projects.filter(p => (p.TypeOfBuilding ?? "").trim() === lead)
        .map(p => `${p.portfolioId}-${p.ProjectID}`)
    );
    const openCount = projects
      .filter(p => projIds.has(`${p.portfolioId}-${p.ProjectID}`))
      .reduce((sum, p) => sum + (records[`${p.portfolioId}-${p.ProjectID}`] || []).filter(kind.isOpen).length, 0);
    return { lead, openCount };
  }).filter(row => row.openCount > 0)
    .sort((a, b) => b.openCount - a.openCount);

  if (!rows.length) return null;
  return (
    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, marginBottom: 16 }}>
      <thead>
        <tr style={{ borderBottom: `1px solid ${C.border}` }}>
          <th style={{ textAlign: "left", padding: "6px 10px", color: C.hint, fontSize: 10, textTransform: "uppercase" }}>Team Member</th>
          <th style={{ textAlign: "right", padding: "6px 10px", color: C.hint, fontSize: 10, textTransform: "uppercase" }}>Open {kind.labelPlural}</th>
        </tr>
      </thead>
      <tbody>
        {rows.map(row => (
          <tr key={row.lead} style={{ borderBottom: `1px solid ${C.border}` }}>
            <td style={{ padding: "6px 10px", color: C.text }}>{row.lead}</td>
            <td style={{ padding: "6px 10px", textAlign: "right", color: C.muted }}>{row.openCount}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ── Project health cards ──────────────────────────────────────────────────────

function RecordCards({ projects, records, loading, errors, kind, expandedProject, setExpandedProject }) {
  const [showAll,    setShowAll]    = useState(false);
  const [search,     setSearch]     = useState("");
  const [detailTab,  setDetailTab]  = useState("open");
  const [detailSort, setDetailSort] = useState({ col: "due", dir: "asc" });

  useEffect(() => { setDetailTab("open"); setDetailSort({ col: "due", dir: "asc" }); }, [expandedProject]);

  const toggleDetailSort = key => setDetailSort(s =>
    s.col === key ? { ...s, dir: s.dir === "asc" ? "desc" : "asc" } : { col: key, dir: "asc" }
  );

  // Columns for the expanded-project detail table below — click a header to
  // sort ascending/descending, same interaction as the flat RecordTable further down.
  const DETAIL_COLS = [
    { key: "colorbar",  label: "",           sortable: false },
    { key: "num",       label: kind.numColLabel, sortable: true  },
    { key: "subject",   label: "Subject",   sortable: true  },
    { key: "submitted", label: "Submitted", sortable: true  },
    { key: "due",       label: "Due",       sortable: true  },
    { key: "age",       label: "Days Open", sortable: true  },
    { key: "status",    label: "Status",    sortable: true  },
  ];

  if (!projects.length) {
    return (
      <p style={{ margin: 0, padding: "32px 0", textAlign: "center", fontSize: 13, color: C.hint }}>
        No ProjectSight projects visible for your role.
      </p>
    );
  }

  const scored = projects.map(p => {
    const pid      = `${p.portfolioId}-${p.ProjectID}`;
    const open     = (records[pid] || []).filter(kind.isOpen);
    const overdue  = open.filter(r => ageBand(kind.due(r)) === "overdue").length;
    const soon     = open.filter(r => ["soon3", "soon7"].includes(ageBand(kind.due(r)))).length;
    return { p, overdue, soon, openCount: open.length };
  });
  scored.sort((a, b) => b.overdue - a.overdue || b.soon - a.soon || b.openCount - a.openCount);
  const sorted = scored.map(s => s.p);

  const q        = search.trim().toLowerCase();
  const filtered = q
    ? sorted.filter(p =>
        (p.Name   || "").toLowerCase().includes(q) ||
        (p.Number || "").toLowerCase().includes(q))
    : sorted;

  const visible = showAll ? filtered : filtered.slice(0, 12);

  return (
    <>
      <input
        type="text"
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="Search projects…"
        style={{ display: "block", width: "100%", marginBottom: 10, padding: "7px 12px",
          background: C.surface, border: `1px solid ${C.border}`, borderRadius: 7,
          color: C.text, fontSize: 12, fontFamily: "inherit", boxSizing: "border-box", outline: "none" }}
      />

      <div style={showAll
        ? { maxHeight: "70vh", overflowY: "auto", border: `1px solid ${C.border}`, borderRadius: 10,
            padding: "0 12px 12px", marginBottom: 12,
            display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px,1fr))", gap: 12 }
        : { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px,1fr))", gap: 12, marginBottom: 12 }}>
        {showAll && (
          <div style={{ gridColumn: "1/-1", position: "sticky", top: 0, zIndex: 1,
            background: C.bg, paddingTop: 10, paddingBottom: 8,
            display: "flex", justifyContent: "flex-end", marginBottom: 4 }}>
            <button onClick={() => setShowAll(false)}
              style={{ padding: "5px 14px", borderRadius: 6, fontFamily: "inherit",
                background: C.surface, border: `1px solid ${C.border}`,
                color: C.hint, fontSize: 12, cursor: "pointer" }}>
              Collapse ↑
            </button>
          </div>
        )}
        {visible.map(p => {
          const pid      = `${p.portfolioId}-${p.ProjectID}`;
          const isLoading = loading[pid];
          const error    = errors[pid];
          const recs     = records[pid] || [];
          const openRfis = recs.filter(kind.isOpen);
          const overdue  = openRfis.filter(r => ageBand(kind.due(r)) === "overdue").length;
          const nextDue  = openRfis.map(r => kind.due(r)).filter(Boolean).sort()[0];
          const oldest   = openRfis.reduce((m, r) => Math.max(m, daysOpenCalc(kind.submitted(r))), 0);
          const isExp    = expandedProject === pid;
          const accentC  = overdue > 0 ? BAND_C.overdue : (openRfis.length > 0 ? C.border : C.success);
          const isCloseOut = (p.Status ?? "").trim() === "Close-out";
          if (isCloseOut && openRfis.length === 0) return null;

          return (
            <div key={pid}
              onClick={() => setExpandedProject(isExp ? null : pid)}
              style={{ background: C.surface, border: `1px solid ${isExp ? C.accent : C.border}`,
                borderRadius: 10, padding: "14px 16px", cursor: "pointer",
                transition: "border-color 0.15s", borderLeft: `3px solid ${accentC}` }}
              onMouseEnter={e => { if (!isExp) e.currentTarget.style.borderColor = C.borderHi; }}
              onMouseLeave={e => { if (!isExp) e.currentTarget.style.borderColor = C.border; }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: C.text, flex: 1,
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.Name}</span>
                <VertBadge v={p.vertical} />
              </div>
              {isCloseOut && openRfis.length > 0 && (
                <div style={{ background: `${C.warning}1a`, border: `1px solid ${C.warning}44`,
                  borderRadius: 6, padding: "6px 10px", marginBottom: 8,
                  fontSize: 11, fontWeight: 600, color: C.warning }}>
                  ⚠️ Close-out — Open {kind.labelPlural} need cleanup
                </div>
              )}
              {isLoading ? (
                <Spinner />
              ) : error ? (
                <span style={{ fontSize: 11, color: C.danger }}>⚠ Load failed</span>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <div style={{ display: "flex", gap: 16, alignItems: "flex-end" }}>
                    <div>
                      <p style={{ margin: 0, fontSize: 22, fontWeight: 700, fontFamily: F.stat, color: C.text, lineHeight: 1 }}>{openRfis.length}</p>
                      <p style={{ margin: "2px 0 0", fontSize: 10, color: C.hint }}>Open {kind.labelPlural}</p>
                    </div>
                    {overdue > 0 && (
                      <div>
                        <p style={{ margin: 0, fontSize: 22, fontWeight: 700, fontFamily: F.stat, color: BAND_C.overdue, lineHeight: 1 }}>{overdue}</p>
                        <p style={{ margin: "2px 0 0", fontSize: 10, color: C.hint }}>Overdue</p>
                      </div>
                    )}
                    {oldest > 0 && (
                      <div>
                        <p style={{ margin: 0, fontSize: 22, fontWeight: 700, fontFamily: F.stat, color: C.muted, lineHeight: 1 }}>{oldest}d</p>
                        <p style={{ margin: "2px 0 0", fontSize: 10, color: C.hint }}>Oldest</p>
                      </div>
                    )}
                  </div>
                  {nextDue && (
                    <p style={{ margin: 0, fontSize: 10, color: C.hint }}>
                      Next due: <span style={{ color: BAND_C[ageBand(nextDue)], fontWeight: 600 }}>{fmtD(nextDue)}</span>
                    </p>
                  )}
                  {openRfis.length === 0 && (
                    <p style={{ margin: 0, fontSize: 11, color: C.success }}>✓ No open {kind.labelPlural}</p>
                  )}
                </div>
              )}
              <p style={{ margin: "10px 0 0", fontSize: 10, color: isExp ? C.accentText : C.hint, textAlign: "right" }}>
                {isExp ? "▲ Collapse" : `▼ View ${kind.labelPlural}`}
              </p>
            </div>
          );
        })}
      </div>

      {!showAll && filtered.length > 12 && (
        <button onClick={() => setShowAll(true)}
          style={{ display: "block", width: "100%", padding: "8px", marginBottom: 12,
            background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8,
            color: C.hint, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>
          Show All {filtered.length} Projects ↓
        </button>
      )}

      {expandedProject && (() => {
        const p       = projects.find(x => `${x.portfolioId}-${x.ProjectID}` === expandedProject);
        if (!p) return null;
        const allRecs = records[expandedProject] || [];
        const tabRecs = detailTab === "open"   ? allRecs.filter(kind.isOpen)
                      : detailTab === "closed" ? allRecs.filter(r => !kind.isOpen(r))
                      : allRecs;
        const openCount   = allRecs.filter(kind.isOpen).length;
        const closedCount = allRecs.filter(r => !kind.isOpen(r)).length;

        const detailDir = detailSort.dir === "asc" ? 1 : -1;
        const sortedTabRecs = [...tabRecs].sort((a, b) => {
          switch (detailSort.col) {
            case "num":       return detailDir * String(kind.num(a)).localeCompare(String(kind.num(b)), undefined, { numeric: true });
            case "subject":   return detailDir * kind.subject(a).localeCompare(kind.subject(b));
            case "submitted": return detailDir * (new Date(kind.submitted(a) || 0) - new Date(kind.submitted(b) || 0));
            case "due": {
              const ad = kind.due(a), bd = kind.due(b);
              if (!ad && !bd) return 0; if (!ad) return 1; if (!bd) return -1;
              return detailDir * (new Date(ad) - new Date(bd));
            }
            case "age":       return detailDir * (daysOpenCalc(kind.submitted(a)) - daysOpenCalc(kind.submitted(b)));
            case "status":    return detailDir * (a.WorkflowStateName || "").localeCompare(b.WorkflowStateName || "");
            default: return 0;
          }
        });

        return (
          <div style={{ background: C.surface, border: `1px solid ${C.accent}44`, borderRadius: 10,
            padding: "16px 20px", marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: C.text, flex: 1 }}>{p.Name} — {kind.labelPlural}</span>
              <VertBadge v={p.vertical} />
              <button onClick={() => setExpandedProject(null)}
                style={{ background: "none", border: "none", color: C.hint, cursor: "pointer",
                  fontSize: 18, lineHeight: 1, padding: "2px 4px" }}>×</button>
            </div>

            <div style={{ display: "flex", gap: 4, marginBottom: 12 }}>
              {[
                { id: "open",   label: `Open (${openCount})`     },
                { id: "closed", label: `Closed (${closedCount})` },
                { id: "all",    label: `All (${allRecs.length})` },
              ].map(t => (
                <button key={t.id} onClick={() => setDetailTab(t.id)}
                  style={{ padding: "4px 12px", borderRadius: 6, fontFamily: "inherit",
                    border:      `1px solid ${detailTab === t.id ? C.accent + "66" : C.border}`,
                    background:  detailTab === t.id ? C.accentDim : C.surface2,
                    color:       detailTab === t.id ? C.accentText : C.muted,
                    fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
                  {t.label}
                </button>
              ))}
            </div>

            {tabRecs.length === 0 ? (
              <p style={{ margin: 0, fontSize: 12, color: C.muted }}>
                No {detailTab} {kind.labelPlural} for this project.
              </p>
            ) : (
              <div style={{ overflowX: "auto", maxHeight: 320, overflowY: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                      {DETAIL_COLS.map(col => (
                        <th key={col.key} onClick={() => col.sortable && toggleDetailSort(col.key)}
                          style={{ padding: "6px 10px", textAlign: "left", fontSize: 10,
                            fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase",
                            color: detailSort.col === col.key ? C.accentText : C.hint,
                            whiteSpace: "nowrap", cursor: col.sortable ? "pointer" : "default",
                            userSelect: "none" }}>
                          {col.label}
                          {col.sortable && detailSort.col === col.key && (
                            <span style={{ marginLeft: 3 }}>{detailSort.dir === "asc" ? "↑" : "↓"}</span>
                          )}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sortedTabRecs.map(r => {
                      const isVoid = r.WorkflowStateName === "Void";
                      const open   = kind.isOpen(r);
                      const band   = open ? ageBand(kind.due(r)) : "nodate";
                      const wfn    = r.WorkflowStateName || "—";
                      const sc     = wfnChipStyle(r.WorkflowStateName);
                      return (
                        <tr key={kind.idVal(r)} style={{ borderBottom: `1px solid ${C.border}`, opacity: isVoid ? 0.5 : 1 }}
                          onMouseEnter={e => e.currentTarget.style.background = C.surface2}
                          onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                          <td style={{ padding: "8px 10px" }}>
                            {open
                              ? <BandDot band={band} />
                              : <div style={{ width: 8, height: 8, borderRadius: "50%",
                                  background: isVoid ? C.border : C.success, flexShrink: 0 }} />}
                          </td>
                          <td style={{ padding: "8px 10px", whiteSpace: "nowrap" }}>
                            <a href={kind.link(p.portfolioId, p.ProjectID, r)} target="_blank" rel="noopener noreferrer"
                              style={{ color: C.accentText, fontWeight: 600, textDecoration: "none" }}
                              onMouseEnter={e => e.currentTarget.style.textDecoration = "underline"}
                              onMouseLeave={e => e.currentTarget.style.textDecoration = "none"}>
                              {kind.num(r)}
                            </a>
                          </td>
                          <td style={{ padding: "8px 10px", color: C.text, maxWidth: 240, overflow: "hidden",
                            textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={kind.subject(r)}>
                            {kind.subject(r)}
                          </td>
                          <td style={{ padding: "8px 10px", color: C.muted, whiteSpace: "nowrap" }}>
                            {fmtD(kind.submitted(r))}
                          </td>
                          <td style={{ padding: "8px 10px", whiteSpace: "nowrap",
                            color: open ? BAND_C[band] : C.hint, fontWeight: open ? 600 : 400 }}>
                            {fmtD(kind.due(r))}
                          </td>
                          <td style={{ padding: "8px 10px", color: C.muted, whiteSpace: "nowrap" }}>
                            {daysOpenCalc(kind.submitted(r))}d
                          </td>
                          <td style={{ padding: "8px 10px" }}>
                            <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 7px", borderRadius: 20,
                              background: sc.bg, color: sc.color, whiteSpace: "nowrap" }}>
                              {wfn}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      })()}
    </>
  );
}

// ── Importance chip style ─────────────────────────────────────────────────────

const impChipStyle = imp => ({
  Low:    { color: C.hint,    bg: C.surface2 },
  Normal: { color: C.accent,  bg: "rgba(91,141,184,0.12)"  },
  High:   { color: C.warning, bg: "rgba(251,191,36,0.12)"  },
  Urgent: { color: C.danger,  bg: "rgba(248,113,113,0.12)" },
}[imp] || { color: C.muted, bg: C.surface2 });

// ── Full record table (RFIs or Issues, driven by `kind`) ──────────────────────
// Columns are user-reorderable (drag a header) and user-hideable (Grid
// Options popup) — preference persists per-user in localStorage, shared
// across the RFIs/Issues tabs since the column set is identical either way.
// Each column carries its own filter control in a header sub-row (pivot-
// table style) instead of a separate filter bar above the table.

const DEFAULT_COLUMN_ORDER = ["project", "discipline", "num", "subject", "detailer", "submitted", "due", "age", "importance", "status", "linked"];

// weight: relative share of table width when visible (colorbar gets a fixed
// slice separately — see widthPct below). filter: which header filter control
// to render, or null for sort-only/no-filter columns.
const COLUMN_META = {
  project:    { label: () => "Project",     sortable: true,  weight: 16, filter: "project"     },
  discipline: { label: () => "Discipline",  sortable: true,  weight: 9,  filter: "discipline"  },
  num:        { label: k => k.numColLabel,  sortable: false, weight: 8,  filter: null          },
  subject:    { label: () => "Subject",     sortable: false, weight: 20, filter: "subject"     },
  detailer:   { label: () => "Detailer",    sortable: true,  weight: 13, filter: "detailer"    },
  submitted:  { label: () => "Submitted",   sortable: true,  weight: 9,  filter: null          },
  due:        { label: () => "Due",         sortable: true,  weight: 10, filter: "band"        },
  age:        { label: () => "Days Open",   sortable: true,  weight: 7,  filter: null          },
  importance: { label: () => "Importance",  sortable: true,  weight: 8,  filter: "importance"  },
  status:     { label: () => "Status",      sortable: true,  weight: 10, filter: "status"      },
  linked:     { label: k => k.linkedLabel,  sortable: false, weight: 10, filter: null          },
};

const VISIBLE_ROWS = 12; // beyond this, the body scrolls internally instead of pushing the page down
const ROW_HEIGHT    = 53;
const HEAD_HEIGHT   = 32;
const FILTER_ROW_HEIGHT = 38;

// Minimum weight a column can be squeezed to when a neighbor borrows width
// from it (see startResize below) — keeps a column from being dragged down
// to unreadable/zero width.
const MIN_COLUMN_WEIGHT = 4;

function loadColumnPrefs(storageKey) {
  if (storageKey) {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey));
      if (saved) {
        const order  = Array.isArray(saved.order) ? saved.order.filter(k => DEFAULT_COLUMN_ORDER.includes(k)) : [];
        const missing = DEFAULT_COLUMN_ORDER.filter(k => !order.includes(k));
        const hidden = Array.isArray(saved.hidden) ? saved.hidden.filter(k => DEFAULT_COLUMN_ORDER.includes(k)) : [];
        const widths = (saved.widths && typeof saved.widths === "object") ? saved.widths : {};
        return { order: [...order, ...missing], hidden, widths };
      }
    } catch {}
  }
  return { order: DEFAULT_COLUMN_ORDER, hidden: [], widths: {} };
}

function GridOptionsMenu({ columns, hidden, onToggle, onReset }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onClick = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button onClick={() => setOpen(o => !o)}
        style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 600, padding: "4px 10px",
          borderRadius: 6, border: `1px solid ${open ? C.accent + "66" : C.border}`,
          background: open ? C.accentDim : C.surface, color: open ? C.accentText : C.muted,
          cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}>
        ⚙ Grid Options
      </button>
      {open && (
        <div style={{ position: "absolute", right: 0, top: "calc(100% + 6px)", zIndex: 30, width: 200,
          background: C.surface, border: `1px solid ${C.borderHi}`, borderRadius: 8,
          boxShadow: "0 8px 28px rgba(0,0,0,0.22)", padding: 10 }}>
          <p style={{ margin: "0 0 6px", fontSize: 10, fontWeight: 700, letterSpacing: "0.06em",
            textTransform: "uppercase", color: C.hint }}>Show columns</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 2, maxHeight: 240, overflowY: "auto" }}>
            {columns.map(col => (
              <label key={col.key} style={{ display: "flex", alignItems: "center", gap: 7, padding: "3px 2px",
                fontSize: 12, color: C.text, cursor: "pointer" }}>
                <input type="checkbox" checked={!hidden.includes(col.key)} onChange={() => onToggle(col.key)} />
                {col.label}
              </label>
            ))}
          </div>
          <button onClick={onReset}
            style={{ marginTop: 8, fontSize: 11, fontWeight: 600, color: C.accentText, background: "none",
              border: "none", cursor: "pointer", padding: 0, fontFamily: "inherit" }}>
            Reset to default
          </button>
        </div>
      )}
    </div>
  );
}

const EMPTY_FILTER = {
  project: "all", discipline: "all", subject: "", detailer: "all",
  status: "all", importance: "all", band: "all",
};

const filterInputSt = active => ({
  width: "100%", fontSize: 11, padding: "4px 6px", borderRadius: 5, fontFamily: "inherit",
  border: `1px solid ${active ? C.accent + "66" : C.border}`, background: C.surface,
  color: active ? C.accentText : C.muted, boxSizing: "border-box",
});

// Top-level (not nested inside RecordTable) so identity is stable across
// re-renders — a component redefined every render gets a fresh type each
// time, which makes React unmount+remount its DOM node (e.g. the Subject
// text input) on every keystroke instead of just updating its value. That
// was the "can only type one letter at a time" bug.
function FilterControl({ colKey, filter, setF, projectOpts, detailerOpts }) {
  const kindKey = COLUMN_META[colKey].filter;
  if (!kindKey) return null;
  if (kindKey === "subject") {
    return (
      <input type="text" value={filter.subject} placeholder="Search…"
        onChange={e => setF("subject", e.target.value)} style={filterInputSt(!!filter.subject)} />
    );
  }
  if (kindKey === "project") {
    return (
      <select value={filter.project} onChange={e => setF("project", e.target.value)} style={filterInputSt(filter.project !== "all")}>
        <option value="all">All projects</option>
        {projectOpts.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    );
  }
  if (kindKey === "discipline") {
    return (
      <select value={filter.discipline} onChange={e => setF("discipline", e.target.value)} style={filterInputSt(filter.discipline !== "all")}>
        <option value="all">All disciplines</option>
        {["Structural", "Solar", "Aero"].map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    );
  }
  if (kindKey === "detailer") {
    return (
      <select value={filter.detailer} onChange={e => setF("detailer", e.target.value)} style={filterInputSt(filter.detailer !== "all")}>
        <option value="all">All detailers</option>
        {detailerOpts.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    );
  }
  if (kindKey === "band") {
    return (
      <select value={filter.band} onChange={e => setF("band", e.target.value)} style={filterInputSt(filter.band !== "all")}>
        <option value="all">All ages</option>
        <option value="overdue">Overdue</option>
        <option value="soon3">Due ≤ 3d</option>
        <option value="soon7">Due ≤ 7d</option>
        <option value="ontrack">On Track</option>
        <option value="nodate">No Date</option>
      </select>
    );
  }
  if (kindKey === "importance") {
    return (
      <select value={filter.importance} onChange={e => setF("importance", e.target.value)} style={filterInputSt(filter.importance !== "all")}>
        <option value="all">All</option>
        {["Low", "Normal", "High", "Urgent"].map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    );
  }
  if (kindKey === "status") {
    return (
      <select value={filter.status} onChange={e => setF("status", e.target.value)} style={filterInputSt(filter.status !== "all")}>
        <option value="all">All</option>
        {["Draft", "Open", "KSF PM Review", "Submitted to GC", "Closed"].map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    );
  }
  return null;
}

function ColumnCell({ colKey, r, kind }) {
  switch (colKey) {
    case "project": {
      const name = r._project.Name;
      return (
        <a href={psProjectLink(r._project.portfolioId, r._project.ProjectID)}
          target="_blank" rel="noopener noreferrer" title={name}
          style={{ display: "block", fontSize: 12, fontWeight: 600, color: C.text, textDecoration: "none",
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
          onMouseEnter={e => e.currentTarget.style.textDecoration = "underline"}
          onMouseLeave={e => e.currentTarget.style.textDecoration = "none"}>
          {name}
        </a>
      );
    }
    case "discipline":
      return <VertBadge v={kind.discipline(r)} />;
    case "num":
      return (
        <a href={kind.link(r._project.portfolioId, r._project.ProjectID, r)}
          target="_blank" rel="noopener noreferrer"
          style={{ color: C.accentText, fontWeight: 600, textDecoration: "none", whiteSpace: "nowrap" }}
          onMouseEnter={e => e.currentTarget.style.textDecoration = "underline"}
          onMouseLeave={e => e.currentTarget.style.textDecoration = "none"}>
          {kind.num(r)}
        </a>
      );
    case "subject":
      return (
        <span style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis",
          whiteSpace: "nowrap", color: C.text }} title={kind.subject(r)}>
          {kind.subject(r)}
        </span>
      );
    case "detailer": {
      const name = kind.detailer(r);
      return (
        <span style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis",
          whiteSpace: "nowrap", color: C.muted, fontSize: 11 }} title={name}>
          {name}
        </span>
      );
    }
    case "submitted":
      return <span style={{ color: C.muted, whiteSpace: "nowrap" }}>{fmtD(kind.submitted(r))}</span>;
    case "due": {
      const band = ageBand(kind.due(r));
      return kind.due(r)
        ? <span style={{ color: BAND_C[band], fontWeight: 600, whiteSpace: "nowrap" }}>{fmtD(kind.due(r))}</span>
        : <span style={{ color: C.hint }}>—</span>;
    }
    case "age":
      return <span style={{ color: C.muted, whiteSpace: "nowrap" }}>{daysOpenCalc(kind.submitted(r))}d</span>;
    case "importance": {
      const imp = kind.importance(r) ?? "Normal", ics = impChipStyle(imp);
      return (
        <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 7px", borderRadius: 20,
          background: ics.bg, color: ics.color, whiteSpace: "nowrap" }}>{imp}</span>
      );
    }
    case "status": {
      const sc = wfnChipStyle(r.WorkflowStateName);
      return (
        <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 7px", borderRadius: 20,
          background: sc.bg, color: sc.color, whiteSpace: "nowrap" }}>{r.WorkflowStateName || "—"}</span>
      );
    }
    case "linked": {
      const linked = kind.linkedOf(r);
      if (linked.length === 0) return <span style={{ color: C.hint }}>—</span>;
      return (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
          {linked.map(li => (
            <a key={li.RecordLinkID}
              href={kind.linkedLink(r._project.portfolioId, r._project.ProjectID, li.LinkedRecordID)}
              target="_blank" rel="noopener noreferrer" title={li.RecordTitle}
              style={{ fontSize: 10, fontWeight: 600, padding: "2px 7px", borderRadius: 20,
                background: C.accentDim, color: C.accentText, textDecoration: "none", whiteSpace: "nowrap" }}
              onMouseEnter={e => e.currentTarget.style.textDecoration = "underline"}
              onMouseLeave={e => e.currentTarget.style.textDecoration = "none"}>
              {li.RecordNumber}
            </a>
          ))}
        </div>
      );
    }
    default: return null;
  }
}

function RecordTable({ records, kind, user }) {
  const storageKey = user?.id ? `ksf-rfi-table-cols-${user.id}` : null;

  const [columnOrder, setColumnOrder] = useState(() => loadColumnPrefs(storageKey).order);
  const [hiddenCols,  setHiddenCols]  = useState(() => loadColumnPrefs(storageKey).hidden);
  const [columnWidths, setColumnWidths] = useState(() => loadColumnPrefs(storageKey).widths);
  useEffect(() => {
    if (!storageKey) return;
    try { localStorage.setItem(storageKey, JSON.stringify({ order: columnOrder, hidden: hiddenCols, widths: columnWidths })); } catch {}
  }, [columnOrder, hiddenCols, columnWidths, storageKey]);

  const [dragCol,     setDragCol]     = useState(null);
  const [dragOverCol, setDragOverCol] = useState(null);
  const handleColDrop = toKey => {
    if (!dragCol || dragCol === toKey) return;
    setColumnOrder(prev => {
      const arr = [...prev], from = arr.indexOf(dragCol), to = arr.indexOf(toKey);
      if (from === -1 || to === -1) return arr;
      arr.splice(from, 1); arr.splice(to, 0, dragCol);
      return arr;
    });
  };
  const toggleColumn = key => setHiddenCols(h => h.includes(key) ? h.filter(k => k !== key) : [...h, key]);
  const resetColumns = () => { setColumnOrder(DEFAULT_COLUMN_ORDER); setHiddenCols([]); setColumnWidths({}); };

  const visibleCols = columnOrder.filter(k => !hiddenCols.includes(k));
  const effectiveWeight = key => columnWidths[key] ?? COLUMN_META[key].weight;
  const totalWeight = visibleCols.reduce((s, k) => s + effectiveWeight(k), 0) || 1;
  const widthPct    = key => (effectiveWeight(key) / totalWeight) * 97; // 97 leaves ~3% for the colorbar strip

  // Dragging a column's right edge takes width from (or gives it to) the
  // next visible column — total table width never changes, "the ends" stay
  // put. Reads the table's rendered px width once at drag start rather than
  // tracking individual header widths; that's enough to convert a pixel
  // delta into a weight delta since widthPct() is linear in weight.
  const tableRef = useRef(null);
  const resizingRef = useRef(false);
  const [resizingCol, setResizingCol] = useState(null);
  function startResize(e, colKey) {
    e.preventDefault();
    e.stopPropagation();
    const idx = visibleCols.indexOf(colKey);
    const nextKey = visibleCols[idx + 1];
    if (!nextKey || !tableRef.current) return;
    const startX = e.clientX;
    const tableWidthPx = tableRef.current.getBoundingClientRect().width;
    const startWeightA = effectiveWeight(colKey);
    const startWeightB = effectiveWeight(nextKey);
    const pairWeight = startWeightA + startWeightB;
    resizingRef.current = true;
    setResizingCol(colKey);
    const onMove = ev => {
      const deltaPx = ev.clientX - startX;
      const deltaWeight = deltaPx * totalWeight / (tableWidthPx * 0.97);
      let newA = startWeightA + deltaWeight;
      newA = Math.max(MIN_COLUMN_WEIGHT, Math.min(pairWeight - MIN_COLUMN_WEIGHT, newA));
      const newB = pairWeight - newA;
      setColumnWidths(w => ({ ...w, [colKey]: newA, [nextKey]: newB }));
    };
    const onUp = () => {
      resizingRef.current = false;
      setResizingCol(null);
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }

  const [filter, setFilter] = useState(EMPTY_FILTER);
  const [sort,   setSort]   = useState({ col: "due", dir: "asc" });
  const setF = (key, value) => setFilter(f => ({ ...f, [key]: value }));
  const hasActiveFilter = filter.project !== "all" || filter.discipline !== "all" || !!filter.subject
    || filter.detailer !== "all" || filter.status !== "all" || filter.importance !== "all" || filter.band !== "all";

  const projectOpts  = useMemo(() => [...new Set(records.map(r => r._project.Name))].sort(), [records]);
  const detailerOpts = useMemo(() => [...new Set(records.map(r => kind.detailer(r)))].sort(), [records, kind]);

  const filtered = useMemo(() => {
    let list = [...records];
    if (filter.subject.trim()) {
      const q = filter.subject.trim().toLowerCase();
      list = list.filter(r => kind.subject(r).toLowerCase().includes(q));
    }
    const applyEq = (key, get) => { if (filter[key] !== "all") list = list.filter(r => get(r) === filter[key]); };
    applyEq("project",    r => r._project.Name);
    applyEq("discipline", r => kind.discipline(r));
    applyEq("detailer",   r => kind.detailer(r));
    applyEq("status",     r => r.WorkflowStateName);
    applyEq("importance", r => kind.importance(r) ?? "Normal");
    applyEq("band",       r => ageBand(kind.due(r)));

    const dir = sort.dir === "asc" ? 1 : -1;
    list.sort((a, b) => {
      switch (sort.col) {
        case "project":    return dir * a._project.Name.localeCompare(b._project.Name);
        case "discipline": return dir * kind.discipline(a).localeCompare(kind.discipline(b));
        case "detailer":   return dir * kind.detailer(a).localeCompare(kind.detailer(b));
        case "submitted":  return dir * (new Date(kind.submitted(a) || 0) - new Date(kind.submitted(b) || 0));
        case "due": {
          const ad = kind.due(a), bd = kind.due(b);
          if (!ad && !bd) return 0; if (!ad) return 1; if (!bd) return -1;
          return dir * (new Date(ad) - new Date(bd));
        }
        case "age":        return dir * (daysOpenCalc(kind.submitted(b)) - daysOpenCalc(kind.submitted(a)));
        case "importance": {
          const O = { Urgent: 0, High: 1, Normal: 2, Low: 3 };
          return dir * ((O[kind.importance(a) ?? "Normal"] ?? 2) - (O[kind.importance(b) ?? "Normal"] ?? 2));
        }
        case "status":     return dir * (a.WorkflowStateName || "").localeCompare(b.WorkflowStateName || "");
        default: return 0;
      }
    });
    return list;
  }, [records, filter, sort, kind]);

  const toggleSort = key => setSort(s =>
    s.col === key ? { ...s, dir: s.dir === "asc" ? "desc" : "asc" } : { col: key, dir: "asc" }
  );

  const gridColumns = DEFAULT_COLUMN_ORDER.map(key => ({ key, label: COLUMN_META[key].label(kind) }));

  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, overflow: "hidden" }}>

      <div style={{ padding: "10px 16px", borderBottom: `1px solid ${C.border}`, background: C.surface2,
        display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase",
            color: C.hint, flexShrink: 0 }}>All Open {kind.labelPlural}</span>
          <span style={{ fontSize: 11, color: C.hint, whiteSpace: "nowrap" }}>
            {filtered.length} / {records.length}
          </span>
          {hasActiveFilter && (
            <button onClick={() => setFilter(EMPTY_FILTER)}
              style={{ fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 20,
                border: `1px solid ${C.border}`, background: C.surface, color: C.hint, cursor: "pointer", fontFamily: "inherit" }}>
              Clear filters
            </button>
          )}
        </div>
        <span style={{ fontSize: 13, fontWeight: 700, color: C.text, fontFamily: F.head, whiteSpace: "nowrap" }}>
          The Grid
        </span>
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <GridOptionsMenu columns={gridColumns} hidden={hiddenCols} onToggle={toggleColumn} onReset={resetColumns} />
        </div>
      </div>

      {/* Header (labels + per-column filters) always renders, even with zero
          matches — otherwise a filter combo with no results hides the very
          controls needed to undo it (e.g. filtering to a discipline nobody
          on that project has), locking the table out until a full reload. */}
      <div style={{ overflowX: "auto" }}>
        {/* Fixed height, not max-height — a max-height shrinks to fit fewer
            rows, which shifts everything below it on the page as filters
            narrow the result set (most noticeable while typing in Subject).
            A fixed height keeps the table's footprint constant regardless
            of match count; it just leaves blank space below a short result
            set instead of collapsing around it. */}
        <div style={{ height: HEAD_HEIGHT + FILTER_ROW_HEIGHT + VISIBLE_ROWS * ROW_HEIGHT, overflowY: "auto" }}>
          <table ref={tableRef} style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, tableLayout: "fixed" }}>
            <colgroup>
              <col style={{ width: "3%" }} />
              {visibleCols.map(key => <col key={key} style={{ width: `${widthPct(key)}%` }} />)}
            </colgroup>
            <thead>
              <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                <th style={{ position: "sticky", top: 0, zIndex: 2, background: C.surface,
                  padding: "8px 0 8px 12px", height: HEAD_HEIGHT, borderBottom: `1px solid ${C.border}` }} />
                {visibleCols.map((colKey, i) => {
                  const meta = COLUMN_META[colKey];
                  const canResize = i < visibleCols.length - 1;
                  return (
                    <th key={colKey}
                      draggable
                      onDragStart={() => setDragCol(colKey)}
                      onDragOver={e => { e.preventDefault(); if (dragCol && dragCol !== colKey) setDragOverCol(colKey); }}
                      onDrop={e => { e.preventDefault(); handleColDrop(colKey); setDragCol(null); setDragOverCol(null); }}
                      onDragEnd={() => { setDragCol(null); setDragOverCol(null); }}
                      onClick={() => meta.sortable && toggleSort(colKey)}
                      title="Drag to reorder"
                      style={{ position: "sticky", top: 0, zIndex: 2,
                        padding: "8px 12px", height: HEAD_HEIGHT, textAlign: "left", fontSize: 10, fontWeight: 700,
                        letterSpacing: "0.06em", textTransform: "uppercase",
                        color: sort.col === colKey ? C.accentText : C.hint,
                        cursor: meta.sortable ? "pointer" : "grab", userSelect: "none",
                        background: dragOverCol === colKey ? C.accentDim : C.surface,
                        borderBottom: `1px solid ${C.border}`,
                        borderLeft: dragOverCol === colKey ? `2px solid ${C.accent}` : "2px solid transparent",
                        opacity: dragCol === colKey ? 0.4 : 1 }}>
                      {/* overflow/truncation lives on this inner span rather than the
                          th itself, so the resize handle below (a th sibling, absolutely
                          positioned) isn't clipped when it extends past this row into
                          the filter row underneath. */}
                      <span style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {meta.label(kind)}
                        {meta.sortable && sort.col === colKey && (
                          <span style={{ marginLeft: 3 }}>{sort.dir === "asc" ? "↑" : "↓"}</span>
                        )}
                      </span>
                      {canResize && (
                        <div
                          draggable={false}
                          onDragStart={e => e.preventDefault()}
                          onMouseDown={e => startResize(e, colKey)}
                          onClick={e => e.stopPropagation()}
                          title="Drag to resize"
                          style={{ position: "absolute", top: 0, right: -3, width: 6,
                            height: HEAD_HEIGHT + FILTER_ROW_HEIGHT, cursor: "col-resize", zIndex: 3,
                            background: resizingCol === colKey ? C.accent + "66" : "transparent" }}
                          onMouseEnter={e => { if (!resizingRef.current) e.currentTarget.style.background = C.accent + "33"; }}
                          onMouseLeave={e => { if (!resizingRef.current) e.currentTarget.style.background = "transparent"; }}
                        />
                      )}
                    </th>
                  );
                })}
              </tr>
              <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                <th style={{ position: "sticky", top: HEAD_HEIGHT, zIndex: 2, background: C.surface2,
                  height: FILTER_ROW_HEIGHT, borderBottom: `1px solid ${C.border}` }} />
                {visibleCols.map(colKey => (
                  <th key={colKey} style={{ position: "sticky", top: HEAD_HEIGHT, zIndex: 2, background: C.surface2,
                    padding: "4px 8px", height: FILTER_ROW_HEIGHT, fontWeight: 400,
                    borderBottom: `1px solid ${C.border}`, verticalAlign: "top" }}>
                    <FilterControl colKey={colKey} filter={filter} setF={setF} projectOpts={projectOpts} detailerOpts={detailerOpts} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={visibleCols.length + 1} style={{ padding: "28px 16px", fontSize: 12, color: C.hint, textAlign: "center" }}>
                    No {kind.labelPlural} match the current filters.
                  </td>
                </tr>
              ) : filtered.map(r => {
                const band = ageBand(kind.due(r));
                return (
                  <tr key={`${r._project.portfolioId}-${r._project.ProjectID}-${kind.idVal(r)}`}
                    style={{ borderBottom: `1px solid ${C.border}` }}
                    onMouseEnter={e => e.currentTarget.style.background = C.surface2}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                    <td style={{ padding: "10px 0 10px 12px" }}>
                      <div style={{ width: 4, height: 32, borderRadius: 2, background: BAND_C[band] }} />
                    </td>
                    {visibleCols.map(colKey => (
                      <td key={colKey} style={{ padding: "10px 12px", overflow: "hidden" }}>
                        <ColumnCell colKey={colKey} r={r} kind={kind} />
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── Removed: TriageHealthBar, TriageIssueCard (Section 2 revised — the Issues
// tab now reuses RecordCards/RecordTable instead of bespoke triage UI). The
// consult/decision flow they implemented is gone from the UI entirely; nothing
// else in this file references them.
// ── Main component ────────────────────────────────────────────────────────────

export default function RFIApp({ user }) {
  const [psProjects,      setPsProjects]      = useState([]);
  const [psRFIs,          setPsRFIs]          = useState({});
  const [psIssues,        setPsIssues]        = useState({});
  const [projectsLoading, setProjectsLoading] = useState(() => store.projectsightCache.projects.length === 0);
  const [projectsError,   setProjectsError]   = useState(null);
  const [refreshKey,      setRefreshKey]      = useState(0);
  const [lastSynced,      setLastSynced]      = useState(store.projectsightCache.lastSynced);
  // True only while a manual "Refresh" click is re-syncing Postgres from
  // ProjectSight (server/projectsightSync.js) — separate from projectsLoading,
  // which just means "reading from our own DB," a much faster phase.
  const [syncing,         setSyncing]         = useState(false);
  const [,                setTimeTick]        = useState(0);
  const [expandedProject, setExpandedProject] = useState(null);
  const [rfiTab,          setRfiTab]          = useState("dashboard");
  /* KernBot analysis — disabled, restore when training is ready */
  // const [triageAnalysis,  setTriageAnalysis]  = useState({});
  // const [triageAnalyzing, setTriageAnalyzing] = useState({});
  // const [kernbotLearning, setKernbotLearning] = useState([]);
  /* end KernBot analysis */
  const [leadFilter,      setLeadFilter]      = useState("All");

  /* KernBot analysis — disabled, restore when training is ready */
  // const analyzedRef      = useRef(new Set());
  // const analysisQueueRef = useRef([]);
  // const isProcessingRef  = useRef(false);
  /* end KernBot analysis */

  const isAdmin = user.tier === "admin" || user.tier === "sr_pm";
  /* KernBot analysis — disabled, restore when training is ready */
  // const apiKey  = import.meta.env.VITE_ANTHROPIC_API_KEY;
  /* end KernBot analysis */

  /* KernBot analysis — disabled, restore when training is ready */
  /*
  // Sequential analysis queue — processes one issue at a time, 1500ms between each
  async function runAnalysisQueue() {
    if (isProcessingRef.current || !apiKey) return;
    isProcessingRef.current = true;
    while (analysisQueueRef.current.length > 0) {
      const issue = analysisQueueRef.current.shift();
      const iid   = issueId(issue);
      if (analyzedRef.current.has(iid)) continue;
      analyzedRef.current.add(iid);
      setTriageAnalyzing(a => ({ ...a, [iid]: true }));
      try {
        const text   = issueDesc(issue) || issueTitle(issue) || "";
        const result = await analyzeIssue(text, apiKey);
        setTriageAnalysis(c => ({ ...c, [iid]: result }));
      } catch (e) {
        setTriageAnalysis(c => ({ ...c, [iid]: { error: e.message } }));
      } finally {
        setTriageAnalyzing(a => ({ ...a, [iid]: false }));
      }
      if (analysisQueueRef.current.length > 0) {
        await new Promise(r => setTimeout(r, 1500));
      }
    }
    isProcessingRef.current = false;
  }
  */
  /* end KernBot analysis */

  // Tick every minute so "Last synced" display stays accurate
  useEffect(() => {
    const id = setInterval(() => setTimeTick(t => t + 1), 60000);
    return () => clearInterval(id);
  }, []);

  // Manual "Refresh" now re-syncs Postgres from ProjectSight first (via
  // /api/sync-projectsight, session-authenticated), THEN re-reads — instead
  // of the old behavior of the browser re-fetching ProjectSight directly,
  // once per project. Same background sync also runs automatically every
  // ~10 min via .github/workflows/sync-projectsight.yml.
  const handleRefresh = async () => {
    store.clearProjectsightCache();
    clearProjectsightApiCache();
    setPsProjects([]);
    setPsRFIs({});
    setPsIssues({});
    setProjectsError(null);
    setLastSynced(null);
    setSyncing(true);
    try {
      await triggerProjectsightSync();
    } catch (err) {
      setProjectsError(`Sync failed: ${err.message}`);
    } finally {
      setSyncing(false);
      setRefreshKey(k => k + 1);
    }
  };

  // Load projects + RFIs + Issues — uses cache when available, otherwise
  // fetches once in bulk (getAllRFIs()/getAllIssues() each return every
  // project's records in a single call) and populates the cache. This
  // replaced a per-project fetch loop — one HTTP round trip per record type
  // total, not one per project.
  useEffect(() => {
    const cache = store.projectsightCache;
    if (cache.projects.length > 0) {
      setPsProjects(cache.projects.filter(isActiveProject));
      setPsRFIs(cache.rfis);
      setPsIssues(cache.issues || {});
      setLastSynced(cache.lastSynced);
      setProjectsLoading(false);
      return;
    }
    setProjectsLoading(true);
    Promise.all([getProjects(), getAllRFIs(), getAllIssues(), getSyncStatus().catch(() => null)])
      .then(([projects, rfiMap, rawIssueMap, syncStatus]) => {
        const activeProjects = projects.filter(isActiveProject);
        setPsProjects(activeProjects);
        setPsRFIs(rfiMap);

        // Same pre-filter the old per-project Issues effect applied before
        // handing records to RecordCards/RecordTable (which apply their own
        // isOpen check on top of this).
        const issueMap = {};
        Object.entries(rawIssueMap).forEach(([pid, rawIssues]) => {
          issueMap[pid] = (Array.isArray(rawIssues) ? rawIssues : [])
            .filter(i => i.WorkflowStateName !== "Closed" && i.IsDraft === false);
        });
        setPsIssues(issueMap);
        setProjectsLoading(false);

        // "Last synced" reflects the shared backend sync time (from
        // Postgres), not just "when this browser happened to load the page".
        const ts = syncStatus?.lastSyncedAt ? new Date(syncStatus.lastSyncedAt).getTime() : Date.now();
        store.setProjectsightCache(projects, rfiMap, issueMap, ts);
        setLastSynced(ts);
      })
      .catch(err => { setProjectsError(err.message); setProjectsLoading(false); });
  }, [refreshKey]);

  // ── API Discovery test harness — unrelated to the load effect above, kept
  // as its own effect since it only needs psProjects, not the fetched data.
  useEffect(() => {
    if (!RUN_ISSUE_DISCOVERY || !psProjects.length) return;
    const ksfPid  = "5ce1bcb1-c811-49ac-9039-ec36f3e75f78";
    const ksfProj = psProjects.find(p => p.portfolioId === ksfPid);
    if (ksfProj) {
      getIssues(ksfProj.portfolioId, ksfProj.ProjectID);
      postIssueComment(ksfProj.portfolioId, ksfProj.ProjectID, "PLACEHOLDER_ISSUE_ID", "KSF API test — ignore");
      postRFIFromIssue(ksfProj.portfolioId, ksfProj.ProjectID, "API Test RFI — ignore", "This is an automated test. Please discard.");
    }
  }, [psProjects]);

  // True when the admin's "Team Member" filter is set to someone who doesn't
  // own jobs (JR/Josh/Lisbet/Jacob) — for them we filter which RECORDS show
  // (by CC'd email, below), not which PROJECTS show, so every project stays
  // visible here and the record-level filtering happens in allRFIs/allIssues/
  // recordsForDisplay instead.
  const isCCOnlyFilter = (user?.id === "lanze" || user?.id === "loren") && CC_ONLY_MEMBERS.includes(leadFilter);
  const ccFilterEmail  = isCCOnlyFilter ? TEAM_MEMBER_EMAIL[leadFilter] : null;

  // Derived: visible projects for this user
  const visibleProjects = useMemo(() => {
    if (user?.id === "lanze" || user?.id === "loren") {
      if (leadFilter === "All" || isCCOnlyFilter) return psProjects;
      return psProjects.filter(p => (p.TypeOfBuilding ?? "").trim() === leadFilter);
    }
    const lead = KSF_LEAD_MAP[user?.id];
    if (lead === null || lead === undefined) return psProjects;
    return psProjects.filter(p => {
      const tob = (p.TypeOfBuilding ?? "").trim();
      if (tob === lead) return true;
      const firstName = lead.split(" ")[0].toLowerCase();
      return tob.toLowerCase().includes(firstName);
    });
  }, [psProjects, user, leadFilter, isCCOnlyFilter]);

  // Same `.vertical` field driving the Structural/Solar/Aero tags on project
  // cards — no new classification, just a breakdown of the same count already
  // shown in the header.
  const verticalCounts = useMemo(() => {
    const counts = { Structural: 0, Solar: 0, Aero: 0 };
    visibleProjects.forEach(p => { if (counts[p.vertical] !== undefined) counts[p.vertical]++; });
    return counts;
  }, [visibleProjects]);

  // Derived: all RFIs across visible projects, decorated with _project.
  // When viewing a CC_ONLY_MEMBERS team member, also drops any record that
  // person isn't CC'd on — see isCCOnlyFilter/ccFilterEmail above.
  const allRFIs = useMemo(() => {
    const base = visibleProjects.flatMap(p =>
      (psRFIs[`${p.portfolioId}-${p.ProjectID}`] || []).map(r => ({ ...r, _project: p }))
    );
    return ccFilterEmail ? base.filter(r => ccEmailsOf(r).includes(ccFilterEmail)) : base;
  }, [visibleProjects, psRFIs, ccFilterEmail]);

  const openRFIs = useMemo(() => allRFIs.filter(isOpenRFI), [allRFIs]);

  // Derived: all open issues across visible projects, decorated with
  // _project. Same CC'd-only narrowing as allRFIs above.
  const allIssues = useMemo(() => {
    const base = visibleProjects.flatMap(p =>
      (psIssues[`${p.portfolioId}-${p.ProjectID}`] || []).map(i => ({ ...i, _project: p }))
    );
    return ccFilterEmail ? base.filter(i => ccEmailsOf(i).includes(ccFilterEmail)) : base;
  }, [visibleProjects, psIssues, ccFilterEmail]);

  // Derived: open issues, filtered the same way openRFIs is derived from allRFIs
  const openIssuesList = useMemo(() => allIssues.filter(isOpenIssueRecord), [allIssues]);

  // Summary stats — one per record kind, same shape/logic, picked by active tab at render time
  const rfiStats = useMemo(() => {
    const overdue = openRFIs.filter(r => ageBand(rfiDue(r)) === "overdue").length;
    const due7    = openRFIs.filter(r => ["soon3", "soon7"].includes(ageBand(rfiDue(r)))).length;
    const avgDays = openRFIs.length
      ? Math.round(openRFIs.reduce((s, r) => s + daysOpenCalc(rfiSubmitted(r)), 0) / openRFIs.length)
      : 0;
    return { total: openRFIs.length, overdue, due7, avgDays };
  }, [openRFIs]);

  const issueStats = useMemo(() => {
    const overdue = openIssuesList.filter(i => ageBand(issDue(i)) === "overdue").length;
    const due7    = openIssuesList.filter(i => ["soon3", "soon7"].includes(ageBand(issDue(i)))).length;
    const avgDays = openIssuesList.length
      ? Math.round(openIssuesList.reduce((s, i) => s + daysOpenCalc(issSubmitted(i)), 0) / openIssuesList.length)
      : 0;
    return { total: openIssuesList.length, overdue, due7, avgDays };
  }, [openIssuesList]);

  /* KernBot analysis — disabled, restore when training is ready */
  /*
  const handleAnalyze = issue => {
    if (!apiKey) return;
    const iid = issueId(issue);
    analyzedRef.current.delete(iid);
    analysisQueueRef.current.push(issue);
    runAnalysisQueue();
  };
  */
  /* end KernBot analysis */

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", background: C.bg, overflowY: "auto",
      fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif" }}>
      <style>{`
        @keyframes ksf-spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }
        .ksf-hscroll::-webkit-scrollbar { height: 4px; }
        .ksf-hscroll::-webkit-scrollbar-track { background: transparent; }
        .ksf-hscroll::-webkit-scrollbar-thumb { background: ${C.border}; border-radius: 2px; }
      `}</style>

      <div style={{ maxWidth: 1400, width: "100%", margin: "0 auto", padding: "20px 20px 48px" }}>

        {/* Page header */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
          <div style={{ flex: 1 }}>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: C.text, letterSpacing: "-0.03em" }}>
              RFIs
            </h1>
            <p style={{ margin: "3px 0 0", fontSize: 12, color: C.hint }}>
              Live from ProjectSight · {visibleProjects.length} project{visibleProjects.length !== 1 ? "s" : ""}
              {visibleProjects.length > 0 && ` (Structural: ${verticalCounts.Structural}, Solar: ${verticalCounts.Solar}, Aero: ${verticalCounts.Aero})`}
            </p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
            {syncing ? (
              <Spinner label="Syncing from ProjectSight…" />
            ) : projectsLoading ? (
              <Spinner />
            ) : (
              <>
                {lastSynced && (
                  <span style={{ fontSize: 11, color: C.hint }} title="Shared across everyone — reflects the background sync, not just this browser">
                    Last synced: {relTime(lastSynced)}
                  </span>
                )}
                <button
                  onClick={handleRefresh}
                  title="Re-sync from ProjectSight now"
                  style={{ width: 26, height: 26, borderRadius: 6, background: "none",
                    border: `1px solid ${C.border}`, color: C.hint, fontSize: 16, lineHeight: 1,
                    cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                    fontFamily: "inherit", transition: "all 0.15s" }}
                  onMouseEnter={e => { e.currentTarget.style.color = C.text; e.currentTarget.style.borderColor = C.borderHi; }}
                  onMouseLeave={e => { e.currentTarget.style.color = C.hint; e.currentTarget.style.borderColor = C.border; }}>
                  ↻
                </button>
              </>
            )}
            {projectsError && (
              <span style={{ fontSize: 12, color: C.danger }}>⚠ {projectsError}</span>
            )}
          </div>
        </div>

        {/* Tab bar */}
        <div style={{ display: "flex", gap: 2, marginBottom: 20,
          borderBottom: `1px solid ${C.border}`, paddingBottom: 0 }}>
          {[
            { id: "dashboard", label: "RFIs" },
            { id: "triage",    label: "Issues" },
          ].map(t => {
            const isActive = rfiTab === t.id;
            // Total OPEN records, not every record ever fetched (allRFIs/
            // allIssues include Closed/Void too — that inflated this badge).
            const badge    = t.id === "dashboard" ? rfiStats.total : issueStats.total;
            return (
              <button key={t.id} onClick={() => { setRfiTab(t.id); setExpandedProject(null); }}
                style={{ padding: "8px 18px", borderRadius: "7px 7px 0 0",
                  border: `1px solid ${isActive ? C.border : "transparent"}`,
                  borderBottom: isActive ? `1px solid ${C.bg}` : "none",
                  background: isActive ? C.surface : "transparent",
                  color: isActive ? C.text : C.hint,
                  fontSize: 13, fontWeight: isActive ? 600 : 400,
                  cursor: "pointer", fontFamily: "inherit",
                  marginBottom: isActive ? -1 : 0, position: "relative", zIndex: isActive ? 1 : 0 }}>
                {t.label}
                {badge > 0 && (
                  <span style={{ marginLeft: 6, fontSize: 10, fontWeight: 700,
                    padding: "1px 5px", borderRadius: 10,
                    background: C.pm + "33", color: C.pm }}>
                    {badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* ── RFIs / Issues tab body — same components, driven by `kind` ────── */}
        {(() => {
          const kind        = rfiTab === "dashboard" ? RECORD_KINDS.rfi : RECORD_KINDS.issue;
          const rawRecords  = rfiTab === "dashboard" ? psRFIs      : psIssues;
          // RecordCards/TeamBreakdownTable read this per-project map directly
          // (unlike allRFIs/allIssues above, which are already flattened+
          // filtered) — apply the same CC'd-only narrowing here so a project's
          // card/breakdown count matches what showed up in the flat table.
          const records = !ccFilterEmail ? rawRecords : Object.fromEntries(
            Object.entries(rawRecords).map(([pid, recs]) =>
              [pid, (recs || []).filter(r => ccEmailsOf(r).includes(ccFilterEmail))]
            )
          );
          // No more per-project loading/error map — projects+RFIs+Issues now
          // load in one bulk request (see the load effect above), so there's
          // nothing per-card left to track; RecordCards still accepts these
          // props for its spinner/error-badge logic, just always empty now.
          const loading   = EMPTY_MAP;
          const errors    = EMPTY_MAP;
          const flatStats = rfiTab === "dashboard" ? rfiStats    : issueStats;
          const flatList  = rfiTab === "dashboard" ? openRFIs    : openIssuesList;

          return (
            <>
              <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
                <StatCard label={`Total Open ${kind.labelPlural}`} value={flatStats.total} />
                <StatCard label="Overdue" value={flatStats.overdue}
                  color={flatStats.overdue > 0 ? BAND_C.overdue : C.success} />
                <StatCard label="Due Within 7 Days" value={flatStats.due7}
                  color={flatStats.due7 > 0 ? BAND_C.soon7 : C.success} />
                <StatCard label="Avg Days Open"
                  value={flatStats.avgDays > 0 ? `${flatStats.avgDays}d` : "—"} />
              </div>

              <div style={{ marginBottom: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
                  <p style={{ margin: 0, fontSize: 11, fontWeight: 700,
                    letterSpacing: "0.07em", textTransform: "uppercase", color: C.hint }}>
                    Project Health
                  </p>
                  {(user?.id === "lanze" || user?.id === "loren") && (
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginLeft: "auto" }}>
                      <span style={{ fontSize: 11, color: C.hint }}>Team Member:</span>
                      <select value={leadFilter} onChange={e => setLeadFilter(e.target.value)}
                        style={{ fontSize: 11, padding: "4px 8px", borderRadius: 6, fontFamily: "inherit",
                          background: C.surface, border: `1px solid ${leadFilter !== "All" ? C.accent + "66" : C.border}`,
                          color: leadFilter !== "All" ? C.accentText : C.muted, cursor: "pointer", outline: "none" }}>
                        {TEAM_MEMBER_OPTS.map(o => (
                          <option key={o} value={o}>{o}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
                {/* Always the full, unfiltered per-project record map — this
                    is a summary of EVERY team member regardless of which one
                    leadFilter currently has selected, so it must not inherit
                    the CC'd-only narrowing applied to `records` below (that
                    narrowing is specific to whichever single member is
                    currently selected). */}
                {(user?.id === "lanze" || user?.id === "loren") && (
                  <TeamBreakdownTable projects={visibleProjects} records={rawRecords} kind={kind} />
                )}
                <RecordCards
                  projects={visibleProjects}
                  records={records}
                  loading={loading}
                  errors={errors}
                  kind={kind}
                  expandedProject={expandedProject}
                  setExpandedProject={setExpandedProject}
                />
              </div>

              {!projectsLoading && (
                <RecordTable records={flatList} kind={kind} user={user} />
              )}
            </>
          );
        })()}
      </div>
    </div>
  );
}
