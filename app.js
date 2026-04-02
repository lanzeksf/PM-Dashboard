// ── KSF COMMAND CENTER — APP ───────────────────────────────────────────────
// Vanilla JS. No frameworks, no build step.
// Relies on D (data.js) loaded before this file in index.html.

// ── STATE ──────────────────────────────────────────────────────────────────
let CU           = null;
let TAB          = "dashboard";
let PROJ_FILTER  = "all";
let FILTER_OPEN  = false;
let FILTER_QUERY = "";

// ── VERT CHIPS ─────────────────────────────────────────────────────────────
const VERT_CHIP = {
  structural: '<span class="chip gray">Structural</span>',
  solar:      '<span class="chip grn">Solar</span>',
  aerospace:  '<span class="chip blu">Aerospace</span>',
};

const RISK_CHIP = {
  High:   '<span class="chip red">High</span>',
  Medium: '<span class="chip amb">Medium</span>',
  Low:    '<span class="chip grn">Low</span>',
};

// ── SVG ICONS ──────────────────────────────────────────────────────────────
const ICONS = {
  dashboard:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>',
  rfis:         '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><line x1="9" y1="12" x2="15" y2="12"/><line x1="9" y1="16" x2="13" y2="16"/></svg>',
  scope:        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>',
  changeorders: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></svg>',
  kernbot:      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="10" rx="2"/><circle cx="12" cy="5" r="2"/><line x1="12" y1="7" x2="12" y2="11"/><circle cx="8.5" cy="16" r="1" fill="currentColor" stroke="none"/><circle cx="15.5" cy="16" r="1" fill="currentColor" stroke="none"/></svg>',
  fab:          '<svg viewBox="0 0 32 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><line x1="2" y1="3" x2="30" y2="3"/><line x1="2" y1="21" x2="30" y2="21"/><line x1="16" y1="3" x2="16" y2="21"/><line x1="2" y1="3" x2="2" y2="7"/><line x1="30" y1="3" x2="30" y2="7"/><line x1="2" y1="17" x2="2" y2="21"/><line x1="30" y1="17" x2="30" y2="21"/></svg>',
  field:        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
  owner:        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2A19.79 19.79 0 0 1 11.69 19 19.5 19.5 0 0 1 5 12.31 19.79 19.79 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>',
  detailing:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>',
  lanze:        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>',
  back:         '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>',
};

// ── PAGE META ──────────────────────────────────────────────────────────────
const PAGE_TITLES = {
  dashboard:    "Dashboard",
  rfis:         "Detailer RFIs",
  scope:        "Scope Tracker",
  changeorders: "Change Orders",
  kernbot:      "Kern Bot",
  fab:          "Fabrication & Shipping",
  field:        "Field Needs",
  owner:        "Owner Pending",
  detailing:    "Detailing",
  lanze:        "Lanze View",
};

const PAGE_SUBS = {
  dashboard:    () => new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" }),
  rfis:         () => "AI-cleaned RFIs · Loren reviews before routing",
  scope:        () => "Change orders, delays, unnotified cost items",
  changeorders: () => "Approved, pending, and in-progress change orders by project",
  kernbot:      () => "Ask anything — AISC, procedures, ProjectSight",
  fab:          () => "Production status — material in to shipped",
  field:        () => "Urgent site issues — all verticals",
  owner:        () => "Client response tracking · flags red at 5+ days",
  detailing:    () => "Submittal tracking — all verticals",
  lanze:        () => "Bottleneck analysis · RFI aging · efficiency insights",
};

// ── HELPERS ────────────────────────────────────────────────────────────────
function projs(u)      { return u.vert ? D.projects.filter(p => p.vert === u.vert) : D.projects; }
function fieldItems(u) { return u.vert ? D.field.filter(f => f.vert === u.vert) : D.field; }

// ── NAV ITEMS ──────────────────────────────────────────────────────────────
function navItems(u) {
  const isJake  = u.id === "jake";
  const isLanze = u.id === "lanze";
  const rfiBadge = u.id === "loren" ? D.rfis.filter(r => r.status === "Pending Loren").length : 0;
  const fBadge   = fieldItems(u).length;

  const items = [{ id: "dashboard", ico: "dashboard", lbl: "Dashboard" }];
  if (!isJake && !isLanze) items.push({ id: "rfis",          ico: "rfis",          lbl: "Detailer RFIs",  badge: rfiBadge });
  if (!isJake && !isLanze) items.push({ id: "scope",         ico: "scope",         lbl: "Scope Tracker" });
  items.push(                          { id: "changeorders",  ico: "changeorders",  lbl: "Change Orders" });
  items.push(                          { id: "kernbot",       ico: "kernbot",       lbl: "Kern Bot" });
  if (!isJake)             items.push({ id: "fab",           ico: "fab",           lbl: "Fabrication" });
  items.push(                          { id: "field",         ico: "field",         lbl: "Field Needs",    badge: fBadge });
  if (!isJake && !isLanze) items.push({ id: "owner",         ico: "owner",         lbl: "Owner Pending" });
  if (!isJake && !isLanze) items.push({ id: "detailing",     ico: "detailing",     lbl: "Detailing" });
  if (isLanze || u.id === "loren") items.push({ id: "lanze", ico: "lanze",         lbl: isLanze ? "My View" : "Lanze View" });
  return items;
}

// ── RENDER: LOGIN ──────────────────────────────────────────────────────────
function renderLogin() {
  return `
    <div class="login-wrap">
      <div style="font-family:'Arial Black',Arial,sans-serif;font-size:72px;font-weight:900;color:var(--txt);letter-spacing:-3px;line-height:1;margin-bottom:14px">KSF</div>
      <div class="login-title">&#9881; KSF Command Center</div>
      <div class="login-sub">Kern Steel Fabrication &nbsp;&middot;&nbsp; Select your profile</div>
      <div class="user-grid">
        ${D.users.map(u => `
          <div class="uc" onclick="login('${u.id}')">
            <div class="av" style="width:52px;height:52px;font-size:16px;background:${u.color}">${u.ini}</div>
            <div class="uc-name">${u.name}</div>
            <div class="uc-role">${u.desc}</div>
            ${u.vert ? VERT_CHIP[u.vert] : '<span class="chip pur">All</span>'}
          </div>`).join('')}
      </div>
    </div>`;
}

// ── RENDER: SIDEBAR ────────────────────────────────────────────────────────
function renderSidebar(u) {
  return `
    <div class="sb">
      <div class="sb-brand">
        <div>
          <div style="font-family:'Arial Black',Arial,sans-serif;font-size:28px;font-weight:900;color:var(--txt);letter-spacing:-1px;line-height:1;margin-bottom:6px">KSF</div>
          <div class="sb-brand-t">&#9881; KSF Command Center</div>
          <div class="sb-brand-s">Kern Steel Fabrication</div>
        </div>
        <button class="sb-exit" onclick="logout()" title="Switch user">${ICONS.back}</button>
      </div>
      <nav class="sb-nav">
        ${navItems(u).map(it => `
          <button class="nb${TAB === it.id ? " on" : ""}" onclick="setTab('${it.id}')">
            <span class="nb-ico">${ICONS[it.ico] || ""}</span>
            <span class="nb-lbl">${it.lbl}</span>
            ${it.badge > 0 ? `<span class="badge">${it.badge}</span>` : ""}
          </button>`).join('')}
      </nav>
      <div class="sb-bot">
        <div class="av" style="width:32px;height:32px;font-size:11px;background:${u.color}">${u.ini}</div>
        <div style="flex:1">
          <div class="sb-uname">${u.name}</div>
          <div class="sb-urole">${u.role}</div>
        </div>
      </div>
    </div>`;
}

// ── RENDER: PROJECT FILTER BAR ─────────────────────────────────────────────
function renderFilterBar(u) {
  const ps = projs(u);
  const selected = PROJ_FILTER === "all" ? "All Projects" : (ps.find(p => String(p.id) === PROJ_FILTER) || {}).name || "All Projects";
  const filtered = FILTER_QUERY.trim()
    ? ps.filter(p => p.name.toLowerCase().includes(FILTER_QUERY.toLowerCase()))
    : ps;

  return `
    <div class="filter-bar">
      <span class="filter-label">Project:</span>
      <div class="filter-dropdown" id="filter-dd">
        <button class="filter-btn" onclick="toggleFilter(event)">
          <span class="filter-btn-label">${selected}</span>
          <span class="filter-btn-arrow${FILTER_OPEN ? " open" : ""}">&#9660;</span>
        </button>
        ${FILTER_OPEN ? `
          <div class="filter-menu" id="filter-menu">
            <input
              class="filter-search"
              id="filter-search-input"
              placeholder="Search projects..."
              value="${FILTER_QUERY}"
              oninput="updateFilterQuery(this.value)"
              onclick="event.stopPropagation()"
              autofocus
            >
            <div class="filter-options">
              ${!FILTER_QUERY ? `
                <button class="filter-opt${PROJ_FILTER === 'all' ? ' on' : ''}" onclick="setFilter('all')">All Projects</button>
                <div class="filter-divider"></div>` : ""}
              ${filtered.length > 0
                ? filtered.map(p => `
                    <button class="filter-opt${PROJ_FILTER === String(p.id) ? ' on' : ''}" onclick="setFilter('${p.id}')">
                      ${p.name}
                    </button>`).join('')
                : `<div style="padding:12px 14px;font-size:13px;color:var(--txt2)">No projects match</div>`}
            </div>
          </div>` : ""}
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
            <div style="display:flex;align-items:center;gap:8px">
              <span class="chip ${f.urg === "High" ? "red" : "amb"}">${f.urg}</span>
              <span class="card-proj">${f.proj}</span>
            </div>
            ${VERT_CHIP[f.vert]}
          </div>
          <div class="card-meta" style="margin-top:5px">${f.issue}</div>
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

// ── RENDER: CHANGE ORDERS ──────────────────────────────────────────────────
function renderChangeOrders(u) {
  const ps = projs(u).filter(p => p.co > 0);
  if (!ps.length) return `<div style="padding:32px;text-align:center;color:var(--txt2);font-size:14px">No change orders logged.</div>`;
  const STATUSES = ["Pending Approval", "Approved", "In Progress", "Rejected"];
  return `
    <div class="cards">
      ${ps.map((p, i) => {
        const status = STATUSES[i % STATUSES.length];
        const sc = status === "Approved" ? "grn" : status === "Rejected" ? "red" : status === "In Progress" ? "blu" : "amb";
        return `
          <div class="card">
            <div class="card-top">
              <span class="card-proj">${p.name}</span>
              <span class="chip ${sc}">${status}</span>
            </div>
            <div class="card-meta">
              ${VERT_CHIP[p.vert]} &nbsp;
              <strong>${p.co}</strong> change order${p.co > 1 ? "s" : ""} &nbsp;&middot;&nbsp; Phase: ${p.phase}
            </div>
          </div>`;
      }).join('')}
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
  return `<div style="padding:40px;text-align:center;color:var(--txt2);font-size:14px">${lbl} — full module available in the deployed app.</div>`;
}

// ── RENDER: PAGE CONTENT ROUTER ────────────────────────────────────────────
function renderContent(u) {
  switch (TAB) {
    case "dashboard":    return renderDashboard(u);
    case "field":        return renderField(u);
    case "rfis":         return renderRFIs(u);
    case "owner":        return renderOwner();
    case "changeorders": return renderChangeOrders(u);
    case "lanze":        return renderLanze();
    default:             return placeholder(PAGE_TITLES[TAB] || TAB);
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
        ${renderFilterBar(CU)}
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

// ── ACTIONS ────────────────────────────────────────────────────────────────
function login(id)            { CU = D.users.find(u => u.id === id); TAB = "dashboard"; PROJ_FILTER = "all"; FILTER_OPEN = false; FILTER_QUERY = ""; render(); }
function logout()             { CU = null; TAB = "dashboard"; PROJ_FILTER = "all"; FILTER_OPEN = false; FILTER_QUERY = ""; render(); }
function setTab(t)            { TAB = t; render(); }
function setFilter(id)        { PROJ_FILTER = id; FILTER_OPEN = false; FILTER_QUERY = ""; render(); }
function toggleFilter(e)      { e.stopPropagation(); FILTER_OPEN = !FILTER_OPEN; if (!FILTER_OPEN) FILTER_QUERY = ""; render(); }
function updateFilterQuery(v) { FILTER_QUERY = v; render(); setTimeout(() => { const el = document.getElementById("filter-search-input"); if (el) { el.focus(); el.setSelectionRange(el.value.length, el.value.length); } }, 0); }

document.addEventListener("click", (e) => {
  if (FILTER_OPEN && !e.target.closest("#filter-dd")) {
    FILTER_OPEN = false; FILTER_QUERY = ""; render();
  }
});

// ── BOOT ───────────────────────────────────────────────────────────────────
render();