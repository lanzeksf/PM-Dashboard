import React, { useState } from "react";
import { USERS_LIST, ROLE_MODULES, C } from "../core/utils.jsx";
import DashboardApp from "../dashboard/DashboardApp.jsx";

// ── Shell constants ───────────────────────────────────────────────────────────
export const SHELL_COLORS = { bg: "#05080b" };

const SHELL_ONLY_TABS = new Set(["queue", "standards"]);

const ALL_NAV_ITEMS = [
  { id: "kernbot",       label: "Kern Bot" },
  { id: "dashboard",     label: "Dashboard" },
  { id: "owner",         label: "Owner Pending" },
  { id: "scope",         label: "Scope Tracker" },
  { id: "changes",       label: "Change Orders" },
  { id: "detailing",     label: "Detailing" },
  { id: "rfi",           label: "RFI Log" },
  { id: "fab",           label: "Fabrication & Shipping" },
  { id: "field",         label: "Field Needs" },
  { id: "user_mgmt",     label: "User Management" },
  { id: "system_config", label: "System Config" },
];

// ── Nav icons ─────────────────────────────────────────────────────────────────
const Icon = ({ children }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" style={{ display: "block" }}>
    {children}
  </svg>
);

const NAV_ICONS = {
  kernbot:       () => <Icon><path d="M4 6h16M4 12h10M4 18h16" /></Icon>,
  dashboard:     () => <Icon><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></Icon>,
  queue:         () => <Icon><path d="M4 6h16M4 12h10M4 18h7" /><circle cx="19" cy="18" r="3" /></Icon>,
  owner:         () => <Icon><polyline points="22 12 16 12 14 15 10 15 8 12 2 12" /><path d="M5.45 5.11L2 12v6a2 2 0 002 2h16a2 2 0 002-2v-6l-3.45-6.89A2 2 0 0016.76 4H7.24a2 2 0 00-1.79 1.11z" /></Icon>,
  scope:         () => <Icon><circle cx="12" cy="12" r="6" /><path d="M12 6v12M6 12h12" /></Icon>,
  changes:       () => <Icon><line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" /></Icon>,
  detailing:     () => <Icon><circle cx="12" cy="12" r="2" /><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" /></Icon>,
  rfi:           () => <Icon><circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3" /><line x1="12" y1="17" x2="12.01" y2="17" /></Icon>,
  fab:           () => <Icon><line x1="4" y1="5" x2="20" y2="5" /><line x1="4" y1="19" x2="20" y2="19" /><line x1="12" y1="5" x2="12" y2="19" /></Icon>,
  field:         () => <Icon><path d="M2 18a1 1 0 001 1h18a1 1 0 001-1v-1H2v1z" /><path d="M12 2a8 8 0 018 8v6H4V10a8 8 0 018-8z" /><line x1="7" y1="17" x2="7" y2="12" /><line x1="17" y1="17" x2="17" y2="12" /></Icon>,
  standards:     () => <Icon><path d="M4 19.5A2.5 2.5 0 016.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" /></Icon>,
  user_mgmt:     () => <Icon><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" /></Icon>,
  system_config: () => <Icon><circle cx="12" cy="12" r="3" /><path d="M19.07 4.93l-1.41 1.41M4.93 4.93l1.41 1.41M12 2v2M12 20v2M20 12h2M2 12h2M17.66 17.66l1.41 1.41M4.93 19.07l1.41-1.41" /></Icon>,
};

// ── Coming soon placeholder ───────────────────────────────────────────────────
function ComingSoon({ label }) {
  return (
    <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
      background: SHELL_COLORS.bg, color: "#f7fafc" }}>
      <div style={{ maxWidth: 540, padding: 24, textAlign: "center" }}>
        <p style={{ margin: 0, fontSize: 32, fontWeight: 700, letterSpacing: "-0.03em" }}>{label}</p>
        <p style={{ margin: "14px 0 0", fontSize: 14, color: "rgba(255,255,255,0.65)", lineHeight: 1.7 }}>
          This feature is not available yet. Check back soon when KSF Command Center adds the next phase of workflow tools.
        </p>
      </div>
    </div>
  );
}

// ── User picker ───────────────────────────────────────────────────────────────
function UserPicker({ onLogin }) {
  return (
    <div style={{ minHeight: "100vh", background: "#05080b", display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif", padding: "2rem" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 32 }}>
        <div style={{ width: 36, height: 36, borderRadius: 9, background: "#1e2340",
          border: "1px solid rgba(255,255,255,0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
              stroke="#cccccc" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <div>
          <p style={{ margin: 0, fontWeight: 700, fontSize: 18, color: "#f0f2f8", letterSpacing: "-0.02em" }}>KSF Command Center</p>
          <p style={{ margin: 0, fontSize: 12, color: "rgba(255,255,255,0.35)" }}>Select your profile to continue</p>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
        gap: 10, width: "100%", maxWidth: 700 }}>
        {USERS_LIST.map(u => (
          <button key={u.id} onClick={() => onLogin(u)}
            style={{ background: "#111111", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12,
              padding: "18px 14px", cursor: "pointer", textAlign: "center", fontFamily: "inherit",
              transition: "border-color 0.15s, background 0.15s", outline: "none" }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = u.color + "60"; e.currentTarget.style.background = "#161616"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; e.currentTarget.style.background = "#111111"; }}>
            <div style={{ width: 44, height: 44, borderRadius: "50%", background: u.color + "22",
              border: `1.5px solid ${u.color}44`, display: "flex", alignItems: "center",
              justifyContent: "center", margin: "0 auto 10px" }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: u.color }}>{u.initials}</span>
            </div>
            <p style={{ margin: 0, fontWeight: 600, fontSize: 13, color: "#ededed" }}>{u.name}</p>
            <p style={{ margin: "3px 0 8px", fontSize: 11, color: "rgba(255,255,255,0.4)" }}>{u.position}</p>
            <div style={{ display: "flex", gap: 4, justifyContent: "center", flexWrap: "wrap" }}>
              {u.badge && (
                <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 20,
                  background: u.badge.bg, color: u.badge.color, border: `1px solid ${u.badge.color}33` }}>
                  {u.badge.label}
                </span>
              )}
              {u.department && (
                <span style={{ fontSize: 10, fontWeight: 500, padding: "2px 8px", borderRadius: 20,
                  background: u.department.bg, color: u.department.color }}>
                  {u.department.label}
                </span>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Sidebar ───────────────────────────────────────────────────────────────────
function ShellSidebar({ user, tab, setTab, onSignOut, mobile, onClose }) {
  const allowedModules = ROLE_MODULES[user.role] || [];
  const visibleNav = ALL_NAV_ITEMS.filter(
    item => allowedModules.includes(item.id) && !SHELL_ONLY_TABS.has(item.id)
  );

  return (
    <aside style={{
      width: 200, flexShrink: 0, display: "flex", flexDirection: "column",
      background: "#000000", borderRight: "1px solid rgba(255,255,255,0.06)",
      height: "100vh", overflow: "hidden", fontFamily: "inherit",
      ...(mobile ? { position: "absolute", left: 0, top: 0, zIndex: 200, height: "100%" } : {}),
    }}>
      <div style={{ padding: "14px 14px 10px", display: "flex", alignItems: "center", gap: 8 }}>
        {mobile && (
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#666",
            cursor: "pointer", padding: 2, marginRight: 2, display: "flex" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        )}
        <div style={{ width: 24, height: 24, borderRadius: 6, background: "rgba(255,255,255,0.07)",
          border: "1px solid rgba(255,255,255,0.12)", display: "flex", alignItems: "center",
          justifyContent: "center", flexShrink: 0 }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
              stroke="#cccccc" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <span style={{ fontSize: 13, fontWeight: 700, color: "#f0f2f8", letterSpacing: "-0.02em", whiteSpace: "nowrap" }}>
          KSF Command Center
        </span>
      </div>

      <div style={{ height: 1, background: "rgba(255,255,255,0.05)", margin: "0 12px 6px" }} />

      <style>{`
        .ksf-nav-btn { width:100%;display:flex;align-items:center;gap:11px;padding:8px 10px;border-radius:6px;border:none;background:transparent;cursor:pointer;font-family:inherit;margin-bottom:2px;color:#888;font-size:13px;font-weight:400;text-align:left;transition:background .1s,color .1s;border-left:2px solid transparent; }
        .ksf-nav-btn:hover { background:rgba(255,255,255,0.07);color:#e0e0e0; }
        .ksf-nav-btn.active { background:rgba(255,255,255,0.13);color:#ffffff;font-weight:600;border-left:2px solid rgba(255,255,255,0.7); }
        .ksf-nav-icon { flex-shrink:0;display:flex;align-items:center;opacity:0.55; }
        .ksf-nav-btn:hover .ksf-nav-icon,.ksf-nav-btn.active .ksf-nav-icon { opacity:1; }
      `}</style>

      <nav style={{ flex: 1, overflowY: "auto", padding: "2px 8px" }}>
        {visibleNav.map(item => {
          const NavIcon = NAV_ICONS[item.id];
          const active  = tab === item.id;
          return (
            <button key={item.id} className={`ksf-nav-btn${active ? " active" : ""}`}
              onClick={() => { setTab(item.id); if (mobile) onClose?.(); }}>
              <span className="ksf-nav-icon">{NavIcon && <NavIcon />}</span>
              <span style={{ flex: 1 }}>{item.label}</span>
              {item.id === "kernbot" && (
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#34d399", flexShrink: 0 }} />
              )}
            </button>
          );
        })}
      </nav>

      <div style={{ height: 1, background: "rgba(255,255,255,0.05)", margin: "6px 12px 0" }} />

      <div style={{ padding: "10px 12px 14px", display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ width: 28, height: 28, borderRadius: "50%", background: user.color + "22",
          border: `1px solid ${user.color}44`, display: "flex", alignItems: "center", justifyContent: "center",
          fontWeight: 700, fontSize: 10, color: user.color, flexShrink: 0 }}>
          {user.initials}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: 12, fontWeight: 500, color: "#ddd",
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user.name}</p>
          <p style={{ margin: 0, fontSize: 11, color: "#555",
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user.position}</p>
        </div>
        <button onClick={onSignOut} title="Sign out"
          style={{ width: 26, height: 26, borderRadius: 6, background: "none", border: "none", color: "#555",
            display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
            flexShrink: 0, padding: 0, transition: "all 0.15s" }}
          onMouseEnter={e => { e.currentTarget.style.color = "#aaa"; e.currentTarget.style.background = "rgba(255,255,255,0.07)"; }}
          onMouseLeave={e => { e.currentTarget.style.color = "#555"; e.currentTarget.style.background = "none"; }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
        </button>
      </div>
    </aside>
  );
}

// ── Root shell ────────────────────────────────────────────────────────────────
export default function KSFCommandCenter({ KernBotApp }) {
  const [user,        setUser]        = useState(null);
  const [tab,         setTab]         = useState("kernbot");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (!user) return <UserPicker onLogin={u => { setUser(u); setTab("kernbot"); }} />;

  const handleSignOut = () => { setUser(null); setTab("kernbot"); setSidebarOpen(false); };

  return (
    <div style={{ display: "flex", height: "100vh", background: SHELL_COLORS.bg,
      fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif",
      overflow: "hidden", position: "relative" }}>

      <div className="ksf-sidebar-desktop" style={{ display: "flex" }}>
        <ShellSidebar user={user} tab={tab} setTab={setTab} onSignOut={handleSignOut} />
      </div>

      {sidebarOpen && (
        <>
          <div onClick={() => setSidebarOpen(false)}
            style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 190 }} />
          <ShellSidebar mobile user={user} tab={tab} setTab={setTab}
            onSignOut={handleSignOut} onClose={() => setSidebarOpen(false)} />
        </>
      )}

      <main style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", position: "relative", minWidth: 0 }}>
        <div className="ksf-mobile-bar" style={{ display: "none", alignItems: "center", gap: 10,
          padding: "10px 14px", borderBottom: "1px solid rgba(255,255,255,0.06)", flexShrink: 0, background: "#000" }}>
          <button onClick={() => setSidebarOpen(true)}
            style={{ background: "none", border: "none", color: "#999", cursor: "pointer", padding: 4, display: "flex", alignItems: "center" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
          <span style={{ fontSize: 12, fontWeight: 600, color: "#ddd" }}>KSF Command Center</span>
          <span style={{ fontSize: 11, color: "#999", marginLeft: "auto" }}>
            {ALL_NAV_ITEMS.find(i => i.id === tab)?.label}
          </span>
        </div>

        {/* ── Tab routing ── */}
        {tab === "kernbot"       && <KernBotApp preloadUser={user} />}
        {tab === "dashboard"     && <DashboardApp user={user} setTab={setTab} />}
        {tab === "owner"         && <ComingSoon label="Owner Pending" />}
        {tab === "scope"         && <ComingSoon label="Scope Tracker" />}
        {tab === "changes"       && <ComingSoon label="Change Orders" />}
        {tab === "detailing"     && <ComingSoon label="Detailing" />}
        {tab === "rfi"           && <ComingSoon label="RFI Log" />}
        {tab === "fab"           && <ComingSoon label="Fabrication & Shipping" />}
        {tab === "field"         && <ComingSoon label="Field Needs" />}
        {tab === "user_mgmt"     && <ComingSoon label="User Management" />}
        {tab === "system_config" && <ComingSoon label="System Config" />}
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