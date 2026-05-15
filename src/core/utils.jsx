import React from "react";

// ── Color palette ─────────────────────────────────────────────────────────────
export const C = {
  bg:         "#0a0a0a",
  sidebar:    "#000000",
  surface:    "#111111",
  surface2:   "#1a1a1a",
  border:     "rgba(255,255,255,0.13)",
  borderHi:   "rgba(255,255,255,0.22)",
  text:       "#ededed",
  muted:      "#aaaaaa",
  hint:       "#777777",
  accent:     "#5b7cfa",
  accentDim:  "rgba(91,124,250,0.15)",
  accentText: "#8eaafe",
  success:    "#34d399",
  successDim: "rgba(52,211,153,0.12)",
  warning:    "#fbbf24",
  warningDim: "rgba(251,191,36,0.12)",
  danger:     "#f87171",
  dangerDim:  "rgba(248,113,113,0.12)",
  pm:         "#a78bfa",
  pmDim:      "rgba(167,139,250,0.16)",
};

// ── Option lists ──────────────────────────────────────────────────────────────
export const PROJECT_TYPES = ["Aero", "Solar", "Structural", "General question"];
export const URGENCY_OPTS  = ["Low", "Medium", "High"];
export const VERTICALS     = ["All", "Structural", "Solar", "Aero"];

// ── Date & string helpers ─────────────────────────────────────────────────────
export const YEAR     = new Date().getFullYear();
export const makePMQ  = n => `PMQ-${YEAR}-${String(n).padStart(4, "0")}`;
export const nowStamp = () => new Date().toISOString();
export const daysAgo  = n => { const d = new Date(); d.setDate(d.getDate() - n);   return d.toISOString(); };
export const hoursAgo = n => { const d = new Date(); d.setHours(d.getHours() - n); return d.toISOString(); };
export const fmtDate  = d => new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
export const fmtRel   = iso => {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000), h = Math.floor(diff / 3600000), day = Math.floor(diff / 86400000);
  if (m < 2)     return "just now";
  if (m < 60)    return `${m}m ago`;
  if (h < 24)    return `${h}h ago`;
  if (day === 1) return "yesterday";
  return `${day}d ago`;
};
export const fmtBytes = b =>
  b < 1024    ? `${b}B` :
  b < 1048576 ? `${(b / 1024).toFixed(1)}KB` :
                `${(b / 1048576).toFixed(1)}MB`;

// ── ID generators ─────────────────────────────────────────────────────────────
let _pmqN = 2, _msgN = 500;
export const nextPMQ = () => { _pmqN++; return makePMQ(_pmqN); };
export const nextId  = () => { _msgN++; return _msgN; };

// ── File helpers ──────────────────────────────────────────────────────────────
export const isImage    = f => /^image\//i.test(f.type);
export const isPDF      = f => f.type === "application/pdf";
export const isViewable = f => isImage(f) || isPDF(f);

export const readFileAsDataURL = file => new Promise((res, rej) => {
  const r = new FileReader();
  r.onload = () => res(r.result);
  r.onerror = rej;
  r.readAsDataURL(file);
});

export const MAX_FILE_SIZE   = 8 * 1024 * 1024; // 8 MB
export const MAX_ATTACHMENTS = 6;

// ── Module access map ─────────────────────────────────────────────────────────
// Defines which nav tabs each role can see.
// "standards_write" is a permission flag, not a nav tab — checked separately.
export const ROLE_MODULES = {
  admin: [
    "kernbot", "dashboard", "queue", "owner", "scope", "changes",
    "detailing", "rfi", "fab", "field", "standards", "contracts", "user_mgmt", "system_config",
  ],
  sr_pm: [
    "kernbot", "dashboard", "queue", "owner", "scope", "changes",
    "detailing", "rfi", "fab", "field", "standards", "contracts", "user_mgmt",
  ],
  apm: [
    "kernbot", "dashboard", "owner", "scope", "changes",
    "detailing", "rfi", "fab", "field", "standards", "contracts",
  ],
  coordinator: [
    "kernbot", "dashboard", "owner", "scope", "changes",
    "detailing", "rfi", "fab", "field", "standards", "contracts",
  ],
  mfg_eng: [
    "kernbot", "dashboard", "fab", "standards", "contracts",
  ],
  field: [
    "kernbot", "dashboard", "owner", "scope", "changes", "fab", "field", "standards", "contracts",
  ],
};

// ── Users ─────────────────────────────────────────────────────────────────────
// tier:         controls queue access + reply rights ("admin" | "sr_pm" | "standard")
// role:         maps to ROLE_MODULES key
// canRespond:   can reply to KB queue items
// stdWrite:     can create/edit standards
// department:   shown as tag on user picker card (null = no tag)
export const USERS_LIST = [
  {
    id: "lanze",   name: "Lanze A.",   initials: "LA", color: "#22c55e",
    position: "Manufacturing Engineer", role: "admin",
    tier: "admin",  canRespond: true,  stdWrite: true,
    badge: { label: "Admin", color: "#a78bfa", bg: "rgba(167,139,250,0.15)" },
    department: null,
  },
  {
    id: "loren",   name: "Loren C.",   initials: "LC", color: "#a78bfa",
    position: "Senior PM", role: "sr_pm",
    tier: "sr_pm",  canRespond: true,  stdWrite: true,
    badge: { label: "Senior PM", color: "#c4b5fd", bg: "rgba(196,181,253,0.12)" },
    department: null,
  },
  {
    id: "tony",    name: "Tony S.",    initials: "TS", color: "#38bdf8",
    position: "Project Coordinator", role: "coordinator",
    tier: "standard", canRespond: false, stdWrite: false,
    badge: null,
    department: { label: "Structural", color: "#888", bg: "#2a2a2a" },
  },
  {
    id: "luis",    name: "Luis A.",    initials: "LU", color: "#f59e0b",
    position: "Assistant Project Manager", role: "apm",
    tier: "standard", canRespond: false, stdWrite: false,
    badge: null,
    department: { label: "Solar", color: "#888", bg: "#2a2a2a" },
  },
  {
    id: "jillian", name: "Jillian H.", initials: "JH", color: "#f472b6",
    position: "Project Coordinator", role: "coordinator",
    tier: "standard", canRespond: false, stdWrite: false,
    badge: null,
    department: { label: "Solar", color: "#888", bg: "#2a2a2a" },
  },
  {
    id: "adam",    name: "Adam K.",    initials: "AK", color: "#fb923c",
    position: "Assistant Project Manager", role: "apm",
    tier: "standard", canRespond: false, stdWrite: false,
    badge: null,
    department: { label: "Aero", color: "#888", bg: "#2a2a2a" },
  },
  {
    id: "jacob",   name: "Jacob T.",   initials: "JT", color: "#4ade80",
    position: "Field Coordinator", role: "field",
    tier: "standard", canRespond: false, stdWrite: false,
    badge: null,
    department: null,
  },
];

// ── Icon map (SVG elements) ───────────────────────────────────────────────────
export const MI = {
  rename:    <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>,
  escalate:  <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M12 19V5M5 12l7-7 7 7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>,
  resolve:   <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>,
  unresolve: <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M9 14l-4-4 4-4M20 20v-7a4 4 0 00-4-4H5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>,
  delete:    <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><polyline points="3 6 5 6 21 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6M10 11v6M14 11v6M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>,
  remove:    <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.6"/><path d="M15 9l-6 6M9 9l6 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>,
  archive:   <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><polyline points="21 8 21 21 3 21 3 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/><rect x="1" y="3" width="22" height="5" rx="1" stroke="currentColor" strokeWidth="1.6"/><line x1="10" y1="12" x2="14" y2="12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>,
  paperclip: <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  download:  <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  expand:    <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  close:     <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>,
  pdf:       <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/><polyline points="14 2 14 8 20 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/><line x1="16" y1="13" x2="8" y2="13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/><line x1="16" y1="17" x2="8" y2="17" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/><polyline points="10 9 9 9 8 9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>,
  file:      <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/><polyline points="14 2 14 8 20 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>,
};
