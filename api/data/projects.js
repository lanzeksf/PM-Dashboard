// Read-only, DB-backed replacement for a live ProjectSight /projects call.
// Returns exactly the same shape getProjects() in projectsightApi.js used to
// return directly from ProjectSight (each row already has portfolioId +
// vertical merged in — see server/projectsightSync.js).
import { prisma } from "../../server/prisma.js";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const rows = await prisma.cachedProject.findMany();
  res.status(200).json({ projects: rows.map(r => r.raw) });
}
