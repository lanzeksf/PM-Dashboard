import React from "react";

// ── Color palette ─────────────────────────────────────────────────────────────
export const C = {
  bg:         "#f2f3f5",
  sidebar:    "#0d0e0f",
  surface:    "#ffffff",
  surface2:   "#eceef1",
  border:     "rgba(13,14,15,0.08)",
  borderHi:   "rgba(13,14,15,0.16)",
  text:       "#14161a",
  muted:      "#5a5d63",
  hint:       "#8a8d93",
  accent:     "#d4af3c",
  accentDim:  "rgba(212,175,60,0.14)",
  accentText: "#0d0e0f",
  success:    "#7fb582",
  successDim: "rgba(127,181,130,0.14)",
  warning:    "#d4a44a",
  warningDim: "rgba(212,164,74,0.14)",
  danger:     "#c87878",
  dangerDim:  "rgba(200,120,120,0.14)",
  pm:         "#a78bfa",   // role-badge exception only — never nav/buttons/data
  pmDim:      "rgba(167,139,250,0.16)",

  // Permanently-dark surfaces (nav rail, fullscreen file viewer) — text/borders
  // drawn on these must NOT use the (light-theme) tokens above.
  onDarkSurface:  "#1c1f23",
  onDarkSurface2: "#252a30",
  onDarkText:     "#f0ede5",
  onDarkMuted:    "#a8a59a",
  onDarkHint:     "#6b6964",
  onDarkBorder:      "rgba(240,237,229,0.08)",
  onDarkBorderHi:    "rgba(240,237,229,0.16)",
  onDarkHover:       "rgba(240,237,229,0.06)",
};

// ── Font stack ─────────────────────────────────────────────────────────────
export const F = {
  display: '"Fraunces", Georgia, serif',        // dashboard titles / big numbers only
  head:    '"Inter Tight", "Inter", sans-serif', // card / section titles
  body:    '"Inter", sans-serif',                // running text
  mono:    '"JetBrains Mono", ui-monospace, monospace', // IDs, dates, money, RFI numbers
  stat:    '"Outfit", "Inter Tight", sans-serif', // large stat numbers — RFI counts, day counts
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

// ── "View As" testing mode ──────────────────────────────────────────────────
export const viewingAsTooltip = name => `Disabled while viewing as ${name} — this would submit as you, not them.`;

// ── Module access map ─────────────────────────────────────────────────────────
// Defines which nav tabs each role can see.
// "standards_write" is a permission flag, not a nav tab — checked separately.
export const ROLE_MODULES = {
  admin: [
    "kernbot", "dashboard", "queue", "owner", "scope", "changes",
    "detailing", "rfi", "issuetriage", "fab", "field", "standards", "contracts", "user_mgmt", "system_config",
  ],
  sr_pm: [
    "kernbot", "dashboard", "queue", "owner", "scope", "changes",
    "detailing", "rfi", "issuetriage", "fab", "field", "standards", "contracts", "user_mgmt",
  ],
  apm: [
    "kernbot", "dashboard", "owner", "scope", "changes",
    "detailing", "rfi", "issuetriage", "fab", "field", "standards", "contracts",
  ],
  coordinator: [
    "kernbot", "dashboard", "owner", "scope", "changes",
    "detailing", "rfi", "issuetriage", "fab", "field", "standards", "contracts",
  ],
  superintendent: [
    "kernbot", "dashboard", "owner", "scope", "changes",
    "detailing", "rfi", "issuetriage", "fab", "field", "standards",
  ],
  mfg_eng: [
    "kernbot", "dashboard", "issuetriage", "fab", "standards", "contracts",
  ],
  field: [
    "kernbot", "dashboard", "owner", "scope", "fab", "field", "standards", "contracts",
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
    id: "jr",      name: "JR C.",      initials: "JC", color: "#f472b6",
    position: "Superintendent", role: "superintendent",
    tier: "standard", canRespond: false, stdWrite: false,
    badge: null,
    department: { label: "All", color: "#888", bg: "#2a2a2a" },
  },
  {
    id: "josh",    name: "Josh L.",    initials: "JL", color: "#60a5fa",
    position: "Project Manager", role: "coordinator",
    tier: "standard", canRespond: false, stdWrite: false,
    badge: null,
    department: { label: "Structural", color: "#888", bg: "#2a2a2a" },
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
    id: "adam",    name: "Adam K.",    initials: "AK", color: "#fb923c",
    position: "Assistant Project Manager", role: "apm",
    tier: "standard", canRespond: false, stdWrite: false,
    badge: null,
    department: { label: "Aero", color: "#888", bg: "#2a2a2a" },
  },
  {
    id: "lisbet",  name: "Lisbet L.",  initials: "LL", color: "#2dd4bf",
    position: "Intern", role: "apm",
    tier: "standard", canRespond: false, stdWrite: false,
    badge: null,
    department: null,
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
  eye:       <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/><circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.6"/></svg>,
  eyeOff:    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M17.94 17.94A10.94 10.94 0 0112 20c-7 0-11-8-11-8a18.5 18.5 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19M14.12 14.12a3 3 0 11-4.24-4.24" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/><line x1="1" y1="1" x2="23" y2="23" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>,
  bug:       <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><rect x="8" y="6" width="8" height="12" rx="4" stroke="currentColor" strokeWidth="1.6"/><path d="M12 6V3M9.5 4.5L11 6.5M14.5 4.5L13 6.5M3 10h3M18 10h3M3 16h3M18 16h3M8 9.5l-2.5-2M16 9.5l2.5-2M8 14.5l-2.5 2M16 14.5l2.5 2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>,
  wishlist:  <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M9 18h6M10 21h4M12 3a6 6 0 00-3.5 10.9c.3.2.5.6.5 1v.1h6v-.1c0-.4.2-.8.5-1A6 6 0 0012 3z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  thought:   <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M21 11.5a8.38 8.38 0 01-1.9 5.4A8.5 8.5 0 0112 20a8.5 8.5 0 01-4.3-1.2L3 20l1.3-3.9A8.5 8.5 0 013 11.5 8.5 8.5 0 0111.5 3h.5a8.5 8.5 0 019 8v.5z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>,
};
