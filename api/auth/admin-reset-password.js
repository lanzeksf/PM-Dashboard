// Admin-gated. Generates a new temp password for a target user, same
// one-time-reveal pattern as prisma/seed.js — the plaintext password is
// returned once in this response and never persisted anywhere.
import { prisma } from "../../server/prisma.js";
import { getSessionUser } from "../../server/auth.js";
import { resetUserPassword } from "../../server/resetPassword.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const caller = await getSessionUser(req, res, prisma);
  if (!caller) return res.status(401).json({ error: "No session" });
  if (caller.role !== "admin" && caller.role !== "sr_pm") {
    return res.status(403).json({ error: "Forbidden" });
  }

  const { userId } = req.body || {};
  const target = userId ? await prisma.user.findUnique({ where: { id: userId } }) : null;
  if (!target) return res.status(404).json({ error: "User not found" });

  const tempPassword = await resetUserPassword(prisma, target.id);

  res.status(200).json({ tempPassword, user: { id: target.id, name: target.name, email: target.email } });
}
