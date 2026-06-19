const BASE = "/projectsight-api/projectsight-v1.0";

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


// ── OAuth token cache ─────────────────────────────────────────────────────────

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

// ── HTTP helper ───────────────────────────────────────────────────────────────

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

// Returns all projects across all portfolios, each with a `vertical` field.
export async function getProjects() {
  try {
    const accountId = await getAccountId();
    const portData = await get(`/accounts/${accountId}/portfolios`);
    const portfolios = Array.isArray(portData) ? portData : portData?.portfolios ?? [];

    const results = await Promise.all(
      portfolios.map(async (portfolio) => {
        const pId = portfolio.PortfolioID ?? portfolio.portfolioGuid ?? portfolio.id ?? portfolio.guid;
        const name = portfolio.Name ?? portfolio.name ?? "";
        if (name.trim().toUpperCase() === "TEST") return [];
        const vertical = name.toLowerCase().includes("solar") ? "Solar"
                       : name.toLowerCase().includes("aero")  ? "Aero"
                       : "Structural";
        try {
          const url = `/${pId}/projects`;
          const rawResponse = await get(url);
          const rawArray = Array.isArray(rawResponse) ? rawResponse : rawResponse?.projects ?? [];
          console.log('[KSF RAW]', name, 'raw count:', rawArray.length, 'fetch URL:', url);
          console.log('[KSF META]', name, 'response keys:', Array.isArray(rawResponse) ? '[array]' : Object.keys(rawResponse ?? {}));
          return rawArray.map(p => ({ ...p, portfolioId: pId, vertical }));
        } catch (e) {
          console.warn(`[ProjectSight] Could not load projects for portfolio ${pId} (${name}):`, e.message);
          return [];
        }
      })
    );
    const rawArray = results.flat();
    console.log('[KSF RAW] Kern Steel raw count:', rawArray.length);
    console.log('[KSF RAW] All Kern Steel projects:', JSON.stringify(rawArray.map(p => ({id: p.ProjectID, num: p.Number, name: p.Name}))));
    return rawArray.length > 0 ? rawArray : MOCK_PROJECTS;
  } catch (e) {
    console.error("[ProjectSight] getProjects() FAILED:", e.message, e.stack);
    return MOCK_PROJECTS;
  }
}

// Returns RFIs for a specific project.
export async function getRFIs(portfolioId, projectId) {
  try {
    const data = await get(`/${portfolioId}/${projectId}/rfis`);
    return Array.isArray(data) ? data : data?.rfis ?? [];
  } catch (e) {
    console.warn("[ProjectSight] getRFIs() failed, using mock:", e.message);
    return MOCK_RFIS[projectId] ?? [];
  }
}

// Returns submittals for a specific project.
export async function getSubmittals(portfolioId, projectId) {
  try {
    const data = await get(`/${portfolioId}/${projectId}/submittals`);
    return Array.isArray(data) ? data : data?.submittals ?? [];
  } catch (e) {
    console.warn("[ProjectSight] getSubmittals() failed:", e.message);
    return [];
  }
}

// Returns issues for a specific project.
export async function getIssues(portfolioId, projectId) {
  try {
    let token = await getToken();
    let response = await fetch(`${BASE}/${portfolioId}/${projectId}/issues`, {
      method: "GET",
      headers: buildHeaders(token),
    });
    if (response.status === 401 || response.status === 403) {
      _tokenCache = null;
      token = await getToken();
      response = await fetch(`${BASE}/${portfolioId}/${projectId}/issues`, {
        method: "GET",
        headers: buildHeaders(token),
      });
    }
    console.log('[Issues] HTTP status:', response.status);
    if (!response.ok) {
      const body = await response.text();
      throw new Error(`ProjectSight ${response.status}: ${body}`);
    }
    const data = await response.json();
    const issues = Array.isArray(data) ? data : data?.issues ?? [];
    console.log('[Issues] Count:', issues.length);
    if (issues.length > 0) {
      console.log('[KSF ISSUES FIELDS]', Object.keys(issues[0]));
      console.log('[KSF ISSUES SAMPLE]', issues[0]);
    }
    return issues;
  } catch (e) {
    console.warn("[ProjectSight] getIssues() failed:", e.message);
    return [];
  }
}

// Discovery — LACCD Theater (portfolioId: 5ce1bcb1-…, projectId: 36)
getIssues("5ce1bcb1-c811-49ac-9039-ec36f3e75f78", "36");

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

// ── Temp: test file download endpoint ────────────────────────────────────────
export async function testFileDownload(portfolioId, projectId, fileId) {
  let token = await getToken();
  let res = await fetch(`${BASE}/${portfolioId}/${projectId}/files/${fileId}/download`, {
    method: "GET",
    headers: buildHeaders(token),
  });
  if (res.status === 401 || res.status === 403) {
    _tokenCache = null;
    token = await getToken();
    res = await fetch(`${BASE}/${portfolioId}/${projectId}/files/${fileId}/download`, {
      method: "GET",
      headers: buildHeaders(token),
    });
  }
  if (res.ok) {
    console.log('[KSF FILE DOWNLOAD 200]', res.headers.get('content-type'), 'size:', res.headers.get('content-length'));
  } else {
    console.log('[KSF FILE DOWNLOAD FAIL]', res.status);
  }
}
