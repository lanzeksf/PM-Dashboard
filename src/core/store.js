import { useState, useEffect } from "react";
import { makePMQ, nowStamp, daysAgo, hoursAgo } from "./utils.jsx";

// ── Seed data ─────────────────────────────────────────────────────────────────
const STORE = {
  chats: [],

  queue: [],

  standards: [
    {
      id: "s1", title: "Anchor rod hole sizing — base plates", vertical: "Structural", version: "A.1",
      body: "All anchor rod holes in base plates must use KSF-verified dimensions per Table 14-1 (AISC 16th Ed). Holes are always round. Jam nuts go below the base plate. Washers below are 1/8\" thick matching the washer above.\n\n- ¾\" rod → 1 5/16\" hole, ¼\"×2\" sq washer\n- 1¼\" rod → 2 1/16\" hole, ½\"×4\" sq washer\n- 2\" rod → 3¼\" hole, ¾\"×5\" sq washer",
      updatedBy: "Loren C.", updatedAt: "Apr 10, 2026", status: "active", history: [],
    },
    {
      id: "s2", title: "Material substitution approval — all verticals", vertical: "All", version: "A",
      body: "Any material substitution from contract-specified material requires written EOR approval before fabrication proceeds. This applies to all three verticals. No verbal approvals.",
      updatedBy: "Loren C.", updatedAt: "Mar 2, 2026", status: "active", history: [],
    },
  ],

  projectsightCache: {
    projects:   [],
    rfis:       {},
    issues:     {},
    lastSynced: null,
  },

  // "View As" testing mode — Lanze-only, client-side only, never persisted.
  // See Shell.jsx's effectiveUser/isViewingAs computation.
  viewAsUserId: null,
};

// ── Reactive store ────────────────────────────────────────────────────────────
const _listeners = new Set();

export const store = {
  get chats()             { return STORE.chats; },
  get queue()             { return STORE.queue; },
  get standards()         { return STORE.standards; },
  get projectsightCache() { return STORE.projectsightCache; },
  get viewAsUserId()      { return STORE.viewAsUserId; },

  subscribe(fn) { _listeners.add(fn); return () => _listeners.delete(fn); },
  notify()      { _listeners.forEach(fn => fn()); },

  updateChat(id, patch) {
    const i = STORE.chats.findIndex(c => c.id === id);
    if (i === -1) return;
    STORE.chats[i] = { ...STORE.chats[i], ...patch };
    store.notify();
  },
  addChat(c)      { STORE.chats.unshift(c); store.notify(); },
  removeChat(id)  { STORE.chats = STORE.chats.filter(c => c.id !== id); store.notify(); },

  updateQueue(id, patch) {
    const i = STORE.queue.findIndex(q => q.id === id);
    if (i === -1) return;
    STORE.queue[i] = { ...STORE.queue[i], ...patch };
    store.notify();
  },
  addQueue(q)     { STORE.queue.unshift(q); store.notify(); },
  removeQueue(id) { STORE.queue = STORE.queue.filter(q => q.id !== id); store.notify(); },

  addStd(s) { STORE.standards.unshift(s); store.notify(); },
  updateStd(id, patch) {
    const i = STORE.standards.findIndex(s => s.id === id);
    if (i === -1) return;
    STORE.standards[i] = { ...STORE.standards[i], ...patch };
    store.notify();
  },

  resolveByPMQ(pmqId) {
    STORE.chats.forEach((c, i) => { if (c.pmqId === pmqId) STORE.chats[i] = { ...c, resolved: true,  lastActivity: nowStamp() }; });
    STORE.queue.forEach((q, i) => { if (q.pmqId === pmqId) STORE.queue[i] = { ...q, resolved: true  }; });
    store.notify();
  },
  unresolveByPMQ(pmqId) {
    STORE.chats.forEach((c, i) => { if (c.pmqId === pmqId) STORE.chats[i] = { ...c, resolved: false, lastActivity: nowStamp() }; });
    STORE.queue.forEach((q, i) => { if (q.pmqId === pmqId) STORE.queue[i] = { ...q, resolved: false }; });
    store.notify();
  },

  setProjectsightCache(projects, rfis, issues, ts) {
    STORE.projectsightCache = { projects, rfis, issues, lastSynced: ts };
    store.notify();
  },
  clearProjectsightCache() {
    STORE.projectsightCache = { projects: [], rfis: {}, issues: {}, lastSynced: null };
    store.notify();
  },

  setViewAsUserId(id) {
    STORE.viewAsUserId = id;
    store.notify();
  },
};

// ── useStore hook — subscribe to store updates ────────────────────────────────
export function useStore() {
  const [tick, setTick] = useState(0);
  useEffect(() => store.subscribe(() => setTick(t => t + 1)), []);
  return tick;
}
