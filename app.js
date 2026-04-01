// ── KSF COMMAND CENTER — APP ───────────────────────────────────────────────
// Vanilla JS. No frameworks, no build step.
// Relies on D (data.js) loaded before this file in index.html.

// ── STATE ──────────────────────────────────────────────────────────────────
let CU  = null;   // current user object
let TAB = "dashboard";

// ── HELPERS ────────────────────────────────────────────────────────────────
const VERT_CHIP = {
  structural: `<span class="chip gray">Structural</span>`,
  solar:      `<span class="chip amb">Solar</span>`,
  aerospace:  `<span class="chip blu">Aerospace</span>`,
};

const RISK_CHIP = {
  High:   `<span class="chip red">High</span>`,
  Medium: `<span class="chip amb">Medium</span>`,
  Low:    `<span class="chip grn">Low</span>`,
};

const PAGE_TITLES = {
  dashboard: "Dashboard",
  rfis:      "Detailer RFIs",
  scope:     "Scope Tracker",
  kernbot:   "Kern Bot",
  fab:       "Fabrication & Shipping",
  field:     "Field Needs",
  owner:     "Owner Pending",
  detailing: "Detailing",
  lanze:     "Lanze View",
};

const PAGE_SUBS = {
  dashboard: () => new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" }),
  rfis:      () => "AI-cleaned RFIs · Loren reviews before routing",
  scope:     () => "Change orders, delays, unnotified cost items",
  kernbot:   () => "Ask anything — AISC, procedures, ProjectSight",
  fab:       () => "Production status — material in to shipped",
  field:     () => "Urgent site issues — all verticals",
  owner:     () => "Client response tracking · flags red at 5+ days",
  detailing: () => "Submittal tracking — all verticals",
  lanze:     () => "Bottleneck analysis · RFI aging · efficiency insights",
};

function projs(u)      { return u.vert ? D.projects.filter(p => p.vert === u.vert) : D.projects; }
function fieldItems(u) { return u.vert ? D.field.filter(f => f.vert === u.vert) : D.field; }

// ── NAV ITEMS ──────────────────────────────────────────────────────────────
function navItems(u) {
  const isJake  = u.id === "jake";
  const isLanze = u.id === "lanze";
  const rfiBadge = u.id === "loren" ? D.rfis.filter(r => r.status === "Pending Loren").length : 0;
  const fBadge   = fieldItems(u).length;

  const items = [{ id: "dashboard", ico: "&#9670;", lbl: "Dashboard" }];
  if (!isJake && !isLanze) items.push({ id: "rfis",   ico: "&#9633;", lbl: "Detailer RFIs", badge: rfiBadge });
  if (!isJake && !isLanze) items.push({ id: "scope",  ico: "&#9638;", lbl: "Scope Tracker" });
  items.push({ id: "kernbot", ico: "&#9675;", lbl: "Kern Bot" });
  if (!isJake)             items.push({ id: "fab",    ico: "&#9642;", lbl: "Fabrication" });
  items.push({ id: "field", ico: "&#9679;", lbl: "Field Needs", badge: fBadge });
  if (!isJake && !isLanze) items.push({ id: "owner",     ico: "&#9680;", lbl: "Owner Pending" });
  if (!isJake && !isLanze) items.push({ id: "detailing", ico: "&#9636;", lbl: "Detailing" });
  if (isLanze || u.id === "loren") items.push({ id: "lanze", ico: "&#9672;", lbl: isLanze ? "My View" : "Lanze View" });
  return items;
}

// ── RENDER: LOGIN ──────────────────────────────────────────────────────────
function renderLogin() {
  return `
    <div class="login-wrap">
      <div class="login-title">&#9881; KSF Command Center</div>
      <div class="login-sub">Kern Steel Fabrication &nbsp;&middot;&nbsp; Select your profile</div>
      <div class="user-grid">
        ${D.users.map(u => `
          <div class="uc" onclick="login('${u.id}')">
            <div class="av" style="width:40px;height:40px;font-size:13px;background:${u.color}">${u.ini}</div>
            <div class="uc-name">${u.name}</div>
            <div class="uc-role">${u.desc}</div>
            ${u.vert ? VERT_CHIP[u.vert] : `<span class="chip pur">All</span>`}
          </div>`).join('')}
      </div>
    </div>`;
}

// ── RENDER: SIDEBAR ────────────────────────────────────────────────────────
function renderSidebar(u) {
  return `
    <div class="sb">
      <div class="sb-brand">
        <div class="sb-brand-t">&#9881; KSF Command Center</div>
        <div class="sb-brand-s">Kern Steel Fabrication</div>
      </div>
      <nav class="sb-nav">
        ${navItems(u).map(it => `
          <button class="nb${TAB === it.id ? " on" : ""}" onclick="setTab('${it.id}')">
            <span class="nb-ico">${it.ico}</span>
            <span class="nb-lbl">${it.lbl}</span>
            ${it.badge > 0 ? `<span class="badge">${it.badge}</span>` : ""}
          </button>`).join('')}
      </nav>
      <div class="sb-bot">
        <div class="av" style="width:28px;height:28px;font-size:10px;background:${u.color}">${u.ini}</div>
        <div style="flex:1">
          <div class="sb-uname">${u.name}</div>
          <div class="sb-urole">${u.role}</div>
        </div>
        <button class="exit-btn" onclick="logout()">Exit</button>
      </div>
    </div>`;
}

// ── RENDER: DASHBOARD ──────────────────────────────────────────────────────
function renderDashboard(u) {
  const ps   = projs(u);
  const fi   = fieldItems(u).filter(f => f.urg === "High");
  const over = D.owner.filter(o =>
    o.status === "Overdue" &&
    (u.vert ? D.projects.find(p => p.name === o.proj && p.vert === u.vert) : true)
  );
  const rfiCnt   = u.vert ? D.rfis.filter(r => r.vert === u.vert).length : D.rfis.length;
  const high     = ps.filter(p => p.risk === "High").length;
  const focusKey = { luis: "solar", jillian: "solar" }[u.id] || u.id;
  const focusArr = D.focus[focusKey] || D.focus.loren;

  return `
    <div class="tip">
      <div class="tip-lbl">Kern Bot &middot; Daily focus</div>
      <div class="tip-txt">${D.tips[u.id] || "Have a productive day."}</div>
    </div>
    <div class="statrow">
      <div class="stat"><div class="stat-l">High risk</div>    <div class="stat-v${high > 0 ? " red" : ""}">${high}</div></div>
      <div class="stat"><div class="stat-l">RFIs pending</div> <div class="stat-v${rfiCnt > 0 ? " amb" : ""}">${rfiCnt}</div></div>
      <div class="stat"><div class="stat-l">Field open</div>   <div class="stat-v${fi.length > 0 ? " red" : " blu"}">${fi.length}</div></div>
      <div class="stat"><div class="stat-l">Owner overdue</div><div class="stat-v${over.length > 0 ? " red" : " blu"}">${over.length}</div></div>
    </div>
    <div class="two">
      <div>
        <div class="sec-lbl">Today's focus</div>
        ${focusArr.map(f => `
          <div class="focus-item">
            <div class="fdot" style="background:${f.c}"></div>
            <div><div class="ftxt">${f.t}</div><div class="fsub">${f.s}</div></div>
          </div>`).join('')}
      </div>
      <div>
        <div class="sec-lbl">Projects at risk</div>
        <div class="cards">
          ${ps.filter(p => p.risk !== "Low").slice(0, 4).map(p => `
            <div class="card">
              <div class="card-top"><span class="card-proj">${p.name}</span>${RISK_CHIP[p.risk]}</div>
              <div class="card-meta">${VERT_CHIP[p.vert]} &nbsp; ${p.phase}</div>
            </div>`).join('')}
        </div>
        ${fi.length > 0 ? `
          <div class="sec-lbl" style="margin-top:4px">Field alerts</div>
          ${fi.slice(0, 3).map(f => `
            <div class="alert"><strong>${f.proj}</strong> &mdash; ${f.issue}</div>`).join('')}` : ""}
      </div>
    </div>`;
}

// ── RENDER: FIELD NEEDS ────────────────────────────────────────────────────
function renderField(u) {
  return `
    <div class="cards">
      ${fieldItems(u).map(f => `
        <div class="card">
          <div class="card-top">
            <div style="display:flex;align-items:center;gap:6px">
              <span class="chip ${f.urg === "High" ? "red" : "amb"}">${f.urg}</span>
              <span class="card-proj">${f.proj}</span>
            </div>
            ${VERT_CHIP[f.vert]}
          </div>
          <div class="card-meta" style="margin-top:4px">${f.issue}</div>
        </div>`).join('')}
    </div>`;
}

// ── RENDER: DETAILER RFIs ──────────────────────────────────────────────────
function renderRFIs(u) {
  const items = u.vert ? D.rfis.filter(r => r.vert === u.vert) : D.rfis;
  return `
    <div class="cards">
      ${items.map(r => `
        <div class="card">
          <div class="card-top">
            <span class="card-proj">${r.ref} &mdash; ${r.proj}</span>
            <span class="chip ${r.status === "Pending Loren" ? "amb" : "gray"}">${r.status}</span>
          </div>
          <div class="card-meta">${r.issue} &nbsp; ${VERT_CHIP[r.vert]}</div>
        </div>`).join('')}
    </div>`;
}

// ── RENDER: OWNER PENDING ──────────────────────────────────────────────────
function renderOwner() {
  return `
    <div class="cards">
      ${D.owner.map(o => `
        <div class="card">
          <div class="card-top">
            <span class="card-proj">${o.proj}</span>
            <span class="chip ${o.status === "Overdue" ? "red" : "amb"}">${o.days}d &middot; ${o.status}</span>
          </div>
          <div class="card-meta">${o.item}</div>
        </div>`).join('')}
    </div>`;
}

// ── RENDER: LANZE VIEW ─────────────────────────────────────────────────────
function renderLanze() {
  const verts  = ["structural", "solar", "aerospace"];
  const labels = { structural: "Structural", solar: "Solar", aerospace: "Aerospace" };
  return `
    <div class="lz-grid">
      ${verts.map(v => {
        const vps = D.projects.filter(p => p.vert === v);
        return `
          <div class="lz-card">
            <div class="lz-title">${VERT_CHIP[v]} ${labels[v]}</div>
            <div class="lz-row"><span>Projects</span>     <span class="lz-val">${vps.length}</span></div>
            <div class="lz-row"><span>High risk</span>    <span class="lz-val${vps.filter(p => p.risk === "High").length ? " red" : ""}">${vps.filter(p => p.risk === "High").length}</span></div>
            <div class="lz-row"><span>Open RFIs</span>    <span class="lz-val">${vps.reduce((a, p) => a + p.rfi, 0)}</span></div>
            <div class="lz-row"><span>Change orders</span><span class="lz-val">${vps.reduce((a, p) => a + p.co, 0)}</span></div>
          </div>`;
      }).join('')}
    </div>
    <div class="sec-lbl">RFI pipeline aging — awaiting Loren</div>
    <div class="cards">
      ${D.rfis.filter(r => r.status === "Pending Loren").map(r => `
        <div class="card">
          <div class="card-top"><span class="card-proj">${r.ref} &mdash; ${r.proj}</span><span class="chip red">Pending review</span></div>
          <div class="card-meta">${r.issue}</div>
        </div>`).join('')}
    </div>
    <div class="sec-lbl">Owner-pending overdue</div>
    <div class="cards">
      ${D.owner.filter(o => o.status === "Overdue").map(o => `
        <div class="card">
          <div class="card-top"><span class="card-proj">${o.proj}</span><span class="chip red">${o.days}d overdue</span></div>
          <div class="card-meta">${o.item}</div>
        </div>`).join('')}
    </div>`;
}

// ── RENDER: PLACEHOLDER ────────────────────────────────────────────────────
function placeholder(lbl) {
  return `<div style="padding:32px;text-align:center;color:var(--txt2);font-size:13px">${lbl} — full module available in the deployed app.</div>`;
}

// ── RENDER: PAGE CONTENT ROUTER ────────────────────────────────────────────
function renderContent(u) {
  switch (TAB) {
    case "dashboard": return renderDashboard(u);
    case "field":     return renderField(u);
    case "rfis":      return renderRFIs(u);
    case "owner":     return renderOwner();
    case "lanze":     return renderLanze();
    default:          return placeholder(PAGE_TITLES[TAB] || TAB);
  }
}

// ── RENDER: FULL APP ───────────────────────────────────────────────────────
function render() {
  const root = document.getElementById("root");
  if (!CU) { root.innerHTML = renderLogin(); return; }

  const titleStr = TAB === "lanze" && CU.id === "lanze" ? "My View" : PAGE_TITLES[TAB] || TAB;
  const subFn    = PAGE_SUBS[TAB];

  root.innerHTML = `
    <div class="shell">
      ${renderSidebar(CU)}
      <div class="main">
        <div class="page">
          <div class="ph">
            <div class="pt">${titleStr}</div>
            <div class="ps">${subFn ? subFn() : ""}</div>
          </div>
          ${renderContent(CU)}
        </div>
      </div>
    </div>`;
}

// ── ACTIONS (called from inline onclick attributes) ────────────────────────
function login(id)  { CU = D.users.find(u => u.id === id); TAB = "dashboard"; render(); }
function logout()   { CU = null; TAB = "dashboard"; render(); }
function setTab(t)  { TAB = t; render(); }

// ── BOOT ───────────────────────────────────────────────────────────────────
render();
