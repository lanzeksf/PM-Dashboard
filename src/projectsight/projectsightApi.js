const MOCK_PROJECTS = [
  { ProjectID: "proj-001", Name: "Dignity Health — Parking Structure B",          portfolioId: "5ce1bcb1-c811-49ac-9039-ec36f3e75f78", vertical: "Structural", _isMock: true },
  { ProjectID: "proj-002", Name: "Tejon Ranch Commerce Center — Building 4",      portfolioId: "5ce1bcb1-c811-49ac-9039-ec36f3e75f78", vertical: "Structural", _isMock: true },
  { ProjectID: "proj-003", Name: "Bakersfield College — Science Building",         portfolioId: "5ce1bcb1-c811-49ac-9039-ec36f3e75f78", vertical: "Structural", _isMock: true },
  { ProjectID: "proj-004", Name: "IKEA Distribution Center — Mezzanine",          portfolioId: "5ce1bcb1-c811-49ac-9039-ec36f3e75f78", vertical: "Structural", _isMock: true },
  { ProjectID: "proj-005", Name: "Edwards AFB — Solar Carport Phase 1",           portfolioId: "54bfcdfd-5be5-4e20-b70b-ea11f2549510", vertical: "Solar",      _isMock: true },
  { ProjectID: "proj-006", Name: "Rosamond Unified School District — Carport Array", portfolioId: "54bfcdfd-5be5-4e20-b70b-ea11f2549510", vertical: "Solar",   _isMock: true },
  { ProjectID: "proj-007", Name: "Antelope Valley Mall — EV Carport",             portfolioId: "54bfcdfd-5be5-4e20-b70b-ea11f2549510", vertical: "Solar",      _isMock: true },
];

const MOCK_RFIS = {
  "proj-001": [
    { id: "rfi-001-1", number: "RFI-0012", _isMock: true, jobNumber: "KSF-2025-041", assignedCompany: "ATC Group Services",      discipline: "Structural", importance: "High",   title: "Moment connection bolt pattern — grid C3 beam-to-column", status: "Under Review", submittedDate: new Date(Date.now() - 12 * 86400000).toISOString(), dueDate: new Date(Date.now() -  2 * 86400000).toISOString() },
    { id: "rfi-001-2", number: "RFI-0013", _isMock: true, jobNumber: "KSF-2025-041", assignedCompany: "ATC Group Services",      discipline: "Structural", importance: "Normal", title: "W24x76 camber requirement — Level 3 transfer beams",       status: "Answered",    submittedDate: new Date(Date.now() - 20 * 86400000).toISOString(), dueDate: new Date(Date.now() - 10 * 86400000).toISOString() },
    { id: "rfi-001-3", number: "RFI-0014", _isMock: true, jobNumber: "KSF-2025-041", assignedCompany: "ATC Group Services",      discipline: "Structural", importance: "Normal", title: "Base plate weld size at HSS column — drawing conflict",    status: "Submitted",   submittedDate: new Date(Date.now() -  3 * 86400000).toISOString(), dueDate: new Date(Date.now() +  5 * 86400000).toISOString() },
    { id: "rfi-001-4", number: "RFI-0015", _isMock: true, jobNumber: "KSF-2025-041", assignedCompany: "ATC Group Services",      discipline: "Structural", importance: "Low",    title: "Shear tab cope depth at W18 end condition",               status: "Draft",       submittedDate: new Date(Date.now() -  1 * 86400000).toISOString(), dueDate: new Date(Date.now() +  9 * 86400000).toISOString() },
  ],
  "proj-002": [
    { id: "rfi-002-1", number: "RFI-0007", _isMock: true, jobNumber: "KSF-2025-031", assignedCompany: "Pacific Steel Detailing", discipline: "Structural", importance: "Normal", title: "HSS 8x8 chord splice location — bay D truss",             status: "Answered",    submittedDate: new Date(Date.now() - 30 * 86400000).toISOString(), dueDate: new Date(Date.now() - 18 * 86400000).toISOString() },
    { id: "rfi-002-2", number: "RFI-0008", _isMock: true, jobNumber: "KSF-2025-031", assignedCompany: "Pacific Steel Detailing", discipline: "Structural", importance: "High",   title: "Embed plate tolerance — tilt-up panel interface",         status: "Under Review",submittedDate: new Date(Date.now() -  8 * 86400000).toISOString(), dueDate: new Date(Date.now() +  2 * 86400000).toISOString() },
    { id: "rfi-002-3", number: "RFI-0009", _isMock: true, jobNumber: "KSF-2025-031", assignedCompany: "Pacific Steel Detailing", discipline: "Structural", importance: "Normal", title: "A572 Gr50 substitution for A36 angle clips",              status: "Submitted",   submittedDate: new Date(Date.now() -  4 * 86400000).toISOString(), dueDate: new Date(Date.now() +  6 * 86400000).toISOString() },
  ],
  "proj-003": [
    { id: "rfi-003-1", number: "RFI-0003", _isMock: true, jobNumber: "KSF-2025-027", assignedCompany: "SDS2 Solutions",          discipline: "Structural", importance: "Normal", title: "Anchor rod projection — seismic base plate grid A1–A4",  status: "Answered",    submittedDate: new Date(Date.now() - 45 * 86400000).toISOString(), dueDate: new Date(Date.now() - 35 * 86400000).toISOString() },
    { id: "rfi-003-2", number: "RFI-0004", _isMock: true, jobNumber: "KSF-2025-027", assignedCompany: "SDS2 Solutions",          discipline: "Structural", importance: "Urgent", title: "Stiffener plate requirement — W12 column at Level 2",    status: "Under Review",submittedDate: new Date(Date.now() -  9 * 86400000).toISOString(), dueDate: new Date(Date.now() -  1 * 86400000).toISOString() },
    { id: "rfi-003-3", number: "RFI-0005", _isMock: true, jobNumber: "KSF-2025-027", assignedCompany: "SDS2 Solutions",          discipline: "Structural", importance: "Normal", title: "Kicker brace connection detail missing — stair tower",   status: "Draft",       submittedDate: new Date(Date.now() -  2 * 86400000).toISOString(), dueDate: new Date(Date.now() +  8 * 86400000).toISOString() },
    { id: "rfi-003-4", number: "RFI-0006", _isMock: true, jobNumber: "KSF-2025-027", assignedCompany: "SDS2 Solutions",          discipline: "Structural", importance: "Low",    title: "HSS 4x4 handrail post weld — galvanize after or before", status: "Submitted",   submittedDate: new Date(Date.now() -  5 * 86400000).toISOString(), dueDate: new Date(Date.now() +  3 * 86400000).toISOString() },
    { id: "rfi-003-5", number: "RFI-0007", _isMock: true, jobNumber: "KSF-2025-051", assignedCompany: "SDS2 Solutions",          discipline: "Structural", importance: "Normal", title: "Erection sequence for cantilevered canopy — grid H",     status: "Submitted",   submittedDate: new Date(Date.now() -  6 * 86400000).toISOString(), dueDate: new Date(Date.now() +  4 * 86400000).toISOString() },
  ],
  "proj-004": [
    { id: "rfi-004-1", number: "RFI-0001", _isMock: true, jobNumber: "KSF-2025-019", assignedCompany: "TDS Detailing",           discipline: "Structural", importance: "Normal", title: "Mezzanine joist bearing seat height — column cap plates", status: "Answered",    submittedDate: new Date(Date.now() - 14 * 86400000).toISOString(), dueDate: new Date(Date.now() -  5 * 86400000).toISOString() },
    { id: "rfi-004-2", number: "RFI-0002", _isMock: true, jobNumber: "KSF-2025-019", assignedCompany: "TDS Detailing",           discipline: "Structural", importance: "High",   title: "Deck edge angle spec — 18GA vs 16GA at perimeter",       status: "Under Review",submittedDate: new Date(Date.now() -  7 * 86400000).toISOString(), dueDate: new Date(Date.now() +  1 * 86400000).toISOString() },
  ],
  "proj-005": [
    { id: "rfi-005-1", number: "RFI-0009", _isMock: true, jobNumber: "KSF-2025-053", assignedCompany: "Pacific Steel Detailing", discipline: "Solar",      importance: "Urgent", title: "Footing depth at north row — geotech conflict with IFC", status: "Under Review",submittedDate: new Date(Date.now() - 10 * 86400000).toISOString(), dueDate: new Date(Date.now() -  1 * 86400000).toISOString() },
    { id: "rfi-005-2", number: "RFI-0010", _isMock: true, jobNumber: "KSF-2025-053", assignedCompany: "Pacific Steel Detailing", discipline: "Solar",      importance: "Normal", title: "Purlin splice location — bay 7 rafter span",             status: "Answered",    submittedDate: new Date(Date.now() - 18 * 86400000).toISOString(), dueDate: new Date(Date.now() -  8 * 86400000).toISOString() },
    { id: "rfi-005-3", number: "RFI-0011", _isMock: true, jobNumber: "KSF-2025-053", assignedCompany: "Pacific Steel Detailing", discipline: "Solar",      importance: "High",   title: "EV conduit sleeve — base plate interference grid F2",    status: "Submitted",   submittedDate: new Date(Date.now() -  4 * 86400000).toISOString(), dueDate: new Date(Date.now() +  6 * 86400000).toISOString() },
    { id: "rfi-005-4", number: "RFI-0012", _isMock: true, jobNumber: "KSF-2025-056", assignedCompany: "Pacific Steel Detailing", discipline: "Solar",      importance: "Low",    title: "HSS 6x4 upright wall thickness — A500 Gr.C vs Gr.B",    status: "Draft",       submittedDate: new Date(Date.now() -  1 * 86400000).toISOString(), dueDate: new Date(Date.now() + 10 * 86400000).toISOString() },
  ],
  "proj-006": [
    { id: "rfi-006-1", number: "RFI-0004", _isMock: true, jobNumber: "KSF-2025-047", assignedCompany: "ATC Group Services",      discipline: "Solar",      importance: "Normal", title: "Anchor bolt edge distance — compact soil near building",  status: "Answered",    submittedDate: new Date(Date.now() - 22 * 86400000).toISOString(), dueDate: new Date(Date.now() - 12 * 86400000).toISOString() },
    { id: "rfi-006-2", number: "RFI-0005", _isMock: true, jobNumber: "KSF-2025-047", assignedCompany: "ATC Group Services",      discipline: "Solar",      importance: "High",   title: "Panel tilt angle tolerance — ±0.5° vs ±1° per spec",    status: "Under Review",submittedDate: new Date(Date.now() -  6 * 86400000).toISOString(), dueDate: new Date(Date.now() +  2 * 86400000).toISOString() },
    { id: "rfi-006-3", number: "RFI-0006", _isMock: true, jobNumber: "KSF-2025-047", assignedCompany: "ATC Group Services",      discipline: "Solar",      importance: "Normal", title: "Rafter-to-upright bolted connection — torque spec missing",status: "Submitted",  submittedDate: new Date(Date.now() -  3 * 86400000).toISOString(), dueDate: new Date(Date.now() +  7 * 86400000).toISOString() },
  ],
  "proj-007": [
    { id: "rfi-007-1", number: "RFI-0002", _isMock: true, jobNumber: "KSF-2025-061", assignedCompany: "SDS2 Solutions",          discipline: "Solar",      importance: "High",   title: "Canopy beam splice — high-bay light fixture interference", status: "Under Review",submittedDate: new Date(Date.now() - 11 * 86400000).toISOString(), dueDate: new Date(Date.now() -  3 * 86400000).toISOString() },
    { id: "rfi-007-2", number: "RFI-0003", _isMock: true, jobNumber: "KSF-2025-061", assignedCompany: "SDS2 Solutions",          discipline: "Solar",      importance: "Normal", title: "Diagonal brace HSS wall thickness — wind load zone 3",   status: "Submitted",   submittedDate: new Date(Date.now() -  5 * 86400000).toISOString(), dueDate: new Date(Date.now() +  5 * 86400000).toISOString() },
    { id: "rfi-007-3", number: "RFI-0004", _isMock: true, jobNumber: "KSF-2025-062", assignedCompany: "SDS2 Solutions",          discipline: "Solar",      importance: "Low",    title: "EV charger pedestal weld — dissimilar metal concern",    status: "Draft",       submittedDate: new Date(Date.now() -  2 * 86400000).toISOString(), dueDate: new Date(Date.now() + 12 * 86400000).toISOString() },
  ],
};

// ── DB-backed reads (Projects / RFIs / Issues) ───────────────────────────────
// getProjects()/getRFIs()/getIssues() used to call ProjectSight directly from
// the browser on every page load — slow, and hammered Trimble's API for data
// that barely changes minute to minute. They now read from our own Postgres
// cache via api/data/*.js, kept fresh by a background sync (see
// server/projectsightSync.js + .github/workflows/sync-projectsight.yml).
// Manual "Refresh" now means "re-sync from ProjectSight into Postgres, then
// re-read" — see triggerProjectsightSync() below.
//
// getSubmittals()/postIssueComment()/postRFIFromIssue()/testFileDownload()
// are unchanged — they still call ProjectSight directly (not in scope for the
// Postgres cache yet; Submittals persistence is a separate, later effort).

const BASE = "/projectsight-api/projectsight-v1.0";

// ── OAuth token cache — still needed for the ProjectSight calls that remain
// direct from the browser (getSubmittals, postIssueComment, postRFIFromIssue,
// testFileDownload). ─────────────────────────────────────────────────────────
let _tokenCache  = null; // { accessToken, expiresAt }
let _accountId   = null;

async function fetchToken() {
  const key    = import.meta.env.VITE_PROJECTSIGHT_CONSUMER_KEY;
  const secret = import.meta.env.VITE_PROJECTSIGHT_CONSUMER_SECRET;
  const res = await fetch("https://id.trimble.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=client_credentials&client_id=${encodeURIComponent(key)}&client_secret=${encodeURIComponent(secret)}&scope=ProjectSight`,
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Trimble auth failed ${res.status}: ${body}`);
  }
  const data = await res.json();
  _tokenCache = {
    accessToken: data.access_token,
    expiresAt:   Date.now() + (data.expires_in - 30) * 1000,
  };
  return _tokenCache.accessToken;
}

async function getToken() {
  if (_tokenCache && Date.now() < _tokenCache.expiresAt) return _tokenCache.accessToken;
  return fetchToken();
}

// ── Per-project RFI/Issue cache ─────────────────────────────────────────────
// Short in-browser TTL on top of the DB-backed reads above — mostly guards
// against firing the same request twice in quick succession (e.g. a prefetch
// racing the user opening the tab); the DB itself is already fast.
const CACHE_TTL_MS = 4 * 60 * 1000; // 4 minutes

function makeCache() {
  const data     = new Map(); // key -> { value, expiresAt }
  const inFlight = new Map(); // key -> Promise

  async function withCache(key, fetcher) {
    const cached = data.get(key);
    if (cached && Date.now() < cached.expiresAt) return cached.value;

    const pending = inFlight.get(key);
    if (pending) return pending;

    const promise = fetcher()
      .then(value => { data.set(key, { value, expiresAt: Date.now() + CACHE_TTL_MS }); inFlight.delete(key); return value; })
      .catch(err => { inFlight.delete(key); throw err; });

    inFlight.set(key, promise);
    return promise;
  }

  return { withCache, clear: () => { data.clear(); inFlight.clear(); } };
}

const projectsCache = makeCache();
const rfiCache      = makeCache();
const issueCache    = makeCache();
const bulkCache     = makeCache();

// Bypasses the TTL/in-flight cache above — call this from a manual "Refresh"
// action so it actually hits the network instead of serving a stale cache.
export function clearProjectsightApiCache() {
  projectsCache.clear();
  rfiCache.clear();
  issueCache.clear();
  bulkCache.clear();
}

function buildHeaders(token) {
  return {
    "Authorization": `Bearer ${token}`,
    "x-api-key":     import.meta.env.VITE_PROJECTSIGHT_USAGE_PLAN_KEY,
    "Content-Type":  "application/json",
  };
}

async function getAccountId() {
  if (_accountId) return _accountId;
  const data = await get("/accounts");
  const accounts = Array.isArray(data) ? data : data?.accounts ?? [];
  _accountId = accounts[0]?.AccountID ?? accounts[0]?.id ?? accounts[0]?.accountId ?? accounts[0]?.guid;
  if (!_accountId) throw new Error("No account ID returned from /accounts");
  return _accountId;
}

// ── HTTP helper (Trimble, direct — still used by getSubmittals and the
// write-side test calls below) ──────────────────────────────────────────────

async function get(path) {
  let token = await getToken();
  let res   = await fetch(`${BASE}${path}`, { method: "GET", headers: buildHeaders(token) });
  if (res.status === 401 || res.status === 403) {
    _tokenCache = null;
    token = await getToken();
    res   = await fetch(`${BASE}${path}`, { method: "GET", headers: buildHeaders(token) });
  }
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`ProjectSight ${res.status}: ${body}`);
  }
  return res.json();
}

// Returns all projects across all portfolios, each with a `vertical` field —
// now a read from our own Postgres cache instead of a live Trimble call.
export async function getProjects() {
  return projectsCache.withCache("all", async () => {
    try {
      const res = await fetch("/api/data/projects");
      if (!res.ok) throw new Error(`data/projects ${res.status}`);
      const data = await res.json();
      // Empty is a legitimate state (nothing synced yet) — NOT the same as a
      // failed request. Only the catch block below falls back to mock data.
      return data.projects ?? [];
    } catch (e) {
      console.warn("[ProjectSight] getProjects() (DB-backed) failed, using mock:", e.message);
      return MOCK_PROJECTS;
    }
  });
}

// Returns RFIs for a specific project — DB-backed (see getProjects() above).
export async function getRFIs(portfolioId, projectId) {
  return rfiCache.withCache(`${portfolioId}:${projectId}`, async () => {
    try {
      const res = await fetch(`/api/data/rfis?portfolioId=${encodeURIComponent(portfolioId)}&projectId=${encodeURIComponent(projectId)}`);
      if (!res.ok) throw new Error(`data/rfis ${res.status}`);
      const data = await res.json();
      return data.rfis ?? [];
    } catch (e) {
      console.warn("[ProjectSight] getRFIs() (DB-backed) failed, using mock:", e.message);
      return MOCK_RFIS[projectId] ?? [];
    }
  });
}

// Returns issues for a specific project — DB-backed (see getProjects() above).
export async function getIssues(portfolioId, projectId) {
  return issueCache.withCache(`${portfolioId}:${projectId}`, async () => {
    try {
      const res = await fetch(`/api/data/issues?portfolioId=${encodeURIComponent(portfolioId)}&projectId=${encodeURIComponent(projectId)}`);
      if (!res.ok) throw new Error(`data/issues ${res.status}`);
      const data = await res.json();
      return data.issues ?? [];
    } catch (e) {
      console.warn("[ProjectSight] getIssues() (DB-backed) failed:", e.message);
      return [];
    }
  });
}

// Bulk reads — every project's RFIs/Issues in ONE call instead of one call
// per project. RFIApp.jsx's main load effect uses these; per-project
// getRFIs()/getIssues() above stay in place for callers (IssueTriageApp,
// Shell's old prefetch shape) that want a single project's records.
export async function getAllRFIs() {
  return bulkCache.withCache("rfis:all", async () => {
    const res = await fetch("/api/data/rfis");
    if (!res.ok) throw new Error(`data/rfis ${res.status}`);
    const data = await res.json();
    return data.rfisByProject ?? {};
  });
}

export async function getAllIssues() {
  return bulkCache.withCache("issues:all", async () => {
    const res = await fetch("/api/data/issues");
    if (!res.ok) throw new Error(`data/issues ${res.status}`);
    const data = await res.json();
    return data.issuesByProject ?? {};
  });
}

// Global "last synced" state — shared across every user/browser (see
// api/data/sync-status.js), not a per-browser "when did I last load this".
export async function getSyncStatus() {
  const res = await fetch("/api/data/sync-status");
  if (!res.ok) throw new Error(`sync-status ${res.status}`);
  return res.json();
}

// Manual "Refresh" — re-syncs Postgres from ProjectSight, then the caller is
// expected to clear the caches above and re-fetch. Session-authenticated
// (same cookie as every other logged-in call); the GitHub Actions cron hits
// the same endpoint with a separate secret-header path instead.
export async function triggerProjectsightSync() {
  const res = await fetch("/api/sync-projectsight", { method: "POST", credentials: "include" });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `sync ${res.status}`);
  }
  return res.json();
}

// Returns submittals for a specific project. Still a direct ProjectSight
// call — Submittals aren't in the Postgres cache yet (separate, later effort).
export async function getSubmittals(portfolioId, projectId) {
  try {
    const data = await get(`/${portfolioId}/${projectId}/submittals`);
    return Array.isArray(data) ? data : data?.submittals ?? [];
  } catch (e) {
    console.warn("[ProjectSight] getSubmittals() failed:", e.message);
    return [];
  }
}

// POST a comment to an existing issue (test only)
export async function postIssueComment(portfolioId, projectId, issueId, commentText) {
  let token = await getToken();
  let res = await fetch(`${BASE}/${portfolioId}/${projectId}/issues/${issueId}/comments`, {
    method: "POST",
    headers: buildHeaders(token),
    body: JSON.stringify({ text: commentText }),
  });
  if (res.status === 401 || res.status === 403) {
    _tokenCache = null;
    token = await getToken();
    res = await fetch(`${BASE}/${portfolioId}/${projectId}/issues/${issueId}/comments`, {
      method: "POST",
      headers: buildHeaders(token),
      body: JSON.stringify({ text: commentText }),
    });
  }
  if (res.ok) {
    const response = await res.json().catch(() => ({}));
    console.log('[KSF COMMENT POST 200]', response);
  } else {
    const errBody = await res.text();
    console.log('[KSF COMMENT POST FAIL]', res.status, errBody);
  }
}

// POST a new RFI from an issue (test only)
export async function postRFIFromIssue(portfolioId, projectId, subject, body) {
  let token = await getToken();
  let res = await fetch(`${BASE}/${portfolioId}/${projectId}/rfis`, {
    method: "POST",
    headers: buildHeaders(token),
    body: JSON.stringify({ Subject: subject, Body: body }),
  });
  if (res.status === 401 || res.status === 403) {
    _tokenCache = null;
    token = await getToken();
    res = await fetch(`${BASE}/${portfolioId}/${projectId}/rfis`, {
      method: "POST",
      headers: buildHeaders(token),
      body: JSON.stringify({ Subject: subject, Body: body }),
    });
  }
  if (res.ok) {
    const response = await res.json().catch(() => ({}));
    console.log('[KSF RFI POST 200]', response);
  } else {
    const errBody = await res.text();
    console.log('[KSF RFI POST FAIL]', res.status, errBody);
  }
}

// ── Temp: test file endpoint patterns ────────────────────────────────────────
export async function testFileDownload(portfolioId, projectId, fileId, fileVersionId) {
  const token = await getToken();

  // Attempt 1: GET /{portfolioId}/{projectId}/files/{fileId}
  const res1 = await fetch(`${BASE}/${portfolioId}/${projectId}/files/${fileId}`, {
    method: "GET",
    headers: buildHeaders(token),
  });
  if (res1.ok) {
    const meta = await res1.json();
    console.log('[KSF FILE META]', JSON.stringify(meta, null, 2));
  } else {
    console.log('[KSF FILE TEST 1] FAIL', res1.status);
  }

  // Attempt 2: GET /{portfolioId}/{projectId}/files/{fileVersionId}/download
  const res2 = await fetch(`${BASE}/${portfolioId}/${projectId}/files/${fileVersionId}/download`, {
    method: "GET",
    headers: buildHeaders(token),
  });
  if (res2.ok) {
    console.log('[KSF FILE TEST 2] 200', res2.headers.get('content-type'), 'size:', res2.headers.get('content-length'));
  } else {
    console.log('[KSF FILE TEST 2] FAIL', res2.status);
  }
}
