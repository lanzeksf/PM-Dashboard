// Streams one feedback attachment's raw bytes back for preview/download —
// admin-gated, same as the rest of feedback triage. attachmentId (a cuid)
// is globally unique, so no feedbackId is needed to disambiguate.
import { prisma } from "../../server/prisma.js";
import { getSessionUser } from "../../server/auth.js";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const user = await getSessionUser(req, res, prisma);
  if (!user) return res.status(401).json({ error: "No session" });
  if (user.role !== "admin" && user.role !== "sr_pm") {
    return res.status(403).json({ error: "Forbidden" });
  }

  const url = new URL(req.url, "http://internal");
  const attachmentId = url.searchParams.get("attachmentId");
  if (!attachmentId) return res.status(400).json({ error: "attachmentId required" });

  const attachment = await prisma.feedbackAttachment.findUnique({ where: { id: attachmentId } });
  if (!attachment) return res.status(404).json({ error: "Not found" });

  res.setHeader("Content-Type", attachment.mimeType);
  res.setHeader("Content-Disposition", `inline; filename="${attachment.fileName}"`);
  res.statusCode = 200;
  res.end(attachment.data);
}
