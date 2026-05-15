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

const MOCK_ISSUES = [
  {
    id: "mock-1", _isMock: true,
    title: "Connection conflict — grid B4 HSS-to-W-beam",
    description: "In drawing S-204 the connection show HSS 6x6x1/2 direct weld to W18x97 bottom flange but dimension not matching with section cut on S-312. Need clarification which drawing take precedent and also if stiffener plate require.",
    status: "Open",
    createdDate: new Date(Date.now() - 3 * 86400000).toISOString(),
  },
  {
    id: "mock-2", _isMock: true,
    title: "Missing anchor bolt projection — column A1 base plate",
    description: "Drawing S-101 not show anchor bolt projection dimension for base plate at column grid A1. Need confirm dimension before proceed fabrication. Hole pattern is 4 bolt but bolt size not specify on drawing.",
    status: "Open",
    createdDate: new Date(Date.now() - 5 * 86400000).toISOString(),
  },
  {
    id: "mock-3", _isMock: true,
    title: "Purlin spacing inconsistency — solar bay C",
    description: "Bay C purlin spacing on roof plan show 5'-0\" but in the detail section it show 4'-6\". Which dimension is control? Also tube size for purlin — is it HSS 4x2x3/16 or HSS 4x2x1/4?",
    status: "Open",
    createdDate: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: "mock-4", _isMock: true,
    title: "Camber mark missing on W18x97 beams — Level 2",
    description: "W18x97 beam on grid line D Level 2 not show camber mark on erection drawing. Shop drawing show 3/4\" camber. Please confirm if camber required and update mark on erection plan to avoid confusion during erection.",
    status: "Open",
    createdDate: new Date(Date.now() - 2 * 86400000).toISOString(),
  },
];

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
  console.log("[ProjectSight] /accounts raw response:", JSON.stringify(data).slice(0, 300));
  const accounts = Array.isArray(data) ? data : data?.accounts ?? [];
  console.log("[ProjectSight] Accounts parsed:", accounts.length, accounts[0]);
  _accountId = accounts[0]?.AccountID ?? accounts[0]?.id ?? accounts[0]?.accountId ?? accounts[0]?.guid;
  console.log("[ProjectSight] Account ID resolved:", _accountId);
  if (!_accountId) throw new Error("No account ID returned from /accounts");
  return _accountId;
}

// ── HTTP helper ───────────────────────────────────────────────────────────────

async function get(path) {
  console.log("Fetching:", `${BASE}${path}`);
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
  console.log("[ProjectSight] getProjects() called — starting live fetch");
  console.log("[ProjectSight] Fetching live projects...");
  try {
    const accountId = await getAccountId();
    console.log("[ProjectSight] Account ID:", accountId);
    const portData = await get(`/accounts/${accountId}/portfolios`);
    console.log("[ProjectSight] Raw portfolios:", JSON.stringify(portData).slice(0, 400));
    const portfolios = Array.isArray(portData) ? portData : portData?.portfolios ?? [];
    console.log("[ProjectSight] Portfolios parsed:", portfolios.length);

    const results = await Promise.all(
      portfolios.map(async (portfolio) => {
        const pId = portfolio.PortfolioID ?? portfolio.portfolioGuid ?? portfolio.id ?? portfolio.guid;
        const name = portfolio.Name ?? portfolio.name ?? "";
        if (name.trim().toUpperCase() === "TEST") {
          console.log("[ProjectSight] Skipping TEST portfolio:", pId);
          return [];
        }
        const vertical = name.toLowerCase().includes("solar") ? "Solar"
                       : name.toLowerCase().includes("aero")  ? "Aero"
                       : "Structural";
        try {
          console.log("[ProjectSight] Fetching projects for portfolio:", pId, name);
          const PAGE_SIZE = 100;
          let skip = 0;
          const allPages = [];
          while (true) {
            const projData = await get(`/${pId}/projects?$top=${PAGE_SIZE}&$skip=${skip}`);
            const page = Array.isArray(projData) ? projData : projData?.projects ?? [];
            allPages.push(...page);
            if (page.length < PAGE_SIZE) break;
            skip += PAGE_SIZE;
            console.log(`[ProjectSight] Portfolio ${pId}: fetched page, skip=${skip}, total so far ${allPages.length}`);
          }
          if (allPages.length > 0) {
            console.log("[ProjectSight] Sample project keys:", Object.keys(allPages[0]));
            console.log("[ProjectSight] Sample project:", JSON.stringify(allPages[0]).slice(0, 400));
          }
          return allPages.map(p => ({ ...p, portfolioId: pId, vertical }));
        } catch (e) {
          console.warn(`[ProjectSight] Could not load projects for portfolio ${pId}:`, e.message);
          return [];
        }
      })
    );
    const seen = new Set();
    const flat = results.flat().filter(p => {
      const id = p.ProjectID;
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    });
    console.log(`[ProjectSight] Loaded ${flat.length} live projects`);
    console.log("[ProjectSight] Live projects sample:", flat.slice(0,2).map(p => ({ id: p.id, name: p.name })));
    console.log('[ProjectSight] Total projects after pagination:', flat.length);
    flat.forEach(p => console.log('[ProjectSight] Project:', p.ProjectID, p.Number, p.Name));
    return flat.length > 0 ? flat : MOCK_PROJECTS;
  } catch (e) {
    console.error("[ProjectSight] getProjects() FAILED:", e.message, e.stack);
    console.log("[ProjectSight] Falling back to MOCK_PROJECTS");
    return MOCK_PROJECTS;
  }
}

// Returns RFIs for a specific project.
export async function getRFIs(portfolioId, projectId) {
  console.log("[ProjectSight] Fetching RFIs:", portfolioId, projectId);
  try {
    const data = await get(`/${portfolioId}/${projectId}/rfis`);
    const rfis = Array.isArray(data) ? data : data?.rfis ?? [];
    console.log(`[ProjectSight] Loaded ${rfis.length} RFIs for project ${projectId}`);
    if (rfis.length > 0) {
      console.log('[ProjectSight] Sample RFI keys:', Object.keys(rfis[0]));
      console.log('[ProjectSight] Sample RFI:', JSON.stringify(rfis[0]).slice(0, 600));
    }
    console.log('[ProjectSight] ALL RFIs for debug:', JSON.stringify(rfis.slice(0,5)));
    return rfis;
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

// Returns issues for a specific project. Falls back to mock data if the live call fails.
export async function getIssues(portfolioId, projectId) {
  try {
    const data = await get(`/${portfolioId}/${projectId}/issues`);
    const issues = Array.isArray(data) ? data : data?.issues ?? [];
    return issues.length > 0 ? issues : MOCK_ISSUES;
  } catch (e) {
    console.warn("[ProjectSight] getIssues() failed, using mock:", e.message);
    return MOCK_ISSUES;
  }
}
