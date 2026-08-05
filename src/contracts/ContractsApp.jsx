import React, { useState, useRef, useEffect } from "react";
import { C, MI, USERS_LIST, fmtDate, nowStamp } from "../core/utils.jsx";

// ── Mock job data (populated from ProjectSight + Spectrum once wired) ──────────
const MOCK_JOBS = [
  {
    id: "1",
    name: "Riverside Medical Center",
    jobNum: "J-2401",
    vertical: "Structural",
    customer: "Riverside Health Group",
    customerRep: "Mark Stein",
    gc: "Turner Construction",
    contractValue: "$1,840,000",
    contractType: "Lump Sum",
    noticeWindow: "7 calendar days",
    noticeRisk: "warning",
    spFolder: "https://sharepoint.com",
    docs: [
      { id: "d1", section: "Contracts",            name: "Prime contract",               type: "pdf",   meta: "Executed · 14.2 MB", url: "https://sharepoint.com" },
      { id: "d2", section: "Contracts",            name: "Subcontract agreement",        type: "pdf",   meta: "Executed · 8.6 MB",  url: "https://sharepoint.com" },
      { id: "d3", section: "Contracts",            name: "Scope of work — KSF",          type: "doc",   meta: "Final · 2.1 MB",     url: "https://sharepoint.com" },
      { id: "d4", section: "Addendums & Changes",  name: "Addendum 2 — beam revision",   type: "pdf",   meta: "3/12/26 · 1.4 MB",   url: "https://sharepoint.com" },
      { id: "d5", section: "Addendums & Changes",  name: "OCIP enrollment docs",         type: "pdf",   meta: "Insurance · 5.8 MB", url: "https://sharepoint.com" },
      { id: "d6", section: "Correspondence",       name: "Turner — delivery hold notice",type: "email", meta: "Email · 4/28/26",    url: "https://sharepoint.com" },
      { id: "d7", section: "Correspondence",       name: "Owner RFI response batch 3",   type: "email", meta: "Email · 4/15/26",    url: "https://sharepoint.com" },
    ],
    notes: [
      { id: "n1", text: "GC verbally agreed on 4/10 site meeting to cover crane costs for Phase 2 erection sequence.", author: "Loren C.", date: "2026-04-10T09:00:00Z" },
      { id: "n2", text: "Mark Stein confirmed extended delivery window by phone. No written confirmation yet — follow up.", author: "Loren C.", date: "2026-04-22T14:30:00Z" },
    ],
  },
  {
    id: "2",
    name: "Westfield Solar Carport Ph. 2",
    jobNum: "J-2389",
    vertical: "Solar",
    customer: "Westfield Properties",
    customerRep: "Dana Cross",
    gc: "Self-perform",
    contractValue: "$540,000",
    contractType: "Lump Sum",
    noticeWindow: "10 calendar days",
    noticeRisk: "warning",
    spFolder: "https://sharepoint.com",
    docs: [
      { id: "d8",  section: "Contracts", name: "Prime contract",  type: "pdf", meta: "Executed · 9.1 MB",  url: "https://sharepoint.com" },
      { id: "d9",  section: "Contracts", name: "Scope of work",   type: "doc", meta: "Final · 1.8 MB",    url: "https://sharepoint.com" },
      { id: "d10", section: "Contracts", name: "AHJ permit docs", type: "pdf", meta: "Approved · 3.2 MB", url: "https://sharepoint.com" },
    ],
    notes: [],
  },
  {
    id: "3",
    name: "F-35 Maintenance Stand — Edwards AFB",
    jobNum: "J-2376",
    vertical: "Aerospace",
    customer: "Lockheed Martin",
    customerRep: "Col. R. Haines",
    gc: "Prime contract",
    contractValue: "$280,000",
    contractType: "Fixed Price",
    noticeWindow: "Per EO — strict",
    noticeRisk: "danger",
    spFolder: "https://sharepoint.com",
    docs: [
      { id: "d11", section: "Contracts",           name: "Prime contract — LM",          type: "pdf",   meta: "Executed · 22.4 MB", url: "https://sharepoint.com" },
      { id: "d12", section: "Contracts",           name: "USAF spec requirements",       type: "pdf",   meta: "Rev C · 11.2 MB",    url: "https://sharepoint.com" },
      { id: "d13", section: "Contracts",           name: "Scope of work",                type: "doc",   meta: "Final · 3.4 MB",     url: "https://sharepoint.com" },
      { id: "d14", section: "Addendums & Changes", name: "Engineering Order EO-004",     type: "pdf",   meta: "Approved · 2.1 MB",  url: "https://sharepoint.com" },
      { id: "d15", section: "Addendums & Changes", name: "Engineering Order EO-007",     type: "pdf",   meta: "Pending · 1.8 MB",   url: "https://sharepoint.com" },
      { id: "d16", section: "Correspondence",      name: "LM QC inspection request",     type: "email", meta: "Email · 5/1/26",     url: "https://sharepoint.com" },
      { id: "d17", section: "Correspondence",      name: "USAF delivery extension req",  type: "email", meta: "Email · 4/20/26",    url: "https://sharepoint.com" },
      { id: "d18", section: "Correspondence",      name: "Weld inspection records",      type: "email", meta: "Email · 4/18/26",    url: "https://sharepoint.com" },
    ],
    notes: [
      { id: "n3", text: "LM QC rep requires all mill certs before final acceptance. Adam to compile package.", author: "Lanze A.", date: "2026-05-01T08:00:00Z" },
      { id: "n4", text: "EO-007 still pending LM signature — do not proceed on that scope until signed.", author: "Loren C.", date: "2026-05-03T11:00:00Z" },
    ],
  },
  {
    id: "4",
    name: "Harmon Ave Parking Structure",
    jobNum: "J-2361",
    vertical: "Structural",
    customer: "City of Harmon",
    customerRep: "James Wu",
    gc: "Hensel Phelps",
    contractValue: "$620,000",
    contractType: "Lump Sum",
    noticeWindow: "14 calendar days",
    noticeRisk: "warning",
    spFolder: "https://sharepoint.com",
    docs: [
      { id: "d19", section: "Contracts", name: "Subcontract agreement", type: "pdf", meta: "Executed · 7.3 MB", url: "https://sharepoint.com" },
      { id: "d20", section: "Contracts", name: "Scope of work",         type: "doc", meta: "Draft · 1.1 MB",   url: "https://sharepoint.com" },
    ],
    notes: [],
  },
];

const DOC_SECTIONS = ["Contracts", "Addendums & Changes", "Correspondence", "PM Notes"];

const QUICK_PROMPTS = [
  "What are our lien rights and deadlines on this job?",
  "Summarize all open notice obligations.",
  "What does the contract say about back-charges?",
  "What recourse do we have for an owner-caused delay?",
];

// ── Helpers ───────────────────────────────────────────────────────────────────
function vertBadgeStyle(vertical) {
  const map = {
    Structural: { color: C.accentText, bg: C.accentDim },
    Solar:      { color: C.warning,    bg: C.warningDim },
    Aerospace:  { color: C.pm,         bg: C.pmDim },
  };
  const t = map[vertical] || { color: C.muted, bg: C.surface2 };
  return {
    fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 20,
    background: t.bg, color: t.color, border: `1px solid ${t.color}33`,
    whiteSpace: "nowrap", flexShrink: 0,
  };
}

function noticeStyle(risk) {
  if (risk === "danger")  return { color: C.danger };
  if (risk === "warning") return { color: C.warning };
  return { color: C.success };
}

function docIcon(type) {
  if (type === "email") return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={C.warning} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
      <polyline points="22,6 12,13 2,6"/>
    </svg>
  );
  if (type === "doc") return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={C.accentText} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
    </svg>
  );
  return <span style={{ color: C.danger, display: "flex" }}>{MI.pdf}</span>;
}

function noteIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={C.success} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="16" y1="13" x2="8" y2="13"/>
      <line x1="16" y1="17" x2="8" y2="17"/>
    </svg>
  );
}

function externalIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={C.hint} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/>
      <polyline points="15 3 21 3 21 9"/>
      <line x1="10" y1="14" x2="21" y2="3"/>
    </svg>
  );
}

function sendIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <line x1="22" y1="2" x2="11" y2="13"/>
      <polygon points="22 2 15 22 11 13 2 9 22 2"/>
    </svg>
  );
}

function backIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6"/>
    </svg>
  );
}

function uploadIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/>
      <path d="M20.39 18.39A5 5 0 0018 9h-1.26A8 8 0 103 16.3"/>
    </svg>
  );
}

// ── Anthropic call ────────────────────────────────────────────────────────────
async function callContractBrain(jobContext, messages) {
  const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY;
  if (!apiKey) return "⚠️ Anthropic API key not configured. Add VITE_ANTHROPIC_API_KEY to your environment variables.";

  const systemPrompt = `You are the Contract Brain for Kern Steel Fabrication (KSF) — a structural steel fabricator in Bakersfield, CA operating across Structural, Solar, and Aerospace verticals.

You are a contract expert for a specific job. Your role is to answer questions about this job's contracts, scope, payment terms, lien rights, back-charges, delays, damages, and any disputes — based on the job context provided.

JOB CONTEXT:
Job: ${jobContext.name} (${jobContext.jobNum})
Vertical: ${jobContext.vertical}
Customer: ${jobContext.customer} — Rep: ${jobContext.customerRep}
GC: ${jobContext.gc}
Contract Value: ${jobContext.contractValue} (${jobContext.contractType})
Notice Window: ${jobContext.noticeWindow}

DOCUMENTS IN LIBRARY:
${jobContext.docs.map(d => `- [${d.section}] ${d.name} (${d.meta})`).join("\n")}

PM NOTES:
${jobContext.notes.length > 0 ? jobContext.notes.map(n => `- ${n.text} [${n.author}, ${fmtDate(n.date)}]`).join("\n") : "None recorded."}

STANDARDS ALWAYS APPLY:
- AISC 303 (Code of Standard Practice) governs all fabrication across all verticals
- AISC CoSP §9.4 — written notice required for extra work claims
- AISC CoSP §9.5.3 — fabricator compensated for delays caused by others
- AISC CoSP §9.6 — fabricator shall be paid for materials stored off-site
- AWS D1.1 governs weld inspection
- Aerospace: all field modifications require a written Engineering Order (EO) — no exceptions
- Solar: AHJ permit approval required before construction start

BEHAVIOR:
- Be direct and specific. Name the clause, the risk, the recommended action.
- When citing documents, reference them clearly: e.g. [Subcontract §8.3] or [AISC CoSP §9.6]
- Flag contract notice deadlines proactively — KSF operates under tight change order windows
- If something could expose KSF to liability or lost revenue, say so clearly
- End responses with a clear recommended next action
- Keep responses concise but complete — this is a working tool, not an essay`;

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-5",
      max_tokens: 1000,
      system: systemPrompt,
      messages: messages.map(m => ({ role: m.role === "user" ? "user" : "assistant", content: m.text })),
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    return `API error: ${err.error?.message || response.statusText}`;
  }

  const data = await response.json();
  return data.content?.map(b => b.text || "").join("") || "No response.";
}

// ── Feed pill ─────────────────────────────────────────────────────────────────
function FeedPill({ icon, count, active }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      fontSize: 10, padding: "2px 7px", borderRadius: 20,
      background: active ? C.successDim : C.surface2,
      color: active ? C.success : C.hint,
      border: `1px solid ${active ? C.success + "44" : C.border}`,
    }}>
      {icon} {count}
    </span>
  );
}

// ── Job List Screen ───────────────────────────────────────────────────────────
function JobList({ jobs, onSelect }) {
  const [search, setSearch] = useState("");

  const filtered = search.trim()
    ? jobs.filter(j => {
        const q = search.toLowerCase();
        return [j.name, j.customer, j.gc, j.jobNum, j.vertical]
          .some(f => f.toLowerCase().includes(q));
      })
    : jobs;

  function highlight(text, query) {
    if (!query.trim()) return text;
    const idx = text.toLowerCase().indexOf(query.toLowerCase());
    if (idx === -1) return text;
    return (
      <>
        {text.slice(0, idx)}
        <span style={{ background: C.accentDim, color: C.accentText, borderRadius: 2, padding: "0 1px" }}>
          {text.slice(idx, idx + query.length)}
        </span>
        {text.slice(idx + query.length)}
      </>
    );
  }

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", background: C.bg }}>
      {/* Header */}
      <div style={{ padding: "16px 20px 12px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 16, flexShrink: 0 }}>
        <div style={{ flex: "0 0 auto" }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: C.text, letterSpacing: "-0.02em" }}>Contracts</div>
          <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>Contract brain — one per job</div>
        </div>
        {/* Search */}
        <div style={{ flex: 1, maxWidth: 340, position: "relative" }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.hint} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
            style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}>
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by job, customer, or GC…"
            style={{
              width: "100%", padding: "8px 32px 8px 32px", fontSize: 13,
              border: `1px solid ${C.border}`, borderRadius: 8,
              background: C.surface, color: C.text, fontFamily: "inherit",
              outline: "none",
            }}
            onFocus={e => { e.target.style.borderColor = C.accent; }}
            onBlur={e => { e.target.style.borderColor = C.border; }}
          />
          {search && (
            <button onClick={() => setSearch("")} style={{
              position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)",
              background: "none", border: "none", cursor: "pointer", color: C.hint,
              display: "flex", alignItems: "center", padding: 2,
            }}>
              {MI.close}
            </button>
          )}
        </div>
        {search.trim() && (
          <div style={{ fontSize: 11, color: C.muted, flexShrink: 0 }}>
            {filtered.length} of {jobs.length} jobs
          </div>
        )}
      </div>

      {/* Grid */}
      <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px" }}>
        {filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "48px 0", color: C.hint, fontSize: 13 }}>
            <div style={{ fontSize: 24, marginBottom: 8, opacity: 0.4 }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" style={{ margin: "0 auto" }}>
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
            </div>
            No jobs match "{search}"
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 10 }}>
            {filtered.map(job => {
              const docCount   = job.docs.length;
              const emailCount = job.docs.filter(d => d.type === "email").length;
              const noteCount  = job.notes.length;
              const incomplete = docCount === 0;

              return (
                <button key={job.id} onClick={() => onSelect(job)}
                  style={{
                    background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12,
                    padding: "14px 16px", cursor: "pointer", textAlign: "left",
                    fontFamily: "inherit", transition: "border-color 0.15s, background 0.15s",
                    display: "flex", flexDirection: "column", gap: 0,
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = C.accent + "66"; e.currentTarget.style.background = C.surface2; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.background = C.surface; }}>

                  {/* Top row */}
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8, marginBottom: 10 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: C.text, lineHeight: 1.4 }}>
                      {highlight(job.name, search)}
                    </div>
                    <span style={vertBadgeStyle(job.vertical)}>{job.vertical}</span>
                  </div>

                  {/* Meta */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 3, marginBottom: 10 }}>
                    {[
                      ["Customer", highlight(job.customer, search)],
                      ["GC",       highlight(job.gc, search)],
                      ["Contract", job.contractValue],
                    ].map(([label, val]) => (
                      <div key={label} style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}>
                        <span style={{ color: C.muted }}>{label}</span>
                        <span style={{ color: C.text }}>{val}</span>
                      </div>
                    ))}
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}>
                      <span style={{ color: C.muted }}>Notice window</span>
                      <span style={noticeStyle(job.noticeRisk)}>{job.noticeWindow}</span>
                    </div>
                  </div>

                  {/* Footer */}
                  <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 8, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                      <FeedPill active={docCount > 0}   icon={MI.file} count={`${docCount} docs`} />
                      <FeedPill active={emailCount > 0} icon={
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
                        </svg>
                      } count={`${emailCount} emails`} />
                      <FeedPill active={noteCount > 0} icon={
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/>
                        </svg>
                      } count={`${noteCount} notes`} />
                    </div>
                    {incomplete ? (
                      <span style={{ fontSize: 10, color: C.danger, display: "flex", alignItems: "center", gap: 3 }}>
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                        no docs loaded
                      </span>
                    ) : (
                      <span style={{ fontSize: 11, color: C.accent, display: "flex", alignItems: "center", gap: 3 }}>
                        Open
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Job Brain Screen ──────────────────────────────────────────────────────────
function JobBrain({ job, user, onBack, extraDocs, setExtraDocs }) {
  const [messages, setMessages] = useState([
    {
      id: 0, role: "assistant",
      text: `Contract brain loaded for **${job.name}**.\n\nI've read ${job.docs.length} document${job.docs.length !== 1 ? "s" : ""} and ${job.notes.length} PM note${job.notes.length !== 1 ? "s" : ""} from the library. Ask me anything about this job — payment terms, lien rights, scope disputes, back-charge exposure, notice requirements, stored material claims, or anything in the correspondence.`,
    },
  ]);
  const [input,      setInput]      = useState("");
  const [loading,    setLoading]    = useState(false);
  const [showAddNote, setShowAddNote] = useState(false);
  const [noteText,   setNoteText]   = useState("");
  const [showPaste,  setShowPaste]  = useState(false);
  const [pasteText,  setPasteText]  = useState("");
  const [pasteLabel, setPasteLabel] = useState("");
  const [tooltip,    setTooltip]    = useState(null); // { id, text }
  const messagesEndRef = useRef(null);
  const textareaRef    = useRef(null);

  const jobExtraDocs = extraDocs[job.id] || [];
  const allDocs      = [...job.docs, ...jobExtraDocs];
  const allNotes     = [...job.notes, ...(jobExtraDocs.filter(d => d.section === "PM Notes"))];
  const docSections  = DOC_SECTIONS.slice(0, 3);
  const jobContext   = { ...job, docs: allDocs, notes: [...job.notes, ...allNotes] };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const send = async (text) => {
    const q = (text || input).trim();
    if (!q || loading) return;
    setInput("");
    const userMsg = { id: Date.now(), role: "user", text: q };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);
    const history = [...messages, userMsg].map(m => ({ role: m.role, text: m.text }));
    const reply = await callContractBrain(jobContext, history).catch(e => `Error: ${e.message}`);
    setMessages(prev => [...prev, { id: Date.now() + 1, role: "assistant", text: reply }]);
    setLoading(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  };

  const addNote = () => {
    if (!noteText.trim()) return;
    const note = {
      id: `en-${Date.now()}`,
      section: "PM Notes",
      name: noteText.slice(0, 60) + (noteText.length > 60 ? "…" : ""),
      type: "note",
      meta: `Note · ${user.name} · ${fmtDate(nowStamp())}`,
      url: null,
      text: noteText,
      author: user.name,
      date: nowStamp(),
    };
    setExtraDocs(prev => ({ ...prev, [job.id]: [...(prev[job.id] || []), note] }));
    setNoteText(""); setShowAddNote(false);
  };

  const addPaste = () => {
    if (!pasteText.trim()) return;
    const doc = {
      id: `ep-${Date.now()}`,
      section: "Correspondence",
      name: pasteLabel.trim() || "Pasted correspondence",
      type: "email",
      meta: `Pasted · ${user.name} · ${fmtDate(nowStamp())}`,
      url: null,
      text: pasteText,
      author: user.name,
      date: nowStamp(),
    };
    setExtraDocs(prev => ({ ...prev, [job.id]: [...(prev[job.id] || []), doc] }));
    setPasteText(""); setPasteLabel(""); setShowPaste(false);
  };

  function renderText(text) {
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return <strong key={i} style={{ fontWeight: 600, color: C.text }}>{part.slice(2, -2)}</strong>;
      }
      const citeParts = part.split(/(\[[^\]]+\])/g);
      return citeParts.map((cp, j) => {
        if (cp.startsWith("[") && cp.endsWith("]")) {
          const label = cp.slice(1, -1);
          return (
            <span key={`${i}-${j}`}
              style={{
                display: "inline-flex", alignItems: "center", gap: 3,
                fontSize: 11, padding: "1px 6px", borderRadius: 4,
                background: C.accentDim, color: C.accentText,
                cursor: "pointer", margin: "0 2px", position: "relative",
              }}
              onClick={() => setTooltip(tooltip?.id === `${i}-${j}` ? null : { id: `${i}-${j}`, text: `"${label}" — referenced from your contract library. Click a document in the library panel to open it in SharePoint.` })}
            >
              <span style={{ color: C.accentText, display: "flex" }}>{MI.file}</span>
              {label}
              {tooltip?.id === `${i}-${j}` && (
                <span style={{
                  position: "absolute", bottom: "calc(100% + 6px)", left: 0,
                  background: C.surface2, border: `1px solid ${C.borderHi}`,
                  borderRadius: 8, padding: "8px 10px", fontSize: 11,
                  color: C.muted, lineHeight: 1.5, whiteSpace: "normal",
                  width: 220, zIndex: 10, boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
                }}>
                  {tooltip.text}
                  <span style={{ display: "block", marginTop: 6, color: C.accent, fontSize: 10 }}>
                    Open in SharePoint via the library →
                  </span>
                </span>
              )}
            </span>
          );
        }
        return <span key={`${i}-${j}`} style={{ whiteSpace: "pre-wrap" }}>{cp}</span>;
      });
    });
  }

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", background: C.bg }} onClick={() => setTooltip(null)}>
      {/* Job context bar */}
      <div style={{
        padding: "10px 16px", borderBottom: `1px solid ${C.border}`,
        display: "flex", alignItems: "center", gap: 12, flexShrink: 0,
        background: C.surface, flexWrap: "wrap",
      }}>
        <button onClick={onBack} style={{
          display: "flex", alignItems: "center", gap: 5, padding: "5px 10px",
          fontSize: 12, color: C.muted, background: C.surface2,
          border: `1px solid ${C.border}`, borderRadius: 7, cursor: "pointer",
          fontFamily: "inherit", flexShrink: 0,
        }}
          onMouseEnter={e => e.currentTarget.style.color = C.text}
          onMouseLeave={e => e.currentTarget.style.color = C.muted}>
          {backIcon()} Jobs
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{job.name}</span>
          <span style={{ fontSize: 12, color: C.muted, marginLeft: 6 }}>· {job.jobNum}</span>
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {[
            { label: job.gc },
            { label: job.contractValue },
            { label: `Notice: ${job.noticeWindow}`, color: noticeStyle(job.noticeRisk).color },
          ].map(({ label, color }) => (
            <span key={label} style={{
              fontSize: 11, padding: "2px 9px", borderRadius: 20,
              background: C.surface2, border: `1px solid ${C.border}`,
              color: color || C.muted,
            }}>{label}</span>
          ))}
        </div>
      </div>

      {/* Two-panel layout */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

        {/* LEFT: Library */}
        <div style={{
          width: 260, flexShrink: 0, display: "flex", flexDirection: "column",
          borderRight: `1px solid ${C.border}`, background: C.surface,
        }}>
          <div style={{ padding: "10px 12px 8px", borderBottom: `1px solid ${C.border}` }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: C.text }}>Contract library</span>
              <button title="Refresh from SharePoint" style={{
                background: "none", border: "none", cursor: "pointer", color: C.hint,
                display: "flex", padding: 2,
              }}>
                {MI.resolve}
              </button>
            </div>
            <div style={{ fontSize: 11, color: C.hint, marginTop: 3, display: "flex", alignItems: "center", gap: 5 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: C.success, display: "inline-block" }}/>
              SharePoint · {job.name.split(" ").slice(0, 2).join(" ")}
            </div>
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: "6px 8px" }}>
            {docSections.map(section => {
              const sectionDocs = allDocs.filter(d => d.section === section);
              if (sectionDocs.length === 0) return null;
              return (
                <div key={section}>
                  <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: C.hint, padding: "8px 6px 4px" }}>
                    {section}
                  </div>
                  {sectionDocs.map(doc => (
                    <div key={doc.id}
                      onClick={() => doc.url && window.open(doc.url, "_blank")}
                      style={{
                        display: "flex", alignItems: "center", gap: 8,
                        padding: "6px 8px", borderRadius: 7, cursor: doc.url ? "pointer" : "default",
                        fontSize: 12, color: C.text, transition: "background 0.1s",
                      }}
                      onMouseEnter={e => { if (doc.url) e.currentTarget.style.background = C.surface2; }}
                      onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}>
                      <span style={{ flexShrink: 0, display: "flex" }}>{docIcon(doc.type)}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ color: C.text, lineHeight: 1.3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{doc.name}</div>
                        <div style={{ fontSize: 10, color: C.hint, marginTop: 1 }}>{doc.meta}</div>
                      </div>
                      {doc.url && <span style={{ flexShrink: 0, display: "flex", opacity: 0.5 }}>{externalIcon()}</span>}
                    </div>
                  ))}
                </div>
              );
            })}

            {/* PM Notes section */}
            <div>
              <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: C.hint, padding: "8px 6px 4px" }}>PM Notes</div>
              {job.notes.map(note => (
                <div key={note.id} style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: "6px 8px", fontSize: 12, color: C.text }}>
                  <span style={{ flexShrink: 0, display: "flex", marginTop: 1 }}>{noteIcon()}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ color: C.muted, lineHeight: 1.4, fontSize: 11 }}>{note.text}</div>
                    <div style={{ fontSize: 10, color: C.hint, marginTop: 2 }}>{note.author} · {fmtDate(note.date)}</div>
                  </div>
                </div>
              ))}
              {jobExtraDocs.filter(d => d.section === "PM Notes").map(note => (
                <div key={note.id} style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: "6px 8px", fontSize: 12, color: C.text }}>
                  <span style={{ flexShrink: 0, display: "flex", marginTop: 1 }}>{noteIcon()}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ color: C.muted, lineHeight: 1.4, fontSize: 11 }}>{note.text}</div>
                    <div style={{ fontSize: 10, color: C.hint, marginTop: 2 }}>{note.author} · {fmtDate(note.date)}</div>
                  </div>
                </div>
              ))}
              {job.notes.length === 0 && jobExtraDocs.filter(d => d.section === "PM Notes").length === 0 && (
                <div style={{ fontSize: 11, color: C.hint, padding: "4px 8px", fontStyle: "italic" }}>No notes yet</div>
              )}
            </div>
          </div>

          {/* Add buttons */}
          <div style={{ padding: "8px 10px", borderTop: `1px solid ${C.border}`, display: "flex", gap: 5 }}>
            <button onClick={() => { setShowPaste(false); setShowAddNote(v => !v); }}
              style={{ flex: 1, padding: "6px 4px", fontSize: 11, display: "flex", alignItems: "center", justifyContent: "center", gap: 4, border: `1px dashed ${C.border}`, borderRadius: 7, background: "transparent", color: C.muted, cursor: "pointer", fontFamily: "inherit" }}
              onMouseEnter={e => { e.currentTarget.style.background = C.surface2; e.currentTarget.style.color = C.text; }}
              onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = C.muted; }}>
              {noteIcon()} Note
            </button>
            <button onClick={() => { setShowAddNote(false); setShowPaste(v => !v); }}
              style={{ flex: 1, padding: "6px 4px", fontSize: 11, display: "flex", alignItems: "center", justifyContent: "center", gap: 4, border: `1px dashed ${C.border}`, borderRadius: 7, background: "transparent", color: C.muted, cursor: "pointer", fontFamily: "inherit" }}
              onMouseEnter={e => { e.currentTarget.style.background = C.surface2; e.currentTarget.style.color = C.text; }}
              onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = C.muted; }}>
              {uploadIcon()} Paste
            </button>
          </div>

          {showAddNote && (
            <div style={{ padding: "0 10px 10px", borderTop: `1px solid ${C.border}`, display: "flex", flexDirection: "column", gap: 6 }}>
              <textarea
                value={noteText} onChange={e => setNoteText(e.target.value)}
                placeholder="Type a PM note — verbal agreements, site meeting decisions, anything not in a document…"
                rows={3}
                style={{ width: "100%", padding: "8px 10px", fontSize: 12, border: `1px solid ${C.border}`, borderRadius: 7, background: C.bg, color: C.text, resize: "none", fontFamily: "inherit", lineHeight: 1.5, marginTop: 8 }}
              />
              <button onClick={addNote} style={{ padding: "6px", fontSize: 11, fontWeight: 600, background: C.accentDim, color: C.accentText, border: `1px solid ${C.accent}44`, borderRadius: 7, cursor: "pointer", fontFamily: "inherit" }}>
                Save note
              </button>
            </div>
          )}

          {showPaste && (
            <div style={{ padding: "0 10px 10px", borderTop: `1px solid ${C.border}`, display: "flex", flexDirection: "column", gap: 6 }}>
              <input
                value={pasteLabel} onChange={e => setPasteLabel(e.target.value)}
                placeholder="Label (e.g. GC back-charge letter 5/10)"
                style={{ marginTop: 8, padding: "7px 10px", fontSize: 12, border: `1px solid ${C.border}`, borderRadius: 7, background: C.bg, color: C.text, fontFamily: "inherit" }}
              />
              <textarea
                value={pasteText} onChange={e => setPasteText(e.target.value)}
                placeholder="Paste email or correspondence text here…"
                rows={4}
                style={{ width: "100%", padding: "8px 10px", fontSize: 12, border: `1px solid ${C.border}`, borderRadius: 7, background: C.bg, color: C.text, resize: "none", fontFamily: "inherit", lineHeight: 1.5 }}
              />
              <button onClick={addPaste} style={{ padding: "6px", fontSize: 11, fontWeight: 600, background: C.accentDim, color: C.accentText, border: `1px solid ${C.accent}44`, borderRadius: 7, cursor: "pointer", fontFamily: "inherit" }}>
                Add to library
              </button>
            </div>
          )}
        </div>

        {/* RIGHT: Chat */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div style={{ flex: 1, overflowY: "auto", padding: "16px 16px 8px", display: "flex", flexDirection: "column", gap: 12 }}>
            {messages.map(msg => (
              <div key={msg.id} style={{ display: "flex", gap: 8, maxWidth: "88%", alignSelf: msg.role === "user" ? "flex-end" : "flex-start", flexDirection: msg.role === "user" ? "row-reverse" : "row" }}>
                <div style={{
                  width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
                  background: msg.role === "user" ? user.color + "22" : C.accentDim,
                  border: `1px solid ${msg.role === "user" ? user.color + "44" : C.accent + "44"}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 10, fontWeight: 700,
                  color: msg.role === "user" ? user.color : C.accentText,
                }}>
                  {msg.role === "user" ? user.initials : "KB"}
                </div>
                <div style={{
                  padding: "9px 12px", borderRadius: 10, fontSize: 13, lineHeight: 1.65,
                  background: msg.role === "user" ? C.accentDim : C.surface,
                  border: `1px solid ${msg.role === "user" ? C.accent + "44" : C.border}`,
                  color: C.text,
                  borderBottomLeftRadius:  msg.role !== "user" ? 3 : 10,
                  borderBottomRightRadius: msg.role === "user" ? 3 : 10,
                }}>
                  {renderText(msg.text)}
                </div>
              </div>
            ))}
            {loading && (
              <div style={{ display: "flex", gap: 8, maxWidth: "88%" }}>
                <div style={{ width: 28, height: 28, borderRadius: "50%", flexShrink: 0, background: C.accentDim, border: `1px solid ${C.accent}44`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: C.accentText }}>KB</div>
                <div style={{ padding: "12px 14px", borderRadius: "10px 10px 10px 3px", background: C.surface, border: `1px solid ${C.border}`, display: "flex", gap: 5, alignItems: "center" }}>
                  {[0, 1, 2].map(i => (
                    <div key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: C.accentText, animation: "pulse 1.2s infinite", animationDelay: `${i * 0.2}s`, opacity: 0.6 }}/>
                  ))}
                </div>
              </div>
            )}
            <div ref={messagesEndRef}/>
          </div>

          {/* Quick prompts */}
          <div style={{ padding: "0 14px 8px", display: "flex", gap: 6, flexWrap: "wrap" }}>
            {QUICK_PROMPTS.map(qp => (
              <button key={qp} onClick={() => send(qp)} disabled={loading}
                style={{
                  fontSize: 11, padding: "4px 10px", borderRadius: 20,
                  border: `1px solid ${C.border}`, background: C.surface,
                  color: C.muted, cursor: "pointer", fontFamily: "inherit",
                  transition: "border-color 0.1s, color 0.1s",
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = C.accent + "66"; e.currentTarget.style.color = C.accentText; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.muted; }}>
                {qp}
              </button>
            ))}
          </div>

          {/* Input */}
          <div style={{ padding: "8px 14px 14px", borderTop: `1px solid ${C.border}` }}>
            <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
              <textarea
                ref={textareaRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask anything about this contract…"
                rows={2}
                style={{
                  flex: 1, padding: "9px 12px", fontSize: 13,
                  border: `1px solid ${C.border}`, borderRadius: 9,
                  background: C.surface, color: C.text, resize: "none",
                  fontFamily: "inherit", lineHeight: 1.5,
                }}
                onFocus={e => e.target.style.borderColor = C.accent}
                onBlur={e => e.target.style.borderColor = C.border}
              />
              <button onClick={() => send()} disabled={!input.trim() || loading}
                style={{
                  width: 38, height: 38, borderRadius: 9, flexShrink: 0,
                  background: input.trim() && !loading ? C.accent : C.surface2,
                  border: "none", color: C.accentText, display: "flex", alignItems: "center",
                  justifyContent: "center", cursor: input.trim() && !loading ? "pointer" : "default",
                  transition: "background 0.15s",
                }}>
                {sendIcon()}
              </button>
            </div>
            <div style={{ fontSize: 10, color: C.hint, marginTop: 5 }}>
              Enter to send · Shift+Enter for new line
            </div>
          </div>
        </div>
      </div>
      <style>{`@keyframes pulse{0%,100%{opacity:0.3;transform:scale(0.85);}50%{opacity:1;transform:scale(1);}}`}</style>
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────
export default function ContractsApp({ user }) {
  const [selectedJob, setSelectedJob] = useState(null);
  const [extraDocs,   setExtraDocs]   = useState({});

  const visibleJobs = (user.role === "admin" || user.role === "sr_pm")
    ? MOCK_JOBS
    : MOCK_JOBS.filter(j => {
        if (user.role === "field") return true;
        const dept = user.department?.label;
        if (!dept) return true;
        return j.vertical === dept || (dept === "Aero" && j.vertical === "Aerospace");
      });

  if (selectedJob) {
    return (
      <JobBrain
        job={selectedJob}
        user={user}
        onBack={() => setSelectedJob(null)}
        extraDocs={extraDocs}
        setExtraDocs={setExtraDocs}
      />
    );
  }

  return <JobList jobs={visibleJobs} onSelect={setSelectedJob} />;
}
