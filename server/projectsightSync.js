// Server-side ProjectSight → Postgres sync. Runs on the server (Vercel
// function / local `npm run dev` API middleware / a plain `node` script) —
// never in the browser — so it uses `process.env`, not `import.meta.env`.
//
// Triggered by:
//   - api/sync-projectsight.js, called on a schedule by
//     .github/workflows/sync-projectsight.yml (every ~10 min, via a shared
//     secret header), or manually by a logged-in user clicking "Refresh" on
//     the RFI Dashboard (session-authenticated, same endpoint).
//
// Why: RFIApp.jsx used to call ProjectSight directly, once per project, on
// every page load — slow, and hit Trimble's API repeatedly for data that
// barely changes minute to minute. This pulls everything into Postgres on a
// timer so the app just reads from our own fast DB (see api/data/*.js).
import { prisma } from "./prisma.js";

const BASE = "https://api-usw2.trimblepaas.com/projectsight-v1.0";

// ── OAuth token cache (server-side — separate from the browser-side cache in
// src/projectsight/projectsightApi.js; this process may be short-lived
// serverless invocations, so this cache often won't survive between runs,
// which is fine — it just refetches a token when that happens). ────────────
let _tokenCache = null; // { accessToken, expiresAt }
let _accountId  = null;

async function fetchToken() {
  const key    = process.env.PROJECTSIGHT_CONSUMER_KEY;
  const secret = process.env.PROJECTSIGHT_CONSUMER_SECRET;
  const res = await fetch("https://id.trimble.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=client_credentials&client_id=${encodeURIComponent(key)}&client_secret=${encodeURIComponent(secret)}&scope=ProjectSight`,
  });
  if (!res.ok) throw new Error(`Trimble auth failed ${res.status}: ${await res.text()}`);
  const data = await res.json();
  _tokenCache = { accessToken: data.access_token, expiresAt: Date.now() + (data.expires_in - 30) * 1000 };
  return _tokenCache.accessToken;
}

async function getToken() {
  if (_tokenCache && Date.now() < _tokenCache.expiresAt) return _tokenCache.accessToken;
  return fetchToken();
}

function buildHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
    "x-api-key":   process.env.PROJECTSIGHT_USAGE_PLAN_KEY,
    "Content-Type": "application/json",
  };
}

async function get(path) {
  let token = await getToken();
  let res   = await fetch(`${BASE}${path}`, { headers: buildHeaders(token) });
  if (res.status === 401 || res.status === 403) {
    _tokenCache = null;
    token = await getToken();
    res   = await fetch(`${BASE}${path}`, { headers: buildHeaders(token) });
  }
  if (!res.ok) throw new Error(`ProjectSight ${res.status}: ${await res.text()}`);
  return res.json();
}

async function getAccountId() {
  if (_accountId) return _accountId;
  const data = await get("/accounts");
  const accounts = Array.isArray(data) ? data : data?.accounts ?? [];
  _accountId = accounts[0]?.AccountID ?? accounts[0]?.id ?? accounts[0]?.accountId ?? accounts[0]?.guid;
  if (!_accountId) throw new Error("No account ID returned from /accounts");
  return _accountId;
}

async function fetchAllProjects() {
  const accountId = await getAccountId();
  const portData = await get(`/accounts/${accountId}/portfolios`);
  const portfolios = Array.isArray(portData) ? portData : portData?.portfolios ?? [];

  const results = await Promise.all(
    portfolios.map(async portfolio => {
      const pId = portfolio.PortfolioID ?? portfolio.portfolioGuid ?? portfolio.id ?? portfolio.guid;
      const name = portfolio.Name ?? portfolio.name ?? "";
      if (name.trim().toUpperCase() === "TEST") return [];
      const vertical = name.toLowerCase().includes("solar") ? "Solar"
                      : name.toLowerCase().includes("aero")  ? "Aero"
                      : "Structural";
      try {
        const rawResponse = await get(`/${pId}/projects`);
        const rawArray = Array.isArray(rawResponse) ? rawResponse : rawResponse?.projects ?? [];
        return rawArray.map(p => ({ ...p, portfolioId: pId, vertical }));
      } catch (e) {
        console.warn(`[sync] projects failed for portfolio ${pId} (${name}):`, e.message);
        return [];
      }
    })
  );
  return results.flat();
}

// CC/watcher field is NOT confirmed yet (pending Lanze checking real fields
// against ProjectSight's UI). Logging the full field list + one full sample
// record here so it shows up in the sync's own logs (Vercel function logs in
// prod, this same terminal under `npm run dev` locally) — check for a
// "CcContacts" / "Watchers" / "DistributionList"-shaped field, then wire it
// into the CC'd-only visibility rule in RFIApp.jsx's KSF_LEAD_MAP section.
async function fetchRfisFor(portfolioId, projectId) {
  try {
    const data = await get(`/${portfolioId}/${projectId}/rfis`);
    const rfis = Array.isArray(data) ? data : data?.rfis ?? [];
    if (rfis.length > 0) {
      console.log("[sync][KSF RFI FIELDS]", Object.keys(rfis[0]));
      console.log("[sync][KSF RFI SAMPLE]", JSON.stringify(rfis[0]));
    }
    return rfis;
  } catch (e) {
    console.warn(`[sync] RFIs failed for ${portfolioId}/${projectId}:`, e.message);
    return [];
  }
}

async function fetchIssuesFor(portfolioId, projectId) {
  try {
    const data = await get(`/${portfolioId}/${projectId}/issues`);
    const issues = Array.isArray(data) ? data : data?.issues ?? [];
    if (issues.length > 0) {
      console.log("[sync][KSF ISSUE FIELDS]", Object.keys(issues[0]));
      console.log("[sync][KSF ISSUE SAMPLE]", JSON.stringify(issues[0]));
    }
    return issues;
  } catch (e) {
    console.warn(`[sync] Issues failed for ${portfolioId}/${projectId}:`, e.message);
    return [];
  }
}

// Mirrors rfiIdVal/issIdVal in src/rfi/RFIApp.jsx exactly — needs to produce
// the same stable per-record identity so re-syncing updates the same row
// instead of creating duplicates.
const rfiIdVal   = r => String(r.RFI_ID ?? r.RFIID ?? r.id ?? r.rfiId ?? r.Number ?? r.number ?? "");
const issueIdVal = i => String(i.IssueID ?? i.id ?? i.issueId ?? i.Number ?? i.number ?? "");

export async function runProjectsightSync() {
  const startedAt = Date.now();
  let recordCount = 0;
  try {
    const projects = await fetchAllProjects();

    for (const p of projects) {
      const projectKey = `${p.portfolioId}-${p.ProjectID}`;

      await prisma.cachedProject.upsert({
        where:  { id: projectKey },
        create: {
          id: projectKey, portfolioId: p.portfolioId, projectId: String(p.ProjectID),
          name: p.Name ?? "", vertical: p.vertical,
          typeOfBuilding: (p.TypeOfBuilding ?? "").trim() || null,
          status: p.Status ?? null, raw: p,
        },
        update: {
          name: p.Name ?? "", vertical: p.vertical,
          typeOfBuilding: (p.TypeOfBuilding ?? "").trim() || null,
          status: p.Status ?? null, raw: p,
        },
      });
      recordCount++;

      const [rfis, issues] = await Promise.all([
        fetchRfisFor(p.portfolioId, p.ProjectID),
        fetchIssuesFor(p.portfolioId, p.ProjectID),
      ]);

      for (const r of rfis) {
        const id = `${projectKey}-rfi-${rfiIdVal(r)}`;
        await prisma.cachedRfi.upsert({ where: { id }, create: { id, projectKey, raw: r }, update: { raw: r } });
        recordCount++;
      }
      for (const i of issues) {
        const id = `${projectKey}-issue-${issueIdVal(i)}`;
        await prisma.cachedIssue.upsert({ where: { id }, create: { id, projectKey, raw: i }, update: { raw: i } });
        recordCount++;
      }
    }

    await prisma.syncState.upsert({
      where:  { id: "projectsight" },
      create: { id: "projectsight", lastSyncedAt: new Date(), lastSyncOk: true, lastError: null, recordCount },
      update: { lastSyncedAt: new Date(), lastSyncOk: true, lastError: null, recordCount },
    });

    const ms = Date.now() - startedAt;
    console.log(`[sync] done in ${ms}ms — ${projects.length} projects, ${recordCount} total records`);
    return { ok: true, projectCount: projects.length, recordCount, ms };
  } catch (e) {
    console.error("[sync] FAILED:", e.message);
    await prisma.syncState.upsert({
      where:  { id: "projectsight" },
      create: { id: "projectsight", lastSyncedAt: new Date(), lastSyncOk: false, lastError: e.message, recordCount },
      update: { lastSyncOk: false, lastError: e.message },
    }).catch(() => {});
    throw e;
  }
}
