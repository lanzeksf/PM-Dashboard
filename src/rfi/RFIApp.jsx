import React, { useState, useEffect, useMemo, useRef } from "react";
import { C, F, MI } from "../core/utils.jsx";
import { store } from "../core/store.js";
import { getProjects, getRFIs, getIssues, postIssueComment, postRFIFromIssue } from "../projectsight/projectsightApi.js";

// Set true to run API discovery calls once — flip back to false after
const RUN_ISSUE_DISCOVERY = false;

// ── KSF team → Territory filter mapping ──────────────────────────────────────

const KSF_LEAD_MAP = {
  lanze:   null,
  loren:   null,
  jacob:   null,
  tony:    'Tony S.',
  luis:    'Luis A.',
  lisbet:  null,
  adam:    'Adam K.',
};

// ── Constants ─────────────────────────────────────────────────────────────────

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
const rfiJobNum   = r => r.Number ?? r.jobNumber ?? r.sequenceNumber ?? "—";
const rfiDetailer = r => r.AuthorContactName ?? r.assignedCompany ?? r.submittedBy ?? r.createdBy ?? "Unknown";
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

const isOpenRFI = r => r.WorkflowStateName !== "Closed" && r.WorkflowStateName !== "Void";

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
const issJobNum = i => i.Number ?? i.number ?? "—";
const issAuthor = i => i.AuthorContactName ?? i.createdBy ?? "Unknown";
const issImpVal = i => i.Importance ?? i.importance ?? null;
const isOpenIssueRecord = i => i.WorkflowStateName !== "Closed" && i.WorkflowStateName !== "Void";

// ── Record-kind config shared by RecordCards/RecordTable ─────────────────────
const RECORD_KINDS = {
  rfi: {
    labelPlural: "RFIs", numColLabel: "RFI #",
    isOpen: isOpenRFI, due: rfiDue, submitted: rfiSubmitted, num: rfiNum, idVal: rfiIdVal,
    jobNum: rfiJobNum, subject: rfiSubject, detailer: rfiDetailer, discipline: rfiDisc, importance: rfiImp,
    link: (pid, projId, r) => psRFILink(pid, projId, rfiIdVal(r)),
    linkedLabel: "Linked Issue",
    linkedOf: linkedIssuesOf,
    linkedLink: (pid, projId, linkedId) => psIssueLink(pid, projId, linkedId),
  },
  issue: {
    labelPlural: "Issues", numColLabel: "Issue #",
    isOpen: isOpenIssueRecord, due: issDue, submitted: issSubmitted, num: issNum, idVal: issIdVal,
    jobNum: issJobNum, subject: issSubject, detailer: issAuthor,
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
  const leads = ["Antonio S.", "Adam K.", "Loren", "Jake", "Luis A.", "Frank", "Ali"];
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
  const [showAll,   setShowAll]   = useState(false);
  const [search,    setSearch]    = useState("");
  const [detailTab, setDetailTab] = useState("open");

  useEffect(() => { setDetailTab("open"); }, [expandedProject]);

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
                      {["", kind.numColLabel, "Subject", "Submitted", "Due", "Days Open", "Status"].map((h, i) => (
                        <th key={i} style={{ padding: "6px 10px", textAlign: "left", fontSize: 10,
                          fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase",
                          color: C.hint, whiteSpace: "nowrap" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {tabRecs.map(r => {
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

function RecordTable({ records, kind, enabledFilters }) {
  const has = f => enabledFilters.includes(f);

  const mkFilter = () => ({
    jobNumber:  "",
    project:    "all",
    detailer:   "all",
    discipline: "all",
    status:     "all",
    importance: "all",
    band:       "all",
  });

  const [filter, setFilter] = useState(mkFilter);
  const [sort,   setSort]   = useState({ col: "due", dir: "asc" });

  const setF = (key, value) => setFilter(f => ({ ...f, [key]: value }));

  const projectOpts  = useMemo(() => [...new Set(records.map(r => r._project.Name))].sort(), [records]);
  const detailerOpts = useMemo(() => [...new Set(records.map(r => kind.detailer(r)))].sort(), [records, kind]);

  const activeChips = useMemo(() => {
    const chips = [];
    const { jobNumber, project, detailer, discipline, status, importance, band } = filter;
    if (has("jobNumber")  && jobNumber)            chips.push({ key: "jobNumber",  label: `Job: "${jobNumber}"` });
    if (has("project")    && project    !== "all") chips.push({ key: "project",    label: `Project: ${project}` });
    if (has("detailer")   && detailer   !== "all") chips.push({ key: "detailer",   label: `Detailer: ${detailer}` });
    if (has("discipline") && discipline !== "all") chips.push({ key: "discipline", label: `Discipline: ${discipline}` });
    if (has("status")     && status     !== "all") chips.push({ key: "status",     label: `Status: ${status}` });
    if (has("importance") && importance !== "all") chips.push({ key: "importance", label: `Importance: ${importance}` });
    if (has("band")       && band       !== "all") chips.push({ key: "band",       label: `Age: ${BAND_LABEL[band]}` });
    return chips;
  }, [filter, enabledFilters]);

  const clearChip = key => setFilter(f => ({
    ...f, [key]: key === "jobNumber" ? "" : "all",
  }));

  const filtered = useMemo(() => {
    let list = [...records];
    if (has("jobNumber") && filter.jobNumber) {
      const q = filter.jobNumber.toLowerCase();
      list = list.filter(r => kind.jobNum(r).toLowerCase().includes(q));
    }
    const applyEq = (key, get) => {
      if (has(key) && filter[key] !== "all") list = list.filter(r => get(r) === filter[key]);
    };
    applyEq("project",    r => r._project.Name);
    applyEq("detailer",   r => kind.detailer(r));
    applyEq("discipline", r => kind.discipline(r));
    applyEq("status",     r => r.WorkflowStateName);
    applyEq("importance", r => kind.importance(r) ?? "Normal");
    applyEq("band",       r => ageBand(kind.due(r)));

    const dir = sort.dir === "asc" ? 1 : -1;
    list.sort((a, b) => {
      switch (sort.col) {
        case "jobnum":     return dir * kind.jobNum(a).localeCompare(kind.jobNum(b));
        case "project":    return dir * a._project.Name.localeCompare(b._project.Name);
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

  const COLS = [
    { key: "colorbar",   label: "",           sortable: false },
    { key: "jobnum",     label: "Job #",      sortable: true  },
    { key: "project",    label: "Project",    sortable: true  },
    { key: "num",        label: kind.numColLabel, sortable: false },
    { key: "subject",    label: "Subject",    sortable: false },
    { key: "detailer",   label: "Detailer",   sortable: true  },
    { key: "submitted",  label: "Submitted",  sortable: true  },
    { key: "due",        label: "Due",        sortable: true  },
    { key: "age",        label: "Days Open",  sortable: true  },
    { key: "importance", label: "Importance", sortable: true  },
    { key: "status",     label: "Status",     sortable: true  },
    { key: "linked",     label: kind.linkedLabel, sortable: false },
  ];

  const selSt = active => ({
    fontSize: 11, padding: "4px 8px", borderRadius: 6, fontFamily: "inherit", cursor: "pointer",
    border:     `1px solid ${active ? C.accent + "66" : C.border}`,
    background: C.surface,
    color:      active ? C.accentText : C.muted,
  });

  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, overflow: "hidden" }}>

      <div style={{ padding: "12px 16px", borderBottom: `1px solid ${C.border}`, background: C.surface2 }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center",
          marginBottom: activeChips.length ? 8 : 0 }}>

          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase",
            color: C.hint, marginRight: 4, flexShrink: 0 }}>All Open {kind.labelPlural}</span>

          {has("jobNumber") && (
            <input type="text" value={filter.jobNumber} placeholder="Job #…"
              onChange={e => setF("jobNumber", e.target.value)}
              style={{ ...selSt(!!filter.jobNumber), width: 88 }} />
          )}

          {has("project") && (
            <select value={filter.project} onChange={e => setF("project", e.target.value)}
              style={selSt(filter.project !== "all")}>
              <option value="all">Project: All</option>
              {projectOpts.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          )}

          {has("detailer") && (
            <select value={filter.detailer} onChange={e => setF("detailer", e.target.value)}
              style={selSt(filter.detailer !== "all")}>
              <option value="all">Detailer: All</option>
              {detailerOpts.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          )}

          {has("discipline") && (
            <select value={filter.discipline} onChange={e => setF("discipline", e.target.value)}
              style={selSt(filter.discipline !== "all")}>
              <option value="all">Discipline: All</option>
              {["Structural", "Solar", "Aero"].map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          )}

          {has("status") && (
            <select value={filter.status} onChange={e => setF("status", e.target.value)}
              style={selSt(filter.status !== "all")}>
              <option value="all">Status: All</option>
              {["Draft", "Open", "KSF PM Review", "Submitted to GC", "Closed"].map(o =>
                <option key={o} value={o}>{o}</option>)}
            </select>
          )}

          {has("importance") && (
            <select value={filter.importance} onChange={e => setF("importance", e.target.value)}
              style={selSt(filter.importance !== "all")}>
              <option value="all">Importance: All</option>
              {["Low", "Normal", "High", "Urgent"].map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          )}

          {has("band") && (
            <select value={filter.band} onChange={e => setF("band", e.target.value)}
              style={selSt(filter.band !== "all")}>
              <option value="all">Age Band: All</option>
              <option value="overdue">Overdue</option>
              <option value="soon3">Due ≤ 3d</option>
              <option value="soon7">Due ≤ 7d</option>
              <option value="ontrack">On Track</option>
              <option value="nodate">No Date</option>
            </select>
          )}

          <span style={{ marginLeft: "auto", fontSize: 11, color: C.hint, flexShrink: 0, whiteSpace: "nowrap" }}>
            {filtered.length} / {records.length} {kind.labelPlural}
          </span>
        </div>

        {activeChips.length > 0 && (
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
            {activeChips.map(chip => (
              <span key={chip.key} style={{ display: "inline-flex", alignItems: "center", gap: 4,
                fontSize: 11, padding: "3px 8px 3px 10px", borderRadius: 20,
                background: C.accent + "1a", border: `1px solid ${C.accent}44`,
                color: C.accentText, whiteSpace: "nowrap" }}>
                {chip.label}
                <button onClick={() => clearChip(chip.key)}
                  style={{ background: "none", border: "none", color: C.accentText,
                    cursor: "pointer", padding: 0, lineHeight: 1, fontSize: 14,
                    display: "flex", alignItems: "center" }}>×</button>
              </span>
            ))}
            <button onClick={() => setFilter(mkFilter())}
              style={{ fontSize: 11, padding: "3px 10px", borderRadius: 20,
                border: `1px solid ${C.border}`, background: C.surface,
                color: C.hint, cursor: "pointer", fontFamily: "inherit" }}>
              Clear All
            </button>
          </div>
        )}
      </div>

      {filtered.length === 0 ? (
        <p style={{ margin: 0, padding: "28px 16px", fontSize: 12, color: C.hint, textAlign: "center" }}>
          No {kind.labelPlural} match the current filters.
        </p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                {COLS.map(col => (
                  <th key={col.key} onClick={() => col.sortable && toggleSort(col.key)}
                    style={{ padding: col.key === "colorbar" ? "8px 0 8px 12px" : "8px 12px",
                      textAlign: "left", fontSize: 10, fontWeight: 700,
                      letterSpacing: "0.06em", textTransform: "uppercase",
                      color: sort.col === col.key ? C.accentText : C.hint,
                      whiteSpace: "nowrap", cursor: col.sortable ? "pointer" : "default",
                      userSelect: "none",
                      ...(col.key === "colorbar" ? { width: 20 } : {}) }}>
                    {col.label}
                    {col.sortable && sort.col === col.key && (
                      <span style={{ marginLeft: 3 }}>{sort.dir === "asc" ? "↑" : "↓"}</span>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(r => {
                const band = ageBand(kind.due(r));
                const imp  = kind.importance(r) ?? "Normal";
                const ics  = impChipStyle(imp);
                const sc   = wfnChipStyle(r.WorkflowStateName);
                const linked = kind.linkedOf(r);
                return (
                  <tr key={`${r._project.portfolioId}-${r._project.ProjectID}-${kind.idVal(r)}`}
                    style={{ borderBottom: `1px solid ${C.border}` }}
                    onMouseEnter={e => e.currentTarget.style.background = C.surface2}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                    <td style={{ padding: "10px 0 10px 12px", width: 20 }}>
                      <div style={{ width: 4, height: 32, borderRadius: 2, background: BAND_C[band] }} />
                    </td>
                    <td style={{ padding: "10px 12px", color: C.muted, whiteSpace: "nowrap", fontSize: 11 }}>
                      {kind.jobNum(r)}
                    </td>
                    <td style={{ padding: "10px 12px", whiteSpace: "nowrap" }}>
                      <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: C.text }}>{r._project.Name}</span>
                        <VertBadge v={kind.discipline(r)} />
                      </div>
                    </td>
                    <td style={{ padding: "10px 12px", whiteSpace: "nowrap" }}>
                      <a href={kind.link(r._project.portfolioId, r._project.ProjectID, r)}
                        target="_blank" rel="noopener noreferrer"
                        style={{ color: C.accentText, fontWeight: 600, textDecoration: "none", whiteSpace: "nowrap" }}
                        onMouseEnter={e => e.currentTarget.style.textDecoration = "underline"}
                        onMouseLeave={e => e.currentTarget.style.textDecoration = "none"}>
                        {kind.num(r)}
                      </a>
                    </td>
                    <td style={{ padding: "10px 12px", maxWidth: 220 }}>
                      <span style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis",
                        whiteSpace: "nowrap", color: C.text }} title={kind.subject(r)}>
                        {kind.subject(r)}
                      </span>
                    </td>
                    <td style={{ padding: "10px 12px", color: C.muted, whiteSpace: "nowrap", fontSize: 11 }}>
                      {kind.detailer(r)}
                    </td>
                    <td style={{ padding: "10px 12px", color: C.muted, whiteSpace: "nowrap" }}>
                      {fmtD(kind.submitted(r))}
                    </td>
                    <td style={{ padding: "10px 12px", whiteSpace: "nowrap" }}>
                      {kind.due(r)
                        ? <span style={{ color: BAND_C[band], fontWeight: 600 }}>{fmtD(kind.due(r))}</span>
                        : <span style={{ color: C.hint }}>—</span>}
                    </td>
                    <td style={{ padding: "10px 12px", color: C.muted, whiteSpace: "nowrap" }}>
                      {daysOpenCalc(kind.submitted(r))}d
                    </td>
                    <td style={{ padding: "10px 12px" }}>
                      <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 7px", borderRadius: 20,
                        background: ics.bg, color: ics.color, whiteSpace: "nowrap" }}>
                        {imp}
                      </span>
                    </td>
                    <td style={{ padding: "10px 12px" }}>
                      <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 7px", borderRadius: 20,
                        background: sc.bg, color: sc.color, whiteSpace: "nowrap" }}>
                        {r.WorkflowStateName || "—"}
                      </span>
                    </td>
                    <td style={{ padding: "10px 12px" }}>
                      {linked.length === 0 ? (
                        <span style={{ color: C.hint }}>—</span>
                      ) : (
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
                      )}
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
  const [rfiLoading,      setRfiLoading]      = useState({});
  const [rfiErrors,       setRfiErrors]       = useState({});
  const [issuesLoading,   setIssuesLoading]   = useState({});
  const [issuesErrors,    setIssuesErrors]    = useState({});
  const [projectsLoading, setProjectsLoading] = useState(() => store.projectsightCache.projects.length === 0);
  const [projectsError,   setProjectsError]   = useState(null);
  const [refreshKey,      setRefreshKey]      = useState(0);
  const [lastSynced,      setLastSynced]      = useState(store.projectsightCache.lastSynced);
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

  const handleRefresh = () => {
    store.clearProjectsightCache();
    setPsProjects([]);
    setPsRFIs({});
    setPsIssues({});
    setRfiLoading({});
    setRfiErrors({});
    setIssuesLoading({});
    setIssuesErrors({});
    setProjectsError(null);
    setLastSynced(null);
    setRefreshKey(k => k + 1);
  };

  // Load projects + RFIs — uses cache when available, otherwise fetches and populates cache
  useEffect(() => {
    const cache = store.projectsightCache;
    if (cache.projects.length > 0) {
      setPsProjects(cache.projects);
      setPsRFIs(cache.rfis);
      setLastSynced(cache.lastSynced);
      setProjectsLoading(false);
      return;
    }
    setProjectsLoading(true);
    getProjects()
      .then(projects => {
        setPsProjects(projects);
        setProjectsLoading(false);
        const rfiMap = {};
        Promise.all(
          projects.map(p => {
            const pid = `${p.portfolioId}-${p.ProjectID}`;
            setRfiLoading(prev => ({ ...prev, [pid]: true }));
            return getRFIs(p.portfolioId, p.ProjectID)
              .then(rfis => {
                rfiMap[pid] = rfis;
                setPsRFIs(prev => ({ ...prev, [pid]: rfis }));
                setRfiLoading(prev => ({ ...prev, [pid]: false }));
              })
              .catch(err => {
                rfiMap[pid] = [];
                setRfiErrors(prev => ({ ...prev, [pid]: err.message }));
                setRfiLoading(prev => ({ ...prev, [pid]: false }));
              });
          })
        ).then(() => {
          const ts = Date.now();
          store.setProjectsightCache(projects, rfiMap, ts);
          setLastSynced(ts);
        });
      })
      .catch(err => { setProjectsError(err.message); setProjectsLoading(false); });
  }, [refreshKey]);

  // Load Issues per project as projects arrive — mirrors the RFI loading
  // effect's per-project loading/error bookkeeping so RecordCards can show a
  // spinner/error for Issues exactly like it does for RFIs.
  useEffect(() => {
    if (!psProjects.length) return;
    psProjects.forEach(p => {
      const pid = `${p.portfolioId}-${p.ProjectID}`;
      setIssuesLoading(prev => ({ ...prev, [pid]: true }));
      getIssues(p.portfolioId, p.ProjectID)
        .then(rawIssues => {
          const open = (Array.isArray(rawIssues) ? rawIssues : [])
            .filter(i => i.WorkflowStateName !== "Closed" && i.IsDraft === false);
          setPsIssues(prev => ({ ...prev, [pid]: open }));
          setIssuesLoading(prev => ({ ...prev, [pid]: false }));
        })
        .catch(err => {
          setIssuesErrors(prev => ({ ...prev, [pid]: err.message }));
          setIssuesLoading(prev => ({ ...prev, [pid]: false }));
        });
    });

    // ── API Discovery test harness ─────────────────────────────────────────
    if (RUN_ISSUE_DISCOVERY) {
      const ksfPid  = "5ce1bcb1-c811-49ac-9039-ec36f3e75f78";
      const ksfProj = psProjects.find(p => p.portfolioId === ksfPid);
      if (ksfProj) {
        getIssues(ksfProj.portfolioId, ksfProj.ProjectID);
        postIssueComment(ksfProj.portfolioId, ksfProj.ProjectID, "PLACEHOLDER_ISSUE_ID", "KSF API test — ignore");
        postRFIFromIssue(ksfProj.portfolioId, ksfProj.ProjectID, "API Test RFI — ignore", "This is an automated test. Please discard.");
      }
    }
    // ── end discovery ──────────────────────────────────────────────────────
  }, [psProjects]);

  // Derived: visible projects for this user
  const visibleProjects = useMemo(() => {
    if (user?.id === "lanze" || user?.id === "loren") {
      if (leadFilter === "All") return psProjects;
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
  }, [psProjects, user, leadFilter]);

  // Same `.vertical` field driving the Structural/Solar/Aero tags on project
  // cards — no new classification, just a breakdown of the same count already
  // shown in the header.
  const verticalCounts = useMemo(() => {
    const counts = { Structural: 0, Solar: 0, Aero: 0 };
    visibleProjects.forEach(p => { if (counts[p.vertical] !== undefined) counts[p.vertical]++; });
    return counts;
  }, [visibleProjects]);

  // Derived: all RFIs across visible projects, decorated with _project
  const allRFIs = useMemo(() =>
    visibleProjects.flatMap(p =>
      (psRFIs[`${p.portfolioId}-${p.ProjectID}`] || []).map(r => ({ ...r, _project: p }))
    ),
    [visibleProjects, psRFIs]
  );

  const openRFIs = useMemo(() => allRFIs.filter(isOpenRFI), [allRFIs]);

  // Derived: all open issues across visible projects, decorated with _project
  const allIssues = useMemo(() =>
    visibleProjects.flatMap(p =>
      (psIssues[`${p.portfolioId}-${p.ProjectID}`] || []).map(i => ({ ...i, _project: p }))
    ),
    [visibleProjects, psIssues]
  );

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
            {projectsLoading ? (
              <Spinner />
            ) : (
              <>
                {lastSynced && (
                  <span style={{ fontSize: 11, color: C.hint }}>
                    Last synced: {relTime(lastSynced)}
                  </span>
                )}
                <button
                  onClick={handleRefresh}
                  title="Refresh data"
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
            const badge    = t.id === "triage" && allIssues.length;
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
          const kind      = rfiTab === "dashboard" ? RECORD_KINDS.rfi : RECORD_KINDS.issue;
          const records   = rfiTab === "dashboard" ? psRFIs      : psIssues;
          const loading   = rfiTab === "dashboard" ? rfiLoading  : issuesLoading;
          const errors    = rfiTab === "dashboard" ? rfiErrors   : issuesErrors;
          const flatStats = rfiTab === "dashboard" ? rfiStats    : issueStats;
          const flatList  = rfiTab === "dashboard" ? openRFIs    : openIssuesList;
          const enabledFilters = rfiTab === "dashboard"
            ? ["jobNumber", "project", "detailer", "discipline", "status", "importance", "band"]
            : ["project", "status", "importance", "band"];

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
                        {["All", "Antonio S.", "Adam K.", "Loren", "Jake", "Luis A.", "Frank", "Ali"].map(o => (
                          <option key={o} value={o}>{o}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
                {(user?.id === "lanze" || user?.id === "loren") && (
                  <TeamBreakdownTable projects={visibleProjects} records={records} kind={kind} />
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
                <RecordTable records={flatList} kind={kind} enabledFilters={enabledFilters} />
              )}
            </>
          );
        })()}
      </div>
    </div>
  );
}
