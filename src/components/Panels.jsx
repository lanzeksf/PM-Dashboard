import React, { useState } from "react";
import { C, MI, VERTICALS, fmtRel } from "../core/utils.js";
import { VerBadge, UrgBadge, CtxMenu } from "./UI.jsx";
import { store, useStore } from "../core/store.js";

// ── Chat sidebar row ──────────────────────────────────────────────────────────
export function ChatRow({ c, active, isAdmin, onSelect, onRename, onEscalate, onResolve, onUnresolve, onDelete }) {
  const [menuOpen, setMenuOpen] = useState(false);

  const showUnread = !isAdmin && c.unread && !c.resolved;
  const dotColor   = showUnread ? C.warning : c.resolved ? C.success : c.escalated ? C.pm : null;

  const items = [{ icon: "rename", label: "Rename", fn: () => onRename(c.id) }];
  if (!isAdmin && !c.escalated && !c.resolved && c.msgs?.some(m => m.role === "bot" && !m.escalationNotice))
    items.push({ icon: "escalate", label: "Escalate", fn: () => onEscalate(c.id) });
  if (!isAdmin && c.escalated && !c.resolved)
    items.push({ icon: "resolve", label: "Mark resolved", fn: () => onResolve(c.id) });
  if (c.resolved)
    items.push({ icon: "unresolve", label: "Unresolve", fn: () => onUnresolve(c.id) });
  items.push("---", { icon: "delete", danger: true, label: "Delete", fn: () => onDelete(c.id) });

  return (
    <div style={{ position: "relative", marginBottom: 1 }}>
      <div onClick={() => onSelect(c.id)}
        style={{ display: "flex", alignItems: "center", borderRadius: 6, cursor: "pointer", background: active ? "rgba(79,110,247,0.11)" : "none", border: `1px solid ${active ? "rgba(79,110,247,0.28)" : "transparent"}`, padding: "4px 4px 4px 6px", transition: "background 0.1s" }}
        onMouseEnter={e => { if (!active) e.currentTarget.style.background = "rgba(255,255,255,0.04)"; }}
        onMouseLeave={e => { if (!active) e.currentTarget.style.background = "none"; }}
      >
        <div style={{ width: 6, height: 6, borderRadius: "50%", flexShrink: 0, marginRight: 5, background: dotColor || "transparent", border: dotColor && !showUnread ? `1.5px solid ${dotColor}` : "none" }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <span style={{ fontSize: 14, color: active ? C.text : c.resolved ? C.hint : C.muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "block", lineHeight: 1.35, opacity: c.resolved ? 0.65 : 1 }}>
            {c.title}
          </span>
          {!c.resolved && (
            <span style={{ fontSize: 12, color: C.hint, display: "block", marginTop: 1 }}>{fmtRel(c.lastActivity || c.createdAt)}</span>
          )}
        </div>
        <button onClick={e => { e.stopPropagation(); setMenuOpen(o => !o); }}
          style={{ background: "none", border: "none", cursor: "pointer", color: C.hint, padding: "2px 4px", borderRadius: 4, display: "flex", alignItems: "center", flexShrink: 0, opacity: menuOpen ? 1 : 0.4, transition: "opacity 0.1s" }}
          onMouseEnter={e => e.currentTarget.style.opacity = "1"}
          onMouseLeave={e => e.currentTarget.style.opacity = menuOpen ? "1" : "0.4"}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="19" cy="12" r="1.5" /></svg>
        </button>
      </div>
      {menuOpen && <CtxMenu items={items} onClose={() => setMenuOpen(false)} style={{ right: 0, top: "calc(100% + 2px)" }} />}
    </div>
  );
}

// ── Queue sidebar row ─────────────────────────────────────────────────────────
export function QueueRow({ q, active, onSelect, onRename, onResolve, onUnresolve, onRemove }) {
  const [menuOpen, setMenuOpen] = useState(false);

  const dotColor = q.resolved ? C.success : C.danger;
  const items = [
    { icon: "rename", label: "Rename", fn: () => onRename(q.id) },
    q.resolved
      ? { icon: "unresolve", label: "Unresolve",      fn: () => onUnresolve(q.id) }
      : { icon: "resolve",   label: "Mark resolved",  fn: () => onResolve(q.id) },
    "---",
    { icon: "remove", danger: true, label: "Remove", fn: () => onRemove(q.id) },
  ];

  return (
    <div style={{ position: "relative", marginBottom: 1 }}>
      <div onClick={() => onSelect(q.id)}
        style={{ display: "flex", alignItems: "center", borderRadius: 6, cursor: "pointer", background: active ? "rgba(167,139,250,0.1)" : "none", border: `1px solid ${active ? "rgba(167,139,250,0.28)" : "transparent"}`, padding: "4px 4px 4px 6px", transition: "background 0.1s" }}
        onMouseEnter={e => { if (!active) e.currentTarget.style.background = "rgba(255,255,255,0.04)"; }}
        onMouseLeave={e => { if (!active) e.currentTarget.style.background = "none"; }}
      >
        <div style={{ width: 6, height: 6, borderRadius: "50%", flexShrink: 0, marginRight: 5, background: dotColor }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <span style={{ fontSize: 14, color: active ? C.text : q.resolved ? C.hint : C.muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "block", lineHeight: 1.35, opacity: q.resolved ? 0.65 : 1 }}>
            {q.title}
          </span>
          <span style={{ fontSize: 12, color: C.hint, display: "block", marginTop: 1, fontFamily: "monospace" }}>
            {q.pmqId}{!q.resolved && ` · ${fmtRel(q.createdAt)}`}
          </span>
        </div>
        <button onClick={e => { e.stopPropagation(); setMenuOpen(o => !o); }}
          style={{ background: "none", border: "none", cursor: "pointer", color: C.hint, padding: "2px 4px", borderRadius: 4, display: "flex", alignItems: "center", flexShrink: 0, opacity: menuOpen ? 1 : 0.4, transition: "opacity 0.1s" }}
          onMouseEnter={e => e.currentTarget.style.opacity = "1"}
          onMouseLeave={e => e.currentTarget.style.opacity = menuOpen ? "1" : "0.4"}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="19" cy="12" r="1.5" /></svg>
        </button>
      </div>
      {menuOpen && <CtxMenu items={items} onClose={() => setMenuOpen(false)} style={{ right: 0, top: "calc(100% + 2px)" }} />}
    </div>
  );
}

// ── Standards editor ──────────────────────────────────────────────────────────
function StdEditor({ std, onSave, onCancel, isNew }) {
  const [title, setTitle] = useState(std?.title || "");
  const [vert,  setVert]  = useState(std?.vertical || "All");
  const [body,  setBody]  = useState(std?.body || "");

  const inp   = { width: "100%", padding: "8px 10px", background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 7, color: C.text, fontSize: 13, fontFamily: "inherit", boxSizing: "border-box", outline: "none" };
  const ready = title.trim() && body.trim();

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div style={{ padding: "10px 14px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
        <p style={{ margin: 0, fontWeight: 500, fontSize: 13, color: C.text }}>{isNew ? "New standard" : "Edit standard"}</p>
        <button onClick={onCancel} style={{ background: "none", border: "none", cursor: "pointer", color: C.muted, fontSize: 17 }}>×</button>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: "14px", display: "flex", flexDirection: "column", gap: 12 }}>
        <div>
          <p style={{ fontSize: 10, color: C.hint, margin: "0 0 5px", textTransform: "uppercase", letterSpacing: "0.07em" }}>Title</p>
          <input style={inp} value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Anchor rod hole sizing…" />
        </div>
        <div>
          <p style={{ fontSize: 10, color: C.hint, margin: "0 0 5px", textTransform: "uppercase", letterSpacing: "0.07em" }}>Vertical</p>
          <div style={{ display: "flex", gap: 5 }}>
            {VERTICALS.map(v => {
              const a = vert === v;
              return (
                <button key={v} onClick={() => setVert(v)} style={{ flex: 1, padding: "6px", fontSize: 11, borderRadius: 6, border: `1px solid ${a ? "rgba(79,110,247,0.4)" : C.border}`, background: a ? C.accentDim : "none", color: a ? C.accentText : C.muted, cursor: "pointer", fontFamily: "inherit" }}>
                  {v}
                </button>
              );
            })}
          </div>
        </div>
        <div>
          <p style={{ fontSize: 10, color: C.hint, margin: "0 0 5px", textTransform: "uppercase", letterSpacing: "0.07em" }}>Body</p>
          <textarea value={body} onChange={e => setBody(e.target.value)} style={{ ...inp, minHeight: 200, resize: "vertical", lineHeight: 1.75 }} placeholder="Describe the standard in plain language…" />
        </div>
      </div>
      <div style={{ padding: "10px 14px", borderTop: `1px solid ${C.border}`, display: "flex", gap: 8, flexShrink: 0 }}>
        <button onClick={onCancel} style={{ flex: 1, padding: "8px", fontSize: 12, background: "none", border: `1px solid ${C.border}`, borderRadius: 7, color: C.muted, cursor: "pointer", fontFamily: "inherit" }}>Cancel</button>
        <button onClick={() => { if (ready) onSave({ title, vert, body }); }} disabled={!ready}
          style={{ flex: 2, padding: "8px", fontSize: 12, fontWeight: 500, background: ready ? C.accent : C.surface2, border: "none", borderRadius: 7, color: ready ? "#fff" : C.hint, cursor: ready ? "pointer" : "not-allowed", fontFamily: "inherit" }}>
          {isNew ? "Create standard" : "Save — new version"}
        </button>
      </div>
    </div>
  );
}

// ── Standards list ────────────────────────────────────────────────────────────
export function StdList({ user }) {
  useStore();
  const standards = store.standards;
  const [editing, setEditing] = useState(null);
  const [isNew,   setIsNew]   = useState(false);
  const [menuId,  setMenuId]  = useState(null);

  const save = data => {
    const dt = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    if (isNew) {
      store.addStd({ id: "s" + Date.now(), title: data.title, vertical: data.vert, body: data.body, version: "A", updatedBy: user.name, updatedAt: dt, status: "active", history: [] });
    } else {
      const s = standards.find(x => x.id === editing.id);
      if (!s) return;
      const old = { version: s.version, body: s.body, updatedBy: s.updatedBy, updatedAt: s.updatedAt };
      const pts = s.version.split(".");
      const nv  = pts.length === 1 ? pts[0] + ".1" : pts[0] + "." + (parseInt(pts[1]) + 1);
      store.updateStd(editing.id, { title: data.title, vertical: data.vert, body: data.body, version: nv, updatedBy: user.name, updatedAt: dt, history: [old, ...(s.history || [])] });
    }
    setEditing(null); setIsNew(false);
  };

  if (editing || isNew) {
    return <StdEditor std={editing} onSave={save} onCancel={() => { setEditing(null); setIsNew(false); }} isNew={isNew} />;
  }

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div style={{ padding: "10px 14px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
        <div>
          <p style={{ margin: 0, fontWeight: 500, fontSize: 13, color: C.text }}>Standards library</p>
          <p style={{ margin: 0, fontSize: 10, color: C.hint }}>Tier 0 — highest priority in bot responses</p>
        </div>
        <button onClick={() => setIsNew(true)} style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 10px", background: C.accentDim, border: `1px solid rgba(79,110,247,0.3)`, borderRadius: 7, color: C.accentText, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
          New
        </button>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: "11px" }}>
        {standards.filter(s => s.status === "active").map(s => (
          <div key={s.id} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: "11px 12px", marginBottom: 8, position: "relative" }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 5 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2, flexWrap: "wrap" }}>
                  <p style={{ margin: 0, fontWeight: 500, fontSize: 12, color: C.text }}>{s.title}</p>
                  <VerBadge v={s.vertical} />
                  <span style={{ fontSize: 10, color: C.hint, fontFamily: "monospace" }}>v{s.version}</span>
                </div>
                <p style={{ margin: 0, fontSize: 10, color: C.hint }}>{s.updatedBy} · {s.updatedAt}</p>
              </div>
              <div style={{ position: "relative", flexShrink: 0 }}>
                <button onClick={() => setMenuId(menuId === s.id ? null : s.id)} style={{ background: "none", border: "none", cursor: "pointer", color: C.hint, padding: "2px 6px", fontSize: 14 }}>···</button>
                {menuId === s.id && (
                  <CtxMenu onClose={() => setMenuId(null)} style={{ right: 0, top: 22 }} items={[
                    { icon: "rename",  label: "Edit",    fn: () => setEditing(s) },
                    "---",
                    { icon: "archive", label: "Archive", fn: () => store.updateStd(s.id, { status: "archived" }) },
                  ]} />
                )}
              </div>
            </div>
            <p style={{ margin: 0, fontSize: 11, color: C.muted, lineHeight: 1.65, whiteSpace: "pre-line" }}>
              {s.body.slice(0, 180)}{s.body.length > 180 ? "…" : ""}
            </p>
            <button onClick={() => setEditing(s)} style={{ marginTop: 7, fontSize: 11, color: C.accent, background: "none", border: "none", cursor: "pointer", padding: 0, fontFamily: "inherit" }}>
              Edit / update →
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
