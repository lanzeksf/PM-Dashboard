// Triggers a ProjectSight → Postgres sync (see server/projectsightSync.js).
// Two callers, two auth paths:
//   1. GitHub Actions cron (.github/workflows/sync-projectsight.yml) — sends
//      `x-cron-secret` matching SYNC_CRON_SECRET (server-only env var, never
//      exposed to the browser).
//   2. The RFI Dashboard's "Refresh" button — sends the normal session
//      cookie, same as every other logged-in API call.
import { prisma } from "../server/prisma.js";
import { getSessionUser } from "../server/auth.js";
import { runProjectsightSync } from "../server/projectsightSync.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const cronSecret = req.headers["x-cron-secret"];
  const isCron = !!process.env.SYNC_CRON_SECRET && cronSecret === process.env.SYNC_CRON_SECRET;

  if (!isCron) {
    const user = await getSessionUser(req, res, prisma);
    if (!user) return res.status(401).json({ error: "No session" });
  }

  try {
    const result = await runProjectsightSync();
    res.status(200).json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
