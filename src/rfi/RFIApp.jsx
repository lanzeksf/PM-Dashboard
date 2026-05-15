import React, { useState, useEffect, useMemo } from "react";
import { C } from "../core/utils.jsx";
import { getProjects, getRFIs, getIssues } from "../projectsight/projectsightApi.js";

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
const ISSUE_SYSTEM_PROMPT = `You are Kern Bot, an internal AI assistant for Kern Steel Fabrication (KSF) in Bakersfield, CA.
KSF fabricates structural steel, solar carport structures, and aerospace maintenance stands.
You are analyzing a raw issue submitted by an overseas steel detailer. Their English may be unclear.

Your job:
1. Rewrite the issue in clear, professional English — preserve all technical content, fix grammar and clarity
2. Categorize it using one of these categories: "Design Miss — EOR", "Architectural Conflict", "MEP / Trade Conflict", "Connection Clarification (KSF can answer)", "Missing Information on Drawings", "Dimension / Geometry Conflict", "Material / Fabrication Question"
3. Recommend one of: "Submit as RFI", "KSF Can Answer", "Needs Loren Review"
4. Provide 1-2 sentences of reasoning
5. If "KSF Can Answer", provide a suggested response draft

Respond ONLY in this JSON format, no preamble:
{
  "cleanText": "...",
  "category": "...",
  "recommendation": "Submit as RFI | KSF Can Answer | Needs Loren Review",
  "reasoning": "...",
  "suggestedResponse": "..."
}`;

// ── Field accessors (handles API field name variations) ───────────────────────

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
const rfiNum       = r => r.Number ?? r.number ?? r.rfiNumber ?? r.sequenceNumber ?? r.id ?? "—";
const rfiIdVal     = r => String(r.RFIID ?? r.id ?? r.rfiId ?? r.Number ?? r.number ?? "");
const rfiJobNum    = r => r.Number ?? r.jobNumber ?? r.sequenceNumber ?? "—";
const rfiDetailer  = r => r.AuthorContactName ?? r.assignedCompany ?? r.submittedBy ?? r.createdBy ?? "Unknown";
const rfiImp       = r => r.Importance ?? r.importance ?? r.priority ?? r.urgency ?? null;
const rfiDisc      = r => r.Discipline ?? r.discipline ?? r._project?.vertical ?? "Unknown";

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

const isOpenRFI = r => r.WorkflowStateName !== "Closed";

const fmtD = d => d
  ? new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
  : "—";

const wfnChipStyle = s => ({
  "Draft":          { color: C.muted,   bg: C.surface2 },
  "Open":           { color: C.warning, bg: "rgba(251,191,36,0.12)"  },
  "KSF PM Review":  { color: C.hint,    bg: C.surface2 },
  "Submitted to GC":{ color: C.danger,  bg: "rgba(248,113,113,0.12)" },
  "Closed":         { color: C.success, bg: "rgba(52,211,153,0.12)"  },
}[s] || { color: C.muted, bg: C.surface2 });

const statusChipStyle = s => {
  const ls = (s || "").toLowerCase();
  if (ls.includes("draft"))                            return { color: C.hint,    bg: C.surface2 };
  if (ls.includes("submit"))                           return { color: C.warning, bg: "rgba(251,191,36,0.12)" };
  if (ls.includes("review"))                           return { color: C.accent,  bg: "rgba(91,124,250,0.12)" };
  if (ls.includes("answer") || ls.includes("respond")) return { color: C.success, bg: "rgba(52,211,153,0.12)" };
  if (ls.includes("close")  || ls.includes("void"))   return { color: C.hint,    bg: C.surface2 };
  return { color: C.muted, bg: C.surface2 };
};

const recStyle = rec => ({
  "Submit as RFI":      { color: C.warning, bg: "rgba(251,191,36,0.12)"  },
  "KSF Can Answer":     { color: C.success, bg: "rgba(52,211,153,0.12)"  },
  "Needs Loren Review": { color: C.pm,      bg: "rgba(167,139,250,0.12)" },
}[rec] || { color: C.muted, bg: C.surface2 });

const psRFILink   = (pid, projId, r)     => `https://app.projectsight.com/${pid}/projects/${projId}/rfis/${rfiIdVal(r)}`;
const psIssueLink = (pid, projId, issue) => `https://app.projectsight.com/${pid}/projects/${projId}/issues/${issue.id ?? ""}`;

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

  // Sort worst-first: most overdue → most due-within-7 → most open → healthiest last
  const scored = projects.map(p => {
    const pid      = String(p.ProjectID);
    const open     = (psRFIs[pid] || []).filter(isOpenRFI);
    const overdue  = open.filter(r => ageBand(rfiDue(r)) === "overdue").length;
    const soon     = open.filter(r => ["soon3", "soon7"].includes(ageBand(rfiDue(r)))).length;
    return { p, overdue, soon, openCount: open.length };
  });
  scored.sort((a, b) => b.overdue - a.overdue || b.soon - a.soon || b.openCount - a.openCount);
  const sorted = scored.map(s => s.p);

  // Search filter by name or job number
  const q        = search.trim().toLowerCase();
  const filtered = q
    ? sorted.filter(p =>
        (p.Name   || "").toLowerCase().includes(q) ||
        (p.Number || "").toLowerCase().includes(q))
    : sorted;

  const visible = showAll ? filtered : filtered.slice(0, 12);

  return (
    <>
      {/* Search bar */}
      <input
        type="text"
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="Search projects…"
        style={{ display: "block", width: "100%", marginBottom: 10, padding: "7px 12px",
          background: C.surface, border: `1px solid ${C.border}`, borderRadius: 7,
          color: C.text, fontSize: 12, fontFamily: "inherit", boxSizing: "border-box", outline: "none" }}
      />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px,1fr))", gap: 12, marginBottom: 12 }}>
        {visible.map(p => {
          const pid      = String(p.ProjectID);
          const loading  = rfiLoading[pid];
          const error    = rfiErrors[pid];
          const rfis     = psRFIs[pid] || [];
          const openRfis = rfis.filter(isOpenRFI);
          const overdue  = openRfis.filter(r => ageBand(rfiDue(r)) === "overdue").length;
          const nextDue  = openRfis.map(r => rfiDue(r)).filter(Boolean).sort()[0];
          const oldest   = openRfis.reduce((m, r) => Math.max(m, daysOpenCalc(rfiSubmitted(r))), 0);
          const isExp    = expandedProject === pid;
          const accentC  = overdue > 0 ? BAND_C.overdue : (openRfis.length > 0 ? C.border : C.success);

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

      {filtered.length > 12 && (
        <button onClick={() => setShowAll(v => !v)}
          style={{ display: "block", width: "100%", padding: "8px", marginBottom: 12,
            background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8,
            color: C.hint, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>
          {showAll ? "Show Less ↑" : `Show All ${filtered.length} Projects ↓`}
        </button>
      )}

      {expandedProject && (() => {
        const p       = projects.find(x => String(x.ProjectID) === expandedProject);
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

            {/* Tab filter */}
            <div style={{ display: "flex", gap: 4, marginBottom: 12 }}>
              {[
                { id: "open",   label: `Open (${openCount})`         },
                { id: "closed", label: `Closed (${closedCount})`     },
                { id: "all",    label: `All (${allRfis.length})`     },
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
                      const open = isOpenRFI(r);
                      const band = open ? ageBand(rfiDue(r)) : "nodate";
                      const wfn  = r.WorkflowStateName || "—";
                      const sc   = wfnChipStyle(r.WorkflowStateName);
                      return (
                        <tr key={rfiIdVal(r)} style={{ borderBottom: `1px solid ${C.border}` }}
                          onMouseEnter={e => e.currentTarget.style.background = C.surface2}
                          onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                          <td style={{ padding: "8px 10px" }}>
                            {open
                              ? <BandDot band={band} />
                              : <div style={{ width: 8, height: 8, borderRadius: "50%",
                                  background: C.success, flexShrink: 0 }} />}
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
  Normal: { color: C.accent,  bg: "rgba(91,124,250,0.12)"  },
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
    if (jobNumber)          chips.push({ key: "jobNumber",  label: `Job: "${jobNumber}"` });
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

      {/* ── Filter bar ───────────────────────────────────────────────────────── */}
      <div style={{ padding: "12px 16px", borderBottom: `1px solid ${C.border}`, background: C.surface2 }}>

        {/* Row 1 — filter controls */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center",
          marginBottom: activeChips.length ? 8 : 0 }}>

          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase",
            color: C.hint, marginRight: 4, flexShrink: 0 }}>All Open RFIs</span>

          {/* Job # */}
          <input type="text" value={filter.jobNumber} placeholder="Job #…"
            onChange={e => setF("jobNumber", e.target.value)}
            style={{ ...selSt(!!filter.jobNumber), width: 88 }} />

          {/* Project */}
          <select value={filter.project} onChange={e => setF("project", e.target.value)}
            style={selSt(filter.project !== "all")}>
            <option value="all">Project: All</option>
            {projectOpts.map(o => <option key={o} value={o}>{o}</option>)}
          </select>

          {/* Detailer */}
          <select value={filter.detailer} onChange={e => setF("detailer", e.target.value)}
            style={selSt(filter.detailer !== "all")}>
            <option value="all">Detailer: All</option>
            {detailerOpts.map(o => <option key={o} value={o}>{o}</option>)}
          </select>

          {/* Discipline */}
          <select value={filter.discipline} onChange={e => setF("discipline", e.target.value)}
            style={selSt(filter.discipline !== "all")}>
            <option value="all">Discipline: All</option>
            {["Structural", "Solar", "Aero"].map(o => <option key={o} value={o}>{o}</option>)}
          </select>

          {/* Status */}
          <select value={filter.status} onChange={e => setF("status", e.target.value)}
            style={selSt(filter.status !== "all")}>
            <option value="all">Status: All</option>
            {["Draft", "Open", "KSF PM Review", "Submitted to GC", "Closed"].map(o =>
              <option key={o} value={o}>{o}</option>)}
          </select>

          {/* Importance */}
          <select value={filter.importance} onChange={e => setF("importance", e.target.value)}
            style={selSt(filter.importance !== "all")}>
            <option value="all">Importance: All</option>
            {["Low", "Normal", "High", "Urgent"].map(o => <option key={o} value={o}>{o}</option>)}
          </select>

          {/* Age Band */}
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

        {/* Row 2 — active filter chips */}
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

      {/* ── Table ────────────────────────────────────────────────────────────── */}
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
                  <tr key={`${r._project.ProjectID}-${rfiIdVal(r)}`}
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

// ── Triage Issue Card ─────────────────────────────────────────────────────────

function TriageIssueCard({ issue, project, analysis, analyzing, verified, onAnalyze, onVerify, onCorrect, onFlag, onResolve }) {
  const id       = issue.id;
  const a        = analysis?.[id];
  const isAnalyz = analyzing?.[id];
  const v        = verified?.[id];
  const isMock   = issue._isMock;

  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10,
      marginBottom: 12, overflow: "hidden" }}>
      {/* Card header */}
      <div style={{ padding: "12px 16px", borderBottom: `1px solid ${C.border}`, background: C.surface2 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: C.text, flex: 1 }}>
            {issue.title || "(No title)"}
          </span>
          {project && <VertBadge v={project.vertical} />}
          {project && <span style={{ fontSize: 10, color: C.muted }}>{project.Name}</span>}
          {isMock && (
            <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 4,
              background: "rgba(251,191,36,0.12)", color: C.warning, letterSpacing: "0.05em" }}>
              SAMPLE
            </span>
          )}
          <span style={{ fontSize: 10, color: C.hint }}>
            {issue.createdDate ? `${daysOpenCalc(issue.createdDate)}d ago` : ""}
          </span>
        </div>
      </div>

      <div style={{ padding: "14px 16px" }}>
        {/* Two-column: Original | Kern Bot Cleanup */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
          <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 12px" }}>
            <p style={{ margin: "0 0 6px", fontSize: 9, fontWeight: 700, letterSpacing: "0.08em",
              textTransform: "uppercase", color: C.hint }}>Detailer's Original</p>
            <p style={{ margin: 0, fontSize: 12, color: C.muted, lineHeight: 1.65, whiteSpace: "pre-wrap" }}>
              {issue.description || issue.title || "(No content)"}
            </p>
          </div>

          <div style={{ background: "rgba(91,124,250,0.05)", border: `1px solid ${C.accent}33`,
            borderRadius: 8, padding: "10px 12px" }}>
            <p style={{ margin: "0 0 6px", fontSize: 9, fontWeight: 700, letterSpacing: "0.08em",
              textTransform: "uppercase", color: C.accentText }}>Kern Bot Cleanup</p>
            {isAnalyz ? (
              <div style={{ padding: "14px 0" }}><Spinner label="Analyzing…" /></div>
            ) : a?.error ? (
              <p style={{ margin: 0, fontSize: 11, color: C.danger }}>Analysis failed: {a.error}</p>
            ) : a?.cleanText ? (
              <p style={{ margin: 0, fontSize: 12, color: C.text, lineHeight: 1.65 }}>{a.cleanText}</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center",
                justifyContent: "center", padding: "18px 8px", gap: 10 }}>
                <p style={{ margin: 0, fontSize: 11, color: C.hint, textAlign: "center", lineHeight: 1.5 }}>
                  Run Kern Bot to get a cleanup and recommendation.
                </p>
                <button onClick={() => onAnalyze(issue)}
                  style={{ fontSize: 12, fontWeight: 600, padding: "7px 18px", borderRadius: 7,
                    border: `1px solid ${C.accent}44`, background: C.accentDim, color: C.accentText,
                    cursor: "pointer", fontFamily: "inherit" }}>
                  Analyze with Kern Bot
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Analysis results */}
        {a && !a.error && (
          <>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
              {a.category && (
                <span style={{ fontSize: 10, fontWeight: 600, padding: "3px 9px", borderRadius: 20,
                  background: C.surface2, color: C.muted, border: `1px solid ${C.border}` }}>
                  {a.category}
                </span>
              )}
              {a.recommendation && (() => {
                const rs = recStyle(a.recommendation);
                return (
                  <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 9px", borderRadius: 20,
                    background: rs.bg, color: rs.color, border: `1px solid ${rs.color}44` }}>
                    {a.recommendation}
                  </span>
                );
              })()}
            </div>
            {a.reasoning && (
              <p style={{ margin: "0 0 10px", fontSize: 12, color: C.muted, lineHeight: 1.55 }}>
                {a.reasoning}
              </p>
            )}
            {a.suggestedResponse && (
              <div style={{ background: C.surface2, borderRadius: 7, padding: "10px 12px",
                marginBottom: 10, border: `1px solid ${C.border}` }}>
                <p style={{ margin: "0 0 4px", fontSize: 9, fontWeight: 700, letterSpacing: "0.07em",
                  textTransform: "uppercase", color: C.success }}>Suggested Response</p>
                <p style={{ margin: 0, fontSize: 12, color: C.text, lineHeight: 1.65 }}>
                  {a.suggestedResponse}
                </p>
              </div>
            )}

            {/* PM Verification */}
            <div style={{ padding: "10px 12px", background: C.surface2, borderRadius: 8,
              border: `1px solid ${C.border}`, marginBottom: 12 }}>
              <p style={{ margin: "0 0 8px", fontSize: 10, fontWeight: 700, letterSpacing: "0.05em",
                textTransform: "uppercase", color: C.hint }}>PM Verification</p>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {[
                  ["accurate",         "✓ Looks accurate",     C.success],
                  ["needs_correction", "⚠ Needs correction",   C.warning],
                ].map(([verdict, label, col]) => (
                  <button key={verdict} onClick={() => onVerify(id, verdict)}
                    style={{ padding: "5px 12px", borderRadius: 6, fontFamily: "inherit",
                      border: `1px solid ${v?.verdict === verdict ? col + "66" : C.border}`,
                      background: v?.verdict === verdict ? col + "18" : C.surface,
                      color: v?.verdict === verdict ? col : C.muted,
                      cursor: "pointer", fontSize: 11, fontWeight: 600 }}>
                    {label}
                  </button>
                ))}
              </div>
              {v?.verdict === "needs_correction" && (
                <textarea
                  value={v.correction || ""}
                  onChange={e => onCorrect(id, e.target.value)}
                  placeholder="Enter your corrected version…"
                  style={{ width: "100%", marginTop: 8, padding: "8px 10px", background: C.bg,
                    border: `1px solid ${C.border}`, borderRadius: 6, color: C.text,
                    fontSize: 12, fontFamily: "inherit", resize: "vertical",
                    minHeight: 72, boxSizing: "border-box" }} />
              )}
            </div>
          </>
        )}

        {/* Triage actions */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {project && (
            <a href={psIssueLink(project.portfolioId, project.ProjectID, issue)}
              target="_blank" rel="noopener noreferrer"
              style={{ fontSize: 11, fontWeight: 600, padding: "6px 14px", borderRadius: 7,
                border: `1px solid ${C.accent}44`, background: C.accentDim,
                color: C.accentText, textDecoration: "none", whiteSpace: "nowrap" }}>
              Open in ProjectSight →
            </a>
          )}
          <button onClick={() => onResolve(id)}
            style={{ fontSize: 11, fontWeight: 600, padding: "6px 14px", borderRadius: 7,
              border: `1px solid ${C.success}44`, background: "rgba(52,211,153,0.1)",
              color: C.success, cursor: "pointer", fontFamily: "inherit" }}>
            ✓ Mark: KSF Answers Internally
          </button>
          <button onClick={() => onFlag(id)}
            style={{ fontSize: 11, fontWeight: 600, padding: "6px 14px", borderRadius: 7,
              border: `1px solid ${C.pm}44`, background: C.pmDim,
              color: C.pm, cursor: "pointer", fontFamily: "inherit" }}>
            ⚑ Flag for Loren
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Loren Review Queue ────────────────────────────────────────────────────────

function LorenQueue({ issues, lorenNotes, setLorenNotes, onDismiss, onApprove }) {
  if (!issues.length) return null;
  return (
    <div style={{ background: "rgba(167,139,250,0.05)", border: `1px solid ${C.pm}44`,
      borderRadius: 10, padding: "14px 18px", marginBottom: 20 }}>
      <p style={{ margin: "0 0 12px", fontSize: 11, fontWeight: 700, letterSpacing: "0.07em",
        textTransform: "uppercase", color: C.pm }}>
        ⚑ Loren Review Queue ({issues.length})
      </p>
      {issues.map(issue => {
        const note = lorenNotes[issue.id] || "";
        return (
          <div key={issue.id} style={{ background: C.surface, border: `1px solid ${C.pm}33`,
            borderRadius: 8, padding: "12px 14px", marginBottom: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: C.text, flex: 1 }}>
                {issue.title || "(No title)"}
              </span>
              {issue._project && <VertBadge v={issue._project.vertical} />}
            </div>
            <p style={{ margin: "0 0 8px", fontSize: 12, color: C.muted, lineHeight: 1.5 }}>
              {issue.description || "(No description)"}
            </p>
            <textarea value={note}
              onChange={e => setLorenNotes(p => ({ ...p, [issue.id]: e.target.value }))}
              placeholder="Add a note (optional)…"
              style={{ width: "100%", padding: "7px 10px", background: C.bg,
                border: `1px solid ${C.border}`, borderRadius: 6, color: C.text,
                fontSize: 11, fontFamily: "inherit", resize: "vertical",
                minHeight: 48, boxSizing: "border-box", marginBottom: 8 }} />
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => onApprove(issue.id)}
                style={{ fontSize: 11, fontWeight: 600, padding: "5px 12px", borderRadius: 6,
                  border: `1px solid ${C.success}44`, background: "rgba(52,211,153,0.1)",
                  color: C.success, cursor: "pointer", fontFamily: "inherit" }}>
                ✓ Approve / Take Action
              </button>
              <button onClick={() => onDismiss(issue.id)}
                style={{ fontSize: 11, fontWeight: 600, padding: "5px 12px", borderRadius: 6,
                  border: `1px solid ${C.border}`, background: C.surface2,
                  color: C.muted, cursor: "pointer", fontFamily: "inherit" }}>
                Dismiss
              </button>
            </div>
          </div>
        );
      })}
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
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [projectsError,   setProjectsError]   = useState(null);
  const [expandedProject, setExpandedProject] = useState(null);
  const [rfiTab,          setRfiTab]          = useState("dashboard");
  const [triageAnalysis,  setTriageAnalysis]  = useState({});
  const [triageAnalyzing, setTriageAnalyzing] = useState({});
  const [triageVerified,  setTriageVerified]  = useState({});
  const [triageFlagged,   setTriageFlagged]   = useState([]);
  const [triageResolved,  setTriageResolved]  = useState([]);
  const [lorenNotes,      setLorenNotes]      = useState({});

  const isAdmin = user.tier === "admin" || user.tier === "sr_pm";
  const apiKey  = import.meta.env.VITE_ANTHROPIC_API_KEY;

  // Load projects on mount
  useEffect(() => {
    setProjectsLoading(true);
    getProjects()
      .then(projects => {
        setPsProjects(projects);
        console.log("[RFI] Projects in state:", projects.slice(0,2).map(p => ({ id: p.ProjectID, name: p.Name })));
        setProjectsLoading(false);
      })
      .catch(err      => { setProjectsError(err.message); setProjectsLoading(false); });
  }, []);

  // Load RFIs + Issues per visible project as projects arrive
  useEffect(() => {
    if (!psProjects.length) return;
    const visible = psProjects;
    visible.forEach(p => {
      const pid = String(p.ProjectID);
      setRfiLoading(prev => ({ ...prev, [pid]: true }));
      console.log("[RFI] Fetching RFIs for project:", p.ProjectID, p.Name);
      getRFIs(p.portfolioId, p.ProjectID)
        .then(rfis => {
          setPsRFIs(prev => ({ ...prev, [pid]: rfis }));
          setRfiLoading(prev => ({ ...prev, [pid]: false }));
        })
        .catch(err => {
          setRfiErrors(prev => ({ ...prev, [pid]: err.message }));
          setRfiLoading(prev => ({ ...prev, [pid]: false }));
        });
      getIssues(p.portfolioId, p.ProjectID)
        .then(issues => setPsIssues(prev => ({ ...prev, [pid]: issues })))
        .catch(() => {});
    });
  }, [psProjects]);

  // Derived: visible projects for this user
  const visibleProjects = useMemo(
    () => psProjects,
    [psProjects]
  );

  // Derived: all RFIs across visible projects, decorated with _project
  const allRFIs = useMemo(() =>
    visibleProjects.flatMap(p =>
      (psRFIs[String(p.ProjectID)] || []).map(r => ({ ...r, _project: p }))
    ),
    [visibleProjects, psRFIs]
  );

  const openRFIs = useMemo(() => allRFIs.filter(isOpenRFI), [allRFIs]);

  // Derived: all issues, excluding resolved
  const resolvedSet = useMemo(() => new Set(triageResolved), [triageResolved]);
  const flaggedSet  = useMemo(() => new Set(triageFlagged),  [triageFlagged]);

  const allIssues = useMemo(() =>
    visibleProjects.flatMap(p =>
      (psIssues[String(p.ProjectID)] || []).map(i => ({ ...i, _project: p }))
    ).filter(i => !resolvedSet.has(i.id)),
    [visibleProjects, psIssues, resolvedSet]
  );

  const triageIssues  = useMemo(() => allIssues.filter(i => !flaggedSet.has(i.id)),  [allIssues, flaggedSet]);
  const flaggedIssues = useMemo(() => allIssues.filter(i => flaggedSet.has(i.id)),   [allIssues, flaggedSet]);
  const hasMockIssues = allIssues.some(i => i._isMock);

  // Summary stats
  const stats = useMemo(() => {
    const overdue = openRFIs.filter(r => ageBand(rfiDue(r)) === "overdue").length;
    const due7    = openRFIs.filter(r => ["soon3", "soon7"].includes(ageBand(rfiDue(r)))).length;
    const avgDays = openRFIs.length
      ? Math.round(openRFIs.reduce((s, r) => s + daysOpenCalc(rfiSubmitted(r)), 0) / openRFIs.length)
      : 0;
    return { total: openRFIs.length, overdue, due7, avgDays };
  }, [openRFIs]);

  // Triage handlers
  const handleAnalyze = async issue => {
    if (!apiKey) return;
    const id = issue.id;
    setTriageAnalyzing(p => ({ ...p, [id]: true }));
    try {
      const result = await analyzeIssue(issue.description || issue.title || "", apiKey);
      setTriageAnalysis(p => ({ ...p, [id]: result }));
    } catch (e) {
      setTriageAnalysis(p => ({ ...p, [id]: { error: e.message } }));
    } finally {
      setTriageAnalyzing(p => ({ ...p, [id]: false }));
    }
  };

  const handleVerify  = (id, verdict) => setTriageVerified(p => ({ ...p, [id]: { ...p[id], verdict } }));
  const handleCorrect = (id, text)    => setTriageVerified(p => ({ ...p, [id]: { ...p[id], correction: text } }));
  const handleFlag    = id => setTriageFlagged(p => [...p, id]);
  const handleResolve = id => setTriageResolved(p => [...p, id]);
  const handleLorenDismiss  = id => setTriageFlagged(p => p.filter(x => x !== id));
  const handleLorenApprove  = id => { setTriageFlagged(p => p.filter(x => x !== id)); setTriageResolved(p => [...p, id]); };

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", background: C.bg, overflowY: "auto",
      fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif" }}>
      <style>{`@keyframes ksf-spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>

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
          {projectsLoading && <Spinner />}
          {projectsError && (
            <span style={{ fontSize: 12, color: C.danger }}>⚠ {projectsError}</span>
          )}
        </div>

        {/* Tab bar */}
        <div style={{ display: "flex", gap: 2, marginBottom: 20,
          borderBottom: `1px solid ${C.border}`, paddingBottom: 0 }}>
          {[
            { id: "dashboard", label: "RFI Dashboard" },
            { id: "triage",    label: "Issue Triage" },
          ].map(t => {
            const isActive = rfiTab === t.id;
            const badge = t.id === "triage" && triageIssues.length;
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

        {/* ── Dashboard tab ─────────────────────────────────────────────────── */}
        {rfiTab === "dashboard" && (
          <>
            {/* Stats row */}
            <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
              <StatCard label="Total Open RFIs"   value={stats.total} />
              <StatCard label="Overdue"            value={stats.overdue}
                color={stats.overdue > 0 ? BAND_C.overdue : C.success} />
              <StatCard label="Due Within 7 Days"  value={stats.due7}
                color={stats.due7 > 0 ? BAND_C.soon7 : C.success} />
              <StatCard label="Avg Days Open"
                value={stats.avgDays > 0 ? `${stats.avgDays}d` : "—"} />
            </div>

            {/* Project health cards */}
            <div style={{ marginBottom: 16 }}>
              <p style={{ margin: "0 0 10px", fontSize: 11, fontWeight: 700,
                letterSpacing: "0.07em", textTransform: "uppercase", color: C.hint }}>
                Project Health
              </p>
              <ProjectCards
                projects={visibleProjects}
                psRFIs={psRFIs}
                rfiLoading={rfiLoading}
                rfiErrors={rfiErrors}
                expandedProject={expandedProject}
                setExpandedProject={setExpandedProject}
              />
            </div>

            {/* Full RFI table */}
            {!projectsLoading && <RFITable rfis={openRFIs} />}
          </>
        )}

        {/* ── Triage tab ────────────────────────────────────────────────────── */}
        {rfiTab === "triage" && (
          <>
            {hasMockIssues && (
              <p style={{ margin: "0 0 14px", fontSize: 11, color: C.hint }}>
                Sample data — Issues endpoint pending confirmation
              </p>
            )}

            {isAdmin && flaggedIssues.length > 0 && (
              <LorenQueue
                issues={flaggedIssues}
                lorenNotes={lorenNotes}
                setLorenNotes={setLorenNotes}
                onDismiss={handleLorenDismiss}
                onApprove={handleLorenApprove}
              />
            )}

            {triageIssues.length === 0 ? (
              <div style={{ textAlign: "center", padding: "48px 16px" }}>
                <p style={{ margin: 0, fontSize: 32, color: C.success }}>✓</p>
                <p style={{ margin: "8px 0 0", fontSize: 14, fontWeight: 600, color: C.success }}>
                  Triage queue is clear
                </p>
                <p style={{ margin: "4px 0 0", fontSize: 12, color: C.hint }}>
                  All issues have been triaged or resolved.
                </p>
              </div>
            ) : (
              triageIssues.map(issue => (
                <TriageIssueCard
                  key={issue.id}
                  issue={issue}
                  project={issue._project}
                  analysis={triageAnalysis}
                  analyzing={triageAnalyzing}
                  verified={triageVerified}
                  onAnalyze={handleAnalyze}
                  onVerify={handleVerify}
                  onCorrect={handleCorrect}
                  onFlag={handleFlag}
                  onResolve={handleResolve}
                />
              ))
            )}
          </>
        )}
      </div>
    </div>
  );
}
