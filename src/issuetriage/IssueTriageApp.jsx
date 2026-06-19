import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { C } from "../core/utils.jsx";
import { store } from "../core/store.js";
import { getProjects, getIssues, testFileDownload } from "../projectsight/projectsightApi.js";

// ── Dev cap — temporary, remove before production ────────────────────────────
const DEV_ISSUE_CAP = 4;

// Temporary: fires once on the first issue found with FileLinks
let _fileLinksLogged = false;

// ── Territory filter map ──────────────────────────────────────────────────────
const KSF_LEAD_MAP = {
  lanze:  null,
  loren:  null,
  jacob:  null,
  lisbet: null,
  tony:   "Tony S.",
  luis:   "Luis A.",
  adam:   "Adam K.",
};

// ── KernBot triage system prompt ──────────────────────────────────────────────
const TRIAGE_SYSTEM_PROMPT = `You are KSF's Issue Triage assistant. KSF is a structural steel fabricator in Bakersfield, CA specializing in structural steel, solar carports, and aerospace maintenance stands for Lockheed Martin and the US Air Force. You have knowledge of AISC 303, AISC 360, AWS D1.1, and KSF internal standards.`;

// ── Anthropic triage call — full issue ───────────────────────────────────────
async function callTriageBot(issueText, apiKey, attachments = [], commentContext = "") {
  if (!apiKey) throw new Error("API key not configured");

  let prompt = `Raw issue text:\n${issueText}`;
  if (commentContext) prompt += `\n\nAdditional context from discussion thread:\n${commentContext}`;
  prompt += `\n\nInstructions:\n1. Rewrite the issue in clear professional English. Fix grammar. Preserve all technical content exactly.\n2. Identify and number each distinct sub-question within the issue.\n3. For each sub-question, classify as:\n   A: Answerable from project documents — provide answer and cite source\n   B: Answerable from published code (AISC/AWS) — provide answer and cite section\n   C: Needs RFI — cannot be answered from available information\n4. For each sub-question provide a confidence score 0–100.\n5. For Category C sub-questions, draft an RFI:\n   Question: [rewritten question]\n   Recommended Solution: [KernBot recommendation or "Requires EOR determination"]\n   Reference: [drawing number and/or spec section from issue context]\n\nRespond in JSON only, no markdown:\n{\n  "rewritten_summary": "one-line summary under 60 chars",\n  "rewritten_full": "full rewritten issue text",\n  "sub_questions": [\n    {\n      "number": 1,\n      "question": "clean question text",\n      "category": "A|B|C",\n      "confidence": 85,\n      "answer": "answer text or null",\n      "citation": "source + section or null",\n      "rfi_draft": { "question": "", "recommended_solution": "", "reference": "" }\n    }\n  ]\n}`;

  // Build content array — attachments first, prompt text last
  const content = [];
  for (const att of attachments) {
    if (att.mimeType === "application/pdf") {
      content.push({ type: "document", source: { type: "base64", media_type: "application/pdf", data: att.base64 } });
    } else if (att.mimeType.startsWith("image/")) {
      content.push({ type: "image", source: { type: "base64", media_type: att.mimeType, data: att.base64 } });
    }
  }
  content.push({ type: "text", text: prompt });
  const messageContent = content.length === 1 ? prompt : content;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-5",
      max_tokens: 2048,
      system: TRIAGE_SYSTEM_PROMPT,
      messages: [{ role: "user", content: messageContent }],
    }),
  });
  if (!res.ok) { const err = await res.text(); throw new Error(`API ${res.status}: ${err}`); }
  const data    = await res.json();
  const raw     = data.content?.[0]?.text || "{}";
  const cleaned = raw.replace(/^```json\n?/, "").replace(/\n?```$/, "").trim();
  return JSON.parse(cleaned);
}

// ── Anthropic reclassify call — single sub-question ───────────────────────────
async function callReclassify(questionText, newCat, apiKey) {
  if (!apiKey) throw new Error("API key not configured");
  const desc = {
    A: "Answerable from project documents — provide a document-based answer and cite the source",
    B: "Answerable from published code (AISC/AWS) — provide a code-based answer and cite the section",
    C: "Needs RFI — explain why this cannot be answered without the engineer of record",
  }[newCat] || "Analyze";
  const prompt = `Re-analyze this sub-question as Category ${newCat} (${desc}):\n\n"${questionText}"\n\nRespond in JSON only:\n{\n  "category": "${newCat}",\n  "confidence": 80,\n  "answer": "answer text or null",\n  "citation": "source + section or null",\n  "rfi_draft": { "question": "", "recommended_solution": "", "reference": "" }\n}`;
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-5",
      max_tokens: 512,
      system: TRIAGE_SYSTEM_PROMPT,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  if (!res.ok) { const err = await res.text(); throw new Error(`API ${res.status}: ${err}`); }
  const data    = await res.json();
  const raw     = data.content?.[0]?.text || "{}";
  const cleaned = raw.replace(/^```json\n?/, "").replace(/\n?```$/, "").trim();
  return JSON.parse(cleaned);
}

// ── Issue field accessors (confirmed field names) ─────────────────────────────
const issId        = i => String(i.IssueID ?? i.id ?? "");
const issNum       = i => i.Number ?? "—";
const issTitle     = i => i.Subject ?? "(No subject)";
const issDesc      = i => i.Details ?? i.Body ?? i.description ?? "";
const issCreated   = i => { const d = i.DateCreated ?? null; return (d && !String(d).startsWith("0001")) ? d : null; };
const issModified  = i => { const d = i.DateModified ?? i.LastModified ?? i.DateUpdated ?? null; return (d && !String(d).startsWith("0001")) ? d : null; };
const issImp       = i => i.Importance ?? "Normal";
const issSubmitter = i => i.AuthorContactName ?? "Unknown";
const issLinks     = i => Array.isArray(i.FileLinks) ? i.FileLinks : [];
const issComments  = i => Array.isArray(i.RecordComments) ? i.RecordComments : [];
const issCostImp   = i => i.IsCostImpact ?? false;
const issSchedImp  = i => i.IsSchedImpact ?? false;
const isOpenIssue  = i => i.WorkflowStateName === "Open";

// ── Helpers ───────────────────────────────────────────────────────────────────
const daysOpen = iso => iso ? Math.max(0, Math.floor((Date.now() - new Date(iso)) / 86400000)) : 0;
const fmtD     = d => d ? new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—";
const fmtTs    = iso => iso ? new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : null;

const readBase64 = file => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload  = () => resolve(reader.result.split(",")[1]);
  reader.onerror = reject;
  reader.readAsDataURL(file);
});

const vcol = v => ({
  Structural: { color: "#38bdf8", bg: "rgba(56,189,248,0.12)"  },
  Solar:      { color: "#fbbf24", bg: "rgba(251,191,36,0.12)"  },
  Aero:       { color: "#a78bfa", bg: "rgba(167,139,250,0.12)" },
}[v] || { color: C.muted, bg: C.surface2 });

const ageColor = d => d >= 14 ? C.danger  : d >= 7 ? C.warning : C.hint;
const ageBg    = d => d >= 14 ? "rgba(248,113,113,0.12)" : d >= 7 ? "rgba(251,191,36,0.12)" : C.surface2;

const impChipStyle = imp => ({
  Low:    { color: C.hint,    bg: C.surface2 },
  Normal: { color: C.accent,  bg: "rgba(91,141,184,0.12)" },
  High:   { color: C.warning, bg: "rgba(251,191,36,0.12)" },
  Urgent: { color: C.danger,  bg: "rgba(248,113,113,0.12)" },
}[imp] || { color: C.muted, bg: C.surface2 });

const issueGroup = (id, cache) => {
  const t = cache[id];
  if (!t || t._processing) return "processing";
  if (t.error)             return "processing";
  const sqs = t.sub_questions || [];
  if (sqs.some(q => q.category === "C")) return "decision";
  return "review";
};

const issueDeepLink = (p, i) =>
  `https://app.trimblepaas.com/projectsight/projects/${p.ProjectID}/issues/${issId(i)}`;

// ── Micro-components ──────────────────────────────────────────────────────────

function Spinner({ label = "" }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, color: C.hint, fontSize: 11 }}>
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"
        style={{ animation: "ksf-it-spin 1s linear infinite", flexShrink: 0 }}>
        <path d="M21 12a9 9 0 11-6.219-8.56" strokeLinecap="round"/>
      </svg>
      {label}
    </span>
  );
}

function VertBadge({ v }) {
  const vc = vcol(v);
  return (
    <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 7px", borderRadius: 20,
      background: vc.bg, color: vc.color, border: `1px solid ${vc.color}33`, whiteSpace: "nowrap" }}>
      {v}
    </span>
  );
}

function CategoryBadge({ cat }) {
  const s = cat === "A" ? { color: C.success, bg: "rgba(52,211,153,0.12)"  }
           : cat === "B" ? { color: C.accent,  bg: "rgba(91,141,184,0.12)" }
           :               { color: C.danger,  bg: "rgba(248,113,113,0.12)" };
  return (
    <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20,
      background: s.bg, color: s.color, border: `1px solid ${s.color}33`, whiteSpace: "nowrap" }}>
      Cat {cat}
    </span>
  );
}

function TriageBadge({ triage }) {
  if (!triage || triage._processing) {
    return (
      <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
        <Spinner /><span style={{ fontSize: 10, color: C.hint }}>Processing</span>
      </span>
    );
  }
  if (triage.error) {
    return <span style={{ fontSize: 10, color: C.warning }}>⚠ Analysis failed</span>;
  }
  const sqs    = triage.sub_questions || [];
  const cCount = sqs.filter(q => q.category === "C").length;
  const abCount = sqs.filter(q => q.category !== "C").length;
  return (
    <span style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
      {cCount > 0  && <span style={{ fontSize: 10, fontWeight: 600, color: C.danger  }}>🔴 {cCount} RFI</span>}
      {abCount > 0 && <span style={{ fontSize: 10, fontWeight: 600, color: C.success }}>🟢 {abCount} answered</span>}
    </span>
  );
}

// ── RFI Draft block ───────────────────────────────────────────────────────────

function RFIDraftBlock({ draft }) {
  const [local, setLocal] = useState({
    question:             draft?.question             || "",
    recommended_solution: draft?.recommended_solution || "",
    reference:            draft?.reference            || "",
  });
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    const text = `QUESTION:\n${local.question}\n\nRECOMMENDED SOLUTION:\n${local.recommended_solution}\n\nREFERENCE:\n${local.reference}`;
    navigator.clipboard.writeText(text)
      .then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); })
      .catch(() => {});
  };

  const taStyle = {
    width: "100%", boxSizing: "border-box",
    background: C.bg, border: `1px solid ${C.border}`, borderRadius: 6,
    color: C.text, fontSize: 11, fontFamily: "inherit",
    padding: "7px 10px", resize: "vertical", outline: "none", lineHeight: 1.6,
  };

  return (
    <div style={{ marginTop: 10, background: "rgba(248,113,113,0.05)",
      border: `1px solid rgba(248,113,113,0.25)`, borderRadius: 8, padding: "12px 14px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.07em",
          textTransform: "uppercase", color: C.danger }}>Draft RFI</span>
        <button onClick={handleCopy}
          style={{ fontSize: 11, padding: "4px 12px", borderRadius: 6, fontFamily: "inherit",
            background: copied ? "rgba(52,211,153,0.12)" : C.surface2,
            border: `1px solid ${copied ? C.success + "55" : C.border}`,
            color: copied ? C.success : C.muted, cursor: "pointer" }}>
          {copied ? "✓ Copied" : "Copy Draft"}
        </button>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <div>
          <label style={{ fontSize: 10, color: C.hint, display: "block", marginBottom: 3 }}>Question</label>
          <textarea rows={2} value={local.question} style={taStyle}
            onChange={e => setLocal(p => ({ ...p, question: e.target.value }))} />
        </div>
        <div>
          <label style={{ fontSize: 10, color: C.hint, display: "block", marginBottom: 3 }}>Recommended Solution</label>
          <textarea rows={2} value={local.recommended_solution} style={taStyle}
            onChange={e => setLocal(p => ({ ...p, recommended_solution: e.target.value }))} />
        </div>
        <div>
          <label style={{ fontSize: 10, color: C.hint, display: "block", marginBottom: 3 }}>Reference</label>
          <textarea rows={1} value={local.reference} style={taStyle}
            onChange={e => setLocal(p => ({ ...p, reference: e.target.value }))} />
        </div>
      </div>
    </div>
  );
}

// ── Sub-question block ────────────────────────────────────────────────────────

function SubQuestionBlock({ sq, onReclassify, reclassifying }) {
  const [dropOpen, setDropOpen] = useState(false);
  const catColor = { A: C.success, B: C.accent, C: C.danger }[sq.category] || C.border;

  return (
    <div style={{ border: `1px solid ${catColor}25`, borderRadius: 8, marginBottom: 12, overflow: "visible" }}>

      {/* Header row */}
      <div style={{ background: `${catColor}08`, padding: "9px 14px",
        borderBottom: `1px solid ${catColor}20`,
        display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: C.muted, flexShrink: 0 }}>
          Question {sq.number}
        </span>
        <CategoryBadge cat={sq.category} />
        <span style={{ fontSize: 10, fontWeight: 600, flexShrink: 0,
          color: sq.confidence >= 80 ? C.success : sq.confidence >= 60 ? C.warning : C.danger }}>
          {sq.confidence}%
        </span>
        <div style={{ flex: 1 }} />
        {reclassifying ? (
          <Spinner label="Re-analyzing…" />
        ) : (
          <div style={{ position: "relative" }}>
            <button onClick={() => setDropOpen(v => !v)}
              style={{ fontSize: 11, padding: "3px 10px", borderRadius: 6, fontFamily: "inherit",
                background: dropOpen ? C.surface2 : "none",
                border: `1px solid ${C.border}`, color: C.hint, cursor: "pointer" }}>
              Override ▾
            </button>
            {dropOpen && (
              <div style={{ position: "absolute", right: 0, top: "calc(100% + 4px)", zIndex: 20,
                background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8,
                padding: "4px 0", minWidth: 260, boxShadow: "0 6px 24px rgba(0,0,0,0.5)" }}>
                {["A", "B", "C"].filter(c => c !== sq.category).map(cat => (
                  <button key={cat}
                    onClick={() => { setDropOpen(false); onReclassify(sq.number, cat); }}
                    style={{ display: "block", width: "100%", textAlign: "left", background: "none",
                      border: "none", padding: "8px 14px", color: C.muted, fontSize: 12,
                      cursor: "pointer", fontFamily: "inherit" }}
                    onMouseEnter={e => e.currentTarget.style.background = C.surface2}
                    onMouseLeave={e => e.currentTarget.style.background = "none"}>
                    {cat === "A" && "→ Reclassify as A (Answerable from docs)"}
                    {cat === "B" && "→ Reclassify as B (Answerable from code)"}
                    {cat === "C" && "→ Reclassify as C (Needs RFI)"}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div style={{ padding: "10px 14px 12px" }}>
        <div style={{ height: 1, background: C.border, marginBottom: 8 }} />
        <p style={{ margin: "0 0 10px", fontSize: 12, color: C.text, lineHeight: 1.65 }}>
          {sq.question}
        </p>

        {sq.answer && (
          <div style={{ background: C.surface2, borderRadius: 6, padding: "10px 12px", marginBottom: 4 }}>
            <p style={{ margin: "0 0 4px", fontSize: 10, fontWeight: 700, letterSpacing: "0.06em",
              textTransform: "uppercase", color: C.hint }}>▼ KernBot Answer</p>
            <p style={{ margin: 0, fontSize: 12, color: C.muted, lineHeight: 1.65 }}>{sq.answer}</p>
            {sq.citation && (
              <p style={{ margin: "6px 0 0", fontSize: 11, color: C.accent, fontStyle: "italic" }}>
                {sq.citation}
              </p>
            )}
          </div>
        )}

        {/* RFI Draft — isolated per issue+question via key on SubQuestionBlock */}
        {sq.category === "C" && <RFIDraftBlock draft={sq.rfi_draft} />}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function IssueTriageApp({ user }) {
  const [psProjects,   setPsProjects]   = useState([]);
  const [psIssues,     setPsIssues]     = useState({});
  const [triageCache,  setTriageCache]  = useState({});
  const [reclassing,   setReclassing]   = useState({});
  const [selectedId,   setSelectedId]   = useState(null);
  const [sortOrder,    setSortOrder]    = useState("oldest");
  const [vertFilter,   setVertFilter]   = useState("All");
  const [search,       setSearch]       = useState("");
  const [showOriginal, setShowOriginal] = useState(false);
  const [collapsed,    setCollapsed]    = useState({ decision: false, review: false, processing: false });
  const [loading,      setLoading]      = useState(true);
  const [attachedFiles, setAttachedFiles] = useState([]);

  const queueRef      = useRef([]);
  const queuedRef     = useRef(new Set());
  const processingRef = useRef(false);
  const cacheRef      = useRef(triageCache);
  const apiKey        = import.meta.env.VITE_ANTHROPIC_API_KEY;

  useEffect(() => { cacheRef.current = triageCache; });

  // Reset attached files when switching issues
  useEffect(() => { setAttachedFiles([]); }, [selectedId]);

  // Temporary: test file download with known fileId from FileLinks sample
  useEffect(() => {
    testFileDownload("54bfcdfd-5be5-4e20-b70b-ea11f2549510", "32", "8108", "7221");
  }, []);

  // ── Load projects ─────────────────────────────────────────────────────────
  useEffect(() => {
    const cached = store.projectsightCache.projects;
    if (cached.length > 0) {
      setPsProjects(cached);
      setLoading(false);
    } else {
      getProjects()
        .then(ps => { setPsProjects(ps); setLoading(false); })
        .catch(() => setLoading(false));
    }
  }, []);

  // ── Load issues per project ───────────────────────────────────────────────
  useEffect(() => {
    if (!psProjects.length) return;
    psProjects.forEach(p => {
      const pid = `${p.portfolioId}-${p.ProjectID}`;
      getIssues(p.portfolioId, p.ProjectID)
        .then(raw => {
          const open = (Array.isArray(raw) ? raw : []).filter(isOpenIssue);
          setPsIssues(prev => ({ ...prev, [pid]: open }));
          if (!_fileLinksLogged) {
            const sample = open.find(i => Array.isArray(i.FileLinks) && i.FileLinks.length > 0);
            if (sample) { console.log('[KSF FILELINKS SAMPLE]', sample.FileLinks); _fileLinksLogged = true; }
          }
        })
        .catch(() => {});
    });
  }, [psProjects]);

  // ── Territory-filtered visible projects ───────────────────────────────────
  const visibleProjects = useMemo(() => {
    if (!psProjects.length) return [];
    const isAllSee = user?.id === "lanze" || user?.id === "loren" || user?.id === "lisbet" || user?.id === "jacob";
    const projects = isAllSee ? psProjects : (() => {
      const lead = KSF_LEAD_MAP[user?.id];
      if (lead === null || lead === undefined) return psProjects;
      return psProjects.filter(p => {
        const tob = (p.TypeOfBuilding ?? "").trim();
        return tob === lead || tob.toLowerCase().includes(lead.split(" ")[0].toLowerCase());
      });
    })();
    if (vertFilter === "All") return projects;
    return projects.filter(p => {
      const v = p.vertical || "";
      if (vertFilter === "Aero") return v === "Aero" || (p.TypeOfBuilding || "").toLowerCase().includes("aero");
      return v === vertFilter;
    });
  }, [psProjects, user, vertFilter]);

  // ── All open issues decorated with _project ───────────────────────────────
  const allIssues = useMemo(() =>
    visibleProjects.flatMap(p =>
      (psIssues[`${p.portfolioId}-${p.ProjectID}`] || []).map(i => ({ ...i, _project: p }))
    ),
    [visibleProjects, psIssues]
  );

  // ── Dev cap: 4 oldest issues only ────────────────────────────────────────
  const cappedIssues = useMemo(() => {
    const sorted = [...allIssues].sort((a, b) => {
      const da = issCreated(a) ? new Date(issCreated(a)).getTime() : 0;
      const db = issCreated(b) ? new Date(issCreated(b)).getTime() : 0;
      return da - db;
    });
    return sorted.slice(0, DEV_ISSUE_CAP);
  }, [allIssues]);

  // ── Drain triage queue ────────────────────────────────────────────────────
  const drainQueue = useCallback(async () => {
    if (processingRef.current || !apiKey) return;
    processingRef.current = true;
    while (queueRef.current.length > 0) {
      const issue = queueRef.current.shift();
      const id    = issId(issue);
      try {
        const text   = [issTitle(issue), issDesc(issue)].filter(Boolean).join("\n\n");
        const result = await callTriageBot(text, apiKey);
        setTriageCache(prev => ({ ...prev, [id]: { ...result, _analyzedAt: new Date().toISOString() } }));
      } catch (e) {
        setTriageCache(prev => ({ ...prev, [id]: { error: e.message } }));
      }
      if (queueRef.current.length > 0) await new Promise(r => setTimeout(r, 1200));
    }
    processingRef.current = false;
  }, [apiKey]);

  // ── Queue new issues for triage (capped) ─────────────────────────────────
  useEffect(() => {
    if (!cappedIssues.length) return;
    const newIssues = cappedIssues.filter(i => !queuedRef.current.has(issId(i)));
    if (!newIssues.length) return;
    newIssues.forEach(i => queuedRef.current.add(issId(i)));
    const updates = {};
    newIssues.forEach(i => { updates[issId(i)] = { _processing: true }; });
    setTriageCache(prev => ({ ...prev, ...updates }));
    queueRef.current.push(...newIssues);
    setTimeout(() => drainQueue(), 0);
  }, [cappedIssues, drainQueue]);

  // ── Sub-question reclassify ───────────────────────────────────────────────
  const handleReclassify = useCallback(async (issue, sqNumber, newCat) => {
    if (!apiKey) return;
    const id  = issId(issue);
    const key = `${id}-${sqNumber}`;
    setReclassing(prev => ({ ...prev, [key]: true }));
    try {
      const sq     = cacheRef.current[id]?.sub_questions?.find(q => q.number === sqNumber);
      const result = await callReclassify(sq?.question || issTitle(issue), newCat, apiKey);
      setTriageCache(prev => {
        const entry = prev[id];
        if (!entry?.sub_questions) return prev;
        return {
          ...prev,
          [id]: {
            ...entry,
            sub_questions: entry.sub_questions.map(q =>
              q.number === sqNumber ? { ...q, ...result, number: sqNumber } : q
            ),
          },
        };
      });
    } catch {
      // silent — leave original classification in place
    } finally {
      setReclassing(prev => { const n = { ...prev }; delete n[key]; return n; });
    }
  }, [apiKey]);

  // ── Re-analyze ────────────────────────────────────────────────────────────
  const handleReanalyze = useCallback(async (issue, files = []) => {
    if (!apiKey) return;
    const id = issId(issue);
    setTriageCache(prev => ({ ...prev, [id]: { _processing: true } }));

    const comments = issComments(issue);
    const commentContext = comments.length > 0
      ? comments.map(c =>
          `${c.AuthorContactName ?? "Unknown"} (${fmtD(c.DateCreated ?? c.dateCreated)}): ${c.Text ?? c.text ?? ""}`
        ).join("\n")
      : "";

    const attachments = [];
    for (const f of files) {
      try {
        const base64 = await readBase64(f);
        attachments.push({ name: f.name, base64, mimeType: f.type });
      } catch { /* skip unreadable files */ }
    }

    try {
      const text = [issTitle(issue), issDesc(issue)].filter(Boolean).join("\n\n");
      const result = await callTriageBot(text, apiKey, attachments, commentContext);
      setTriageCache(prev => ({ ...prev, [id]: { ...result, _analyzedAt: new Date().toISOString() } }));
    } catch (e) {
      setTriageCache(prev => ({ ...prev, [id]: { error: e.message } }));
    }
  }, [apiKey]);

  // ── Filtered + sorted issues ──────────────────────────────────────────────
  const filteredIssues = useMemo(() => {
    let list = cappedIssues;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(i => {
        const summary = triageCache[issId(i)]?.rewritten_summary || issTitle(i);
        return (i._project?.Name || "").toLowerCase().includes(q) || summary.toLowerCase().includes(q);
      });
    }
    return [...list].sort((a, b) => {
      if (sortOrder === "project") {
        return (a._project?.Name || "").localeCompare(b._project?.Name || "");
      }
      const da = issCreated(a) ? new Date(issCreated(a)).getTime() : 0;
      const db = issCreated(b) ? new Date(issCreated(b)).getTime() : 0;
      return sortOrder === "newest" ? db - da : da - db;
    });
  }, [cappedIssues, search, sortOrder, triageCache]);

  // ── Group into decision / review / processing ─────────────────────────────
  const grouped = useMemo(() => {
    const decision = [], review = [], processing = [];
    filteredIssues.forEach(i => {
      const g = issueGroup(issId(i), triageCache);
      if      (g === "decision")   decision.push(i);
      else if (g === "review")     review.push(i);
      else                         processing.push(i);
    });
    return { decision, review, processing };
  }, [filteredIssues, triageCache]);

  const selectedIssue  = cappedIssues.find(i => issId(i) === selectedId) || null;
  const selectedTriage = selectedId ? triageCache[selectedId] : null;

  const toggleCollapse = key => setCollapsed(prev => ({ ...prev, [key]: !prev[key] }));

  const selStyle = active => ({
    fontSize: 11, padding: "4px 10px", borderRadius: 6,
    fontFamily: "inherit", cursor: "pointer",
    background: active ? "rgba(91,141,184,0.14)" : C.surface,
    border: `1px solid ${active ? C.accent + "66" : C.border}`,
    color: active ? "#ffffff" : C.muted,
    appearance: "none",
  });

  // ── Left panel: issue card ────────────────────────────────────────────────
  const renderCard = issue => {
    const id      = issId(issue);
    const triage  = triageCache[id];
    const age     = daysOpen(issCreated(issue));
    const isSel   = selectedId === id;
    const summary = triage?._processing ? "Processing…"
                  : triage?.error       ? "Analysis failed"
                  : triage?.rewritten_summary || issTitle(issue);

    return (
      <div key={id}
        onClick={() => setSelectedId(isSel ? null : id)}
        style={{ padding: "10px 12px", cursor: "pointer",
          background: isSel ? "rgba(91,141,184,0.14)" : "transparent",
          borderLeft: `2px solid ${isSel ? C.accent : "transparent"}`,
          borderBottom: `1px solid ${C.border}`, transition: "background 0.1s" }}
        onMouseEnter={e => { if (!isSel) e.currentTarget.style.background = C.surface2; }}
        onMouseLeave={e => { if (!isSel) e.currentTarget.style.background = "transparent"; }}>

        <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 3 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: C.text, flex: 1,
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {issue._project?.Name || "—"}
          </span>
          <span style={{ fontSize: 10, fontWeight: 600, flexShrink: 0,
            color: ageColor(age), background: ageBg(age), padding: "1px 6px", borderRadius: 10 }}>
            {age}d
          </span>
        </div>

        <p style={{ margin: "0 0 5px", fontSize: 11, color: C.muted,
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          <span style={{ color: C.hint }}>#{issNum(issue)} </span>
          {summary.length > 60 ? summary.slice(0, 60) + "…" : summary}
        </p>

        <TriageBadge triage={triage} />
      </div>
    );
  };

  // ── Group section ─────────────────────────────────────────────────────────
  const renderGroup = (key, icon, label, color, issues) => {
    if (!issues.length) return null;
    const isCol = collapsed[key];
    return (
      <div key={key}>
        <button onClick={() => toggleCollapse(key)}
          style={{ width: "100%", display: "flex", alignItems: "center", gap: 6,
            padding: "7px 12px", background: "none", border: "none",
            borderBottom: `1px solid ${C.border}`, cursor: "pointer",
            fontFamily: "inherit", textAlign: "left" }}>
          <span style={{ fontSize: 12 }}>{icon}</span>
          <span style={{ fontSize: 11, fontWeight: 700, color, flex: 1 }}>{label}</span>
          <span style={{ fontSize: 10, fontWeight: 600, padding: "1px 6px", borderRadius: 10,
            background: color + "22", color }}>{issues.length}</span>
          <span style={{ fontSize: 10, color: C.hint }}>{isCol ? "▶" : "▼"}</span>
        </button>
        {!isCol && issues.map(renderCard)}
      </div>
    );
  };

  // ── Right panel: detail view ──────────────────────────────────────────────
  const renderDetail = () => {
    if (!selectedIssue) {
      return (
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
          flexDirection: "column", gap: 8 }}>
          <p style={{ margin: 0, fontSize: 13, color: C.hint }}>Select an issue to review</p>
        </div>
      );
    }

    const id       = issId(selectedIssue);
    const age      = daysOpen(issCreated(selectedIssue));
    const imp      = issImp(selectedIssue);
    const ics      = impChipStyle(imp);
    const triage   = selectedTriage;
    const sqs      = triage?.sub_questions || [];
    const comments = issComments(selectedIssue);
    const links    = issLinks(selectedIssue);

    const analyzedAt  = triage?._analyzedAt || null;
    const modifiedAt  = issModified(selectedIssue);
    const isStale     = analyzedAt && modifiedAt
      ? new Date(modifiedAt) > new Date(analyzedAt)
      : false;
    const isProcessing = !triage || triage._processing;

    return (
      <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>

        {/* Header */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 10, flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 5 }}>
                <span style={{ fontSize: 11, color: C.hint }}>#{issNum(selectedIssue)}</span>
                {selectedIssue._project && <VertBadge v={selectedIssue._project.vertical} />}
                <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 7px", borderRadius: 20,
                  background: ics.bg, color: ics.color }}>{imp}</span>
                {issCostImp(selectedIssue) && (
                  <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 7px", borderRadius: 20,
                    background: "rgba(251,191,36,0.12)", color: C.warning }}>$ Cost Impact</span>
                )}
                {issSchedImp(selectedIssue) && (
                  <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 7px", borderRadius: 20,
                    background: "rgba(248,113,113,0.12)", color: C.danger }}>⏱ Sched Impact</span>
                )}
              </div>
              <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: C.text, lineHeight: 1.4 }}>
                {selectedIssue._project?.Name}
              </h2>
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6, flexShrink: 0 }}>
              <span style={{ fontSize: 10, color: C.hint }}>
                {fmtD(issCreated(selectedIssue))} · {issSubmitter(selectedIssue)}
              </span>
              <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 10,
                color: ageColor(age), background: ageBg(age) }}>
                {age}d open
              </span>
              <button
                disabled={isProcessing}
                onClick={() => handleReanalyze(selectedIssue, attachedFiles)}
                style={{ fontSize: 11, padding: "4px 12px", borderRadius: 6, fontFamily: "inherit",
                  background: isProcessing ? C.surface2 : "rgba(91,141,184,0.14)",
                  border: `1px solid ${isProcessing ? C.border : C.accent + "55"}`,
                  color: isProcessing ? C.hint : "#ffffff",
                  cursor: isProcessing ? "not-allowed" : "pointer" }}>
                {isProcessing ? "Analyzing…" : "Re-analyze"}
              </button>
            </div>
          </div>

          {/* View Original toggle */}
          <button onClick={() => setShowOriginal(v => !v)}
            style={{ fontSize: 11, padding: "4px 12px", borderRadius: 6, fontFamily: "inherit",
              background: showOriginal ? C.surface2 : "none",
              border: `1px solid ${C.border}`, color: C.hint, cursor: "pointer" }}>
            {showOriginal ? "▲ Hide Original" : "▼ View Original"}
          </button>

          {showOriginal && (
            <div style={{ marginTop: 8, background: C.surface2, border: `1px solid ${C.border}`,
              borderRadius: 8, padding: "12px 14px" }}>
              <p style={{ margin: "0 0 6px", fontSize: 10, fontWeight: 700, letterSpacing: "0.06em",
                textTransform: "uppercase", color: C.hint }}>Raw Issue Text</p>
              <p style={{ margin: 0, fontSize: 12, color: C.muted, lineHeight: 1.65, whiteSpace: "pre-wrap" }}>
                {issDesc(selectedIssue) || issTitle(selectedIssue) || "—"}
              </p>
            </div>
          )}
        </div>

        {/* Triage body */}
        {isProcessing ? (
          <div style={{ padding: "24px 0" }}>
            <Spinner label="Analyzing with KernBot…" />
          </div>
        ) : triage.error ? (
          <div style={{ padding: "16px 0" }}>
            <p style={{ margin: "0 0 10px", fontSize: 12, color: C.danger }}>
              Analysis failed: {triage.error}
            </p>
            <button
              onClick={() => handleReanalyze(selectedIssue, [])}
              style={{ fontSize: 11, padding: "5px 14px", borderRadius: 6, fontFamily: "inherit",
                background: C.surface2, border: `1px solid ${C.border}`,
                color: C.muted, cursor: "pointer" }}>
              Retry
            </button>
          </div>
        ) : (
          <>
            {/* Last analyzed + stale warning */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
              {analyzedAt && (
                <span style={{ fontSize: 10, color: C.hint }}>
                  Last analyzed: {fmtTs(analyzedAt)}
                </span>
              )}
              {isStale && (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 8,
                  background: "rgba(251,191,36,0.1)", border: `1px solid rgba(251,191,36,0.3)`,
                  borderRadius: 6, padding: "3px 10px" }}>
                  <span style={{ fontSize: 11, color: C.warning }}>⚠ Issue updated since last analysis</span>
                  <button
                    onClick={() => handleReanalyze(selectedIssue, attachedFiles)}
                    style={{ fontSize: 11, padding: "2px 10px", borderRadius: 5, fontFamily: "inherit",
                      background: "rgba(251,191,36,0.15)", border: `1px solid rgba(251,191,36,0.4)`,
                      color: C.warning, cursor: "pointer" }}>
                    Re-analyze
                  </button>
                </span>
              )}
            </div>

            {/* Rewritten issue */}
            {triage.rewritten_full && (
              <div style={{ marginBottom: 16, padding: "12px 14px", background: C.surface,
                border: `1px solid ${C.border}`, borderRadius: 8 }}>
                <p style={{ margin: "0 0 6px", fontSize: 10, fontWeight: 700, letterSpacing: "0.06em",
                  textTransform: "uppercase", color: C.hint }}>Rewritten Issue</p>
                <p style={{ margin: 0, fontSize: 12, color: C.text, lineHeight: 1.65, whiteSpace: "pre-wrap" }}>
                  {triage.rewritten_full}
                </p>
              </div>
            )}

            {/* Attachments section */}
            <div style={{ marginBottom: 16, padding: "12px 14px", background: C.surface,
              border: `1px solid ${C.border}`, borderRadius: 8 }}>
              <p style={{ margin: "0 0 8px", fontSize: 10, fontWeight: 700, letterSpacing: "0.06em",
                textTransform: "uppercase", color: C.hint }}>Attachments</p>

              {/* FileLinks from ProjectSight */}
              {links.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 5, marginBottom: 12 }}>
                  {links.map((fl, i) => {
                    const name     = fl.FileName ?? fl.fileName ?? fl.name ?? `File ${i + 1}`;
                    const fileType = (fl.FileType ?? "").toLowerCase();
                    const isPdf    = fileType.includes("pdf") || name.toLowerCase().endsWith(".pdf");
                    return (
                      <div key={i} style={{ display: "flex", alignItems: "center", gap: 8,
                        padding: "5px 8px", background: C.surface2, borderRadius: 6,
                        border: `1px solid ${C.border}` }}>
                        <span style={{ color: isPdf ? C.danger : C.accent, flexShrink: 0, lineHeight: 1 }}>
                          {isPdf ? (
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"
                                stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                              <polyline points="14 2 14 8 20 8" stroke="currentColor" strokeWidth="1.6"
                                strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          ) : (
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                              <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.6"/>
                              <circle cx="8.5" cy="8.5" r="1.5" stroke="currentColor" strokeWidth="1.4"/>
                              <polyline points="21 15 16 10 5 21" stroke="currentColor" strokeWidth="1.6"
                                strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          )}
                        </span>
                        <span style={{ fontSize: 12, color: C.muted, flex: 1,
                          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {name}
                        </span>
                        <span style={{ fontSize: 10, color: C.hint, flexShrink: 0, whiteSpace: "nowrap" }}>
                          Download from ProjectSight to view
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p style={{ margin: "0 0 12px", fontSize: 11, color: C.hint }}>No attachments in ProjectSight.</p>
              )}

              {/* Local file upload for KernBot */}
              <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 10 }}>
                <label style={{ fontSize: 10, color: C.hint, display: "block", marginBottom: 6 }}>
                  Upload attachments for KernBot analysis
                </label>
                <input
                  type="file"
                  multiple
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={e => setAttachedFiles(Array.from(e.target.files || []))}
                  style={{ display: "none" }}
                  id={`file-upload-${id}`}
                />
                <label htmlFor={`file-upload-${id}`}
                  style={{ display: "inline-block", fontSize: 11, padding: "5px 14px", borderRadius: 6,
                    background: C.surface2, border: `1px solid ${C.border}`,
                    color: C.muted, cursor: "pointer" }}>
                  Choose files…
                </label>
                {attachedFiles.length > 0 && (
                  <div style={{ marginTop: 6, display: "flex", flexWrap: "wrap", gap: 4 }}>
                    {attachedFiles.map((f, i) => (
                      <span key={i} style={{ fontSize: 10, padding: "2px 8px", borderRadius: 10,
                        background: "rgba(91,141,184,0.12)", color: C.accent,
                        border: `1px solid ${C.accent}33` }}>
                        {f.name}
                      </span>
                    ))}
                  </div>
                )}
                {attachedFiles.length > 0 && (
                  <button
                    onClick={() => handleReanalyze(selectedIssue, attachedFiles)}
                    style={{ marginTop: 8, display: "block", fontSize: 11, padding: "5px 14px",
                      borderRadius: 6, fontFamily: "inherit",
                      background: "rgba(91,141,184,0.14)", border: `1px solid ${C.accent}55`,
                      color: "#ffffff", cursor: "pointer" }}>
                    Re-analyze with attachments
                  </button>
                )}
              </div>
            </div>

            {/* Sub-questions — keyed by issueId+sqNumber to isolate RFIDraftBlock state */}
            {sqs.length > 0 ? (
              <div>
                <p style={{ margin: "0 0 12px", fontSize: 10, fontWeight: 700, letterSpacing: "0.07em",
                  textTransform: "uppercase", color: C.hint }}>
                  Sub-Questions ({sqs.length})
                </p>
                {sqs.map(sq => (
                  <SubQuestionBlock
                    key={`${id}-${sq.number}`}
                    sq={sq}
                    onReclassify={(sqNum, newCat) => handleReclassify(selectedIssue, sqNum, newCat)}
                    reclassifying={!!reclassing[`${id}-${sq.number}`]}
                  />
                ))}
              </div>
            ) : (
              <p style={{ fontSize: 12, color: C.muted }}>No sub-questions identified.</p>
            )}
          </>
        )}

        {/* Discussion Thread — always shown when issue is selected */}
        <div style={{ marginTop: 20, paddingTop: 16, borderTop: `1px solid ${C.border}` }}>
          <p style={{ margin: "0 0 10px", fontSize: 10, fontWeight: 700, letterSpacing: "0.07em",
            textTransform: "uppercase", color: C.hint }}>
            Discussion Thread
          </p>
          {comments.length === 0 ? (
            <p style={{ margin: 0, fontSize: 12, color: C.hint, fontStyle: "italic" }}>No comments yet.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {comments.map((c, i) => (
                <div key={i} style={{ padding: "10px 12px", background: C.surface2,
                  border: `1px solid ${C.border}`, borderRadius: 7 }}>
                  <p style={{ margin: "0 0 4px", fontSize: 11, fontWeight: 600, color: C.muted }}>
                    {c.AuthorContactName ?? c.authorName ?? "Unknown"}
                    <span style={{ fontWeight: 400, color: C.hint }}> — {fmtD(c.DateCreated ?? c.dateCreated)}</span>
                  </p>
                  <p style={{ margin: 0, fontSize: 12, color: C.text, lineHeight: 1.6 }}>
                    {c.Text ?? c.text ?? c.comment ?? ""}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ marginTop: 24, paddingTop: 14, borderTop: `1px solid ${C.border}`,
          display: "flex", alignItems: "center", justifyContent: "space-between",
          gap: 12, flexWrap: "wrap" }}>
          {selectedIssue._project ? (
            <a href={issueDeepLink(selectedIssue._project, selectedIssue)}
              target="_blank" rel="noopener noreferrer"
              style={{ fontSize: 12, fontWeight: 600, padding: "7px 16px", borderRadius: 7,
                background: "rgba(91,141,184,0.14)", border: `1px solid ${C.accent}44`,
                color: "#ffffff", textDecoration: "none", whiteSpace: "nowrap" }}>
              Open in ProjectSight ↗
            </a>
          ) : <span />}
          <p style={{ margin: 0, fontSize: 11, color: C.hint, fontStyle: "italic" }}>
            Act in ProjectSight — post response or submit RFI there. Issue leaves this module when closed.
          </p>
        </div>
      </div>
    );
  };

  // ── Layout ────────────────────────────────────────────────────────────────
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", background: C.bg,
      overflow: "hidden", fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif" }}>
      <style>{`@keyframes ksf-it-spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>

      {/* Dev mode banner */}
      <div style={{ padding: "6px 20px", flexShrink: 0,
        background: "rgba(251,191,36,0.1)", borderBottom: `1px solid rgba(251,191,36,0.3)`,
        display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: C.warning }}>
          ⚠ Dev mode — showing {DEV_ISSUE_CAP} oldest issues only.
        </span>
      </div>

      {/* Module header */}
      <div style={{ padding: "14px 20px 10px", borderBottom: `1px solid ${C.border}`,
        display: "flex", alignItems: "center", gap: 12, flexShrink: 0, flexWrap: "wrap" }}>
        <div style={{ flex: 1 }}>
          <h1 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: C.text, letterSpacing: "-0.03em" }}>
            Issue Triage
          </h1>
          <p style={{ margin: "2px 0 0", fontSize: 11, color: C.hint }}>
            {loading ? "Loading projects…" : `${filteredIssues.length} open issue${filteredIssues.length !== 1 ? "s" : ""} · KernBot processing`}
          </p>
        </div>
        {loading && <Spinner />}
      </div>

      {/* Two-panel body */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

        {/* Left panel */}
        <div style={{ width: "35%", minWidth: 240, maxWidth: 420, display: "flex",
          flexDirection: "column", borderRight: `1px solid ${C.border}`, overflow: "hidden" }}>

          {/* Toolbar */}
          <div style={{ padding: "10px 12px", borderBottom: `1px solid ${C.border}`,
            flexShrink: 0, display: "flex", flexDirection: "column", gap: 6 }}>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search project or issue…"
              style={{ width: "100%", boxSizing: "border-box", padding: "6px 10px",
                background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 6,
                color: C.text, fontSize: 12, fontFamily: "inherit", outline: "none" }}
            />
            <div style={{ display: "flex", gap: 6 }}>
              <select value={sortOrder} onChange={e => setSortOrder(e.target.value)}
                style={{ ...selStyle(false), flex: 1 }}>
                <option value="oldest">Oldest First</option>
                <option value="newest">Newest First</option>
                <option value="project">Project A–Z</option>
              </select>
              <select value={vertFilter} onChange={e => setVertFilter(e.target.value)}
                style={{ ...selStyle(vertFilter !== "All"), flex: 1 }}>
                <option value="All">All Verticals</option>
                <option value="Structural">Structural</option>
                <option value="Solar">Solar</option>
                <option value="Aero">Aerospace</option>
              </select>
            </div>
          </div>

          {/* Issue groups */}
          <div style={{ flex: 1, overflowY: "auto" }}>
            {loading ? (
              <div style={{ padding: "24px 16px" }}><Spinner label="Loading projects…" /></div>
            ) : filteredIssues.length === 0 ? (
              <div style={{ padding: "40px 16px", textAlign: "center" }}>
                <p style={{ margin: 0, fontSize: 28, color: C.success }}>✓</p>
                <p style={{ margin: "6px 0 0", fontSize: 13, fontWeight: 600, color: C.success }}>
                  Triage queue is clear
                </p>
                <p style={{ margin: "4px 0 0", fontSize: 11, color: C.hint }}>
                  No open issues for your projects.
                </p>
              </div>
            ) : (
              <>
                {renderGroup("decision",   "🔴", "Needs Decision",  C.danger,  grouped.decision)}
                {renderGroup("review",     "🟡", "Pending Review",  C.warning, grouped.review)}
                {renderGroup("processing", "🔵", "Processing",      C.accent,  grouped.processing)}
              </>
            )}
          </div>
        </div>

        {/* Right panel */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          {renderDetail()}
        </div>
      </div>
    </div>
  );
}
