import React, { useState, useRef, useEffect } from "react";
import { C, MI } from "../core/utils.jsx";
import { Bubble } from "../components/Chat.jsx";
import { AttachTray, useAttachments } from "../components/Files.jsx";
import { Viewer } from "../components/Files.jsx";
import { SourcePanel } from "../components/UI.jsx";

const QUICK_PROMPTS = [
  'Minimum edge distance — A325 bolts in 3/8" plate',
  "Anchor rod hole size for 1-1/4\" rod",
  "A572 Gr.50 sub for A36 without EOR approval?",
  "CJP weld inspection requirements — AWS D1.1",
];

export function ChatPane({ chat, user, isAdmin, onEscalate, onResolve, onUnresolve, onSend, onSendReply, onMarkRead }) {
  const msgs        = chat?.msgs || [];
  const hasBot      = msgs.some(m => m.role === "bot" && !m.escalationNotice);
  const isResolved  = chat?.resolved;
  const isEscalated = chat?.escalated;

  const [input,       setInput]       = useState("");
  const [loading,     setLoading]     = useState(false);
  const [viewerFile,  setViewerFile]  = useState(null);
  const [dragOver,    setDragOver]    = useState(false);
  const [activeSource, setActiveSource] = useState(null);

  const bottomRef = useRef();
  const taRef     = useRef();
  const { attachments, error: attErr, openPicker, handleFiles, removeAt, clear: clearAtt, fileInput } = useAttachments();

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs, loading, chat?.id]);
  useEffect(() => { setInput(""); setLoading(false); clearAtt(); }, [chat?.id]);
  useEffect(() => { if (chat?.unread) onMarkRead(chat.id); }, [chat?.id, chat?.unread]);
  useEffect(() => {
    if (taRef.current) {
      taRef.current.style.height = "auto";
      taRef.current.style.height = Math.min(taRef.current.scrollHeight, 130) + "px";
    }
  }, [input]);
  useEffect(() => { setTimeout(() => taRef.current?.focus(), 50); }, [chat?.id]);

  const handlePaste = e => {
    const cd = e.clipboardData;
    if (!cd) return;
    if (cd.files?.length > 0) {
      const imgs = Array.from(cd.files).filter(f => f.type.startsWith("image/"));
      if (imgs.length > 0) { e.preventDefault(); handleFiles(imgs); return; }
    }
    const items = Array.from(cd.items || []).filter(it => it.kind === "file" && it.type.startsWith("image/"));
    if (items.length > 0) {
      e.preventDefault();
      const files = items.map(it => it.getAsFile()).filter(Boolean);
      if (files.length > 0) handleFiles(files);
    }
  };

  const send = async () => {
    if ((!input.trim() && !attachments.length) || loading) return;
    const t = input.trim(), att = [...attachments];
    setInput(""); clearAtt(); setLoading(true);
    await onSend(t, att);
    setLoading(false);
  };

  const reply = () => {
    if (!input.trim() && !attachments.length) return;
    const att = [...attachments]; clearAtt();
    onSendReply(chat.id, input.trim(), att);
    setInput("");
  };

  const onDrop = e => { e.preventDefault(); handleFiles(e.dataTransfer.files); };

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", background: C.bg, position: "relative" }}>
      {fileInput}
      {viewerFile   && <Viewer file={viewerFile} onClose={() => setViewerFile(null)} />}
      {activeSource && <SourcePanel source={activeSource} onClose={() => setActiveSource(null)} />}

      {/* Header */}
      <div style={{ padding: "11px 16px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
        <div>
          <p style={{ margin: 0, fontWeight: 600, fontSize: 14, color: C.text }}>{chat?.title || "New conversation"}</p>
          <p style={{ margin: 0, fontSize: 11, color: C.hint }}>AISC · CoSP · AWS D1.1 · KSF Standards — Kern Bot</p>
        </div>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          {isEscalated && !isResolved && (
            <span style={{ fontSize: 11, padding: "2px 9px", borderRadius: 20, background: C.pmDim, color: C.pm, fontFamily: "monospace" }}>{chat.pmqId}</span>
          )}
          {isResolved && (
            <span style={{ fontSize: 11, padding: "2px 9px", borderRadius: 20, background: C.successDim, color: C.success }}>Resolved</span>
          )}
        </div>
      </div>

      {/* Message list */}
      <div style={{ flex: 1, overflowY: "auto", padding: "14px 0" }}>
        <div style={{ maxWidth: 640, margin: "0 auto", padding: "0 14px", display: "flex", flexDirection: "column", gap: 14 }}>
          {msgs.length === 0 && (
            <div style={{ textAlign: "center", padding: "44px 20px" }}>
              <div style={{ width: 36, height: 36, borderRadius: 8, background: "#1e2340", border: `1px solid rgba(255,255,255,0.1)`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px" }}>
                <span style={{ color: "#fff", fontWeight: 700, fontSize: 11 }}>KB</span>
              </div>
              <p style={{ fontSize: 14, fontWeight: 500, color: C.text, margin: "0 0 6px" }}>Ask Kern Bot anything</p>
              <p style={{ fontSize: 12, color: C.muted, margin: "0 0 18px", lineHeight: 1.7 }}>
                Code questions, material specs, tolerances, procedures.<br />
                Attach drawings, photos, or PDFs for context. Escalate if the answer isn't sufficient.
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 7, justifyContent: "center" }}>
                {QUICK_PROMPTS.map((q, i) => (
                  <button key={i} onClick={() => setInput(q)}
                    style={{ background: C.surface, border: `1px solid ${C.border}`, color: C.muted, borderRadius: 20, padding: "4px 12px", fontSize: 11, cursor: "pointer", fontFamily: "inherit", transition: "border-color 0.15s" }}
                    onMouseEnter={e => e.target.style.borderColor = C.accent}
                    onMouseLeave={e => e.target.style.borderColor = C.border}
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {msgs.map((m, idx) => {
            const isMe   = m.role === "user";
            const isLast = idx === msgs.length - 1;
            return (
              <div key={m.id}>
                <Bubble m={m} isMe={isMe} userColor={user.color} userInitials={user.initials} onView={setViewerFile} onSourceClick={setActiveSource} />
                {!isAdmin && m.role === "bot" && m.confidence != null && !m.escalationNotice && isLast && !isEscalated && !isResolved && (
                  <div style={{ paddingLeft: 40, marginTop: 7, display: "flex", gap: 9, alignItems: "center" }}>
                    {m.confidence < 80 && <span style={{ fontSize: 11, color: C.warning }}>⚠ Confidence below 80%</span>}
                    <button onClick={onEscalate} style={{ fontSize: 11, padding: "3px 11px", borderRadius: 20, background: C.pmDim, border: `1px solid rgba(177,151,252,0.3)`, color: C.pm, cursor: "pointer", fontFamily: "inherit" }}>
                      Escalate →
                    </button>
                  </div>
                )}
              </div>
            );
          })}

          {loading && (
            <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
              <div style={{ width: 30, height: 30, borderRadius: "50%", background: C.accentDim, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <span style={{ fontSize: 10, color: C.accent, fontWeight: 700 }}>KB</span>
              </div>
              <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: "3px 12px 12px 12px", padding: "11px 14px", display: "flex", alignItems: "center", gap: 6 }}>
                {[0, 1, 2].map(i => (
                  <div key={i} style={{ width: 5, height: 5, borderRadius: "50%", background: C.accent, animation: `kbdot 1.2s ease-in-out ${i * 0.2}s infinite` }} />
                ))}
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* Input area */}
      {!isResolved && (
        <div
          style={{ padding: "9px 14px 12px", borderTop: `1px solid ${C.border}`, flexShrink: 0, background: C.bg }}
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget)) setDragOver(false); }}
          onDrop={e => { e.preventDefault(); setDragOver(false); onDrop(e); }}
        >
          <div style={{ maxWidth: 640, margin: "0 auto" }}>
            {attErr && <p style={{ fontSize: 11, color: C.danger, margin: "0 0 5px" }}>{attErr}</p>}
            <div style={{ background: C.surface, border: `1px solid ${dragOver ? "rgba(91,141,184,0.6)" : isEscalated ? "rgba(167,139,250,0.32)" : C.borderHi}`, borderRadius: 10, overflow: "hidden", transition: "border-color 0.15s", boxShadow: dragOver ? "0 0 0 3px rgba(91,141,184,0.12)" : "none" }}>
              <AttachTray attachments={attachments} onRemove={removeAt} />
              <textarea
                ref={taRef} value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); isEscalated ? reply() : send(); } }}
                onPaste={handlePaste}
                placeholder={
                  attachments.length > 0 ? "Add a message (optional) or press Enter to send…" :
                  isEscalated ? "Reply to the thread — Loren will see this…" :
                  msgs.length === 0 ? "Ask anything — or paste / attach drawings, photos, PDFs…" :
                  "Follow up or attach files…"
                }
                disabled={loading} rows={1}
                style={{ width: "100%", background: "none", border: "none", outline: "none", color: C.text, fontSize: 13, fontFamily: "inherit", resize: "none", lineHeight: 1.6, padding: "10px 12px", boxSizing: "border-box", display: "block", minHeight: 40, maxHeight: 130, overflowY: "auto" }}
              />
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "4px 8px 7px", borderTop: `1px solid ${C.border}` }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <button
                    onClick={openPicker} title="Attach files — images, PDFs, drawings, docs"
                    style={{ background: "none", border: "1px solid transparent", cursor: "pointer", color: C.hint, padding: "4px 5px", display: "flex", borderRadius: 6, transition: "all 0.15s", alignItems: "center" }}
                    onMouseEnter={e => { e.currentTarget.style.color = C.accent; e.currentTarget.style.background = "rgba(91,141,184,0.12)"; e.currentTarget.style.borderColor = "rgba(91,141,184,0.3)"; }}
                    onMouseLeave={e => { e.currentTarget.style.color = C.hint; e.currentTarget.style.background = "none"; e.currentTarget.style.borderColor = "transparent"; }}
                  >
                    <span style={{ display: "flex", alignItems: "center" }}>{MI.paperclip}</span>
                  </button>
                  <span style={{ fontSize: 10, color: isEscalated ? C.pm : C.hint }}>
                    {dragOver ? "Drop files to attach…" : isEscalated ? "Thread open — reply or mark resolved" : "Shift+Enter for new line · drag & drop files"}
                  </span>
                </div>
                <button
                  onClick={isEscalated ? reply : send}
                  disabled={loading || (!input.trim() && !attachments.length)}
                  style={{ width: 27, height: 27, borderRadius: 7, background: (!loading && (input.trim() || attachments.length)) ? (isEscalated ? "rgba(167,139,250,0.55)" : C.accent) : "rgba(255,255,255,0.05)", border: "none", cursor: (!loading && (input.trim() || attachments.length)) ? "pointer" : "not-allowed", display: "flex", alignItems: "center", justifyContent: "center" }}
                >
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none"><path d="M22 2L11 13M22 2L15 22 11 13 2 9l20-7z" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </button>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 5 }}>
              {!isAdmin && !isEscalated && hasBot
                ? <p style={{ fontSize: 10, color: C.hint, margin: 0 }}>
                    Not satisfied?&nbsp;
                    <button onClick={onEscalate} style={{ background: "none", border: "none", cursor: "pointer", color: C.pm, fontSize: 10, padding: 0, fontFamily: "inherit" }}>Escalate →</button>
                  </p>
                : <span />}
              {!isAdmin && isEscalated && (
                <button onClick={onResolve} style={{ fontSize: 10, padding: "3px 10px", borderRadius: 20, background: C.successDim, border: `1px solid rgba(34,197,94,0.3)`, color: C.success, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 3 }}>
                  <svg width="8" height="8" viewBox="0 0 24 24" fill="none"><path d="M5 13l4 4L19 7" stroke={C.success} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  Mark resolved
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {isResolved && (
        <div style={{ padding: "9px 14px", borderTop: `1px solid ${C.border}`, background: C.bg, flexShrink: 0, textAlign: "center" }}>
          <p style={{ fontSize: 11, color: C.muted, margin: 0 }}>
            Resolved — logged to knowledge base.&nbsp;
            <button onClick={onUnresolve} style={{ background: "none", border: "none", cursor: "pointer", color: C.hint, fontSize: 11, padding: 0, fontFamily: "inherit", textDecoration: "underline" }}>Unresolve</button>
          </p>
        </div>
      )}

      <style>{`@keyframes kbdot{0%,80%,100%{opacity:.2;transform:scale(.75)}40%{opacity:1;transform:scale(1)}}`}</style>
    </div>
  );
}
