// Global "last synced" state — one row shared by every user/browser, instead
// of each browser tracking its own "when did I last load this page" time.
import { prisma } from "../../server/prisma.js";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const state = await prisma.syncState.findUnique({ where: { id: "projectsight" } });
  res.status(200).json({
    lastSyncedAt: state?.lastSyncedAt ?? null,
    ok:           state?.lastSyncOk ?? null,
    error:        state?.lastError ?? null,
    recordCount:  state?.recordCount ?? 0,
  });
}
