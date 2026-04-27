import { useState, useEffect } from "react";
import { makePMQ, nowStamp, daysAgo, hoursAgo } from "./utils.jsx";

// ── Seed data ─────────────────────────────────────────────────────────────────
const STORE = {
  chats: [
    {
      id: "t1", owner: "tony", title: "Minimum edge distance — A325 bolts",
      createdAt: hoursAgo(2), lastActivity: hoursAgo(2), escalated: false, resolved: false, unread: false,
      msgs: [
        { id: 101, role: "user", text: 'What is the minimum edge distance for A325 bolts in 3/8" plate using standard holes?' },
        { id: 102, role: "bot", confidence: 91, sources: [{ doc: "AISC 360", section: "Table J3.4" }],
          text: 'Per AISC 360 Table J3.4, minimum edge distance for standard holes with 7/8" A325 bolts is 1-1/8" for sheared edges and 1" for rolled or sawn edges. For ¾" bolts: 1" sheared, 7/8" rolled/sawn.' },
      ],
    },
    {
      id: "t2", owner: "tony", title: "Weld access hole geometry — moment connection",
      createdAt: daysAgo(1), lastActivity: hoursAgo(1), escalated: true, resolved: false, unread: true, pmqId: makePMQ(1),
      msgs: [
        { id: 103, role: "user", text: "Weld access hole geometry for moment connections per AWS D1.1? W18×97 beam into W14 column." },
        { id: 104, role: "bot", confidence: 58, sources: [{ doc: "AWS D1.1", section: "§5.17" }],
          text: "Partial match at 58% — AWS D1.1 §5.17 addresses weld access holes generally but your specific W18×97 moment connection may require EOR confirmation on dimensions." },
        { id: 105, role: "bot", escalationNotice: true, text: `Thread escalated as ${makePMQ(1)}. Loren's replies will appear here.` },
        { id: 106, role: "pm", name: "Loren C.", unread: true,
          text: 'Tony — for a W18×97 CJP moment connection, weld access hole dimensions follow AISC 360 §J1.6. Min hole height is 1-1/2" or 75% of flange thickness, whichever is greater. What is the flange thickness?' },
      ],
    },
    {
      id: "t3", owner: "tony", title: "A572 Gr.50 substitution for A36",
      createdAt: daysAgo(2), lastActivity: daysAgo(2), escalated: false, resolved: false, unread: false,
      msgs: [
        { id: 107, role: "user", text: "Can we substitute A572 Gr.50 for A36 on HSS brace members without EOR approval?" },
        { id: 108, role: "bot", confidence: 93, sources: [{ doc: "KSF PM Manual", section: "§1.6" }],
          text: "No. Per KSF Standard — material substitution requires written EOR approval before fabrication. No verbal approvals accepted." },
      ],
    },
    {
      id: "lu1", owner: "luis", title: "Base plate design — W12 column",
      createdAt: daysAgo(2), lastActivity: daysAgo(2), escalated: true, resolved: false, unread: false, pmqId: makePMQ(2),
      msgs: [
        { id: 301, role: "user", text: 'Required base plate thickness for W12×53 carrying 85 kips on 6" concrete pedestal?' },
        { id: 302, role: "bot", confidence: 64, sources: [{ doc: "AISC Design Guide 1", section: "Ch. 3" }],
          text: "Partial match at 64% — AISC Design Guide 1 covers base plate design but specific calculation for your loading needs verification." },
        { id: 303, role: "bot", escalationNotice: true, text: `Thread escalated as ${makePMQ(2)}. Loren's replies will appear here.` },
      ],
    },
    {
      id: "ad1", owner: "adam", title: "EO requirement — field splice modification",
      createdAt: daysAgo(3), lastActivity: daysAgo(3), escalated: true, resolved: true, pmqId: makePMQ(3), unread: false,
      msgs: [
        { id: 401, role: "user", text: 'Field conditions require moving a splice location by 4". EO or verbal approval?' },
        { id: 402, role: "bot", confidence: 97, sources: [{ doc: "KSF PM Manual", section: "Aerospace" }],
          text: "Any field modification requires a written Engineering Order. No exceptions." },
        { id: 403, role: "bot", escalationNotice: true, text: `Thread escalated as ${makePMQ(3)}. Loren's replies will appear here.` },
        { id: 404, role: "pm", name: "Loren C.", text: "Adam — bot is correct. Written EO required. Do not proceed until EO-2026-011 is confirmed." },
      ],
    },
    {
      id: "lz1", owner: "lanze", title: "Fabrication throughput — structural vs solar",
      createdAt: hoursAgo(4), lastActivity: hoursAgo(4), escalated: false, resolved: false, unread: false,
      msgs: [
        { id: 501, role: "user", text: "Typical fabrication cycle times for structural vs solar carport members? Trying to identify shop floor bottlenecks." },
        { id: 502, role: "bot", confidence: 72, sources: [{ doc: "KSF PM Manual", section: "Shop Floor" }],
          text: "Per KSF SOP, structural members average 3-5 days through fab. Solar carport members are typically 1-3 days. Bottlenecks most commonly occur at fit-up and weld inspection stages." },
      ],
    },
    {
      id: "l1", owner: "loren", title: "Bolt pretension values — AISC 360",
      createdAt: hoursAgo(3), lastActivity: hoursAgo(3), escalated: false, resolved: false, unread: false,
      msgs: [
        { id: 201, role: "user", text: "Minimum bolt pretension values for A325 and A490 in slip-critical connections per AISC 360?" },
        { id: 202, role: "bot", confidence: 95, sources: [{ doc: "AISC 360", section: "Table J3.1" }],
          text: "Per AISC 360 Table J3.1, minimum pretension for A325: ½\"=12k, ¾\"=28k, 7/8\"=39k, 1\"=51k. For A490: ½\"=15k, ¾\"=35k, 7/8\"=49k, 1\"=64k." },
      ],
    },
    {
      id: "l2", owner: "loren", title: "CJP weld inspection requirements",
      createdAt: daysAgo(1), lastActivity: daysAgo(1), escalated: false, resolved: false, unread: false,
      msgs: [
        { id: 203, role: "user", text: "Visual inspection requirements for CJP groove welds per AWS D1.1?" },
        { id: 204, role: "bot", confidence: 88, sources: [{ doc: "AWS D1.1", section: "§6.9" }],
          text: "Per AWS D1.1 §6.9, CJP groove welds require visual inspection for: crack prohibition, weld/base metal fusion, crater fill, weld profiles per 6.6.1, and size conformance." },
      ],
    },
  ],

  queue: [
    {
      id: "q1", pmqId: makePMQ(1), title: "Weld access hole geometry — moment connection",
      from: "Tony S.", fromPos: "Structural Coordinator", project: "4521", projectType: "Structural",
      urgency: "High", psRef: "", createdAt: daysAgo(1), resolved: false,
      additionalContext: "W18×97 beam to W14 column, gridline C-4. Erection in 5 days.",
      thread: [
        { id: 103, role: "issuer", name: "Tony S.",  text: "Weld access hole geometry for moment connections? W18×97 into W14 column.", confidence: null },
        { id: 104, role: "bot",    name: "Kern Bot", text: "AWS D1.1 §5.17 — 58% confidence, W18×97 moment connection needs senior review.", confidence: 58 },
        { id: 106, role: "pm",     name: "Loren C.", text: 'Tony — AISC 360 §J1.6. Min hole height is 1-1/2" or 75% of flange thickness, whichever governs. What is the flange thickness?' },
      ],
    },
    {
      id: "q2", pmqId: makePMQ(2), title: "Base plate thickness — W12 column axial load",
      from: "Luis A.", fromPos: "Solar APM", project: "4388", projectType: "Solar",
      urgency: "Medium", psRef: "RFI-0019", createdAt: daysAgo(2), resolved: false,
      additionalContext: 'Solar carport column, 6" concrete pedestal, 85 kip axial load.',
      thread: [
        { id: 301, role: "issuer", name: "Luis A.",  text: 'Required base plate thickness for W12×53 carrying 85 kips on 6" concrete pedestal?', confidence: null },
        { id: 302, role: "bot",    name: "Kern Bot", text: "Partial match at 64% — AISC Design Guide 1 covers base plate design but specific calculation needs verification.", confidence: 64 },
      ],
    },
    {
      id: "q3", pmqId: makePMQ(3), title: "EO requirement — field splice modification",
      from: "Adam K.", fromPos: "Aerospace Engineer", project: "4601", projectType: "Aero",
      urgency: "High", psRef: "EO-2026-011", createdAt: daysAgo(3), resolved: true,
      additionalContext: 'Lockheed maintenance stand, field splice moved 4" due to bracket interference.',
      thread: [
        { id: 401, role: "issuer", name: "Adam K.",  text: 'Field conditions require moving a splice location by 4". EO or verbal approval?', confidence: null },
        { id: 402, role: "bot",    name: "Kern Bot", text: "Any field modification requires a written Engineering Order. No exceptions.", confidence: 97 },
        { id: 404, role: "pm",     name: "Loren C.", text: "Adam — written EO required. Do not proceed until EO-2026-011 is in hand." },
      ],
    },
  ],

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
};

// ── Reactive store ────────────────────────────────────────────────────────────
const _listeners = new Set();

export const store = {
  get chats()     { return STORE.chats; },
  get queue()     { return STORE.queue; },
  get standards() { return STORE.standards; },

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
};

// ── useStore hook — subscribe to store updates ────────────────────────────────
export function useStore() {
  const [tick, setTick] = useState(0);
  useEffect(() => store.subscribe(() => setTick(t => t + 1)), []);
  return tick;
}
