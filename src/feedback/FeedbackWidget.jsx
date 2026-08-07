import React, { useState, useEffect } from "react";
import { C, F, MI, viewingAsTooltip } from "../core/utils.jsx";
import { AttachTray, useAttachments } from "../components/Files.jsx";

const TYPES = [
  { id: "bug",     label: "Bug",     icon: "bug" },
  { id: "thought", label: "Thought", icon: "thought" },
];

const TYPE_PLACEHOLDER = {
  bug:     "What did you find! Drag & drop or paste (Ctrl+V) a screenshot.",
  thought: "Open to suggestions! Drag & drop or paste (Ctrl+V) a screenshot.",
};

// Floating button, mounted once in Shell.jsx outside the per-module content
// area so it survives tab switches. Reuses the same attach/paste/drag
// pipeline as Kern Bot's chat box (useAttachments/AttachTray in Files.jsx)
// rather than reimplementing it.
export default function FeedbackWidget({ user, isViewingAs, pageContext }) {
  const [open,       setOpen]       = useState(false);
  const [type,       setType]       = useState("bug");
  const [message,    setMessage]    = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted,  setSubmitted]  = useState(false);
  const [error,      setError]      = useState("");
  const [dragOver,   setDragOver]   = useState(false);

  const { attachments, error: attErr, openPicker, handleFiles, removeAt, clear: clearAtt, fileInput } = useAttachments();

  // Paste-to-attach while the composer is open — same "Ctrl+V a screenshot"
  // behavior as Kern Bot's chat box.
  useEffect(() => {
    if (!open) return;
    const onPaste = e => {
      const items = Array.from(e.clipboardData?.items || []).filter(it => it.kind === "file" && it.type.startsWith("image/"));
      if (items.length === 0) return;
      e.preventDefault();
      const files = items.map(it => it.getAsFile()).filter(Boolean);
      if (files.length > 0) handleFiles(files);
    };
    document.addEventListener("paste", onPaste);
    return () => document.removeEventListener("paste", onPaste);
  }, [open, handleFiles]);

  function close() {
    setOpen(false);
    setType("bug"); setMessage(""); clearAtt(); setError(""); setSubmitted(false);
  }

  const onDrop = e => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); };

  async function submit() {
    if (!message.trim() || submitting || isViewingAs) return;
    setSubmitting(true); setError("");
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          type, message: message.trim(), pageContext,
          attachments: attachments.map(a => ({ fileName: a.name, mimeType: a.mimeType, dataBase64: a.dataUrl.split(",")[1] })),
        }),
      });
      if (!res.ok) { const data = await res.json().catch(() => ({})); throw new Error(data.error || "Failed to submit"); }
      setSubmitted(true);
      setTimeout(close, 1400);
    } catch (e) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  const sendDisabled = !message.trim() || submitting || isViewingAs;

  return (
    <>
      {fileInput}
      <button
        onClick={() => setOpen(o => !o)}
        title="Send feedback"
        style={{ position: "fixed", right: 20, bottom: 20, width: 46, height: 46, borderRadius: "50%", background: C.accent, border: "none", color: C.accentText, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 16px rgba(0,0,0,0.25)", zIndex: 300 }}
      >
        {open ? MI.close : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
          </svg>
        )}
      </button>

      {open && (
        <div
          style={{ position: "fixed", right: 20, bottom: 76, width: 320, maxHeight: "70vh", background: C.surface, border: `1px solid ${C.borderHi}`, borderRadius: 12, boxShadow: "0 8px 32px rgba(0,0,0,0.25)", zIndex: 300, display: "flex", flexDirection: "column", overflow: "hidden" }}
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget)) setDragOver(false); }}
          onDrop={onDrop}
        >
          <div style={{ padding: "12px 14px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: C.text, fontFamily: F.head }}>Send feedback</span>
            <button onClick={close} style={{ background: "none", border: "none", color: C.hint, cursor: "pointer", display: "flex" }}>{MI.close}</button>
          </div>

          {submitted ? (
            <div style={{ padding: "24px 16px", textAlign: "center" }}>
              <p style={{ margin: 0, fontSize: 13, color: C.success, fontWeight: 600 }}>Thanks — got it.</p>
            </div>
          ) : (
            <div style={{ padding: 14, display: "flex", flexDirection: "column", gap: 10, overflowY: "auto" }}>
              <div style={{ display: "flex", gap: 6 }}>
                {TYPES.map(t => (
                  <button key={t.id} onClick={() => setType(t.id)}
                    style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 5, padding: "6px 8px", borderRadius: 7, border: `1px solid ${type === t.id ? C.accent : C.border}`, background: type === t.id ? C.accentDim : C.surface, color: type === t.id ? C.accentText : C.muted, fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                    <span style={{ display: "flex" }}>{MI[t.icon]}</span>{t.label}
                  </button>
                ))}
              </div>

              <textarea
                autoFocus
                value={message} onChange={e => setMessage(e.target.value)}
                placeholder={dragOver ? "Drop files to attach…" : TYPE_PLACEHOLDER[type]}
                rows={4}
                style={{ width: "100%", padding: "8px 10px", background: C.surface2, border: `1px solid ${dragOver ? C.accent : C.border}`, borderRadius: 8, color: C.text, fontSize: 12.5, fontFamily: "inherit", resize: "vertical", outline: "none", boxSizing: "border-box" }}
              />

              <AttachTray attachments={attachments} onRemove={removeAt}/>
              {attErr && <p style={{ margin: 0, fontSize: 11, color: C.danger }}>{attErr}</p>}

              <button onClick={openPicker} style={{ display: "flex", alignItems: "center", gap: 5, alignSelf: "flex-start", background: "none", border: "none", color: C.hint, fontSize: 11, cursor: "pointer", padding: 0, fontFamily: "inherit" }}>
                {MI.paperclip} Attach
              </button>

              {error && <p style={{ margin: 0, fontSize: 11, color: C.danger }}>{error}</p>}

              <button
                onClick={submit}
                disabled={sendDisabled}
                title={isViewingAs ? viewingAsTooltip(user.name) : undefined}
                style={{ padding: "8px 12px", borderRadius: 7, border: "none", background: sendDisabled ? C.surface2 : C.accent, color: sendDisabled ? C.hint : C.accentText, fontSize: 12.5, fontWeight: 600, cursor: sendDisabled ? "not-allowed" : "pointer", fontFamily: "inherit" }}
              >
                {submitting ? "Sending…" : "Send"}
              </button>
            </div>
          )}
        </div>
      )}
    </>
  );
}
