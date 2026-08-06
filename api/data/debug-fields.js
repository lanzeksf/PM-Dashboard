// Temporary — open this in your browser (http://localhost:5173/api/data/debug-fields
// while `npm run dev` is running) to see the real field names ProjectSight
// returns on one RFI and one Issue, without digging through server logs.
// Used to find the CC'd/watcher field for RFIApp.jsx's KSF_LEAD_MAP visibility
// rule. Session-gated (any logged-in user) since it's read-only and only
// exposes one sample record, not the whole dataset. Delete this file once the
// CC field is confirmed and wired in — it's not meant to be permanent.
import { prisma } from "../../server/prisma.js";
import { getSessionUser } from "../../server/auth.js";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const user = await getSessionUser(req, res, prisma);
  if (!user) return res.status(401).json({ error: "No session" });

  const [rfi, issue] = await Promise.all([
    prisma.cachedRfi.findFirst(),
    prisma.cachedIssue.findFirst(),
  ]);

  res.status(200).json({
    rfi: rfi ? { fields: Object.keys(rfi.raw), sample: rfi.raw } : null,
    issue: issue ? { fields: Object.keys(issue.raw), sample: issue.raw } : null,
  });
}
