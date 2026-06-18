import React, { useState, useEffect, useMemo, useRef } from "react";
import { C, MI } from "../core/utils.jsx";
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
const rfiIdVal    = r => String(r.RFIID ?? r.id ?? r.rfiId ?? r.Number ?? r.number ?? "");
const rfiJobNum   = r => r.Number ?? r.jobNumber ?? r.sequenceNumber ?? "—";
const rfiDetailer = r => r.AuthorContactName ?? r.assignedCompany ?? r.submittedBy ?? r.createdBy ?? "Unknown";
const rfiImp      = r => r.Importance ?? r.importance ?? r.priority ?? r.urgency ?? null;
const rfiDisc     = r => r.Discipline ?? r.discipline ?? r._project?.vertical ?? "Unknown";

// ── Issue field accessors ─────────────────────────────────────────────────────

const issueTitle      = i => i.Subject ?? i.Title ?? i.title ?? i.subject ?? "(No subject)";
const issueDesc       = i => i.Body ?? i.Description ?? i.body ?? i.description ?? "";
const issueCreated    = i => i.DateCreated ?? i.createdDate ?? i.dateCreated ?? null;
const issueImportance = i => i.Importance ?? i.importance ?? "Normal";
const issueId         = i => String(i.IssueID ?? i.id ?? i.issueId ?? "");
const issueNumber     = i => i.Number ?? i.number ?? i.sequenceNumber ?? "—";
const issueSubmitter  = i => i.AuthorContactName ?? i.createdBy ?? i.submittedBy ?? "Unknown";
const issueFileLinks  = i => i.FileLinks ?? i.fileLinks ?? i.Attachments ?? [];

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

const psRFILink = (pid, projId, r) => `https://app.projectsight.com/${pid}/projects/${projId}/rfis/${rfiIdVal(r)}`;

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
      <p style={{ margin: 0, fontSize: 28, fontWeight: 700, color: color || C.text,
        letterSpacing: "-0.04em", lineHeight: 1 }}>{value}</p>
    </div>
  );
}

// ── Project health cards ──────────────────────────────────────────────────────

function ProjectCards({ projects, psRFIs, rfiLoading, rfiErrors, expandedProject, setExpandedProject }) {
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
    const open     = (psRFIs[pid] || []).filter(isOpenRFI);
    const overdue  = open.filter(r => ageBand(rfiDue(r)) === "overdue").length;
    const soon     = open.filter(r => ["soon3", "soon7"].includes(ageBand(rfiDue(r)))).length;
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
          const loading  = rfiLoading[pid];
          const error    = rfiErrors[pid];
          const rfis     = psRFIs[pid] || [];
          const openRfis = rfis.filter(isOpenRFI);
          const overdue  = openRfis.filter(r => ageBand(rfiDue(r)) === "overdue").length;
          const nextDue  = openRfis.map(r => rfiDue(r)).filter(Boolean).sort()[0];
          const oldest   = openRfis.reduce((m, r) => Math.max(m, daysOpenCalc(rfiSubmitted(r))), 0);
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
                  ⚠️ Close-out — Open RFIs need cleanup
                </div>
              )}
              {loading ? (
                <Spinner />
              ) : error ? (
                <span style={{ fontSize: 11, color: C.danger }}>⚠ Load failed</span>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <div style={{ display: "flex", gap: 16, alignItems: "flex-end" }}>
                    <div>
                      <p style={{ margin: 0, fontSize: 22, fontWeight: 700, color: C.text, lineHeight: 1 }}>{openRfis.length}</p>
                      <p style={{ margin: "2px 0 0", fontSize: 10, color: C.hint }}>Open RFIs</p>
                    </div>
                    {overdue > 0 && (
                      <div>
                        <p style={{ margin: 0, fontSize: 22, fontWeight: 700, color: BAND_C.overdue, lineHeight: 1 }}>{overdue}</p>
                        <p style={{ margin: "2px 0 0", fontSize: 10, color: C.hint }}>Overdue</p>
                      </div>
                    )}
                    {oldest > 0 && (
                      <div>
                        <p style={{ margin: 0, fontSize: 22, fontWeight: 700, color: C.muted, lineHeight: 1 }}>{oldest}d</p>
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
                    <p style={{ margin: 0, fontSize: 11, color: C.success }}>✓ No open RFIs</p>
                  )}
                </div>
              )}
              <p style={{ margin: "10px 0 0", fontSize: 10, color: isExp ? C.accentText : C.hint, textAlign: "right" }}>
                {isExp ? "▲ Collapse" : "▼ View RFIs"}
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
        const allRfis = psRFIs[expandedProject] || [];
        const tabRfis = detailTab === "open"   ? allRfis.filter(isOpenRFI)
                      : detailTab === "closed" ? allRfis.filter(r => !isOpenRFI(r))
                      : allRfis;
        const openCount   = allRfis.filter(isOpenRFI).length;
        const closedCount = allRfis.filter(r => !isOpenRFI(r)).length;

        return (
          <div style={{ background: C.surface, border: `1px solid ${C.accent}44`, borderRadius: 10,
            padding: "16px 20px", marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: C.text, flex: 1 }}>{p.Name} — RFIs</span>
              <VertBadge v={p.vertical} />
              <button onClick={() => setExpandedProject(null)}
                style={{ background: "none", border: "none", color: C.hint, cursor: "pointer",
                  fontSize: 18, lineHeight: 1, padding: "2px 4px" }}>×</button>
            </div>

            <div style={{ display: "flex", gap: 4, marginBottom: 12 }}>
              {[
                { id: "open",   label: `Open (${openCount})`     },
                { id: "closed", label: `Closed (${closedCount})` },
                { id: "all",    label: `All (${allRfis.length})` },
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

            {tabRfis.length === 0 ? (
              <p style={{ margin: 0, fontSize: 12, color: C.muted }}>
                No {detailTab} RFIs for this project.
              </p>
            ) : (
              <div style={{ overflowX: "auto", maxHeight: 320, overflowY: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                      {["", "RFI #", "Subject", "Submitted", "Due", "Days Open", "Status"].map((h, i) => (
                        <th key={i} style={{ padding: "6px 10px", textAlign: "left", fontSize: 10,
                          fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase",
                          color: C.hint, whiteSpace: "nowrap" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {tabRfis.map(r => {
                      const isVoid = r.WorkflowStateName === "Void";
                      const open   = isOpenRFI(r);
                      const band   = open ? ageBand(rfiDue(r)) : "nodate";
                      const wfn    = r.WorkflowStateName || "—";
                      const sc     = wfnChipStyle(r.WorkflowStateName);
                      return (
                        <tr key={rfiIdVal(r)} style={{ borderBottom: `1px solid ${C.border}`, opacity: isVoid ? 0.5 : 1 }}
                          onMouseEnter={e => e.currentTarget.style.background = C.surface2}
                          onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                          <td style={{ padding: "8px 10px" }}>
                            {open
                              ? <BandDot band={band} />
                              : <div style={{ width: 8, height: 8, borderRadius: "50%",
                                  background: isVoid ? C.border : C.success, flexShrink: 0 }} />}
                          </td>
                          <td style={{ padding: "8px 10px", whiteSpace: "nowrap" }}>
                            <a href={psRFILink(p.portfolioId, p.ProjectID, r)} target="_blank" rel="noopener noreferrer"
                              style={{ color: C.accentText, fontWeight: 600, textDecoration: "none" }}
                              onMouseEnter={e => e.currentTarget.style.textDecoration = "underline"}
                              onMouseLeave={e => e.currentTarget.style.textDecoration = "none"}>
                              {rfiNum(r)}
                            </a>
                          </td>
                          <td style={{ padding: "8px 10px", color: C.text, maxWidth: 240, overflow: "hidden",
                            textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={rfiSubject(r)}>
                            {rfiSubject(r)}
                          </td>
                          <td style={{ padding: "8px 10px", color: C.muted, whiteSpace: "nowrap" }}>
                            {fmtD(rfiSubmitted(r))}
                          </td>
                          <td style={{ padding: "8px 10px", whiteSpace: "nowrap",
                            color: open ? BAND_C[band] : C.hint, fontWeight: open ? 600 : 400 }}>
                            {fmtD(rfiDue(r))}
                          </td>
                          <td style={{ padding: "8px 10px", color: C.muted, whiteSpace: "nowrap" }}>
                            {daysOpenCalc(rfiSubmitted(r))}d
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

// ── Full RFI Table ────────────────────────────────────────────────────────────

function RFITable({ rfis }) {
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

  const projectOpts  = useMemo(() => [...new Set(rfis.map(r => r._project.Name))].sort(), [rfis]);
  const detailerOpts = useMemo(() => [...new Set(rfis.map(r => rfiDetailer(r)))].sort(), [rfis]);

  const activeChips = useMemo(() => {
    const chips = [];
    const { jobNumber, project, detailer, discipline, status, importance, band } = filter;
    if (jobNumber)            chips.push({ key: "jobNumber",  label: `Job: "${jobNumber}"` });
    if (project    !== "all") chips.push({ key: "project",    label: `Project: ${project}` });
    if (detailer   !== "all") chips.push({ key: "detailer",   label: `Detailer: ${detailer}` });
    if (discipline !== "all") chips.push({ key: "discipline", label: `Discipline: ${discipline}` });
    if (status     !== "all") chips.push({ key: "status",     label: `Status: ${status}` });
    if (importance !== "all") chips.push({ key: "importance", label: `Importance: ${importance}` });
    if (band       !== "all") chips.push({ key: "band",       label: `Age: ${BAND_LABEL[band]}` });
    return chips;
  }, [filter]);

  const clearChip = key => setFilter(f => ({
    ...f, [key]: key === "jobNumber" ? "" : "all",
  }));

  const filtered = useMemo(() => {
    let list = [...rfis];
    if (filter.jobNumber) {
      const q = filter.jobNumber.toLowerCase();
      list = list.filter(r => rfiJobNum(r).toLowerCase().includes(q));
    }
    const applyEq = (key, get) => {
      if (filter[key] !== "all") list = list.filter(r => get(r) === filter[key]);
    };
    applyEq("project",    r => r._project.Name);
    applyEq("detailer",   r => rfiDetailer(r));
    applyEq("discipline", r => rfiDisc(r));
    applyEq("status",     r => r.WorkflowStateName);
    applyEq("importance", r => rfiImp(r) ?? "Normal");
    applyEq("band",       r => ageBand(rfiDue(r)));

    const dir = sort.dir === "asc" ? 1 : -1;
    list.sort((a, b) => {
      switch (sort.col) {
        case "jobnum":     return dir * rfiJobNum(a).localeCompare(rfiJobNum(b));
        case "project":    return dir * a._project.Name.localeCompare(b._project.Name);
        case "detailer":   return dir * rfiDetailer(a).localeCompare(rfiDetailer(b));
        case "submitted":  return dir * (new Date(rfiSubmitted(a) || 0) - new Date(rfiSubmitted(b) || 0));
        case "due": {
          const ad = rfiDue(a), bd = rfiDue(b);
          if (!ad && !bd) return 0; if (!ad) return 1; if (!bd) return -1;
          return dir * (new Date(ad) - new Date(bd));
        }
        case "age":        return dir * (daysOpenCalc(rfiSubmitted(b)) - daysOpenCalc(rfiSubmitted(a)));
        case "importance": {
          const O = { Urgent: 0, High: 1, Normal: 2, Low: 3 };
          return dir * ((O[rfiImp(a) ?? "Normal"] ?? 2) - (O[rfiImp(b) ?? "Normal"] ?? 2));
        }
        case "status":     return dir * (a.WorkflowStateName || "").localeCompare(b.WorkflowStateName || "");
        default: return 0;
      }
    });
    return list;
  }, [rfis, filter, sort]);

  const toggleSort = key => setSort(s =>
    s.col === key ? { ...s, dir: s.dir === "asc" ? "desc" : "asc" } : { col: key, dir: "asc" }
  );

  const COLS = [
    { key: "colorbar",   label: "",           sortable: false },
    { key: "jobnum",     label: "Job #",      sortable: true  },
    { key: "project",    label: "Project",    sortable: true  },
    { key: "num",        label: "RFI #",      sortable: false },
    { key: "subject",    label: "Subject",    sortable: false },
    { key: "detailer",   label: "Detailer",   sortable: true  },
    { key: "submitted",  label: "Submitted",  sortable: true  },
    { key: "due",        label: "Due",        sortable: true  },
    { key: "age",        label: "Days Open",  sortable: true  },
    { key: "importance", label: "Importance", sortable: true  },
    { key: "status",     label: "Status",     sortable: true  },
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
            color: C.hint, marginRight: 4, flexShrink: 0 }}>All Open RFIs</span>

          <input type="text" value={filter.jobNumber} placeholder="Job #…"
            onChange={e => setF("jobNumber", e.target.value)}
            style={{ ...selSt(!!filter.jobNumber), width: 88 }} />

          <select value={filter.project} onChange={e => setF("project", e.target.value)}
            style={selSt(filter.project !== "all")}>
            <option value="all">Project: All</option>
            {projectOpts.map(o => <option key={o} value={o}>{o}</option>)}
          </select>

          <select value={filter.detailer} onChange={e => setF("detailer", e.target.value)}
            style={selSt(filter.detailer !== "all")}>
            <option value="all">Detailer: All</option>
            {detailerOpts.map(o => <option key={o} value={o}>{o}</option>)}
          </select>

          <select value={filter.discipline} onChange={e => setF("discipline", e.target.value)}
            style={selSt(filter.discipline !== "all")}>
            <option value="all">Discipline: All</option>
            {["Structural", "Solar", "Aero"].map(o => <option key={o} value={o}>{o}</option>)}
          </select>

          <select value={filter.status} onChange={e => setF("status", e.target.value)}
            style={selSt(filter.status !== "all")}>
            <option value="all">Status: All</option>
            {["Draft", "Open", "KSF PM Review", "Submitted to GC", "Closed"].map(o =>
              <option key={o} value={o}>{o}</option>)}
          </select>

          <select value={filter.importance} onChange={e => setF("importance", e.target.value)}
            style={selSt(filter.importance !== "all")}>
            <option value="all">Importance: All</option>
            {["Low", "Normal", "High", "Urgent"].map(o => <option key={o} value={o}>{o}</option>)}
          </select>

          <select value={filter.band} onChange={e => setF("band", e.target.value)}
            style={selSt(filter.band !== "all")}>
            <option value="all">Age Band: All</option>
            <option value="overdue">Overdue</option>
            <option value="soon3">Due ≤ 3d</option>
            <option value="soon7">Due ≤ 7d</option>
            <option value="ontrack">On Track</option>
            <option value="nodate">No Date</option>
          </select>

          <span style={{ marginLeft: "auto", fontSize: 11, color: C.hint, flexShrink: 0, whiteSpace: "nowrap" }}>
            {filtered.length} / {rfis.length} RFI{rfis.length !== 1 ? "s" : ""}
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
          No RFIs match the current filters.
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
                const band = ageBand(rfiDue(r));
                const imp  = rfiImp(r) ?? "Normal";
                const ics  = impChipStyle(imp);
                const sc   = wfnChipStyle(r.WorkflowStateName);
                return (
                  <tr key={`${r._project.portfolioId}-${r._project.ProjectID}-${rfiIdVal(r)}`}
                    style={{ borderBottom: `1px solid ${C.border}` }}
                    onMouseEnter={e => e.currentTarget.style.background = C.surface2}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                    <td style={{ padding: "10px 0 10px 12px", width: 20 }}>
                      <div style={{ width: 4, height: 32, borderRadius: 2, background: BAND_C[band] }} />
                    </td>
                    <td style={{ padding: "10px 12px", color: C.muted, whiteSpace: "nowrap", fontSize: 11 }}>
                      {rfiJobNum(r)}
                    </td>
                    <td style={{ padding: "10px 12px", whiteSpace: "nowrap" }}>
                      <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: C.text }}>{r._project.Name}</span>
                        <VertBadge v={rfiDisc(r)} />
                      </div>
                    </td>
                    <td style={{ padding: "10px 12px", whiteSpace: "nowrap" }}>
                      <a href={psRFILink(r._project.portfolioId, r._project.ProjectID, r)}
                        target="_blank" rel="noopener noreferrer"
                        style={{ color: C.accentText, fontWeight: 600, textDecoration: "none", whiteSpace: "nowrap" }}
                        onMouseEnter={e => e.currentTarget.style.textDecoration = "underline"}
                        onMouseLeave={e => e.currentTarget.style.textDecoration = "none"}>
                        {rfiNum(r)}
                      </a>
                    </td>
                    <td style={{ padding: "10px 12px", maxWidth: 220 }}>
                      <span style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis",
                        whiteSpace: "nowrap", color: C.text }} title={rfiSubject(r)}>
                        {rfiSubject(r)}
                      </span>
                    </td>
                    <td style={{ padding: "10px 12px", color: C.muted, whiteSpace: "nowrap", fontSize: 11 }}>
                      {rfiDetailer(r)}
                    </td>
                    <td style={{ padding: "10px 12px", color: C.muted, whiteSpace: "nowrap" }}>
                      {fmtD(rfiSubmitted(r))}
                    </td>
                    <td style={{ padding: "10px 12px", whiteSpace: "nowrap" }}>
                      {rfiDue(r)
                        ? <span style={{ color: BAND_C[band], fontWeight: 600 }}>{fmtD(rfiDue(r))}</span>
                        : <span style={{ color: C.hint }}>—</span>}
                    </td>
                    <td style={{ padding: "10px 12px", color: C.muted, whiteSpace: "nowrap" }}>
                      {daysOpenCalc(rfiSubmitted(r))}d
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

// ── Triage Health Bar ─────────────────────────────────────────────────────────

function TriageHealthBar({ projects, psIssues, selectedPids, setSelectedPids }) {
  const cards = projects.map(p => {
    const pid    = `${p.portfolioId}-${p.ProjectID}`;
    const issues = psIssues[pid] || [];
    if (!issues.length) return null;
    const oldestAge = issues.reduce((max, i) => Math.max(max, daysOpenCalc(issueCreated(i))), 0);
    const urgScore  = (oldestAge * 2) + issues.length;
    return { p, pid, count: issues.length, oldestAge, urgScore };
  }).filter(Boolean);

  cards.sort((a, b) => b.urgScore - a.urgScore);
  if (!cards.length) return null;

  return (
    <div style={{ marginBottom: 20 }}>
      {selectedPids.size > 0 && (
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 6 }}>
          <button onClick={() => setSelectedPids(new Set())}
            style={{ background: "none", border: "none", fontSize: 11, color: C.hint,
              cursor: "pointer", fontFamily: "inherit", textDecoration: "underline", padding: 0 }}>
            × Clear
          </button>
        </div>
      )}
      <div className="ksf-hscroll"
        style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 6,
          scrollbarWidth: "thin", scrollbarColor: `${C.border} transparent` }}>
        {cards.map(({ p, pid, count, oldestAge }) => {
          const isSelected    = selectedPids.has(pid);
          const ageBadgeColor = oldestAge >= 14 ? C.danger  : oldestAge >= 7 ? C.warning : C.success;
          const ageBadgeBg    = oldestAge >= 14 ? "rgba(248,113,113,0.12)" : oldestAge >= 7 ? "rgba(251,191,36,0.12)" : "rgba(52,211,153,0.12)";
          const isPilingUp    = count >= 5;
          return (
            <div key={pid}
              onClick={() => setSelectedPids(prev => {
                const next = new Set(prev);
                if (next.has(pid)) next.delete(pid); else next.add(pid);
                return next;
              })}
              style={{ flexShrink: 0, width: 160,
                background: isSelected ? C.accentDim : C.surface,
                border: `1px solid ${isSelected ? C.accent : C.border}`,
                borderRadius: 10, padding: "12px 14px", cursor: "pointer",
                transition: "border-color 0.15s, background 0.15s" }}
              onMouseEnter={e => { if (!isSelected) e.currentTarget.style.borderColor = C.borderHi; }}
              onMouseLeave={e => { if (!isSelected) e.currentTarget.style.borderColor = C.border; }}>
              <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 5 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: C.text, flex: 1,
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {p.Name}
                </span>
                {isPilingUp && (
                  <span style={{ fontSize: 9, fontWeight: 700, padding: "1px 5px", borderRadius: 8,
                    background: "rgba(251,146,60,0.15)", color: "#fb923c", whiteSpace: "nowrap" }}>
                    ▲
                  </span>
                )}
              </div>
              <VertBadge v={p.vertical} />
              <p style={{ margin: "8px 0 2px", fontSize: 24, fontWeight: 700, color: C.text, lineHeight: 1 }}>
                {count}
              </p>
              <p style={{ margin: "0 0 6px", fontSize: 10, color: C.hint }}>Open issues</p>
              <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 7px", borderRadius: 20,
                background: ageBadgeBg, color: ageBadgeColor, border: `1px solid ${ageBadgeColor}33` }}>
                Oldest: {oldestAge}d
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Triage Issue Card ─────────────────────────────────────────────────────────

function TriageIssueCard({
  issue, project, analysis, analyzing, /* analysis + analyzing kept in scope — const a below reads them */
  consultThreads, setConsultThreads,
  /* KernBot analysis — disabled, restore when training is ready */
  /* kernbotLearning, setKernbotLearning, */
  /* end KernBot analysis */
  isAdmin,
  /* KernBot analysis — disabled, restore when training is ready */
  /* onRetryAnalyze, */
  /* end KernBot analysis */
  user, defaultConsultOpen, defaultCollapsed = false,
}) {
  const iid       = issueId(issue);
  const a         = analysis?.[iid]; // undefined when analysis disabled — handleSendConsult handles gracefully
  /* KernBot analysis — disabled, restore when training is ready */
  // const isAnalyz  = analyzing?.[iid];
  /* end KernBot analysis */
  const age       = issueCreated(issue) ? daysOpenCalc(issueCreated(issue)) : null;
  const imp       = issueImportance(issue);
  const ics       = impChipStyle(imp);
  const fileLinks = issueFileLinks(issue);
  const thread    = consultThreads[iid] || null;

  const ageBadgeColor = age !== null && age >= 14 ? C.danger  : age !== null && age >= 7 ? C.warning : C.hint;
  const ageBadgeBg    = age !== null && age >= 14 ? "rgba(248,113,113,0.12)" : age !== null && age >= 7 ? "rgba(251,191,36,0.12)" : C.surface2;

  const [isCollapsed,     setIsCollapsed]     = useState(defaultCollapsed);
  const [showOriginal,    setShowOriginal]    = useState(false);
  const [consultOpen,     setConsultOpen]     = useState(defaultConsultOpen || false);
  const [pills,           setPills]           = useState({ srpm: false, field: false });
  const [consultText,     setConsultText]     = useState("");
  const [consultFiles,    setConsultFiles]    = useState([]);
  const [replyText,       setReplyText]       = useState("");
  const [replyFiles,      setReplyFiles]      = useState([]);
  const [consultDragOver, setConsultDragOver] = useState(false);
  const [replyDragOver,   setReplyDragOver]   = useState(false);

  const consultFileRef = useRef();
  const replyFileRef   = useRef();

  const hasPendingAction = thread?.hasPendingAction;

  const handleSendConsult = () => {
    if (!consultText.trim() || (!pills.srpm && !pills.field)) return;
    const systemMsg = {
      id: Date.now(), type: "system", sender: "Kern Bot",
      timestamp: new Date().toISOString(),
      text: a
        ? `Issue Summary: ${a.cleanText || issueDesc(issue)}\n\nRecommendation: ${a.recommendation || "—"}\nReasoning: ${a.reasoning || "—"}`
        : `Issue: ${issueTitle(issue)}\n\n${issueDesc(issue)}`,
    };
    const pmMsg = {
      id: Date.now() + 1, type: "pm", sender: user?.name || "PM",
      timestamp: new Date().toISOString(),
      text: consultText,
      attachmentNames: consultFiles.map(f => f.name),
    };
    const existing = consultThreads[iid];
    const messages = existing?.messages?.length > 0
      ? [...existing.messages, pmMsg]
      : [systemMsg, pmMsg];
    setConsultThreads(prev => ({
      ...prev,
      [iid]: { pills: { srpm: pills.srpm, field: pills.field }, messages, lastUpdated: Date.now() },
    }));
    setConsultText("");
    setConsultFiles([]);
  };

  const handleReply = () => {
    if (!replyText.trim()) return;
    const msg = {
      id: Date.now(), type: "pm", sender: user?.name || "PM",
      timestamp: new Date().toISOString(),
      text: replyText,
      attachmentNames: replyFiles.map(f => f.name),
    };
    setConsultThreads(prev => ({
      ...prev,
      [iid]: { ...(prev[iid] || {}), messages: [...(prev[iid]?.messages || []), msg], lastUpdated: Date.now() },
    }));
    setReplyText("");
    setReplyFiles([]);
  };

  const handleDecision = decisionText => {
    const msg = {
      id: Date.now(), type: "decision", sender: user?.name || "Sr. PM",
      timestamp: new Date().toISOString(), text: decisionText,
    };
    setConsultThreads(prev => ({
      ...prev,
      [iid]: {
        ...(prev[iid] || {}),
        messages: [...(prev[iid]?.messages || []), msg],
        hasPendingAction: !decisionText.includes("Resolved"),
        lastUpdated: Date.now(),
      },
    }));
    /* KernBot analysis — disabled, restore when training is ready */
    /*
    if (decisionText.includes("Resolved") || decisionText.includes("Clarification")) {
      setKernbotLearning(prev => [...prev, {
        issueTitle: issueTitle(issue),
        subQuestions: a?.subQuestions,
        resolution: decisionText,
        timestamp: Date.now(),
      }]);
    }
    */
    /* end KernBot analysis */
  };

  // ── Shared input box style ──────────────────────────────────────────────────
  const inputBoxStyle = dragOver => ({
    background: C.bg,
    border: `1px solid ${dragOver ? C.borderHi : C.border}`,
    borderRadius: 10, overflow: "hidden", transition: "border-color 0.15s",
  });

  const paperclipBtnStyle = {
    background: "none", border: "1px solid transparent", cursor: "pointer",
    color: C.hint, padding: "4px 5px", display: "flex", borderRadius: 6,
    transition: "all 0.15s", alignItems: "center",
  };

  const sendArrow = (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
      <path d="M22 2L11 13M22 2L15 22 11 13 2 9l20-7z" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );

  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10,
      marginBottom: 12, overflow: "hidden" }}>

      {/* Card header */}
      <div
        onClick={defaultCollapsed ? () => setIsCollapsed(v => !v) : undefined}
        style={{ padding: "12px 16px",
          borderBottom: isCollapsed ? "none" : `1px solid ${C.border}`,
          background: C.surface2,
          cursor: defaultCollapsed ? "pointer" : "default" }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 8, flexWrap: "wrap",
          marginBottom: isCollapsed ? 0 : 5 }}>
          {/* Title: job number / project name / detailer */}
          <div style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "baseline",
            gap: 6, flexWrap: "wrap" }}>
            {project?.Number && (
              <span style={{ fontSize: 11, color: C.hint, flexShrink: 0 }}>{project.Number}</span>
            )}
            <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>
              {project?.Name ?? "—"}
            </span>
            <span style={{ fontSize: 11, color: C.muted }}>— {issueSubmitter(issue)}</span>
          </div>
          {age !== null && (
            <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 7px", borderRadius: 20,
              background: ageBadgeBg, color: ageBadgeColor, whiteSpace: "nowrap",
              border: `1px solid ${ageBadgeColor}33` }}>
              {age}d
            </span>
          )}
          <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 7px", borderRadius: 20,
            background: ics.bg, color: ics.color, whiteSpace: "nowrap",
            border: `1px solid ${ics.color}33` }}>
            {imp}
          </span>
          {defaultCollapsed && (
            <span style={{ fontSize: 10, color: C.hint, flexShrink: 0 }}>
              {isCollapsed ? "▼" : "▲"}
            </span>
          )}
        </div>
        {!isCollapsed && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            {project && <VertBadge v={project.vertical} />}
            <span style={{ fontSize: 10, color: C.hint }}>#{issueNumber(issue)}</span>
            <span style={{ fontSize: 11, color: C.text, fontStyle: "italic" }}>
              {issueTitle(issue)}
            </span>
          </div>
        )}
      </div>

      {/* Card body — hidden when collapsed */}
      {!isCollapsed && (
        <div style={{ padding: "14px 16px" }}>

          {/* KernBot analysis — disabled, restore when training is ready */}
          {/*
          {isAnalyz ? (
            <div style={{ padding: "10px 0 12px" }}>
              <Spinner label="Analyzing with Kern Bot..." />
            </div>
          ) : a?.error ? (
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0", marginBottom: 12 }}>
              <span style={{ fontSize: 12, color: C.danger }}>Analysis failed: {a.error}</span>
              <button onClick={() => onRetryAnalyze(issue)}>Retry</button>
            </div>
          ) : a ? (
            <div style={{ background: "rgba(91,141,184,0.05)", border: "1px solid ...", borderRadius: 8, padding: "12px 14px", marginBottom: 12 }}>
              Kern Bot Summary: {a.cleanText}
              Show original toggle
              Sub-questions with confidence badges
              Recommendation chip
              Reasoning
              References
              FileLinks (moved to active block below when analysis is disabled)
            </div>
          ) : (
            <div style={{ padding: "8px 0 12px" }}>
              <Spinner label="Queued for analysis..." />
            </div>
          )}
          */}
          {/* end KernBot analysis */}

          {/* Raw description — rendered directly when KernBot analysis is disabled */}
          {issueDesc(issue) && (
            <p style={{ margin: "0 0 12px", fontSize: 12, color: C.muted, lineHeight: 1.65,
              whiteSpace: "pre-wrap" }}>
              {issueDesc(issue)}
            </p>
          )}
          {/* FileLinks — moved outside analysis block so they always render */}
          {fileLinks.length > 0 && (
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
              {fileLinks.map((fl, i) => (
                // Download URL TBD — pattern not yet confirmed from API discovery
                <a key={i} href="#" onClick={e => e.preventDefault()}
                  style={{ fontSize: 10, padding: "2px 8px", borderRadius: 10,
                    background: C.surface2, color: C.muted, border: `1px solid ${C.border}`,
                    textDecoration: "none", whiteSpace: "nowrap" }}>
                  📎 {fl.FileName ?? fl.fileName ?? fl.name ?? `File ${i + 1}`}
                </a>
              ))}
            </div>
          )}

          {hasPendingAction && (
            <div style={{ padding: "6px 10px", marginBottom: 10, borderRadius: 6,
              background: "rgba(251,191,36,0.1)", border: `1px solid ${C.warning}44`,
              fontSize: 11, fontWeight: 600, color: C.warning }}>
              Pending PM Action
            </div>
          )}

          {/* Routing buttons */}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 0 }}>
            {project && (
              <a href={`https://prod.projectsightapp.trimble.com/Web/app/Project?listid=-4075&orgid=${project.portfolioId}&projid=${project.ProjectID}`}
                target="_blank" rel="noopener noreferrer"
                style={{ fontSize: 11, fontWeight: 600, padding: "6px 14px", borderRadius: 7,
                  border: `1px solid ${C.accent}44`, background: C.accentDim,
                  color: C.accentText, textDecoration: "none", whiteSpace: "nowrap" }}>
                Issues ↗
              </a>
            )}
            {project && (
              <a href={`https://prod.projectsightapp.trimble.com/Web/app/Project?listid=-4074&orgid=${project.portfolioId}&projid=${project.ProjectID}`}
                target="_blank" rel="noopener noreferrer"
                style={{ fontSize: 11, fontWeight: 600, padding: "6px 14px", borderRadius: 7,
                  border: `1px solid ${C.accent}44`, background: C.accentDim,
                  color: C.accentText, textDecoration: "none", whiteSpace: "nowrap" }}>
                RFI ↗
              </a>
            )}
            <button onClick={() => setConsultOpen(v => !v)}
              style={{ fontSize: 11, fontWeight: 600, padding: "6px 14px", borderRadius: 7,
                border: `1px solid ${consultOpen ? C.pm + "66" : C.border}`,
                background: consultOpen ? C.pmDim : C.surface2,
                color: consultOpen ? C.pm : C.muted,
                cursor: "pointer", fontFamily: "inherit" }}>
              Consult
            </button>
          </div>

          {/* Consult panel */}
          {consultOpen && (
            <div style={{ background: C.surface2, border: `1px solid ${C.pm}33`,
              borderRadius: 8, padding: "12px 14px", marginTop: 10 }}>

              {!thread ? (
                <>
                  {/* Pills */}
                  <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                    {[{ key: "srpm", label: "Sr. PM" }, { key: "field", label: "Field" }].map(({ key, label }) => (
                      <button key={key} onClick={() => setPills(p => ({ ...p, [key]: !p[key] }))}
                        style={{ fontSize: 11, fontWeight: 600, padding: "5px 14px", borderRadius: 20,
                          border: `1px solid ${pills[key] ? C.pm + "66" : C.border}`,
                          background: pills[key] ? C.pmDim : C.surface,
                          color: pills[key] ? C.pm : C.muted,
                          cursor: "pointer", fontFamily: "inherit" }}>
                        {pills[key] ? "● " : "○ "}{label}
                      </button>
                    ))}
                  </div>

                  {/* Hidden file input */}
                  <input ref={consultFileRef} type="file" multiple style={{ display: "none" }}
                    onChange={e => setConsultFiles(Array.from(e.target.files))} />

                  {/* File chips */}
                  {consultFiles.length > 0 && (
                    <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 6 }}>
                      {consultFiles.map((f, i) => (
                        <span key={i} style={{ fontSize: 10, padding: "2px 7px", borderRadius: 8,
                          background: C.surface, color: C.muted, border: `1px solid ${C.border}`,
                          display: "inline-flex", alignItems: "center", gap: 4 }}>
                          {f.name}
                          <button onClick={() => setConsultFiles(prev => prev.filter((_, j) => j !== i))}
                            style={{ background: "none", border: "none", color: C.hint,
                              cursor: "pointer", fontSize: 13, padding: 0, lineHeight: 1 }}>×</button>
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Unified input box */}
                  <div style={inputBoxStyle(consultDragOver)}
                    onDragOver={e => { e.preventDefault(); setConsultDragOver(true); }}
                    onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget)) setConsultDragOver(false); }}
                    onDrop={e => { e.preventDefault(); setConsultDragOver(false); setConsultFiles(Array.from(e.dataTransfer.files)); }}>
                    <textarea value={consultText} onChange={e => setConsultText(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendConsult(); } }}
                      placeholder="Add context or question for the consult…"
                      style={{ width: "100%", background: "none", border: "none", outline: "none",
                        color: C.text, fontSize: 12, fontFamily: "inherit", resize: "none",
                        lineHeight: 1.6, padding: "10px 12px", boxSizing: "border-box",
                        minHeight: 64, display: "block" }} />
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between",
                      padding: "4px 8px 7px", borderTop: `1px solid ${C.border}` }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <button onClick={() => consultFileRef.current?.click()}
                          style={paperclipBtnStyle}
                          onMouseEnter={e => { e.currentTarget.style.color = C.accent; e.currentTarget.style.background = "rgba(91,141,184,0.12)"; e.currentTarget.style.borderColor = "rgba(91,141,184,0.3)"; }}
                          onMouseLeave={e => { e.currentTarget.style.color = C.hint; e.currentTarget.style.background = "none"; e.currentTarget.style.borderColor = "transparent"; }}>
                          <span style={{ display: "flex", alignItems: "center" }}>{MI.paperclip}</span>
                        </button>
                        <span style={{ fontSize: 10, color: C.hint }}>
                          {consultDragOver ? "Drop files to attach…" : "Shift+Enter for new line · drag & drop files"}
                        </span>
                      </div>
                      <button onClick={handleSendConsult}
                        disabled={!consultText.trim() || (!pills.srpm && !pills.field)}
                        style={{ width: 27, height: 27, borderRadius: 7, border: "none",
                          background: (consultText.trim() && (pills.srpm || pills.field)) ? C.pm : "rgba(255,255,255,0.05)",
                          cursor: (consultText.trim() && (pills.srpm || pills.field)) ? "pointer" : "not-allowed",
                          display: "flex", alignItems: "center", justifyContent: "center" }}>
                        {sendArrow}
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <div>
                  <p style={{ margin: "0 0 10px", fontSize: 9, fontWeight: 700, letterSpacing: "0.07em",
                    textTransform: "uppercase", color: C.hint }}>
                    Thread
                    {thread.pills?.srpm  && <span style={{ color: C.pm,    marginLeft: 8 }}>● Sr. PM</span>}
                    {thread.pills?.field && <span style={{ color: C.accent, marginLeft: 8 }}>● Field</span>}
                  </p>
                  {thread.messages.map((msg, idx) => {
                    const isSystem   = msg.type === "system";
                    const isDecision = msg.type === "decision";
                    return (
                      <div key={msg.id ?? idx} style={{ marginBottom: 8, padding: "8px 10px", borderRadius: 7,
                        background: isSystem ? C.bg : isDecision ? "rgba(167,139,250,0.08)" : C.surface,
                        borderLeft: isDecision ? `3px solid ${C.pm}` : "3px solid transparent" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                          <span style={{ fontSize: 11, fontWeight: 700,
                            color: isSystem ? C.hint : isDecision ? C.pm : C.text }}>
                            {isSystem ? "📋 Kern Bot" : msg.sender}
                          </span>
                          <span style={{ fontSize: 10, color: C.hint }}>{fmtD(msg.timestamp)}</span>
                        </div>
                        <p style={{ margin: 0, fontSize: 11, color: isSystem ? C.muted : C.text,
                          lineHeight: 1.55, whiteSpace: "pre-wrap" }}>{msg.text}</p>
                        {msg.attachmentNames?.length > 0 && (
                          <div style={{ marginTop: 5, display: "flex", gap: 5, flexWrap: "wrap" }}>
                            {msg.attachmentNames.map((n, i) => (
                              <span key={i} style={{ fontSize: 10, padding: "1px 6px", borderRadius: 8,
                                background: C.surface2, color: C.muted, border: `1px solid ${C.border}` }}>
                                📎 {n}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {isAdmin && (
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
                      {[
                        ["✓ Resolved",            "✓ Sr. PM marked this Resolved."],
                        ["↩ Needs Clarification", "↩ Sr. PM: Needs further clarification."],
                        ["→ Escalate as RFI",     "→ Sr. PM recommends escalating as RFI. PM to action."],
                      ].map(([label, text]) => (
                        <button key={label} onClick={() => handleDecision(text)}
                          style={{ fontSize: 11, fontWeight: 600, padding: "5px 12px", borderRadius: 7,
                            border: `1px solid ${C.pm}44`, background: C.pmDim, color: C.pm,
                            cursor: "pointer", fontFamily: "inherit" }}>
                          {label}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Hidden file input for reply */}
                  <input ref={replyFileRef} type="file" multiple style={{ display: "none" }}
                    onChange={e => setReplyFiles(Array.from(e.target.files))} />

                  {/* Reply file chips */}
                  {replyFiles.length > 0 && (
                    <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 6 }}>
                      {replyFiles.map((f, i) => (
                        <span key={i} style={{ fontSize: 10, padding: "2px 7px", borderRadius: 8,
                          background: C.surface, color: C.muted, border: `1px solid ${C.border}`,
                          display: "inline-flex", alignItems: "center", gap: 4 }}>
                          {f.name}
                          <button onClick={() => setReplyFiles(prev => prev.filter((_, j) => j !== i))}
                            style={{ background: "none", border: "none", color: C.hint,
                              cursor: "pointer", fontSize: 13, padding: 0, lineHeight: 1 }}>×</button>
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Reply input box */}
                  <div style={inputBoxStyle(replyDragOver)}
                    onDragOver={e => { e.preventDefault(); setReplyDragOver(true); }}
                    onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget)) setReplyDragOver(false); }}
                    onDrop={e => { e.preventDefault(); setReplyDragOver(false); setReplyFiles(Array.from(e.dataTransfer.files)); }}>
                    <textarea value={replyText} onChange={e => setReplyText(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleReply(); } }}
                      placeholder="Reply…"
                      style={{ width: "100%", background: "none", border: "none", outline: "none",
                        color: C.text, fontSize: 11, fontFamily: "inherit", resize: "none",
                        lineHeight: 1.6, padding: "8px 12px", boxSizing: "border-box",
                        minHeight: 48, display: "block" }} />
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between",
                      padding: "4px 8px 7px", borderTop: `1px solid ${C.border}` }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <button onClick={() => replyFileRef.current?.click()}
                          style={paperclipBtnStyle}
                          onMouseEnter={e => { e.currentTarget.style.color = C.accent; e.currentTarget.style.background = "rgba(91,141,184,0.12)"; e.currentTarget.style.borderColor = "rgba(91,141,184,0.3)"; }}
                          onMouseLeave={e => { e.currentTarget.style.color = C.hint; e.currentTarget.style.background = "none"; e.currentTarget.style.borderColor = "transparent"; }}>
                          <span style={{ display: "flex", alignItems: "center" }}>{MI.paperclip}</span>
                        </button>
                        <span style={{ fontSize: 10, color: C.hint }}>
                          {replyDragOver ? "Drop files to attach…" : "Shift+Enter for new line · drag & drop files"}
                        </span>
                      </div>
                      <button onClick={handleReply} disabled={!replyText.trim()}
                        style={{ width: 27, height: 27, borderRadius: 7, border: "none",
                          background: replyText.trim() ? C.accent : "rgba(255,255,255,0.05)",
                          cursor: replyText.trim() ? "pointer" : "not-allowed",
                          display: "flex", alignItems: "center", justifyContent: "center" }}>
                        {sendArrow}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function RFIApp({ user }) {
  const [psProjects,      setPsProjects]      = useState([]);
  const [psRFIs,          setPsRFIs]          = useState({});
  const [psIssues,        setPsIssues]        = useState({});
  const [rfiLoading,      setRfiLoading]      = useState({});
  const [rfiErrors,       setRfiErrors]       = useState({});
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
  /* end KernBot analysis */
  const [consultThreads,  setConsultThreads]  = useState({});
  /* KernBot analysis — disabled, restore when training is ready */
  // const [kernbotLearning, setKernbotLearning] = useState([]);
  /* end KernBot analysis */
  const [selectedPids,    setSelectedPids]    = useState(new Set());
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

  // Load Issues per project as projects arrive
  useEffect(() => {
    if (!psProjects.length) return;
    psProjects.forEach(p => {
      const pid = `${p.portfolioId}-${p.ProjectID}`;
      getIssues(p.portfolioId, p.ProjectID)
        .then(rawIssues => {
          const open = (Array.isArray(rawIssues) ? rawIssues : [])
            .filter(i => i.WorkflowStateName !== "Closed" && i.IsDraft === false);
          setPsIssues(prev => ({ ...prev, [pid]: open }));
          /* KernBot analysis — disabled, restore when training is ready */
          /*
          if (apiKey) {
            const toAnalyze = open.filter(i => !analyzedRef.current.has(issueId(i)));
            if (toAnalyze.length > 0) {
              analysisQueueRef.current.push(...toAnalyze);
              runAnalysisQueue();
            }
          }
          */
          /* end KernBot analysis */
        })
        .catch(() => {});
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

  // Derived: consult inbox — issues with an active srpm thread (isAdmin only)
  const consultInboxIssues = useMemo(() =>
    allIssues.filter(i => consultThreads[issueId(i)]?.pills?.srpm),
    [allIssues, consultThreads]
  );

  // Summary stats
  const stats = useMemo(() => {
    const overdue = openRFIs.filter(r => ageBand(rfiDue(r)) === "overdue").length;
    const due7    = openRFIs.filter(r => ["soon3", "soon7"].includes(ageBand(rfiDue(r)))).length;
    const avgDays = openRFIs.length
      ? Math.round(openRFIs.reduce((s, r) => s + daysOpenCalc(rfiSubmitted(r)), 0) / openRFIs.length)
      : 0;
    return { total: openRFIs.length, overdue, due7, avgDays };
  }, [openRFIs]);

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

  const impOrder = { Urgent: 0, High: 1, Normal: 2, Low: 3 };

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
              RFI Dashboard
            </h1>
            <p style={{ margin: "3px 0 0", fontSize: 12, color: C.hint }}>
              Live from ProjectSight · {visibleProjects.length} project{visibleProjects.length !== 1 ? "s" : ""}
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
            { id: "dashboard", label: "RFI Dashboard" },
            { id: "triage",    label: "Issue Triage"  },
          ].map(t => {
            const isActive = rfiTab === t.id;
            const badge    = t.id === "triage" && allIssues.length;
            return (
              <button key={t.id} onClick={() => setRfiTab(t.id)}
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

        {/* ── Dashboard tab ────────────────────────────────────────────────── */}
        {rfiTab === "dashboard" && (
          <>
            <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
              <StatCard label="Total Open RFIs"  value={stats.total} />
              <StatCard label="Overdue"           value={stats.overdue}
                color={stats.overdue > 0 ? BAND_C.overdue : C.success} />
              <StatCard label="Due Within 7 Days" value={stats.due7}
                color={stats.due7 > 0 ? BAND_C.soon7 : C.success} />
              <StatCard label="Avg Days Open"
                value={stats.avgDays > 0 ? `${stats.avgDays}d` : "—"} />
            </div>

            <div style={{ marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
                <p style={{ margin: 0, fontSize: 11, fontWeight: 700,
                  letterSpacing: "0.07em", textTransform: "uppercase", color: C.hint }}>
                  Project Health
                </p>
                {(user?.id === "lanze" || user?.id === "loren") && (
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginLeft: "auto" }}>
                    <span style={{ fontSize: 11, color: C.hint }}>KSF Lead:</span>
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
              <ProjectCards
                projects={visibleProjects}
                psRFIs={psRFIs}
                rfiLoading={rfiLoading}
                rfiErrors={rfiErrors}
                expandedProject={expandedProject}
                setExpandedProject={setExpandedProject}
              />
            </div>

            {!projectsLoading && <RFITable rfis={openRFIs} />}
          </>
        )}

        {/* ── Triage tab ───────────────────────────────────────────────────── */}
        {rfiTab === "triage" && (
          <>
            {/* Consult Inbox — isAdmin only, shown when srpm threads exist */}
            {isAdmin && consultInboxIssues.length > 0 && (
              <div style={{ marginBottom: 28 }}>
                <p style={{ margin: "0 0 12px", fontSize: 11, fontWeight: 700,
                  letterSpacing: "0.07em", textTransform: "uppercase", color: C.pm }}>
                  Consult Inbox ({consultInboxIssues.length})
                </p>
                {consultInboxIssues.map(issue => (
                  <TriageIssueCard
                    key={issueId(issue)}
                    issue={issue}
                    project={issue._project}
                    /* KernBot analysis — disabled, restore when training is ready */
                    // analysis={triageAnalysis}
                    // analyzing={triageAnalyzing}
                    /* end KernBot analysis */
                    consultThreads={consultThreads}
                    setConsultThreads={setConsultThreads}
                    /* KernBot analysis — disabled, restore when training is ready */
                    // kernbotLearning={kernbotLearning}
                    // setKernbotLearning={setKernbotLearning}
                    /* end KernBot analysis */
                    isAdmin={isAdmin}
                    /* KernBot analysis — disabled, restore when training is ready */
                    // onRetryAnalyze={handleAnalyze}
                    /* end KernBot analysis */
                    user={user}
                    defaultConsultOpen={true}
                    defaultCollapsed={false}
                  />
                ))}
              </div>
            )}

            {/* Health card bar — all users */}
            <TriageHealthBar
              projects={visibleProjects}
              psIssues={psIssues}
              selectedPids={selectedPids}
              setSelectedPids={setSelectedPids}
            />

            {/* Issue list */}
            {allIssues.length === 0 ? (
              <div style={{ textAlign: "center", padding: "48px 16px" }}>
                <p style={{ margin: 0, fontSize: 32, color: C.success }}>✓</p>
                <p style={{ margin: "8px 0 0", fontSize: 14, fontWeight: 600, color: C.success }}>
                  Triage queue is clear
                </p>
                <p style={{ margin: "4px 0 0", fontSize: 12, color: C.hint }}>
                  All issues have been triaged or resolved.
                </p>
              </div>
            ) : (() => {
              // isAdmin: no list until a card is selected; non-admin: always show (filtered if selected)
              if (isAdmin && selectedPids.size === 0) return null;

              const projectsToShow = isAdmin
                ? visibleProjects.filter(p => selectedPids.has(`${p.portfolioId}-${p.ProjectID}`))
                : visibleProjects.filter(p => selectedPids.size === 0 || selectedPids.has(`${p.portfolioId}-${p.ProjectID}`));

              return projectsToShow.map(p => {
                const pid    = `${p.portfolioId}-${p.ProjectID}`;
                const issues = (psIssues[pid] || [])
                  .map(i => ({ ...i, _project: p }))
                  .sort((a, b) => {
                    const da = issueCreated(a) ? new Date(issueCreated(a)).getTime() : 0;
                    const db = issueCreated(b) ? new Date(issueCreated(b)).getTime() : 0;
                    if (da !== db) return da - db;
                    return (impOrder[issueImportance(a)] ?? 2) - (impOrder[issueImportance(b)] ?? 2);
                  });
                if (!issues.length) return null;
                return (
                  <div key={pid} style={{ marginBottom: 28 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12,
                      paddingBottom: 8, borderBottom: `1px solid ${C.border}` }}>
                      <span style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{p.Name}</span>
                      {p.Number && <span style={{ fontSize: 11, color: C.hint }}>#{p.Number}</span>}
                      <VertBadge v={p.vertical} />
                      <span style={{ fontSize: 11, color: C.muted, marginLeft: "auto" }}>
                        {issues.length} open issue{issues.length !== 1 ? "s" : ""}
                      </span>
                    </div>
                    {issues.map(issue => (
                      <TriageIssueCard
                        key={issueId(issue)}
                        issue={issue}
                        project={issue._project}
                        /* KernBot analysis — disabled, restore when training is ready */
                        // analysis={triageAnalysis}
                        // analyzing={triageAnalyzing}
                        /* end KernBot analysis */
                        consultThreads={consultThreads}
                        setConsultThreads={setConsultThreads}
                        /* KernBot analysis — disabled, restore when training is ready */
                        // kernbotLearning={kernbotLearning}
                        // setKernbotLearning={setKernbotLearning}
                        /* end KernBot analysis */
                        isAdmin={isAdmin}
                        /* KernBot analysis — disabled, restore when training is ready */
                        // onRetryAnalyze={handleAnalyze}
                        /* end KernBot analysis */
                        user={user}
                        defaultCollapsed={isAdmin}
                      />
                    ))}
                  </div>
                );
              });
            })()}
          </>
        )}
      </div>
    </div>
  );
}
