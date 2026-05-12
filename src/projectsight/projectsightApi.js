const BASE = "/projectsight-api/projectsight-v1.0";

const PORTFOLIOS = [
  { id: "5ce1bcb1-c811-49ac-9039-ec36f3e75f78", name: "Kern Steel Fabrications, Inc", vertical: "Structural" },
  { id: "54bfcdfd-5be5-4e20-b70b-ea11f2549510", name: "Kern Solar Structures",         vertical: "Solar"      },
];

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

function authHeaders() {
  return {
    "Authorization": `Bearer ${import.meta.env.VITE_PROJECTSIGHT_ACCESS_TOKEN}`,
    "x-api-key":     import.meta.env.VITE_PROJECTSIGHT_USAGE_PLAN_KEY,
    "Content-Type":  "application/json",
  };
}

async function get(path) {
  const res = await fetch(`${BASE}${path}`, { method: "GET", headers: authHeaders() });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`ProjectSight ${res.status}: ${body}`);
  }
  return res.json();
}

// Returns all projects across both portfolios, each with a `vertical` field.
export async function getProjects() {
  const results = await Promise.all(
    PORTFOLIOS.map(async ({ id, vertical }) => {
      const data = await get(`/${id}/projects`);
      const list = Array.isArray(data) ? data : data?.projects ?? [];
      return list.map(p => ({ ...p, portfolioId: id, vertical }));
    })
  );
  return results.flat();
}

// Returns RFIs for a specific project.
export async function getRFIs(portfolioId, projectId) {
  const data = await get(`/${portfolioId}/${projectId}/rfis`);
  return Array.isArray(data) ? data : data?.rfis ?? [];
}

// Returns submittals for a specific project.
export async function getSubmittals(portfolioId, projectId) {
  const data = await get(`/${portfolioId}/${projectId}/submittals`);
  return Array.isArray(data) ? data : data?.submittals ?? [];
}

// Returns issues for a specific project. Falls back to mock data if endpoint is unavailable.
export async function getIssues(portfolioId, projectId) {
  try {
    const data = await get(`/${portfolioId}/${projectId}/issues`);
    return Array.isArray(data) ? data : data?.issues ?? [];
  } catch (e) {
    if (/404|400|405|501/.test(e.message)) {
      return MOCK_ISSUES;
    }
    throw e;
  }
}
