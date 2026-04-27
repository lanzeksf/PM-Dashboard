import React, { useState } from "react";
import { USERS_LIST, C } from "../core/utils.js";

// ── Shell constants ───────────────────────────────────────────────────────────
export const SHELL_COLORS = { bg: "#05080b" };

export const BG_PHOTO = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='1200' height='800'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' y1='0' x2='1' y2='1'%3E%3Cstop offset='0%25' stop-color='%2334d399'/%3E%3Cstop offset='100%25' stop-color='%23040b12'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='100%25' height='100%25' fill='url(%23g)'/%3E%3C/svg%3E";

export const SHELL_USERS = [
  { id: "loren",   name: "Loren C.",   role: "Senior PM",              initials: "LC", color: "#a78bfa", email: "loren@kernsteel.com",   password: "ksf123" },
  { id: "lanze",   name: "Lanze A.",   role: "Manufacturing Engineer", initials: "LA", color: "#22c55e", email: "lanze@kernsteel.com",   password: "ksf123" },
  { id: "tony",    name: "Tony S.",    role: "Structural Coordinator", initials: "TS", color: "#38bdf8", email: "tony@kernsteel.com",    password: "ksf123" },
  { id: "luis",    name: "Luis A.",    role: "Solar APM",              initials: "LU", color: "#f59e0b", email: "luis@kernsteel.com",    password: "ksf123" },
  { id: "jillian", name: "Jillian H.", role: "Solar Coordinator",      initials: "JH", color: "#f472b6", email: "jillian@kernsteel.com", password: "ksf123" },
  { id: "adam",    name: "Adam K.",    role: "Aerospace Engineer",     initials: "AK", color: "#fb923c", email: "adam@kernsteel.com",    password: "ksf123" },
  { id: "jacob",   name: "Jacob T.",   role: "Field Coordinator",      initials: "JT", color: "#4ade80", email: "jacob@kernsteel.com",   password: "ksf123" },
];

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

// ── Kern Bot user picker login (inner app) ────────────────────────────────────
export function LoginScreen({ onLogin }) {
  return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontFamily: "system-ui,-apple-system,sans-serif", padding: "2rem" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: "2rem" }}>
        <div style={{ width: 40, height: 40, borderRadius: 10, background: "#1e2340", border: "1px solid rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{ color: "#fff", fontWeight: 700, fontSize: 14 }}>KSF</span>
        </div>
        <div>
          <p style={{ margin: 0, fontWeight: 500, fontSize: 18, color: C.text }}>Kern Bot</p>
          <p style={{ margin: 0, fontSize: 12, color: C.muted }}>Select your profile to continue</p>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 10, width: "100%", maxWidth: 640 }}>
        {USERS_LIST.map(u => (
          <button key={u.id} onClick={() => onLogin(u)}
            style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: "16px 12px", cursor: "pointer", textAlign: "center", fontFamily: "inherit", transition: "border-color 0.15s", outline: "none" }}
            onMouseEnter={e => e.currentTarget.style.borderColor = u.color + "60"}
            onMouseLeave={e => e.currentTarget.style.borderColor = C.border}
          >
            <div style={{ width: 40, height: 40, borderRadius: "50%", background: u.color + "28", border: `1px solid ${u.color}40`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 10px" }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: u.color }}>{u.initials}</span>
            </div>
            <p style={{ margin: 0, fontWeight: 500, fontSize: 13, color: C.text }}>{u.name}</p>
            <p style={{ margin: "2px 0 0", fontSize: 11, color: C.muted }}>{u.position}</p>
            {u.tier === "admin" && (
              <span style={{ fontSize: 9, padding: "2px 7px", borderRadius: 20, background: C.pmDim, color: C.pm, display: "inline-block", marginTop: 6 }}>Admin</span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Shell login (email/password) ──────────────────────────────────────────────
function ShellLogin({ onLogin }) {
  const [view,       setView]       = useState("login");
  const [forgotSent, setForgotSent] = useState(false);
  const [email,      setEmail]      = useState("");
  const [password,   setPassword]   = useState("");
  const [showPw,     setShowPw]     = useState(false);
  const [error,      setError]      = useState("");

  const handleLogin = () => {
    const normalized = email.trim().toLowerCase();
    if (!normalized || !password) { setError("Enter your email and password."); return; }
    const user = SHELL_USERS.find(u => u.email === normalized);
    if (!user) { setError("No account found for that email."); return; }
    if (user.password !== password) { setError("Incorrect password."); return; }
    setError(""); onLogin(user);
  };

  const handleForgot = () => {
    const normalized = email.trim().toLowerCase();
    if (!normalized) { setError("Enter your work email to reset your password."); return; }
    setError(""); setForgotSent(true);
  };

  const inpStyle = { width: "100%", padding: "12px 12px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.05)", color: "#fff", fontSize: 14, fontFamily: "inherit", outline: "none", boxSizing: "border-box" };
  const lblStyle = { display: "block", marginBottom: 6, fontSize: 12, color: "rgba(255,255,255,0.65)", fontWeight: 600, letterSpacing: "0.01em" };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px", position: "relative", background: "#000000", color: "#ffffff", overflow: "hidden" }}>
      <style>{`
        .ksfl-inp { color:#fff; background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.12); border-radius:10px; transition:border-color .15s,box-shadow .15s; }
        .ksfl-inp:focus { outline:none; border-color:rgba(255,255,255,0.38)!important; box-shadow:0 0 0 3px rgba(255,255,255,0.06); }
        .ksfl-btn { color:#fff; background:rgba(255,255,255,0.12); border:none; border-radius:8px; cursor:pointer; font-family:inherit; transition:background .15s; }
        .ksfl-btn:hover { background:rgba(255,255,255,0.2)!important; }
        .ksfl-card { animation:ksflCardIn .55s cubic-bezier(.22,1,.36,1) both; }
        .ksfl-title { animation:ksflTitleIn .6s cubic-bezier(.22,1,.36,1) .06s both; }
        @keyframes ksflCardIn  { from{opacity:0;transform:translateY(22px)} to{opacity:1;transform:translateY(0)} }
        @keyframes ksflTitleIn { from{opacity:0;transform:translateY(-14px)} to{opacity:1;transform:translateY(0)} }
      `}</style>

      <div style={{ position: "absolute", inset: 0, backgroundImage: `url(${BG_PHOTO})`, backgroundSize: "cover", backgroundPosition: "center" }} />
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(165deg,rgba(0,0,0,0.08) 0%,rgba(0,0,0,0.28) 45%,rgba(0,0,0,0.55) 100%)" }} />
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 80% 80% at 50% 50%,transparent 35%,rgba(0,0,0,0.5) 100%)", pointerEvents: "none" }} />

      <div style={{ width: "100%", maxWidth: 400, position: "relative", zIndex: 10, padding: "0 20px" }}>
        <div className="ksfl-title" style={{ textAlign: "center", marginBottom: 26 }}>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700, color: "#ffffff", letterSpacing: "-0.03em", textShadow: "0 2px 24px rgba(0,0,0,0.7)" }}>KSF Command Center</h1>
          <p style={{ margin: "6px 0 0", fontSize: 11, fontWeight: 400, color: "rgba(255,255,255,0.35)", letterSpacing: "0.14em", textTransform: "uppercase" }}>Kern Steel Fabrication</p>
        </div>

        <div className="ksfl-card" style={{ background: "rgba(5,8,11,0.88)", overflow: "hidden" }}>
          <div style={{ padding: "26px 26px 24px" }}>
            {forgotSent ? (
              <div style={{ textAlign: "center", padding: "6px 0" }}>
                <div style={{ width: 44, height: 44, borderRadius: "50%", margin: "0 auto 14px", background: "rgba(52,211,153,0.14)", border: "1px solid rgba(52,211,153,0.28)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17l-5-5" stroke="#34d399" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </div>
                <p style={{ margin: "0 0 6px", fontSize: 15, fontWeight: 600, color: "#fff" }}>Check your email</p>
                <p style={{ margin: "0 0 20px", fontSize: 13, color: "rgba(255,255,255,0.45)", lineHeight: 1.65 }}>A reset link is on its way to <span style={{ color: "rgba(255,255,255,0.75)" }}>{email || "your email"}</span>.</p>
                <button onClick={() => { setForgotSent(false); setView("login"); }} style={{ width: "100%", padding: "10px", fontSize: 13, background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8, color: "rgba(255,255,255,0.55)", cursor: "pointer", fontFamily: "inherit" }}>← Back to sign in</button>
              </div>
            ) : view === "forgot" ? (
              <>
                <p style={{ margin: "0 0 18px", fontSize: 14, fontWeight: 400, color: "rgba(255,255,255,0.55)" }}>Reset your password</p>
                <div style={{ marginBottom: error ? 10 : 18 }}>
                  <label style={lblStyle}>Work email</label>
                  <input className="ksfl-inp" style={inpStyle} value={email} onChange={e => { setEmail(e.target.value); setError(""); }} placeholder="name@kernsteel.com" type="email" onKeyDown={e => e.key === "Enter" && handleForgot()} />
                </div>
                {error && <div style={{ padding: "8px 11px", marginBottom: 12, background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.2)", borderRadius: 7, fontSize: 12, color: "#fca5a5" }}>{error}</div>}
                <button className="ksfl-btn" onClick={handleForgot} style={{ width: "100%", padding: "11px", fontSize: 13, fontWeight: 500, marginBottom: 14 }}>Send reset link</button>
                <div style={{ textAlign: "center" }}><button onClick={() => { setView("login"); setError(""); }} style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.28)", fontSize: 12, fontFamily: "inherit" }}>← Back to sign in</button></div>
              </>
            ) : (
              <>
                <p style={{ margin: "0 0 18px", fontSize: 14, fontWeight: 400, color: "rgba(255,255,255,0.5)" }}>Sign in to your account</p>
                <div style={{ marginBottom: 12 }}>
                  <label style={lblStyle}>Work email</label>
                  <input className="ksfl-inp" style={inpStyle} value={email} onChange={e => { setEmail(e.target.value); setError(""); }} placeholder="name@kernsteel.com" type="email" onKeyDown={e => e.key === "Enter" && handleLogin()} />
                </div>
                <div style={{ marginBottom: error ? 10 : 20 }}>
                  <label style={lblStyle}>Password</label>
                  <div style={{ position: "relative" }}>
                    <input className="ksfl-inp" style={{ ...inpStyle, paddingRight: 40 }} value={password} onChange={e => { setPassword(e.target.value); setError(""); }} type={showPw ? "text" : "password"} placeholder="Enter your password" onKeyDown={e => e.key === "Enter" && handleLogin()} />
                    <button onClick={() => setShowPw(p => !p)} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.28)", padding: 2, display: "flex" }}>
                      {showPw
                        ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                        : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>}
                    </button>
                  </div>
                </div>
                {error && <div style={{ padding: "8px 11px", marginBottom: 14, background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.2)", borderRadius: 7, fontSize: 12, color: "#fca5a5" }}>{error}</div>}
                <button className="ksfl-btn" onClick={handleLogin} style={{ width: "100%", padding: "11px", fontSize: 13, fontWeight: 500, marginBottom: 14, letterSpacing: "0.02em" }}>Sign in</button>
                <div style={{ textAlign: "center" }}><button onClick={() => { setView("forgot"); setError(""); }} style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.28)", fontSize: 12, fontFamily: "inherit" }}>Forgot password?</button></div>
              </>
            )}
          </div>
        </div>
        <p style={{ textAlign: "center", marginTop: 14, fontSize: 10, color: "rgba(255,255,255,0.15)", letterSpacing: "0.1em", textTransform: "uppercase" }}>Internal use only</p>
      </div>
    </div>
  );
}

// ── Shell sidebar ─────────────────────────────────────────────────────────────
function ShellSidebar({ shellUser, tab, setTab, mobile = false, onSignOut, onClose }) {
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

      <div style={{ height: 1, background: "rgba(255,255,255,0.05)", margin: "8px 12px 0" }} />
      <div style={{ padding: "12px 12px 16px", display: "flex", alignItems: "center", gap: 9 }}>
        <div style={{ width: 28, height: 28, borderRadius: "50%", background: shellUser.color + "22", border: `1px solid ${shellUser.color}44`, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 10, color: shellUser.color, flexShrink: 0, letterSpacing: "0.02em" }}>
          {shellUser.initials}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: 12, fontWeight: 500, color: "#ddd", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{shellUser.name}</p>
          <p style={{ margin: 0, fontSize: 11, color: "#555", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{shellUser.role}</p>
        </div>
        <button onClick={onSignOut} title="Sign out"
          style={{ width: 24, height: 24, borderRadius: 4, background: "none", border: "none", color: "#555", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0, padding: 0 }}
          onMouseEnter={e => { e.currentTarget.style.color = "#aaa"; e.currentTarget.style.background = "rgba(255,255,255,0.06)"; }}
          onMouseLeave={e => { e.currentTarget.style.color = "#555"; e.currentTarget.style.background = "none"; }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>
        </button>
      </div>
    </aside>
  );
}

// ── Root shell ────────────────────────────────────────────────────────────────
// KernBotApp is passed in as a prop to avoid a circular import with store/utils
export default function KSFCommandCenter({ KernBotApp }) {
  const [shellUser,    setShellUser]    = useState(null);
  const [tab,          setTab]          = useState("kernbot");
  const [sidebarOpen,  setSidebarOpen]  = useState(false);

  if (!shellUser) {
    return <ShellLogin onLogin={u => { setShellUser(u); setTab("kernbot"); }} />;
  }

  const kbUser = USERS_LIST.find(u => u.id === shellUser.id) || USERS_LIST[0];

  return (
    <div style={{ display: "flex", height: "100vh", background: SHELL_COLORS.bg, fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif", overflow: "hidden", position: "relative" }}>
      <div className="ksf-sidebar-desktop" style={{ display: "flex" }}>
        <ShellSidebar shellUser={shellUser} tab={tab} setTab={setTab} onSignOut={() => setShellUser(null)} />
      </div>

      {sidebarOpen && (
        <>
          <div onClick={() => setSidebarOpen(false)} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 190 }} />
          <ShellSidebar mobile shellUser={shellUser} tab={tab} setTab={setTab} onSignOut={() => setShellUser(null)} onClose={() => setSidebarOpen(false)} />
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

        {tab === "kernbot"   && <KernBotApp preloadUser={kbUser} />}
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
