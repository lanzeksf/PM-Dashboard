import React from "react";
import { C, fmtRel, daysAgo, hoursAgo } from "../core/utils.jsx";

// ── Seed Data ─────────────────────────────────────────────────────────────────

const PROJECTS = [
  { id: "p1", name: "Stockdale Tower",        client: "Bolthouse Properties",  vertical: "Structural", contractValue: 1420000, pm: "tony",    status: "active" },
  { id: "p2", name: "CSUB Science Building",  client: "Cal State Bakersfield", vertical: "Structural", contractValue: 2850000, pm: "loren",   status: "active" },
  { id: "p3", name: "Ming Ave Retail Center", client: "Pacific Coast Dev.",    vertical: "Structural", contractValue: 680000,  pm: "tony",    status: "active" },
  { id: "p4", name: "Kern High Carports",     client: "KHSD Facilities",       vertical: "Solar",      contractValue: 940000,  pm: "luis",    status: "active" },
  { id: "p5", name: "Dignity Health Parking", client: "Dignity Health",        vertical: "Solar",      contractValue: 1150000, pm: "jillian", status: "active" },
  { id: "p6", name: "F-35 Stand – Lot 4",     client: "Lockheed Martin",       vertical: "Aero",       contractValue: 3200000, pm: "adam",    status: "active" },
  { id: "p7", name: "USAF Ground Support",    client: "US Air Force",          vertical: "Aero",       contractValue: 875000,  pm: "adam",    status: "active" },
];

const OWNER_PENDING = [
  { id: "op1", projectId: "p1", project: "Stockdale Tower",        subject: "Approve grid line revision — Column D4 relocation",  assignedTo: "tony",    createdAt: daysAgo(7) },
  { id: "op2", projectId: "p2", project: "CSUB Science Building",  subject: "Confirm anchor bolt pattern — Grid B / Level 2",     assignedTo: "loren",   createdAt: daysAgo(3) },
  { id: "op3", projectId: "p4", project: "Kern High Carports",     subject: "AHJ permit approval — Lot C expansion",              assignedTo: "luis",    createdAt: daysAgo(9) },
  { id: "op4", projectId: "p5", project: "Dignity Health Parking", subject: "Owner sign-off on revised bay spacing",              assignedTo: "jillian", createdAt: daysAgo(2) },
  { id: "op5", projectId: "p6", project: "F-35 Stand – Lot 4",     subject: "EO approval pending — field weld mod at Sta. 14",    assignedTo: "adam",    createdAt: daysAgo(6) },
];

const FIELD_NEEDS = [
  { id: "fn1", projectId: "p1", project: "Stockdale Tower",        issue: "Missing anchor bolts at grid C3 — erection halted",  urgency: "High",   submittedBy: "jacob", assignedTo: "tony",  createdAt: hoursAgo(4), status: "Open" },
  { id: "fn2", projectId: "p2", project: "CSUB Science Building",  issue: "Beam camber on W18×97 exceeds tolerance — hold fab", urgency: "High",   submittedBy: "jacob", assignedTo: "loren", createdAt: daysAgo(1),  status: "Open" },
  { id: "fn3", projectId: "p3", project: "Ming Ave Retail Center", issue: "Column base plate elevation off 3/8\" at grid A1",    urgency: "Medium", submittedBy: "jacob", assignedTo: "tony",  createdAt: daysAgo(2),  status: "Open" },
  { id: "fn4", projectId: "p4", project: "Kern High Carports",     issue: "Purlin spacing inconsistency vs. approved drawings", urgency: "Medium", submittedBy: "jacob", assignedTo: "luis",  createdAt: daysAgo(3),  status: "Open" },
];

const SCOPE_ITEMS = [
  { id: "sc1", projectId: "p1", project: "Stockdale Tower",        description: "Added beam reinforcement — grid D4 per RFI-014",        amount: 18400, noticeDeadlineDays: 14, createdAt: daysAgo(16), notified: false },
  { id: "sc2", projectId: "p2", project: "CSUB Science Building",  description: "Lateral brace addition — seismic upgrade Level 3",      amount: 34200, noticeDeadlineDays: 14, createdAt: daysAgo(5),  notified: false },
  { id: "sc3", projectId: "p3", project: "Ming Ave Retail",        description: "Owner-directed connection change — Col. A1 base plate",  amount: 6800,  noticeDeadlineDays: 7,  createdAt: daysAgo(8),  notified: false },
  { id: "sc4", projectId: "p5", project: "Dignity Health Parking", description: "Additional canopy bay added — south end",                amount: 52000, noticeDeadlineDays: 14, createdAt: daysAgo(3),  notified: true  },
];

const CHANGE_ORDERS = [
  { id: "co1", projectId: "p1", project: "Stockdale Tower",        coNumber: "CO-007", description: "Grid D4 beam reinforcement + RFI-014 work",            amount: 18400, sentDate: daysAgo(12), dueDate: daysAgo(2),  status: "Unsigned" },
  { id: "co2", projectId: "p2", project: "CSUB Science Building",  coNumber: "CO-003", description: "Seismic lateral brace upgrade — Level 3",              amount: 34200, sentDate: daysAgo(4),  dueDate: daysAgo(-3), status: "Unsigned" },
  { id: "co3", projectId: "p3", project: "Ming Ave Retail",        coNumber: "CO-002", description: "Base plate connection change at Col. A1",               amount: 6800,  sentDate: daysAgo(9),  dueDate: daysAgo(-1), status: "Unsigned" },
  { id: "co4", projectId: "p4", project: "Kern High Carports",     coNumber: "CO-005", description: "Lot C canopy extension — additional structural steel",   amount: 41500, sentDate: daysAgo(6),  dueDate: daysAgo(-5), status: "Unsigned" },
  { id: "co5", projectId: "p6", project: "F-35 Stand – Lot 4",     coNumber: "CO-011", description: "Station 14 weld mod per EO-2026-044",                   amount: 28700, sentDate: daysAgo(3),  dueDate: daysAgo(-7), status: "Unsigned" },
];

const FAB_JOBS = [
  { id: "fj1", projectId: "p1", project: "Stockdale Tower",        vertical: "Structural", totalPieces: 214, shipped: 48,  inFab: 80,  queued: 86,  phase: "Active Fab"    },
  { id: "fj2", projectId: "p2", project: "CSUB Science Building",  vertical: "Structural", totalPieces: 388, shipped: 0,   inFab: 40,  queued: 348, phase: "Starting"      },
  { id: "fj3", projectId: "p3", project: "Ming Ave Retail",        vertical: "Structural", totalPieces: 96,  shipped: 96,  inFab: 0,   queued: 0,   phase: "Complete"      },
  { id: "fj4", projectId: "p4", project: "Kern High Carports",     vertical: "Solar",      totalPieces: 160, shipped: 120, inFab: 30,  queued: 10,  phase: "Near Complete" },
  { id: "fj5", projectId: "p5", project: "Dignity Health Parking", vertical: "Solar",      totalPieces: 204, shipped: 0,   inFab: 0,   queued: 204, phase: "Not Started"   },
  { id: "fj6", projectId: "p6", project: "F-35 Stand – Lot 4",     vertical: "Aero",       totalPieces: 72,  shipped: 22,  inFab: 35,  queued: 15,  phase: "Active Fab"    },
  { id: "fj7", projectId: "p7", project: "USAF Ground Support",    vertical: "Aero",       totalPieces: 54,  shipped: 54,  inFab: 0,   queued: 0,   phase: "Complete"      },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

const firstName  = name => name.split(" ")[0];
const daysSince  = iso  => Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
const daysUntil  = iso  => Math.floor((new Date(iso).getTime() - Date.now()) / 86400000);
const fmtMoney   = n    => "$" + n.toLocaleString();

const greeting = () => {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
};

const verticalColor = v => ({
  Structural: { color: "#38bdf8", bg: "rgba(56,189,248,0.12)"  },
  Solar:      { color: "#fbbf24", bg: "rgba(251,191,36,0.12)"  },
  Aero:       { color: "#a78bfa", bg: "rgba(167,139,250,0.12)" },
}[v] || { color: C.muted, bg: C.surface2 });

const VertBadge = ({ v }) => {
  const vc = verticalColor(v);
  return (
    <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 7px", borderRadius: 20,
      background: vc.bg, color: vc.color, border: `1px solid ${vc.color}33`, whiteSpace: "nowrap" }}>
      {v}
    </span>
  );
};

const ageColor = (iso, redDays = 5, yellowDays = 3) => {
  const d = daysSince(iso);
  if (d >= redDays)    return C.danger;
  if (d >= yellowDays) return C.warning;
  return C.muted;
};

const dueDateColor = iso => {
  const d = daysUntil(iso);
  if (d < 0)  return C.danger;
  if (d <= 3) return C.warning;
  return C.success;
};
const dueDateLabel = iso => {
  const d = daysUntil(iso);
  if (d < 0)   return `${Math.abs(d)}d overdue`;
  if (d === 0) return "Due today";
  if (d === 1) return "Due tomorrow";
  return `Due in ${d}d`;
};

const scopeNoticeColor = item => {
  const r = item.noticeDeadlineDays - daysSince(item.createdAt);
  if (r <= 0) return C.danger;
  if (r <= 3) return C.warning;
  return C.muted;
};
const scopeNoticeLabel = item => {
  const r = item.noticeDeadlineDays - daysSince(item.createdAt);
  if (r <= 0) return `${Math.abs(r)}d past notice window`;
  if (r <= 3) return `${r}d left to notify`;
  return `${r}d remaining`;
};

// ── Filter data by user ───────────────────────────────────────────────────────

const filterByUser = user => {
  const isAdmin = user.tier === "admin" || user.tier === "sr_pm";
  const dept    = user.department?.label;

  const myProjects = isAdmin
    ? PROJECTS
    : dept
      ? PROJECTS.filter(p => p.vertical === dept || p.pm === user.id)
      : PROJECTS.filter(p => p.pm === user.id);

  const ids = new Set(myProjects.map(p => p.id));

  return {
    projects:     myProjects,
    ownerPending: OWNER_PENDING.filter(x => ids.has(x.projectId)),
    fieldNeeds:   user.role === "field"
      ? FIELD_NEEDS.filter(x => x.submittedBy === user.id)
      : FIELD_NEEDS.filter(x => ids.has(x.projectId)),
    scopeItems:   SCOPE_ITEMS.filter(x => ids.has(x.projectId) && !x.notified),
    changeOrders: CHANGE_ORDERS.filter(x => ids.has(x.projectId)),
    fabJobs:      FAB_JOBS.filter(x => ids.has(x.projectId)),
  };
};

// ── Shared UI ─────────────────────────────────────────────────────────────────

function SectionHeader({ title, count, countColor }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
      <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: C.muted }}>
        {title}
      </span>
      {count !== undefined && (
        <span style={{ fontSize: 10, fontWeight: 700, padding: "1px 7px", borderRadius: 20,
          background: (countColor || C.accent) + "22", color: countColor || C.accentText }}>
          {count}
        </span>
      )}
    </div>
  );
}

function Card({ children, style }) {
  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: "14px 16px", ...style }}>
      {children}
    </div>
  );
}

function GoBtn({ label, onClick }) {
  return (
    <button onClick={onClick}
      style={{ fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 6,
        border: `1px solid ${C.border}`, background: C.surface2, color: C.accentText,
        cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0, fontFamily: "inherit" }}
      onMouseEnter={e => { e.currentTarget.style.background = C.accentDim; e.currentTarget.style.borderColor = C.accent + "55"; }}
      onMouseLeave={e => { e.currentTarget.style.background = C.surface2; e.currentTarget.style.borderColor = C.border; }}>
      {label} →
    </button>
  );
}

function ItemRow({ dotColor, title, meta, action }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 10,
      paddingBottom: 10, borderBottom: `1px solid ${C.border}` }}>
      <div style={{ width: 6, height: 6, borderRadius: "50%", background: dotColor,
        marginTop: 5, flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>{title}{meta}</div>
      {action}
    </div>
  );
}

// ── Alert Bar ─────────────────────────────────────────────────────────────────

function AlertBar({ data, setTab }) {
  const alerts = [];

  data.scopeItems.forEach(item => {
    const age = daysSince(item.createdAt);
    if (age > item.noticeDeadlineDays)
      alerts.push({ text: `${item.project} — scope item is ${age - item.noticeDeadlineDays}d past the ${item.noticeDeadlineDays}-day notice window`, tab: "scope" });
  });
  data.ownerPending.forEach(op => {
    if (daysSince(op.createdAt) >= 5)
      alerts.push({ text: `${op.project} — owner item waiting ${daysSince(op.createdAt)} days without response`, tab: "owner" });
  });
  data.fieldNeeds.forEach(fn => {
    if (fn.urgency === "High" && fn.status === "Open")
      alerts.push({ text: `${fn.project} — HIGH field need open: ${fn.issue}`, tab: "field" });
  });
  data.changeOrders.forEach(co => {
    if (co.status === "Unsigned" && daysUntil(co.dueDate) < 0)
      alerts.push({ text: `${co.project} — ${co.coNumber} unsigned and ${Math.abs(daysUntil(co.dueDate))}d overdue (${fmtMoney(co.amount)})`, tab: "changes" });
  });

  if (alerts.length === 0) return null;

  return (
    <div style={{ background: "rgba(248,113,113,0.07)", border: `1px solid ${C.danger}44`,
      borderRadius: 10, padding: "12px 16px", marginBottom: 18 }}>
      <p style={{ margin: "0 0 8px", fontSize: 11, fontWeight: 700, letterSpacing: "0.08em",
        textTransform: "uppercase", color: C.danger }}>
        ⚠ {alerts.length} Critical Item{alerts.length !== 1 ? "s" : ""} Require Attention
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
        {alerts.map((a, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, justifyContent: "space-between" }}>
            <span style={{ fontSize: 12, color: C.danger, lineHeight: 1.4, flex: 1 }}>{a.text}</span>
            <GoBtn label="Go" onClick={() => setTab(a.tab)} />
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Owner Pending ─────────────────────────────────────────────────────────────

function OwnerPendingSection({ items, setTab }) {
  if (items.length === 0) return null;
  return (
    <Card style={{ marginBottom: 14 }}>
      <SectionHeader title="Owner Pending" count={items.length} countColor={C.warning} />
      <div style={{ display: "flex", flexDirection: "column" }}>
        {items.map(item => {
          const age   = daysSince(item.createdAt);
          const color = ageColor(item.createdAt, 5, 3);
          return (
            <ItemRow key={item.id}
              dotColor={color}
              title={<p style={{ margin: 0, fontSize: 13, color: C.text, lineHeight: 1.4,
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.subject}</p>}
              meta={<div style={{ display: "flex", gap: 8, marginTop: 3 }}>
                <span style={{ fontSize: 11, color: C.muted }}>{item.project}</span>
                <span style={{ fontSize: 11, fontWeight: 600, color }}>{age}d waiting</span>
              </div>}
              action={<GoBtn label="Owner" onClick={() => setTab("owner")} />}
            />
          );
        })}
      </div>
    </Card>
  );
}

// ── Field Needs ───────────────────────────────────────────────────────────────

function FieldNeedsSection({ items, setTab, isField }) {
  const open = items.filter(i => i.status === "Open");
  if (open.length === 0) return null;
  return (
    <Card style={{ marginBottom: 14 }}>
      <SectionHeader title="Field Needs" count={open.length} countColor={C.danger} />
      <div style={{ display: "flex", flexDirection: "column" }}>
        {open.map(item => {
          const urgColor = item.urgency === "High" ? C.danger : item.urgency === "Medium" ? C.warning : C.muted;
          return (
            <ItemRow key={item.id}
              dotColor={urgColor}
              title={<p style={{ margin: 0, fontSize: 13, color: C.text, lineHeight: 1.4 }}>{item.issue}</p>}
              meta={<div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 3, flexWrap: "wrap" }}>
                <span style={{ fontSize: 11, color: C.muted }}>{item.project}</span>
                <span style={{ fontSize: 11, fontWeight: 600, padding: "1px 6px", borderRadius: 4,
                  background: urgColor + "20", color: urgColor }}>{item.urgency}</span>
                <span style={{ fontSize: 11, color: C.hint }}>{fmtRel(item.createdAt)}</span>
                {isField && <span style={{ fontSize: 11, color: C.muted }}>PM: {item.assignedTo}</span>}
              </div>}
              action={<GoBtn label="Field" onClick={() => setTab("field")} />}
            />
          );
        })}
      </div>
    </Card>
  );
}

// ── Scope Items ───────────────────────────────────────────────────────────────

function ScopeSection({ items, setTab }) {
  if (items.length === 0) return null;
  return (
    <Card style={{ marginBottom: 14 }}>
      <SectionHeader title="Unnotified Scope Items" count={items.length} countColor={C.danger} />
      <div style={{ display: "flex", flexDirection: "column" }}>
        {items.map(item => {
          const color = scopeNoticeColor(item);
          return (
            <ItemRow key={item.id}
              dotColor={color}
              title={<p style={{ margin: 0, fontSize: 13, color: C.text, lineHeight: 1.4 }}>{item.description}</p>}
              meta={<div style={{ display: "flex", gap: 8, marginTop: 3, flexWrap: "wrap" }}>
                <span style={{ fontSize: 11, color: C.muted }}>{item.project}</span>
                <span style={{ fontSize: 11, fontWeight: 700, color }}>{scopeNoticeLabel(item)}</span>
                <span style={{ fontSize: 11, color: C.success, fontWeight: 600 }}>{fmtMoney(item.amount)}</span>
              </div>}
              action={<GoBtn label="Scope" onClick={() => setTab("scope")} />}
            />
          );
        })}
      </div>
    </Card>
  );
}

// ── Change Orders ─────────────────────────────────────────────────────────────

function ChangeOrdersSection({ items, setTab }) {
  const unsigned = items.filter(co => co.status === "Unsigned");
  if (unsigned.length === 0) return null;
  return (
    <Card style={{ marginBottom: 14 }}>
      <SectionHeader title="Unsigned Change Orders" count={unsigned.length} countColor={C.warning} />
      <div style={{ display: "flex", flexDirection: "column" }}>
        {unsigned.map(co => {
          const color = dueDateColor(co.dueDate);
          return (
            <ItemRow key={co.id}
              dotColor={color}
              title={<div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: C.accentText }}>{co.coNumber}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: C.success }}>{fmtMoney(co.amount)}</span>
                </div>
                <p style={{ margin: 0, fontSize: 13, color: C.text, lineHeight: 1.4 }}>{co.description}</p>
              </div>}
              meta={<div style={{ display: "flex", gap: 8, marginTop: 3, flexWrap: "wrap" }}>
                <span style={{ fontSize: 11, color: C.muted }}>{co.project}</span>
                <span style={{ fontSize: 11, fontWeight: 700, color }}>{dueDateLabel(co.dueDate)}</span>
                <span style={{ fontSize: 11, color: C.hint }}>Sent {fmtRel(co.sentDate)}</span>
              </div>}
              action={<GoBtn label="COs" onClick={() => setTab("changes")} />}
            />
          );
        })}
      </div>
    </Card>
  );
}

// ── Fab Snapshot ──────────────────────────────────────────────────────────────

function FabSnapshot({ jobs }) {
  if (jobs.length === 0) return null;
  const phaseColor = phase => ({
    "Complete":      C.success,
    "Near Complete": "#34d399",
    "Active Fab":    C.accent,
    "Starting":      C.warning,
    "Not Started":   C.hint,
  }[phase] || C.muted);

  return (
    <Card>
      <SectionHeader title="Fabrication Snapshot" />
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {jobs.map(job => {
          const pct    = Math.round((job.shipped / job.totalPieces) * 100);
          const fabPct = Math.round(((job.shipped + job.inFab) / job.totalPieces) * 100);
          const pc     = phaseColor(job.phase);
          return (
            <div key={job.id} style={{ paddingBottom: 12, borderBottom: `1px solid ${C.border}` }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0, flex: 1 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: C.text,
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{job.project}</span>
                  <VertBadge v={job.vertical} />
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0, marginLeft: 8 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 7px", borderRadius: 4,
                    background: pc + "20", color: pc }}>{job.phase}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: C.muted, minWidth: 34, textAlign: "right" }}>{pct}%</span>
                </div>
              </div>
              <div style={{ height: 6, borderRadius: 4, background: C.surface2, overflow: "hidden", position: "relative", marginBottom: 5 }}>
                <div style={{ position: "absolute", left: 0, top: 0, height: "100%", width: `${fabPct}%`,
                  background: C.accentDim, borderRadius: 4 }} />
                <div style={{ position: "absolute", left: 0, top: 0, height: "100%", width: `${pct}%`,
                  background: pct === 100 ? C.success : C.accent, borderRadius: 4 }} />
              </div>
              <div style={{ display: "flex", gap: 14 }}>
                <span style={{ fontSize: 10, color: C.hint }}><span style={{ color: C.success, fontWeight: 600 }}>{job.shipped}</span> shipped</span>
                <span style={{ fontSize: 10, color: C.hint }}><span style={{ color: C.accentText, fontWeight: 600 }}>{job.inFab}</span> in fab</span>
                <span style={{ fontSize: 10, color: C.hint }}><span style={{ color: C.muted, fontWeight: 600 }}>{job.queued}</span> queued</span>
                <span style={{ fontSize: 10, color: C.hint }}>of <span style={{ fontWeight: 600 }}>{job.totalPieces}</span> pcs</span>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

// ── Project Health ────────────────────────────────────────────────────────────

function ProjectHealthCards({ data, setTab }) {
  const { projects, ownerPending, fieldNeeds, scopeItems, changeOrders } = data;

  const riskLevel = proj => {
    const hasHighFN     = fieldNeeds.some(x => x.projectId === proj.id && x.urgency === "High" && x.status === "Open");
    const hasPastScope  = scopeItems.some(x => x.projectId === proj.id && daysSince(x.createdAt) > x.noticeDeadlineDays);
    const hasOverdueCO  = changeOrders.some(x => x.projectId === proj.id && x.status === "Unsigned" && daysUntil(x.dueDate) < 0);
    if (hasHighFN || hasPastScope || hasOverdueCO) return "High";
    const hasAgingOP = ownerPending.some(x => x.projectId === proj.id && daysSince(x.createdAt) >= 3);
    if (hasAgingOP) return "Medium";
    return "Low";
  };

  const riskColor = r => r === "High" ? C.danger : r === "Medium" ? C.warning : C.success;

  const topIssue = proj => {
    const fn = fieldNeeds.find(x => x.projectId === proj.id && x.urgency === "High" && x.status === "Open");
    if (fn) return { text: fn.issue, tab: "field", color: C.danger };
    const sc = scopeItems.find(x => x.projectId === proj.id && daysSince(x.createdAt) > x.noticeDeadlineDays);
    if (sc) return { text: `Unnotified scope past window: ${sc.description}`, tab: "scope", color: C.danger };
    const co = changeOrders.find(x => x.projectId === proj.id && x.status === "Unsigned" && daysUntil(x.dueDate) < 0);
    if (co) return { text: `${co.coNumber} unsigned — ${Math.abs(daysUntil(co.dueDate))}d overdue`, tab: "changes", color: C.warning };
    const op = ownerPending.find(x => x.projectId === proj.id);
    if (op) return { text: `Owner item waiting ${daysSince(op.createdAt)}d: ${op.subject}`, tab: "owner", color: ageColor(op.createdAt) };
    return null;
  };

  const openCount = proj =>
    ownerPending.filter(x => x.projectId === proj.id).length +
    fieldNeeds.filter(x => x.projectId === proj.id && x.status === "Open").length +
    scopeItems.filter(x => x.projectId === proj.id).length +
    changeOrders.filter(x => x.projectId === proj.id && x.status === "Unsigned").length;

  return (
    <div>
      <SectionHeader title="Project Health" count={projects.length} />
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {projects.map(proj => {
          const risk  = riskLevel(proj);
          const rc    = riskColor(risk);
          const issue = topIssue(proj);
          const count = openCount(proj);
          return (
            <div key={proj.id} style={{ background: C.surface, border: `1px solid ${C.border}`,
              borderRadius: 10, padding: "12px 14px", borderLeft: `3px solid ${rc}` }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0, flex: 1 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: C.text,
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{proj.name}</span>
                  <VertBadge v={proj.vertical} />
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0, marginLeft: 8 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 4,
                    background: rc + "20", color: rc }}>{risk} Risk</span>
                  {count > 0 && (
                    <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 7px", borderRadius: 4,
                      background: C.surface2, color: C.muted }}>{count} open</span>
                  )}
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, marginBottom: issue ? 8 : 0 }}>
                <span style={{ fontSize: 11, color: C.hint }}>{proj.client}</span>
                <span style={{ fontSize: 11, color: C.hint }}>·</span>
                <span style={{ fontSize: 11, color: C.muted, fontWeight: 500 }}>{fmtMoney(proj.contractValue)}</span>
              </div>
              {issue && (
                <div style={{ display: "flex", alignItems: "flex-start", gap: 8,
                  background: issue.color + "0d", border: `1px solid ${issue.color}22`,
                  borderRadius: 6, padding: "6px 10px" }}>
                  <span style={{ fontSize: 11, color: issue.color, flex: 1, lineHeight: 1.4 }}>{issue.text}</span>
                  <GoBtn label="→" onClick={() => setTab(issue.tab)} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Root ──────────────────────────────────────────────────────────────────────

export default function DashboardApp({ user, setTab }) {
  const data    = filterByUser(user);
  const isField = user.role === "field";

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric",
  });

  const totalOpen =
    data.ownerPending.length +
    data.fieldNeeds.filter(f => f.status === "Open").length +
    data.scopeItems.length +
    data.changeOrders.filter(co => co.status === "Unsigned").length;

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", background: C.bg, overflowY: "auto",
      fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif" }}>
      <div style={{ maxWidth: 1280, width: "100%", margin: "0 auto", padding: "24px 24px 48px" }}>

        {/* Header */}
        <div style={{ marginBottom: 22 }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
            <div>
              <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: C.text, letterSpacing: "-0.03em" }}>
                {greeting()}, {firstName(user.name)}.
              </h1>
              <p style={{ margin: "4px 0 0", fontSize: 13, color: C.hint }}>{today}</p>
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 5 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                {user.department && (() => {
                  const vc = verticalColor(user.department.label);
                  return (
                    <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 20,
                      background: vc.bg, color: vc.color, border: `1px solid ${vc.color}33` }}>
                      {user.department.label}
                    </span>
                  );
                })()}
                {user.badge && (
                  <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 20,
                    background: user.badge.bg, color: user.badge.color, border: `1px solid ${user.badge.color}33` }}>
                    {user.badge.label}
                  </span>
                )}
              </div>
              <span style={{ fontSize: 12, color: C.hint }}>{user.position}</span>
              {totalOpen > 0 && (
                <span style={{ fontSize: 11, fontWeight: 700, color: C.danger }}>
                  {totalOpen} open item{totalOpen !== 1 ? "s" : ""} need attention
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Alert Bar */}
        <AlertBar data={data} setTab={setTab} />

        {/* Two-column body */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 18 }} className="ksf-dash-grid">
          <div>
            {!isField && <OwnerPendingSection items={data.ownerPending} setTab={setTab} />}
            <FieldNeedsSection items={data.fieldNeeds} setTab={setTab} isField={isField} />
            {!isField && <ScopeSection items={data.scopeItems} setTab={setTab} />}
            {!isField && <ChangeOrdersSection items={data.changeOrders} setTab={setTab} />}
            <FabSnapshot jobs={data.fabJobs} />
          </div>
          {!isField && (
            <div>
              <ProjectHealthCards data={data} setTab={setTab} />
            </div>
          )}
        </div>
      </div>

      <style>{`
        @media (min-width: 900px)  { .ksf-dash-grid { grid-template-columns: 1fr 1fr !important; } }
        @media (min-width: 1200px) { .ksf-dash-grid { grid-template-columns: 58% 1fr !important; } }
      `}</style>
    </div>
  );
}