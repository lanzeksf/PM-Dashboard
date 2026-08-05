import React, { useState, useRef, useEffect } from "react";
import { C, MI, URGENCY_OPTS, PROJECT_TYPES } from "../core/utils.jsx";
import { ConfBadge } from "./UI.jsx";
import { AttachDisplay } from "./Files.jsx";

// ── Inline markdown renderer ──────────────────────────────────────────────────
export function RenderMD({ text }) {
  if (!text) return null;
  const lines = text.split("\n"), elements = [];
  let i = 0, keyC = 0;

  const parseInline = str => {
    const parts = [], re = /(\*\*(.+?)\*\*|\*(.+?)\*)/g;
    let last = 0, m;
    while ((m = re.exec(str)) !== null) {
      if (m.index > last) parts.push(str.slice(last, m.index));
      if (m[2]) parts.push(<strong key={keyC++} style={{ fontWeight: 700, color: C.text }}>{m[2]}</strong>);
      else if (m[3]) parts.push(<em key={keyC++} style={{ fontStyle: "italic" }}>{m[3]}</em>);
      last = m.index + m[0].length;
    }
    if (last < str.length) parts.push(str.slice(last));
    return parts.length > 1 ? parts : str;
  };

  while (i < lines.length) {
    const line = lines[i], trimmed = line.trim();
    if (!trimmed) { elements.push(<div key={keyC++} style={{ height: 8 }} />); i++; continue; }

    if (/^[-*]\s/.test(trimmed)) {
      const items = [];
      while (i < lines.length && /^[-*]\s/.test(lines[i].trim())) { items.push(lines[i].trim().replace(/^[-*]\s/, "")); i++; }
      elements.push(
        <ul key={keyC++} style={{ margin: "4px 0", paddingLeft: 16, display: "flex", flexDirection: "column", gap: 3 }}>
          {items.map((it, j) => <li key={j} style={{ listStyle: "disc", lineHeight: 1.65, paddingLeft: 2 }}>{parseInline(it)}</li>)}
        </ul>
      );
      continue;
    }

    if (/^\d+\.\s/.test(trimmed)) {
      const items = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i].trim())) { items.push(lines[i].trim().replace(/^\d+\.\s/, "")); i++; }
      elements.push(
        <ol key={keyC++} style={{ margin: "4px 0", paddingLeft: 18, display: "flex", flexDirection: "column", gap: 3 }}>
          {items.map((it, j) => <li key={j} style={{ lineHeight: 1.65, paddingLeft: 2 }}>{parseInline(it)}</li>)}
        </ol>
      );
      continue;
    }

    elements.push(<p key={keyC++} style={{ margin: 0, lineHeight: 1.75 }}>{parseInline(trimmed)}</p>);
    i++;
  }

  return <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>{elements}</div>;
}

// ── Message bubble ────────────────────────────────────────────────────────────
export function Bubble({ m, isMe, userColor, userInitials, onView, onSourceClick }) {
  const isPM  = m.role === "pm";
  const isBot = m.role === "bot";

  const avBg = isMe ? userColor + "28" : isPM ? "rgba(167,139,250,0.2)" : C.surface2;
  const avC  = isMe ? userColor : isPM ? "#a78bfa" : C.muted;
  const avL  = isMe ? userInitials : isPM ? (m.name?.split(" ").map(w => w[0]).join("").slice(0, 2) || "LC") : "KB";

  const bg = isPM
    ? "rgba(139,92,246,0.13)"
    : isBot && m.confidence != null && m.confidence < 80 ? C.warningDim
    : isMe ? C.surface2 : C.surface;

  const bdr = isPM
    ? "rgba(139,92,246,0.55)"
    : isBot && m.confidence != null && m.confidence < 80 ? "rgba(251,191,36,0.28)"
    : m.unread && isPM ? C.warning : C.border;

  const leftBar = isPM && !m.escalationNotice;

  const renderEscalationText = text => {
    const pmqMatch = text.match(/(PMQ-\d{4}-\d{4})/);
    if (!pmqMatch) return <span style={{ fontWeight: 600 }}>{text}</span>;
    const parts = text.split(pmqMatch[1]);
    return (
      <span style={{ fontWeight: 600 }}>
        {parts[0]}
        <span style={{ textDecoration: "underline", textUnderlineOffset: "2px" }}>{pmqMatch[1]}</span>
        {parts[1]}
      </span>
    );
  };

  return (
    <div style={{ display: "flex", gap: 10, alignItems: "flex-start", flexDirection: isMe ? "row-reverse" : "row" }}>
      <div style={{ width: 30, height: 30, borderRadius: "50%", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", marginTop: 1, background: avBg, border: `1px solid ${avC}44` }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: avC }}>{avL}</span>
      </div>
      <div style={{ maxWidth: "82%", minWidth: 0 }}>
        <div style={{ fontSize: 11, marginBottom: 4, display: "flex", alignItems: "center", gap: 5, flexDirection: isMe ? "row-reverse" : "row" }}>
          <span style={{ color: isPM ? "#a78bfa" : isBot ? C.muted : C.hint, fontWeight: 500 }}>
            {isPM ? (m.name || "Loren C.") : isBot ? "Kern Bot" : "You"}
          </span>
          {m.unread && isPM && (
            <span style={{ fontSize: 9, padding: "1px 6px", borderRadius: 20, background: C.warningDim, color: C.warning, fontWeight: 600 }}>New</span>
          )}
        </div>

        {m.escalationNotice ? (
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "7px 12px", background: "rgba(139,92,246,0.10)", border: "1px solid rgba(139,92,246,0.3)", borderRadius: 8, fontSize: 13, color: "#6d3fd6", lineHeight: 1.5 }}>
            <span style={{ fontSize: 10, fontWeight: 600, padding: "1px 6px", borderRadius: 4, background: "rgba(139,92,246,0.2)", color: "#6d3fd6", letterSpacing: "0.03em" }}>ESCALATED</span>
            {renderEscalationText(m.text)}
          </div>
        ) : (
          <div style={{ background: bg, border: `1px solid ${bdr}`, borderLeft: leftBar ? "3px solid #a78bfa" : `1px solid ${bdr}`, borderRadius: isMe ? "12px 3px 12px 12px" : "3px 12px 12px 12px", padding: "11px 14px", fontSize: 13, color: C.text, lineHeight: 1.75 }}>
            <RenderMD text={m.text} />
            {m.attachments?.length > 0 && <AttachDisplay attachments={m.attachments} onView={onView} />}
            {m.sources?.length > 0 && (
              <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", gap: 5 }}>
                {m.sources.map((s, j) => (
                  <button key={j} onClick={() => onSourceClick && onSourceClick(s)}
                    style={{ display: "inline-flex", alignItems: "center", gap: 5, background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 6, padding: "3px 9px", cursor: "pointer", fontFamily: "inherit", transition: "all 0.12s" }}
                    onMouseEnter={e => { e.currentTarget.style.background = C.accentDim; e.currentTarget.style.borderColor = "rgba(91,141,184,0.3)"; }}
                    onMouseLeave={e => { e.currentTarget.style.background = C.surface2; e.currentTarget.style.borderColor = C.border; }}
                  >
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
                      <path d="M4 19.5A2.5 2.5 0 016.5 17H20" stroke={C.accentText} strokeWidth="1.5" strokeLinecap="round" />
                      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" stroke={C.accentText} strokeWidth="1.5" />
                    </svg>
                    <span style={{ fontSize: 10, color: C.accentText, fontWeight: 500 }}>{s.doc}</span>
                    {s.section && <span style={{ fontSize: 10, color: C.muted }}>{s.section}</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {isBot && m.confidence != null && !m.escalationNotice && (
          <div style={{ marginTop: 5 }}><ConfBadge s={m.confidence} /></div>
        )}
      </div>
    </div>
  );
}

// ── Rename modal ──────────────────────────────────────────────────────────────
export function RenameModal({ current, onSave, onClose }) {
  const [val, setVal] = useState(current);
  const ref = useRef();
  useEffect(() => { ref.current?.focus(); ref.current?.select(); }, []);

  return (
    <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.65)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: 16 }}>
      <div style={{ background: C.surface, border: `1px solid ${C.borderHi}`, borderRadius: 12, width: "100%", maxWidth: 380, padding: "18px 18px 14px", boxShadow: "0 16px 60px rgba(0,0,0,0.65)" }}>
        <p style={{ margin: "0 0 12px", fontWeight: 500, fontSize: 13, color: C.text }}>Rename conversation</p>
        <input ref={ref} value={val} onChange={e => setVal(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && val.trim()) { onSave(val.trim()); onClose(); } if (e.key === "Escape") onClose(); }}
          style={{ width: "100%", padding: "9px 11px", background: C.surface2, border: `1px solid ${C.borderHi}`, borderRadius: 8, color: C.text, fontSize: 13, outline: "none", boxSizing: "border-box", fontFamily: "inherit" }}
        />
        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          <button onClick={onClose} style={{ flex: 1, padding: "8px", fontSize: 12, background: "none", border: `1px solid ${C.border}`, borderRadius: 8, color: C.muted, cursor: "pointer", fontFamily: "inherit" }}>Cancel</button>
          <button onClick={() => { if (val.trim()) { onSave(val.trim()); onClose(); } }} style={{ flex: 2, padding: "8px", fontSize: 12, fontWeight: 500, background: C.accent, border: "none", borderRadius: 8, color: "#fff", cursor: "pointer", fontFamily: "inherit" }}>Save</button>
        </div>
      </div>
    </div>
  );
}

// ── Escalate modal ────────────────────────────────────────────────────────────
export function EscalateModal({ msgs, onSubmit, onClose }) {
  const [ctx, setCtx] = useState("");
  const [proj, setProj] = useState("");
  const [pt,   setPt]   = useState("");
  const [ps,   setPs]   = useState("");
  const [urg,  setUrg]  = useState("Medium");

  const inp = { width: "100%", padding: "8px 10px", background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 7, color: C.text, fontSize: 12, fontFamily: "inherit", boxSizing: "border-box", outline: "none" };
  const lbl = { fontSize: 10, color: C.hint, margin: "0 0 4px", textTransform: "uppercase", letterSpacing: "0.07em" };

  return (
    <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.72)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: 16 }}>
      <div style={{ background: C.surface, border: `1px solid ${C.borderHi}`, borderRadius: 13, width: "100%", maxWidth: 500, maxHeight: "90vh", overflow: "hidden", display: "flex", flexDirection: "column", boxShadow: "0 20px 80px rgba(0,0,0,0.7)" }}>
        <div style={{ padding: "13px 15px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <div>
            <p style={{ margin: 0, fontWeight: 500, fontSize: 14, color: C.text }}>Escalate this thread</p>
            <p style={{ margin: 0, fontSize: 11, color: C.muted }}>Tab through fields · Shift+Enter in context box to submit</p>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: C.muted, fontSize: 18, lineHeight: 1 }}>×</button>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "13px 15px", display: "flex", flexDirection: "column", gap: 11 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 9 }}>
            <div>
              <p style={lbl}>Project number</p>
              <input autoFocus style={inp} value={proj} onChange={e => setProj(e.target.value)} placeholder="e.g. 4521" />
            </div>
            <div>
              <p style={lbl}>Project type</p>
              <select style={{ ...inp, cursor: "pointer" }} value={pt} onChange={e => setPt(e.target.value)}>
                <option value="">Select…</option>
                {PROJECT_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
          </div>

          <div>
            <p style={lbl}>ProjectSight reference</p>
            <input style={inp} value={ps} onChange={e => setPs(e.target.value)} placeholder="RFI-0042, submittal ID…" />
          </div>

          <div>
            <p style={lbl}>Urgency</p>
            <div style={{ display: "flex", gap: 5 }}>
              {URGENCY_OPTS.map((u, idx) => {
                const active = urg === u;
                const cl = u === "High" ? C.danger : u === "Medium" ? C.warning : C.success;
                return (
                  <button key={u} onClick={() => setUrg(u)}
                    onKeyDown={e => {
                      if (e.key === "ArrowRight") { e.preventDefault(); setUrg(URGENCY_OPTS[Math.min(idx + 1, 2)]); }
                      if (e.key === "ArrowLeft")  { e.preventDefault(); setUrg(URGENCY_OPTS[Math.max(idx - 1, 0)]); }
                    }}
                    style={{ flex: 1, padding: "7px", fontSize: 12, borderRadius: 7, border: `1px solid ${active ? cl + "66" : C.border}`, background: active ? cl + "18" : "none", color: active ? cl : C.muted, cursor: "pointer", fontFamily: "inherit", fontWeight: active ? 500 : 400 }}>
                    {u}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <p style={lbl}>Thread preview</p>
            <div tabIndex={-1} style={{ background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 11px", maxHeight: 110, overflowY: "auto", display: "flex", flexDirection: "column", gap: 5 }}>
              {msgs.filter(m => !m.escalationNotice).map((m, i) => (
                <div key={i} style={{ fontSize: 11, lineHeight: 1.6 }}>
                  <span style={{ fontWeight: 500, color: m.role === "user" ? C.accentText : C.pm, marginRight: 5 }}>{m.role === "user" ? "You" : "Kern Bot"}</span>
                  <span style={{ color: C.muted }}>{m.text.slice(0, 85)}{m.text.length > 85 ? "..." : ""}</span>
                  {m.attachments?.length > 0 && <span style={{ marginLeft: 4, fontSize: 10, color: C.hint }}>📎 {m.attachments.length} attachment{m.attachments.length > 1 ? "s" : ""}</span>}
                  {m.confidence != null && <span style={{ marginLeft: 4, fontSize: 9, color: C.hint }}>({m.confidence}%)</span>}
                </div>
              ))}
            </div>
          </div>

          <div>
            <p style={lbl}>Additional context</p>
            <textarea value={ctx} onChange={e => setCtx(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && e.shiftKey) { e.preventDefault(); onSubmit({ ctx, proj, pt, ps, urg }); } }}
              style={{ ...inp, minHeight: 75, resize: "vertical", lineHeight: 1.65 }}
              placeholder="Add anything the thread doesn't cover… (Shift+Enter to submit)"
            />
          </div>
        </div>

        <div style={{ padding: "10px 15px", borderTop: `1px solid ${C.border}`, display: "flex", gap: 8, flexShrink: 0 }}>
          <button onClick={onClose} style={{ flex: 1, padding: "8px", fontSize: 12, background: "none", border: `1px solid ${C.border}`, borderRadius: 8, color: C.muted, cursor: "pointer", fontFamily: "inherit" }}>Cancel</button>
          <button onClick={() => onSubmit({ ctx, proj, pt, ps, urg })} style={{ flex: 2, padding: "8px", fontSize: 13, fontWeight: 500, background: C.accent, border: "none", borderRadius: 8, color: "#fff", cursor: "pointer", fontFamily: "inherit" }}>Send to queue</button>
        </div>
      </div>
    </div>
  );
}
