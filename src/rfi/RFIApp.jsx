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
const FUNNEL_STAGES = ["Draft", "Submitted", "Under Review", "Answered", "Closed"];

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

const rfiSubject   = r => r.title ?? r.subject ?? r.description ?? "(No subject)";
const rfiStatusVal = r => r.status ?? r.statusName ?? "Unknown";
const rfiSubmitted = r => r.submittedDate ?? r.dateSubmitted ?? r.createdDate ?? r.createDate ?? null;
const rfiDue       = r => r.dueDate ?? r.dateRequired ?? r.responseDueDate ?? null;
const rfiNum       = r => r.number ?? r.rfiNumber ?? r.sequenceNumber ?? r.id ?? "—";
const rfiIdVal     = r => String(r.id ?? r.rfiId ?? r.number ?? "");

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

const isOpenRFI = r => {
  const s = rfiStatusVal(r).toLowerCase();
  return !s.includes("close") && !s.includes("void");
};

const userCanSeeVertical = (user, vertical) =>
  user.tier === "admin" || user.tier === "sr_pm" || user.department?.label === vertical;

const fmtD = d => d
  ? new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
  : "—";

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

function FilterSelect({ label, value, options, labels, onChange }) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)}
      style={{ fontSize: 11, padding: "4px 8px", borderRadius: 6, border: `1px solid ${C.border}`,
        background: C.surface, color: C.muted, fontFamily: "inherit", cursor: "pointer" }}>
      {options.map((o, i) => (
        <option key={o} value={o}>{labels?.[i] ?? (o === "all" ? `${label}: All` : o)}</option>
      ))}
    </select>
  );
}

// ── Project health cards ──────────────────────────────────────────────────────

function ProjectCards({ projects, psRFIs, rfiLoading, rfiErrors, expandedProject, setExpandedProject }) {
  if (!projects.length) {
    return (
      <p style={{ margin: 0, padding: "32px 0", textAlign: "center", fontSize: 13, color: C.hint }}>
        No ProjectSight projects visible for your role.
      </p>
    );
  }

  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px,1fr))", gap: 12, marginBottom: 12 }}>
        {projects.map(p => {
          const pid      = String(p.id);
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
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</span>
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

      {expandedProject && (() => {
        const p    = projects.find(x => String(x.id) === expandedProject);
        if (!p) return null;
        const rfis = (psRFIs[expandedProject] || []).filter(isOpenRFI);
        return (
          <div style={{ background: C.surface, border: `1px solid ${C.accent}44`, borderRadius: 10,
            padding: "16px 20px", marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: C.text, flex: 1 }}>{p.name} — Open RFIs</span>
              <VertBadge v={p.vertical} />
              <button onClick={() => setExpandedProject(null)}
                style={{ background: "none", border: "none", color: C.hint, cursor: "pointer",
                  fontSize: 18, lineHeight: 1, padding: "2px 4px" }}>×</button>
            </div>
            {rfis.length === 0 ? (
              <p style={{ margin: 0, fontSize: 12, color: C.success }}>✓ No open RFIs for this project.</p>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                      {["", "RFI #", "Subject", "Submitted", "Due", "Days Open", "Status", ""].map((h, i) => (
                        <th key={i} style={{ padding: "6px 10px", textAlign: "left", fontSize: 10,
                          fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase",
                          color: C.hint, whiteSpace: "nowrap" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rfis.map(r => {
                      const band = ageBand(rfiDue(r));
                      const sc   = statusChipStyle(rfiStatusVal(r));
                      return (
                        <tr key={rfiIdVal(r)} style={{ borderBottom: `1px solid ${C.border}` }}
                          onMouseEnter={e => e.currentTarget.style.background = C.surface2}
                          onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                          <td style={{ padding: "8px 10px" }}><BandDot band={band} /></td>
                          <td style={{ padding: "8px 10px", color: C.accentText, fontWeight: 600, whiteSpace: "nowrap" }}>{rfiNum(r)}</td>
                          <td style={{ padding: "8px 10px", color: C.text, maxWidth: 240, overflow: "hidden",
                            textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={rfiSubject(r)}>{rfiSubject(r)}</td>
                          <td style={{ padding: "8px 10px", color: C.muted, whiteSpace: "nowrap" }}>{fmtD(rfiSubmitted(r))}</td>
                          <td style={{ padding: "8px 10px", color: BAND_C[band], fontWeight: 600, whiteSpace: "nowrap" }}>{fmtD(rfiDue(r))}</td>
                          <td style={{ padding: "8px 10px", color: C.muted, whiteSpace: "nowrap" }}>{daysOpenCalc(rfiSubmitted(r))}d</td>
                          <td style={{ padding: "8px 10px" }}>
                            <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 7px", borderRadius: 20,
                              background: sc.bg, color: sc.color, whiteSpace: "nowrap" }}>{rfiStatusVal(r)}</span>
                          </td>
                          <td style={{ padding: "8px 10px" }}>
                            <a href={psRFILink(p.portfolioId, p.id, r)} target="_blank" rel="noopener noreferrer"
                              style={{ fontSize: 11, padding: "4px 10px", borderRadius: 5,
                                border: `1px solid ${C.accent}44`, background: C.accentDim,
                                color: C.accentText, textDecoration: "none", whiteSpace: "nowrap" }}>
                              Open in PS →
                            </a>
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

// ── RFI Status Funnel ─────────────────────────────────────────────────────────

function FunnelRow({ counts }) {
  const max = Math.max(...FUNNEL_STAGES.map(s => counts[s] || 0), 1);
  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10,
      padding: "16px 20px", marginBottom: 16 }}>
      <p style={{ margin: "0 0 14px", fontSize: 11, fontWeight: 700, letterSpacing: "0.07em",
        textTransform: "uppercase", color: C.hint }}>RFI Status Funnel</p>
      <div style={{ display: "flex", gap: 4, alignItems: "flex-end" }}>
        {FUNNEL_STAGES.map((stage, i) => {
          const count = counts[stage] || 0;
          const isMax = count > 0 && count === max;
          const pct   = count / max;
          return (
            <React.Fragment key={stage}>
              <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                <div style={{ width: "100%", height: 44, borderRadius: 6, background: C.surface2,
                  overflow: "hidden", position: "relative" }}>
                  <div style={{ position: "absolute", bottom: 0, left: 0, right: 0,
                    height: `${Math.max(pct * 100, count > 0 ? 10 : 0)}%`,
                    background: isMax ? C.accent : C.accentDim,
                    transition: "height 0.3s ease" }} />
                </div>
                <span style={{ fontSize: 17, fontWeight: 700, color: count > 0 ? C.text : C.hint,
                  lineHeight: 1 }}>{count}</span>
                <span style={{ fontSize: 10, color: C.hint, textAlign: "center", lineHeight: 1.3,
                  whiteSpace: "nowrap" }}>{stage}</span>
              </div>
              {i < FUNNEL_STAGES.length - 1 && (
                <div style={{ display: "flex", alignItems: "center", paddingBottom: 44, color: C.hint, flexShrink: 0 }}>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}

// ── Full RFI Table ────────────────────────────────────────────────────────────

function RFITable({ rfis, filter, setFilter, sort, setSort }) {
  const cols = [
    { key: "band",      label: "",           sortable: false },
    { key: "project",   label: "Project",    sortable: true  },
    { key: "num",       label: "RFI #",      sortable: false },
    { key: "subject",   label: "Subject",    sortable: false },
    { key: "submitted", label: "Submitted",  sortable: false },
    { key: "due",       label: "Due",        sortable: true  },
    { key: "age",       label: "Days Open",  sortable: true  },
    { key: "status",    label: "Status",     sortable: true  },
    { key: "action",    label: "",           sortable: false },
  ];

  const toggleSort = col => {
    if (!col.sortable) return;
    setSort(s => s.col === col.key
      ? { col: col.key, dir: s.dir === "asc" ? "desc" : "asc" }
      : { col: col.key, dir: "asc" });
  };

  const allVerticals = ["all", ...new Set(rfis.map(r => r._project.vertical))];
  const allStatuses  = ["all", ...new Set(rfis.map(r => normalizeStatus(r)))];

  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, overflow: "hidden" }}>
      <div style={{ padding: "10px 16px", borderBottom: `1px solid ${C.border}`, background: C.surface2,
        display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase",
          color: C.hint, marginRight: 4 }}>All Open RFIs</span>
        <FilterSelect label="Vertical" value={filter.vertical} options={allVerticals}
          onChange={v => setFilter(f => ({ ...f, vertical: v }))} />
        <FilterSelect label="Status" value={filter.status} options={allStatuses}
          onChange={v => setFilter(f => ({ ...f, status: v }))} />
        <FilterSelect
          label="Age Band"
          value={filter.band}
          options={["all", "overdue", "soon3", "soon7", "ontrack", "nodate"]}
          labels={["Age: All", "Overdue", "Due ≤ 3d", "Due ≤ 7d", "On Track", "No Date"]}
          onChange={v => setFilter(f => ({ ...f, band: v }))} />
        <span style={{ marginLeft: "auto", fontSize: 11, color: C.hint }}>
          {rfis.length} RFI{rfis.length !== 1 ? "s" : ""}
        </span>
      </div>
      {rfis.length === 0 ? (
        <p style={{ margin: 0, padding: "28px 16px", fontSize: 12, color: C.hint, textAlign: "center" }}>
          No RFIs match the current filters.
        </p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                {cols.map(col => (
                  <th key={col.key} onClick={() => toggleSort(col)}
                    style={{ padding: "8px 12px", textAlign: "left", fontSize: 10, fontWeight: 700,
                      letterSpacing: "0.06em", textTransform: "uppercase",
                      color: sort.col === col.key ? C.accentText : C.hint,
                      whiteSpace: "nowrap", cursor: col.sortable ? "pointer" : "default",
                      userSelect: "none" }}>
                    {col.label}
                    {col.sortable && sort.col === col.key && (
                      <span style={{ marginLeft: 3 }}>{sort.dir === "asc" ? "↑" : "↓"}</span>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rfis.map(r => {
                const band = ageBand(rfiDue(r));
                const sc   = statusChipStyle(rfiStatusVal(r));
                return (
                  <tr key={`${r._project.id}-${rfiIdVal(r)}`}
                    style={{ borderBottom: `1px solid ${C.border}` }}
                    onMouseEnter={e => e.currentTarget.style.background = C.surface2}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                    <td style={{ padding: "10px 8px 10px 12px" }}>
                      <div style={{ width: 4, height: 28, borderRadius: 2, background: BAND_C[band] }} />
                    </td>
                    <td style={{ padding: "10px 12px", whiteSpace: "nowrap" }}>
                      <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: C.text }}>{r._project.name}</span>
                        <VertBadge v={r._project.vertical} />
                      </div>
                    </td>
                    <td style={{ padding: "10px 12px", color: C.accentText, fontWeight: 600,
                      whiteSpace: "nowrap" }}>{rfiNum(r)}</td>
                    <td style={{ padding: "10px 12px", maxWidth: 220, overflow: "hidden" }}>
                      <span style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis",
                        whiteSpace: "nowrap", color: C.text }} title={rfiSubject(r)}>{rfiSubject(r)}</span>
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
                        background: sc.bg, color: sc.color, whiteSpace: "nowrap" }}>{rfiStatusVal(r)}</span>
                    </td>
                    <td style={{ padding: "10px 12px" }}>
                      <a href={psRFILink(r._project.portfolioId, r._project.id, r)}
                        target="_blank" rel="noopener noreferrer"
                        style={{ fontSize: 11, padding: "4px 10px", borderRadius: 5,
                          border: `1px solid ${C.accent}44`, background: C.accentDim,
                          color: C.accentText, textDecoration: "none", whiteSpace: "nowrap" }}>
                        Open in PS →
                      </a>
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
          {project && <span style={{ fontSize: 10, color: C.muted }}>{project.name}</span>}
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
            <a href={psIssueLink(project.portfolioId, project.id, issue)}
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
  const [rfiFilter,       setRfiFilter]       = useState({ vertical: "all", status: "all", band: "all" });
  const [rfiSort,         setRfiSort]         = useState({ col: "due", dir: "asc" });
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
      .then(projects => { setPsProjects(projects); setProjectsLoading(false); })
      .catch(err      => { setProjectsError(err.message); setProjectsLoading(false); });
  }, []);

  // Load RFIs + Issues per visible project as projects arrive
  useEffect(() => {
    if (!psProjects.length) return;
    const visible = psProjects.filter(p => userCanSeeVertical(user, p.vertical));
    visible.forEach(p => {
      const pid = String(p.id);
      setRfiLoading(prev => ({ ...prev, [pid]: true }));
      getRFIs(p.portfolioId, p.id)
        .then(rfis => {
          setPsRFIs(prev => ({ ...prev, [pid]: rfis }));
          setRfiLoading(prev => ({ ...prev, [pid]: false }));
        })
        .catch(err => {
          setRfiErrors(prev => ({ ...prev, [pid]: err.message }));
          setRfiLoading(prev => ({ ...prev, [pid]: false }));
        });
      getIssues(p.portfolioId, p.id)
        .then(issues => setPsIssues(prev => ({ ...prev, [pid]: issues })))
        .catch(() => {});
    });
  }, [psProjects]);

  // Derived: visible projects for this user
  const visibleProjects = useMemo(
    () => psProjects.filter(p => userCanSeeVertical(user, p.vertical)),
    [psProjects, user]
  );

  // Derived: all RFIs across visible projects, decorated with _project
  const allRFIs = useMemo(() =>
    visibleProjects.flatMap(p =>
      (psRFIs[String(p.id)] || []).map(r => ({ ...r, _project: p }))
    ),
    [visibleProjects, psRFIs]
  );

  const openRFIs = useMemo(() => allRFIs.filter(isOpenRFI), [allRFIs]);

  // Derived: all issues, excluding resolved
  const resolvedSet = useMemo(() => new Set(triageResolved), [triageResolved]);
  const flaggedSet  = useMemo(() => new Set(triageFlagged),  [triageFlagged]);

  const allIssues = useMemo(() =>
    visibleProjects.flatMap(p =>
      (psIssues[String(p.id)] || []).map(i => ({ ...i, _project: p }))
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

  // Funnel stage counts
  const funnelCounts = useMemo(() => {
    const c = {};
    FUNNEL_STAGES.forEach(s => { c[s] = 0; });
    allRFIs.forEach(r => { const s = normalizeStatus(r); if (s in c) c[s]++; });
    return c;
  }, [allRFIs]);

  // Filtered + sorted RFI table data
  const filteredRFIs = useMemo(() => {
    let list = [...openRFIs];
    if (rfiFilter.vertical !== "all") list = list.filter(r => r._project.vertical === rfiFilter.vertical);
    if (rfiFilter.status   !== "all") list = list.filter(r => normalizeStatus(r) === rfiFilter.status);
    if (rfiFilter.band     !== "all") list = list.filter(r => ageBand(rfiDue(r)) === rfiFilter.band);
    list.sort((a, b) => {
      const dir = rfiSort.dir === "asc" ? 1 : -1;
      if (rfiSort.col === "due") {
        const ad = rfiDue(a), bd = rfiDue(b);
        if (!ad && !bd) return 0;
        if (!ad) return 1;
        if (!bd) return -1;
        return dir * (new Date(ad) - new Date(bd));
      }
      if (rfiSort.col === "age")     return dir * (daysOpenCalc(rfiSubmitted(b)) - daysOpenCalc(rfiSubmitted(a)));
      if (rfiSort.col === "project") return dir * a._project.name.localeCompare(b._project.name);
      if (rfiSort.col === "status")  return dir * normalizeStatus(a).localeCompare(normalizeStatus(b));
      return 0;
    });
    return list;
  }, [openRFIs, rfiFilter, rfiSort]);

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
            { id: "triage",    label: "Detailer Triage" },
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

            {/* Funnel — only once data has loaded */}
            {!projectsLoading && allRFIs.length > 0 && (
              <FunnelRow counts={funnelCounts} />
            )}

            {/* Full RFI table */}
            {!projectsLoading && (
              <RFITable
                rfis={filteredRFIs}
                filter={rfiFilter}
                setFilter={setRfiFilter}
                sort={rfiSort}
                setSort={setRfiSort}
              />
            )}
          </>
        )}

        {/* ── Triage tab ────────────────────────────────────────────────────── */}
        {rfiTab === "triage" && (
          <>
            {hasMockIssues && (
              <div style={{ padding: "10px 14px", background: "rgba(251,191,36,0.07)",
                border: `1px solid ${C.warning}44`, borderRadius: 8, marginBottom: 16,
                fontSize: 12, color: C.warning, lineHeight: 1.5 }}>
                ⚠ Issues API endpoint not yet confirmed — showing sample data
              </div>
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
