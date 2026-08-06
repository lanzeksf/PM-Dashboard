import React, { useState, useRef, useCallback } from "react";
import { C, F, nowStamp, nextId, nextPMQ, USERS_LIST, viewingAsTooltip } from "../core/utils.jsx";
import { store } from "../core/store.js";
import { useStore } from "../core/store.js";
import { callKernBot } from "./kernBot.js";
import { ChatPane } from "./ChatPane.jsx";
import { QueueDetail } from "./QueueDetail.jsx";
import { StdList } from "../components/Panels.jsx";
import { ChatRow, QueueRow } from "../components/Panels.jsx";
import { RenameModal, EscalateModal } from "../components/Chat.jsx";



// ── Root App ──────────────────────────────────────────────────────────────────
export function KernBotApp({ preloadUser, isViewingAs = false }) {
  useStore();

  const [user,       setUser]       = useState(preloadUser || null);
  const [searchQ,    setSearchQ]    = useState("");
  const [escOpen,    setEscOpen]    = useState(false);
  const [escTarget,  setEscTarget]  = useState(null);
  const [renameId,   setRenameId]   = useState(null);
  const [renameQId,  setRenameQId]  = useState(null);
  const [adminView,  setAdminView]  = useState("chat");
  const [selQ,       setSelQ]       = useState(store.queue[0]?.id || null);

  const escTargetRef = useRef(null);

  const initChatId = () => {
    if (!preloadUser) return null;
    const mine = store.chats.filter(c => c.owner === preloadUser.id);
    return mine[0]?.id || null;
  };
  const [chatId, setChatId] = useState(initChatId);

  const isAdmin  = user?.tier === "admin" || user?.tier === "sr_pm";
  const canWrite = user?.stdWrite === true && !isViewingAs;
  const myChats = user ? store.chats.filter(c => c.owner === user.id) : [];

  // Belt-and-suspenders on top of role/module gating (see Shell.jsx's
  // effectiveUser swap) — blocks every mutating action while Lanze is
  // driving as someone else, including things that person's own role would
  // normally be allowed to do.
  const guardWrite = fn => (...args) => { if (isViewingAs) return; return fn(...args); };

  // ── Chat actions ──────────────────────────────────────────────────────────
  const newChat = () => {
    const id = "c" + Date.now(), ts = nowStamp();
    store.addChat({ id, owner: user.id, title: "New conversation", createdAt: ts, lastActivity: ts, escalated: false, resolved: false, unread: false, msgs: [] });
    setChatId(id); setAdminView("chat");
  };

  const ensureChatAndSend = useCallback(async (text, attachments = []) => {
    let id = chatId;
    if (!id || !store.chats.find(x => x.id === id && x.owner === user.id)) {
      id = "c" + Date.now();
      const ts = nowStamp();
      store.addChat({ id, owner: user.id, title: "New conversation", createdAt: ts, lastActivity: ts, escalated: false, resolved: false, unread: false, msgs: [] });
      setChatId(id);
    }
    await handleSendInner(id, text, attachments);
  }, [chatId, user]);

  const handleSendInner = useCallback(async (id, text, attachments = []) => {
    const um  = { id: nextId(), role: "user", text, attachments };
    const c   = store.chats.find(x => x.id === id); if (!c) return;
    const title = c.title === "New conversation" && text
      ? text.slice(0, 44) + (text.length > 44 ? "…" : "")
      : c.title === "New conversation" && attachments.length ? attachments[0].name : c.title;
    store.updateChat(id, { title, lastActivity: nowStamp(), msgs: [...c.msgs, um] });
    const history = c.msgs.filter(m => !m.escalationNotice && (m.role === "user" || m.role === "bot")).slice(-10);
    const resp    = await callKernBot(text, history, attachments);
    const c2 = store.chats.find(x => x.id === id); if (!c2) return;
    store.updateChat(id, { lastActivity: nowStamp(), msgs: [...c2.msgs, { id: nextId(), role: "bot", ...resp }] });
  }, []);

  const handleSendReply = useCallback((cId, text, attachments = []) => {
    const msg = { id: nextId(), role: "user", text, attachments };
    const c   = store.chats.find(x => x.id === cId); if (!c) return;
    store.updateChat(cId, { lastActivity: nowStamp(), msgs: [...c.msgs, msg] });
    if (c.pmqId) {
      const q = store.queue.find(x => x.pmqId === c.pmqId); if (!q) return;
      store.updateQueue(q.id, { thread: [...q.thread, { id: msg.id, role: "issuer", name: user?.name || "", text, attachments }] });
    }
  }, [user]);

  // ── Queue actions ─────────────────────────────────────────────────────────
  const handleQSend = useCallback((qId, text, fromName, attachments = []) => {
    const msg = { id: nextId(), role: "pm", name: fromName, text, attachments, unread: true };
    const q   = store.queue.find(x => x.id === qId); if (!q) return;
    store.updateQueue(qId, { thread: [...q.thread, msg] });
    const ic = store.chats.find(x => x.pmqId === q.pmqId);
    if (ic) store.updateChat(ic.id, { unread: true, lastActivity: nowStamp(), msgs: [...ic.msgs, { ...msg }] });
  }, []);

  const handleResolve    = () => { const c = store.chats.find(x => x.id === chatId); if (c?.pmqId) store.resolveByPMQ(c.pmqId);   else if (c) store.updateChat(c.id, { resolved: true,  lastActivity: nowStamp() }); };
  const handleUnresolve  = () => { const c = store.chats.find(x => x.id === chatId); if (c?.pmqId) store.unresolveByPMQ(c.pmqId); else if (c) store.updateChat(c.id, { resolved: false, lastActivity: nowStamp() }); };
  const handleQResolve   = qId => { const q = store.queue.find(x => x.id === qId); if (q) store.resolveByPMQ(q.pmqId);   };
  const handleQUnresolve = qId => { const q = store.queue.find(x => x.id === qId); if (q) store.unresolveByPMQ(q.pmqId); };

  // ── Escalation ────────────────────────────────────────────────────────────
  const openEsc = cId => {
    const target = cId || chatId;
    escTargetRef.current = target;
    setEscTarget(target);
    setEscOpen(true);
  };

  const submitEscalation = ctx => {
    const cId   = escTargetRef.current || chatId;
    const pmqId = nextPMQ();
    const chat  = store.chats.find(c => c.id === cId);
    if (!chat) return;
    const newQ = {
      id: "q" + Date.now(), pmqId, title: chat.title || "Untitled",
      from: user.name, fromPos: user.position,
      project: ctx.proj, projectType: ctx.pt, urgency: ctx.urg, psRef: ctx.ps,
      createdAt: nowStamp(), resolved: false, additionalContext: ctx.ctx,
      thread: chat.msgs.filter(m => !m.escalationNotice).map(m => ({
        id: m.id, role: m.role === "user" ? "issuer" : "bot",
        name: m.role === "user" ? user.name : "Kern Bot",
        text: m.text, confidence: m.confidence ?? null, attachments: m.attachments || [],
      })),
    };
    store.addQueue(newQ);
    const notice = { id: nextId(), role: "bot", escalationNotice: true, text: `Escalated as ${pmqId}. Loren's replies will appear here.` };
    store.updateChat(cId, { escalated: true, pmqId, lastActivity: nowStamp(), msgs: [...chat.msgs, notice] });
    escTargetRef.current = null;
    setEscOpen(false);
    setEscTarget(null);
  };

  // ── Misc ──────────────────────────────────────────────────────────────────
  const markRead    = id => { const c = store.chats.find(x => x.id === id); if (c) store.updateChat(id, { unread: false, msgs: c.msgs.map(m => ({ ...m, unread: false })) }); };
  const renameChat  = (cId, title) => {
    store.updateChat(cId, { title });
    const c = store.chats.find(x => x.id === cId);
    if (c?.pmqId) { const q = store.queue.find(x => x.pmqId === c.pmqId); if (q) store.updateQueue(q.id, { title }); }
  };
  const deleteChat  = cId => { store.removeChat(cId); if (chatId === cId) setChatId(null); };
  const renameQueue = (qId, title) => {
    store.updateQueue(qId, { title });
    const q = store.queue.find(x => x.id === qId);
    if (q?.pmqId) { const c = store.chats.find(x => x.pmqId === q.pmqId); if (c) store.updateChat(c.id, { title }); }
  };
  const removeQueue = qId => store.removeQueue(qId);

  // ── Derived data ──────────────────────────────────────────────────────────
  const activeChat    = store.chats.find(c => c.id === chatId);
  const qItem         = store.queue.find(q => q.id === selQ);
  const filtered      = myChats.filter(c => !searchQ || c.title.toLowerCase().includes(searchQ.toLowerCase()));
  const stdChats      = filtered.filter(c => !c.escalated && !c.resolved).sort((a, b) => new Date(a.lastActivity || a.createdAt) - new Date(b.lastActivity || b.createdAt));
  const escChats      = filtered.filter(c =>  c.escalated && !c.resolved).sort((a, b) => new Date(a.lastActivity || a.createdAt) - new Date(b.lastActivity || b.createdAt));
  const resChats      = filtered.filter(c =>  c.resolved).sort((a, b) => new Date(b.lastActivity || b.createdAt) - new Date(a.lastActivity || a.createdAt));
  const qUnresolved   = store.queue.filter(q => !q.resolved).sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  const qResolved     = store.queue.filter(q =>  q.resolved);

  const renameSrc  = store.chats.find(c => c.id === renameId);
  const renameQSrc = store.queue.find(q => q.id === renameQId);

  if (!user) return null;

  // ── Section header ────────────────────────────────────────────────────────
  const SecHdr = ({ label, count, color }) => (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "8px 2px 3px" }}>
      <span style={{ fontSize: 10, color: C.onDarkHint, textTransform: "uppercase", letterSpacing: "0.07em" }}>{label}</span>
      {count > 0 && <span style={{ fontSize: 10, fontWeight: 600, padding: "1px 6px", borderRadius: 10, background: color + "22", color }}>{count}</span>}
    </div>
  );

  const chatRowProps = c => ({
    c, active: c.id === chatId && adminView === "chat", isAdmin,
    onSelect:   id => { setChatId(id); setAdminView("chat"); markRead(id); }, // read-only, not guarded
    onRename:   guardWrite(id => setRenameId(id)),
    onEscalate: guardWrite(id => openEsc(id)),
    onResolve:  guardWrite(id => { const ch = store.chats.find(x => x.id === id); if (ch?.pmqId) store.resolveByPMQ(ch.pmqId); else if (ch) store.updateChat(id, { resolved: true,  lastActivity: nowStamp() }); }),
    onUnresolve:guardWrite(id => { const ch = store.chats.find(x => x.id === id); if (ch?.pmqId) store.unresolveByPMQ(ch.pmqId); else if (ch) store.updateChat(id, { resolved: false, lastActivity: nowStamp() }); }),
    onDelete:   guardWrite(id => deleteChat(id)),
  });

  return (
    <div style={{ display: "flex", flex: 1, height: "100%", background: C.bg, fontFamily: "system-ui,-apple-system,sans-serif", overflow: "hidden", position: "relative" }}>

      {/* ── Sidebar ─────────────────────────────────────────────────────── */}
      <div style={{ width: 240, background: C.sidebar, borderRight: `1px solid ${C.onDarkBorder}`, display: "flex", flexDirection: "column", flexShrink: 0, overflow: "hidden" }}>

        {/* Top: logo + new chat + search */}
        <div style={{ padding: "9px 8px 7px", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
            <div style={{ width: 25, height: 25, borderRadius: 6, background: "#1e2340", border: `1px solid rgba(255,255,255,0.1)`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <span style={{ color: "#fff", fontWeight: 700, fontSize: 10 }}>KSF</span>
            </div>
            <span style={{ fontWeight: 500, fontSize: 13, color: C.onDarkText, flex: 1 }}>Kern Bot</span>
            <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
              <div style={{ width: 5, height: 5, borderRadius: "50%", background: C.success }} />
              <span style={{ fontSize: 10, color: C.success }}>live</span>
            </div>
          </div>

          <button onClick={newChat} disabled={isViewingAs} title={isViewingAs ? viewingAsTooltip(user.name) : undefined} style={{ width: "100%", background: C.onDarkSurface, border: `1px solid ${C.onDarkBorder}`, borderRadius: 7, padding: "6px 9px", color: isViewingAs ? C.onDarkHint : C.onDarkText, fontSize: 12, cursor: isViewingAs ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: 5, fontFamily: "inherit", marginBottom: 6, opacity: isViewingAs ? 0.5 : 1 }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke={C.onDarkMuted} strokeWidth="2" strokeLinecap="round" /></svg>
            New conversation
          </button>

          <div style={{ position: "relative" }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" style={{ position: "absolute", left: 7, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", opacity: 0.4 }}>
              <circle cx="11" cy="11" r="8" stroke={C.onDarkHint} strokeWidth="1.5" /><path d="M21 21l-4.35-4.35" stroke={C.onDarkHint} strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <input
              value={searchQ} onChange={e => setSearchQ(e.target.value)} placeholder="Search"
              style={{ width: "100%", paddingLeft: 24, paddingRight: 7, paddingTop: 5, paddingBottom: 5, background: C.onDarkSurface2, border: `1px solid ${C.onDarkBorder}`, borderRadius: 6, color: C.onDarkText, fontSize: 12, fontFamily: "inherit", boxSizing: "border-box", outline: "none" }}
            />
          </div>
        </div>

        {/* Chat / queue list */}
        <div style={{ flex: 1, overflowY: "auto", padding: "2px 7px 6px" }}>
          {stdChats.length > 0 && (
            <><SecHdr label="Conversations" count={0} color={C.accent} />{stdChats.map(c => <ChatRow key={c.id} {...chatRowProps(c)} />)}</>
          )}
          {escChats.length > 0 && (
            <div style={{ marginTop: stdChats.length ? 6 : 0 }}>
              <SecHdr label="Escalated" count={escChats.length} color={C.pm} />
              {escChats.map(c => <ChatRow key={c.id} {...chatRowProps(c)} />)}
            </div>
          )}
          {resChats.length > 0 && (
            <div style={{ marginTop: (stdChats.length + escChats.length) ? 4 : 0 }}>
              <div style={{ height: 1, background: C.onDarkBorder, margin: "6px 0 2px" }} />
              <SecHdr label="Resolved" count={resChats.length} color={C.success} />
              {resChats.map(c => <ChatRow key={c.id} {...chatRowProps(c)} />)}
            </div>
          )}

          {isAdmin && (
            <div style={{ marginTop: 6 }}>
              <div style={{ height: 1, background: C.onDarkBorder, margin: "6px 0 2px" }} />
              {qUnresolved.length > 0 && (
                <><SecHdr label="Queue · Open" count={qUnresolved.length} color={C.danger} />
                  {qUnresolved.map(q => <QueueRow key={q.id} q={q} active={q.id === selQ && adminView === "queue"} onSelect={id => { setSelQ(id); setAdminView("queue"); }} onRename={id => setRenameQId(id)} onResolve={handleQResolve} onUnresolve={handleQUnresolve} onRemove={removeQueue} />)}
                </>
              )}
              {qResolved.length > 0 && (
                <><SecHdr label="Queue · Resolved" count={qResolved.length} color={C.success} />
                  {qResolved.map(q => <QueueRow key={q.id} q={q} active={q.id === selQ && adminView === "queue"} onSelect={id => { setSelQ(id); setAdminView("queue"); }} onRename={id => setRenameQId(id)} onResolve={handleQResolve} onUnresolve={handleQUnresolve} onRemove={removeQueue} />)}
                </>
              )}
            </div>
          )}
          <div style={{ marginTop: isAdmin ? 0 : 6 }}>
            {!isAdmin && <div style={{ height: 1, background: C.onDarkBorder, margin: "6px 0 2px" }} />}
            <button onClick={() => setAdminView("standards")} style={{ width: "100%", marginTop: 4, background: adminView === "standards" ? "rgba(91,141,184,0.1)" : "none", border: `1px solid ${adminView === "standards" ? "rgba(91,141,184,0.28)" : "transparent"}`, borderRadius: 6, padding: "5px 7px", cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", gap: 6, fontFamily: "inherit" }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none"><path d="M4 19.5A2.5 2.5 0 016.5 17H20" stroke={adminView === "standards" ? C.accentText : C.onDarkHint} strokeWidth="1.5" strokeLinecap="round" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" stroke={adminView === "standards" ? C.accentText : C.onDarkHint} strokeWidth="1.5" /></svg>
              <span style={{ fontSize: 11, color: adminView === "standards" ? C.accentText : C.onDarkHint }}>Standards library</span>
            </button>
          </div>
        </div>

        {/* User profile footer */}
        <div style={{ padding: "8px 9px", borderTop: `1px solid ${C.onDarkBorder}`, flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 24, height: 24, borderRadius: "50%", background: user.color + "30", border: `1px solid ${user.color}40`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <span style={{ fontSize: 8, fontWeight: 600, color: user.color }}>{user.initials}</span>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: 12, color: C.onDarkText, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user.name}</p>
              <p style={{ margin: 0, fontSize: 11, color: C.onDarkHint }}>{user.position}</p>
            </div>
            {/* logout handled by shell sidebar */}
          </div>
        </div>
      </div>

      {/* ── Main panel ──────────────────────────────────────────────────── */}
      {adminView === "chat"      && <ChatPane chat={activeChat} user={user} isAdmin={isAdmin} isViewingAs={isViewingAs} onEscalate={guardWrite(() => openEsc(chatId))} onResolve={guardWrite(handleResolve)} onUnresolve={guardWrite(handleUnresolve)} onSend={guardWrite(ensureChatAndSend)} onSendReply={guardWrite(handleSendReply)} onMarkRead={markRead} />}
      {adminView === "queue"     && isAdmin && <QueueDetail item={qItem} user={user} isViewingAs={isViewingAs} onSend={guardWrite(handleQSend)} onResolve={guardWrite(handleQResolve)} onUnresolve={guardWrite(handleQUnresolve)} />}
      {adminView === "standards" && <StdList user={user} canWrite={canWrite} isViewingAs={isViewingAs} />}

      {/* ── Modals ──────────────────────────────────────────────────────── */}
      {escOpen    && <EscalateModal msgs={store.chats.find(c => c.id === (escTargetRef.current || chatId))?.msgs || []} onSubmit={submitEscalation} onClose={() => { escTargetRef.current = null; setEscOpen(false); setEscTarget(null); }} />}
      {renameId   && renameSrc  && <RenameModal current={renameSrc.title}  onSave={t => renameChat(renameId, t)}  onClose={() => setRenameId(null)} />}
      {renameQId  && renameQSrc && <RenameModal current={renameQSrc.title} onSave={t => renameQueue(renameQId, t)} onClose={() => setRenameQId(null)} />}
    </div>
  );
}

// Re-export for Shell.jsx compatibility
export { USERS_LIST } from "../core/utils.jsx";
