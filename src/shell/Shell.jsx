import React, { useState } from "react";
import { USERS_LIST, C } from "../core/utils.jsx";

// ── Shell constants ───────────────────────────────────────────────────────────
export const SHELL_COLORS = { bg: "#05080b" };

// ── Nav icons (inline SVG components) ────────────────────────────────────────
const Icon = ({ children }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ display: "block" }}>
    {children}
  </svg>
);

const NAV_ICONS = {
  kernbot:   () => <Icon><path d="M4 6h16M4 12h10M4 18h16" /></Icon>,
  dashboard: () => <Icon><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></Icon>,
  rfi:       () => <Icon><path d="M4 7h16M8 12h8M7 17h10" /></Icon>,
  scope:     () => <Icon><circle cx="12" cy="12" r="6" /><path d="M12 6v12M6 12h12" /></Icon>,
  changes:   () => <Icon><path d="M5 12h14M12 5l7 7-7 7" /></Icon>,
  fab:       () => <Icon><path d="M4 7h16v10H4z" /><path d="M4 7l8 5 8-5" /></Icon>,
  field:     () => <Icon><circle cx="12" cy="12" r="5" /><path d="M12 7v10M7 12h10" /></Icon>,
  owner:     () => <Icon><path d="M5 5h14v14H5z" /><path d="M9 9h6v6H9z" /></Icon>,
  detailing: () => <Icon><path d="M6 20h12M7 4h10l-1 5H8z" /></Icon>,
};

export const NAV_ITEMS = [
  { id: "kernbot",   label: "Kern Bot" },
  { id: "dashboard", label: "Dashboard" },
  { id: "rfi",       label: "RFI Log" },
  { id: "scope",     label: "Scope Tracker" },
  { id: "changes",   label: "Change Orders" },
  { id: "fab",       label: "Fabrication & Shipping" },
  { id: "field",     label: "Field Needs" },
  { id: "owner",     label: "Owner Pending" },
  { id: "detailing", label: "Detailing" },
];

// ── Coming soon placeholder ───────────────────────────────────────────────────
export function ComingSoon({ label }) {
  return (
    <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100%", background: SHELL_COLORS.bg, color: "#f7fafc" }}>
      <div style={{ maxWidth: 540, padding: 24, textAlign: "center" }}>
        <p style={{ margin: 0, fontSize: 32, fontWeight: 700, letterSpacing: "-0.03em" }}>{label}</p>
        <p style={{ margin: "14px 0 0", fontSize: 14, color: "rgba(255,255,255,0.65)", lineHeight: 1.7 }}>
          This feature is not available yet. Check back soon when KSF Command Center adds the next phase of workflow tools.
        </p>
      </div>
    </div>
  );
}

// ── Sidebar ───────────────────────────────────────────────────────────────────
function ShellSidebar({ tab, setTab, mobile = false, onClose }) {
  return (
    <aside style={{ width: 230, background: "#000000", borderRight: "1px solid rgba(255,255,255,0.06)", display: "flex", flexDirection: "column", flexShrink: 0, ...(mobile ? { position: "absolute", inset: "0 auto 0 0", zIndex: 200, boxShadow: "4px 0 24px rgba(0,0,0,0.5)" } : {}) }}>
      <div style={{ padding: "18px 16px 14px", display: "flex", alignItems: "center", gap: 10 }}>
        {mobile && (
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#999", cursor: "pointer", padding: "2px 6px 2px 0", display: "flex", flexShrink: 0 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
        )}
        <div style={{ width: 26, height: 26, borderRadius: 6, background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="#cccccc" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </div>
        <span style={{ fontSize: 14, fontWeight: 700, color: "#f0f2f8", letterSpacing: "-0.02em", whiteSpace: "nowrap" }}>KSF Command Center</span>
      </div>

      <div style={{ height: 1, background: "rgba(255,255,255,0.05)", margin: "0 12px 8px" }} />

      <style>{`
        .ksf-nav-btn { width:100%;display:flex;align-items:center;gap:10px;padding:8px 10px;border-radius:6px;border:none;background:transparent;cursor:pointer;font-family:inherit;margin-bottom:1px;color:#888;font-size:13px;font-weight:400;text-align:left;transition:background .1s,color .1s;border-left:2px solid transparent; }
        .ksf-nav-btn:hover { background:rgba(255,255,255,0.08);color:#e0e0e0; }
        .ksf-nav-btn.active { background:rgba(255,255,255,0.14);color:#ffffff;font-weight:600;border-left:2px solid rgba(255,255,255,0.7); }
        .ksf-nav-btn.active:hover { background:rgba(255,255,255,0.16); }
        .ksf-nav-icon { flex-shrink:0;display:flex;align-items:center;opacity:0.6; }
        .ksf-nav-btn:hover .ksf-nav-icon { opacity:0.85; }
        .ksf-nav-btn.active .ksf-nav-icon { opacity:1; }
      `}</style>

      <nav style={{ flex: 1, overflowY: "auto", padding: "2px 8px" }}>
        {NAV_ITEMS.map(item => {
          const NavIcon = NAV_ICONS[item.id];
          const active  = tab === item.id;
          return (
            <button key={item.id} className={`ksf-nav-btn${active ? " active" : ""}`}
              onClick={() => { setTab(item.id); if (mobile) onClose?.(); }}>
              <span className="ksf-nav-icon"><NavIcon /></span>
              <span style={{ flex: 1 }}>{item.label}</span>
              {item.id === "kernbot" && <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#34d399", flexShrink: 0 }} />}
            </button>
          );
        })}
      </nav>
    </aside>
  );
}

// ── Root shell ────────────────────────────────────────────────────────────────
// KernBotApp is passed in as a prop to avoid a circular import with store/utils
export default function KSFCommandCenter({ KernBotApp }) {
  const [tab,         setTab]         = useState("kernbot");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Auth placeholder — defaults to admin user until login is implemented
  const currentUser = USERS_LIST.find(u => u.tier === "admin") || USERS_LIST[0];

  return (
    <div style={{ display: "flex", height: "100vh", background: SHELL_COLORS.bg, fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif", overflow: "hidden", position: "relative" }}>
      <div className="ksf-sidebar-desktop" style={{ display: "flex" }}>
        <ShellSidebar tab={tab} setTab={setTab} />
      </div>

      {sidebarOpen && (
        <>
          <div onClick={() => setSidebarOpen(false)} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 190 }} />
          <ShellSidebar mobile tab={tab} setTab={setTab} onClose={() => setSidebarOpen(false)} />
        </>
      )}

      <main style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", position: "relative", minWidth: 0 }}>
        <div className="ksf-mobile-bar" style={{ display: "none", alignItems: "center", gap: 10, padding: "10px 14px", borderBottom: "1px solid rgba(255,255,255,0.06)", flexShrink: 0, background: "#000" }}>
          <button onClick={() => setSidebarOpen(true)} style={{ background: "none", border: "none", color: "#999", cursor: "pointer", padding: 4, display: "flex", alignItems: "center" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" /></svg>
          </button>
          <span style={{ fontSize: 12, fontWeight: 600, color: "#ddd" }}>KSF Command Center</span>
          <span style={{ fontSize: 11, color: "#999", marginLeft: "auto" }}>{NAV_ITEMS.find(i => i.id === tab)?.label}</span>
        </div>

        {tab === "kernbot"   && <KernBotApp preloadUser={currentUser} />}
        {tab === "dashboard" && <ComingSoon label="Dashboard" />}
        {tab === "rfi"       && <ComingSoon label="RFI Log" />}
        {tab === "scope"     && <ComingSoon label="Scope Tracker" />}
        {tab === "changes"   && <ComingSoon label="Change Orders" />}
        {tab === "fab"       && <ComingSoon label="Fabrication & Shipping" />}
        {tab === "field"     && <ComingSoon label="Field Needs" />}
        {tab === "owner"     && <ComingSoon label="Owner Pending" />}
        {tab === "detailing" && <ComingSoon label="Detailing" />}
      </main>

      <style>{`
        @media (max-width:640px) {
          .ksf-sidebar-desktop { display:none!important; }
          .ksf-mobile-bar { display:flex!important; }
        }
      `}</style>
    </div>
  );
}
