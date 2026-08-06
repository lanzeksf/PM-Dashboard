import React, { useState, useRef, useEffect } from "react";
import { C, MI, fmtDate, viewingAsTooltip } from "../core/utils.jsx";
import { UrgBadge } from "../components/UI.jsx";
import { Bubble } from "../components/Chat.jsx";
import { AttachTray, useAttachments } from "../components/Files.jsx";
import { Viewer } from "../components/Files.jsx";
import { store } from "../core/store.js";

export function QueueDetail({ item, user, isViewingAs = false, onSend, onResolve, onUnresolve }) {
  const viewingAsTitle = isViewingAs ? viewingAsTooltip(user.name) : undefined;
  const [input,    setInput]    = useState("");
  const [viewerFile, setViewerFile] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [editing,  setEditing]  = useState(false);
  const [editVals, setEditVals] = useState({});

  const bottomRef = useRef();
  const taRef     = useRef();
  const { attachments, error: attErr, openPicker, handleFiles, removeAt, clear: clearAtt, fileInput } = useAttachments();

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [item?.thread]);
  useEffect(() => { setInput(""); clearAtt(); setEditing(false); }, [item?.id]);
  useEffect(() => {
    if (taRef.current) {
      taRef.current.style.height = "auto";
      taRef.current.style.height = Math.min(taRef.current.scrollHeight, 120) + "px";
    }
  }, [input]);

  if (!item) return (
    <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", background: C.bg }}>
      <p style={{ fontSize: 13, color: C.hint }}>Select a thread from the queue.</p>
    </div>
  );

  const startEdit  = () => { setEditVals({ urgency: item.urgency, project: item.project || "", projectType: item.projectType || "", psRef: item.psRef || "", additionalContext: item.additionalContext || "" }); setEditing(true); };
  const saveEdit   = () => { store.updateQueue(item.id, { urgency: editVals.urgency, project: editVals.project, projectType: editVals.projectType, psRef: editVals.psRef, additionalContext: editVals.additionalContext }); setEditing(false); };
  const cancelEdit = () => setEditing(false);

  const doSend = () => {
    if (!input.trim() && !attachments.length) return;
    onSend(item.id, input.trim(), user.name, attachments);
    setInput(""); clearAtt();
  };

  const onDrop = e => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); };

  const fieldInp = { width: "100%", padding: "6px 9px", background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 6, color: C.text, fontSize: 12, fontFamily: "inherit", boxSizing: "border-box", outline: "none" };
  const fieldLbl = { fontSize: 9, color: C.hint, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 3, display: "block" };

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", background: C.bg }}>
      {fileInput}
      {viewerFile && <Viewer file={viewerFile} onClose={() => setViewerFile(null)} />}

      {/* Header */}
      <div style={{ padding: "13px 16px 11px", borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
        {/* Top row */}
        <div style={{ display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap", marginBottom: 10 }}>
          <span style={{ fontFamily: "monospace", fontSize: 12, color: C.accentText, fontWeight: 500 }}>{item.pmqId}</span>
          {editing ? (
            <div style={{ display: "flex", gap: 4 }}>
              {["Low", "Medium", "High"].map(u => {
                const a  = editVals.urgency === u;
                const cl = u === "High" ? C.danger : u === "Medium" ? C.warning : C.success;
                return (
                  <button key={u} onClick={() => setEditVals(v => ({ ...v, urgency: u }))}
                    style={{ fontSize: 10, fontWeight: 500, padding: "2px 9px", borderRadius: 20, background: a ? cl + "22" : C.surface2, color: a ? cl : C.hint, border: `1px solid ${a ? cl + "55" : C.border}`, cursor: "pointer", fontFamily: "inherit" }}>
                    {u}
                  </button>
                );
              })}
            </div>
          ) : <UrgBadge u={item.urgency} />}
          <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 20, background: item.resolved ? C.successDim : C.dangerDim, color: item.resolved ? C.success : C.danger, fontWeight: 500 }}>
            {item.resolved ? "Resolved" : "Open"}
          </span>
          <span style={{ fontSize: 10, color: C.hint, marginLeft: "auto" }}>{fmtDate(item.createdAt)}</span>
          {!editing ? (
            <button onClick={startEdit} disabled={isViewingAs} title={viewingAsTitle}
              style={{ width: 26, height: 26, borderRadius: 6, background: "none", border: `1px solid ${C.border}`, cursor: isViewingAs ? "not-allowed" : "pointer", color: C.hint, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all 0.15s", opacity: isViewingAs ? 0.5 : 1 }}
              onMouseEnter={e => { e.currentTarget.style.background = C.accentDim; e.currentTarget.style.borderColor = "rgba(91,141,184,0.35)"; e.currentTarget.style.color = C.accentText; }}
              onMouseLeave={e => { e.currentTarget.style.background = "none"; e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.hint; }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
            </button>
          ) : (
            <div style={{ display: "flex", gap: 5, marginLeft: "auto" }}>
              <button onClick={cancelEdit} style={{ fontSize: 11, padding: "3px 10px", borderRadius: 6, background: "none", border: `1px solid ${C.border}`, color: C.muted, cursor: "pointer", fontFamily: "inherit" }}>Cancel</button>
              <button onClick={saveEdit}   style={{ fontSize: 11, padding: "3px 10px", borderRadius: 6, background: C.accent, border: "none", color: "#fff", cursor: "pointer", fontFamily: "inherit", fontWeight: 500 }}>Save</button>
            </div>
          )}
        </div>

        {/* Metadata */}
        {!editing ? (
          <div style={{ display: "flex", gap: "20px 32px", flexWrap: "wrap", alignItems: "flex-start", justifyContent: "center", padding: "4px 0" }}>
            {[
              { lbl: "From",   val: item.from,        sub: item.fromPos },
              item.project     && { lbl: "Job #",    val: `#${item.project}` },
              item.projectType && { lbl: "Type",     val: item.projectType },
              item.psRef       && { lbl: "PS Ref",   val: item.psRef, accent: true },
            ].filter(Boolean).map((f, i) => (
              <div key={i} style={{ display: "flex", flexDirection: "column", gap: 2, alignItems: "center", textAlign: "center" }}>
                <span style={{ fontSize: 9, color: C.hint, textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600 }}>{f.lbl}</span>
                <span style={{ fontSize: 13, color: f.accent ? C.accentText : C.text, fontWeight: 600 }}>{f.val}</span>
                {f.sub && <span style={{ fontSize: 11, color: C.muted }}>{f.sub}</span>}
              </div>
            ))}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 9 }}>
              <div>
                <span style={fieldLbl}>Job number</span>
                <input style={fieldInp} value={editVals.project} onChange={e => setEditVals(v => ({ ...v, project: e.target.value }))} placeholder="e.g. 4521" />
              </div>
              <div>
                <span style={fieldLbl}>Project type</span>
                <select style={{ ...fieldInp, cursor: "pointer" }} value={editVals.projectType} onChange={e => setEditVals(v => ({ ...v, projectType: e.target.value }))}>
                  <option value="">Select…</option>
                  {["Aero", "Solar", "Structural", "General question"].map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <span style={fieldLbl}>ProjectSight ref</span>
                <input style={fieldInp} value={editVals.psRef} onChange={e => setEditVals(v => ({ ...v, psRef: e.target.value }))} placeholder="RFI-0042, submittal ID…" />
              </div>
            </div>
            <div>
              <span style={fieldLbl}>Additional context</span>
              <textarea value={editVals.additionalContext} onChange={e => setEditVals(v => ({ ...v, additionalContext: e.target.value }))}
                style={{ ...fieldInp, minHeight: 60, resize: "vertical", lineHeight: 1.6 }} placeholder="Add context for Loren…" />
            </div>
          </div>
        )}
      </div>

      {/* Thread */}
      <div style={{ flex: 1, overflowY: "auto", padding: "14px 16px" }}>
        <div style={{ maxWidth: 640, margin: "0 auto", display: "flex", flexDirection: "column", gap: 12 }}>
          {item.additionalContext && (
            <div style={{ background: C.accentDim, border: `1px solid rgba(91,141,184,0.2)`, borderRadius: 9, padding: "10px 13px" }}>
              <p style={{ fontSize: 10, color: C.accentText, margin: "0 0 4px", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.06em" }}>Additional context</p>
              <p style={{ fontSize: 13, color: C.text, margin: 0, lineHeight: 1.7 }}>{item.additionalContext}</p>
            </div>
          )}
          {item.thread.map((m, i) => (
            <Bubble key={m.id || i} m={m} isMe={m.role === "pm" && user.canRespond} userColor={user.color} userInitials={user.initials} onView={setViewerFile} />
          ))}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* Reply area (admin only, unresolved) */}
      {!item.resolved && user.canRespond && (
        <div
          style={{ padding: "10px 16px 13px", borderTop: `1px solid ${C.border}`, flexShrink: 0, background: C.bg }}
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget)) setDragOver(false); }}
          onDrop={onDrop}
        >
          <div style={{ maxWidth: 640, margin: "0 auto" }}>
            {attErr && <p style={{ fontSize: 11, color: C.danger, margin: "0 0 5px" }}>{attErr}</p>}
            <div style={{ background: C.surface, border: `1px solid ${dragOver ? "rgba(91,141,184,0.6)" : C.borderHi}`, borderRadius: 10, overflow: "hidden", marginBottom: 8, transition: "border-color 0.15s", boxShadow: dragOver ? "0 0 0 3px rgba(91,141,184,0.12)" : "none" }}>
              <AttachTray attachments={attachments} onRemove={removeAt} />
              <textarea
                ref={taRef} value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey && (input.trim() || attachments.length)) { e.preventDefault(); doSend(); } }}
                placeholder={dragOver ? "Drop files to attach…" : attachments.length ? "Add a message (optional) or press Enter to send…" : "Reply to this thread — Loren will see it as new…"}
                rows={1}
                style={{ width: "100%", background: "none", border: "none", outline: "none", color: C.text, fontSize: 13, fontFamily: "inherit", resize: "none", lineHeight: 1.6, padding: "10px 12px", boxSizing: "border-box", display: "block", minHeight: 44, maxHeight: 120, overflowY: "auto" }}
              />
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "4px 8px 7px", borderTop: `1px solid ${C.border}` }}>
                <button onClick={openPicker}
                  style={{ background: "none", border: "1px solid transparent", cursor: "pointer", color: C.hint, padding: "4px 5px", display: "flex", borderRadius: 6, transition: "all 0.15s", alignItems: "center" }}
                  onMouseEnter={e => { e.currentTarget.style.color = C.accent; e.currentTarget.style.background = "rgba(91,141,184,0.12)"; e.currentTarget.style.borderColor = "rgba(91,141,184,0.3)"; }}
                  onMouseLeave={e => { e.currentTarget.style.color = C.hint; e.currentTarget.style.background = "none"; e.currentTarget.style.borderColor = "transparent"; }}
                >
                  <span style={{ display: "flex", alignItems: "center" }}>{MI.paperclip}</span>
                </button>
                <button onClick={doSend} disabled={isViewingAs || (!input.trim() && !attachments.length)} title={viewingAsTitle}
                  style={{ width: 27, height: 27, borderRadius: 7, background: (!isViewingAs && (input.trim() || attachments.length)) ? C.accent : C.surface2, border: "none", cursor: (!isViewingAs && (input.trim() || attachments.length)) ? "pointer" : "not-allowed", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none"><path d="M22 2L11 13M22 2L15 22 11 13 2 9l20-7z" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </button>
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button onClick={() => onResolve(item.id)} disabled={isViewingAs} title={viewingAsTitle} style={{ fontSize: 11, padding: "5px 14px", borderRadius: 20, background: C.successDim, border: `1px solid rgba(34,197,94,0.3)`, color: C.success, cursor: isViewingAs ? "not-allowed" : "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 4, opacity: isViewingAs ? 0.5 : 1 }}>
                <svg width="9" height="9" viewBox="0 0 24 24" fill="none"><path d="M5 13l4 4L19 7" stroke={C.success} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                Mark resolved
              </button>
            </div>
          </div>
        </div>
      )}

      {item.resolved && (
        <div style={{ padding: "10px 16px", borderTop: `1px solid ${C.border}`, background: C.bg, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
          <p style={{ fontSize: 11, color: C.muted, margin: 0 }}>Resolved · logged to knowledge base.</p>
          <button onClick={() => onUnresolve(item.id)} disabled={isViewingAs} title={viewingAsTitle} style={{ fontSize: 11, padding: "3px 10px", borderRadius: 20, background: C.warningDim, border: `1px solid rgba(245,158,11,0.3)`, color: C.warning, cursor: isViewingAs ? "not-allowed" : "pointer", fontFamily: "inherit", opacity: isViewingAs ? 0.5 : 1 }}>Unresolve</button>
        </div>
      )}

      {!item.resolved && !user.canRespond && (
        <div style={{ padding: "9px 16px", borderTop: `1px solid ${C.border}`, background: C.bg, flexShrink: 0, textAlign: "center" }}>
          <p style={{ fontSize: 11, color: C.hint, margin: 0 }}>Only the Senior PM can respond to queue items.</p>
        </div>
      )}
    </div>
  );
}
