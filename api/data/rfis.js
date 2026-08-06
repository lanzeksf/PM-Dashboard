// Read-only, DB-backed replacement for a live ProjectSight /rfis call.
//
// Two modes:
//   - ?portfolioId=&projectId= → { rfis: [...] } for that one project
//     (used by getRFIs(), kept for callers like IssueTriageApp/Shell's
//     prefetch that still want a per-project shape).
//   - no query params → { rfisByProject: { [projectKey]: [...] } } for
//     EVERY project in one call (used by RFIApp's bulk load — this is the
//     "don't load 1 by 1" fix: one HTTP round trip instead of one per
//     project).
import { prisma } from "../../server/prisma.js";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const url = new URL(req.url, "http://internal");
  const portfolioId = url.searchParams.get("portfolioId");
  const projectId   = url.searchParams.get("projectId");

  if (portfolioId && projectId) {
    const rows = await prisma.cachedRfi.findMany({ where: { projectKey: `${portfolioId}-${projectId}` } });
    return res.status(200).json({ rfis: rows.map(r => r.raw) });
  }

  const rows = await prisma.cachedRfi.findMany();
  const rfisByProject = {};
  for (const row of rows) {
    (rfisByProject[row.projectKey] ??= []).push(row.raw);
  }
  res.status(200).json({ rfisByProject });
}
