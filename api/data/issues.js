// Read-only, DB-backed replacement for a live ProjectSight /issues call.
// Same two-mode shape as api/data/rfis.js — see that file's comment.
import { prisma } from "../../server/prisma.js";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const url = new URL(req.url, "http://internal");
  const portfolioId = url.searchParams.get("portfolioId");
  const projectId   = url.searchParams.get("projectId");

  if (portfolioId && projectId) {
    const rows = await prisma.cachedIssue.findMany({ where: { projectKey: `${portfolioId}-${projectId}` } });
    return res.status(200).json({ issues: rows.map(r => r.raw) });
  }

  const rows = await prisma.cachedIssue.findMany();
  const issuesByProject = {};
  for (const row of rows) {
    (issuesByProject[row.projectKey] ??= []).push(row.raw);
  }
  res.status(200).json({ issuesByProject });
}
