// Feedback intake (any logged-in user, POST) + admin triage (GET list,
// PATCH status). No path params — the dev middleware (vite.config.js) maps
// /api/x literally to api/x.js with no [id]-style bracket routing, so the
// target id for PATCH travels in the body, same as admin-reset-password.js.
import { prisma } from "../server/prisma.js";
import { getSessionUser } from "../server/auth.js";

const MAX_ATTACHMENTS = 4;
const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024; // 5MB — adjust once real screenshot sizes are seen (see CLAUDE.md)

export default async function handler(req, res) {
  const user = await getSessionUser(req, res, prisma);
  if (!user) return res.status(401).json({ error: "No session" });

  if (req.method === "POST") {
    const { type, message, pageContext, attachments } = req.body || {};
    if (!["bug", "thought"].includes(type)) {
      return res.status(400).json({ error: "Invalid type" });
    }
    if (!message || !message.trim()) {
      return res.status(400).json({ error: "Message required" });
    }

    const files = Array.isArray(attachments) ? attachments : [];
    if (files.length > MAX_ATTACHMENTS) {
      return res.status(400).json({ error: `Max ${MAX_ATTACHMENTS} attachments` });
    }
    const buffers = [];
    for (const f of files) {
      const buf = Buffer.from(f.dataBase64 || "", "base64");
      if (buf.length > MAX_ATTACHMENT_BYTES) {
        return res.status(400).json({ error: `${f.fileName} exceeds the ${MAX_ATTACHMENT_BYTES / (1024 * 1024)}MB limit` });
      }
      buffers.push(buf);
    }

    const feedback = await prisma.feedback.create({
      data: {
        type, message: message.trim(), pageContext: pageContext || null,
        submittedById: user.id,
        attachments: {
          create: files.map((f, i) => ({
            fileName: f.fileName, mimeType: f.mimeType, fileSize: buffers[i].length, data: buffers[i],
          })),
        },
      },
    });
    return res.status(200).json({ id: feedback.id });
  }

  // GET (list) and PATCH (status) are triage — admin only.
  if (user.role !== "admin" && user.role !== "sr_pm") {
    return res.status(403).json({ error: "Forbidden" });
  }

  if (req.method === "GET") {
    const items = await prisma.feedback.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        submittedBy: { select: { name: true } },
        attachments: { select: { id: true, fileName: true, mimeType: true, fileSize: true } },
      },
    });
    return res.status(200).json({
      feedback: items.map(f => ({
        id: f.id, type: f.type, message: f.message, status: f.status,
        pageContext: f.pageContext, createdAt: f.createdAt,
        submittedByName: f.submittedBy.name,
        attachments: f.attachments,
      })),
    });
  }

  if (req.method === "PATCH") {
    const { id, status } = req.body || {};
    if (!["open", "done"].includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }
    const updated = await prisma.feedback.update({ where: { id }, data: { status } }).catch(() => null);
    if (!updated) return res.status(404).json({ error: "Not found" });
    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ error: "Method not allowed" });
}
