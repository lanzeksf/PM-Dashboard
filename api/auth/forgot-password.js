// Notify-only — no self-service reset. Records that a reset was requested so
// an admin sees it flagged in User Management; the actual reset still
// requires an admin to run admin-reset-password.js.
//
// Always returns the same generic response whether or not the email
// matches a user — this endpoint must never reveal which emails exist.
import { prisma } from "../../server/prisma.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { email } = req.body || {};
  if (email) {
    await prisma.user.updateMany({
      where: { email: String(email).toLowerCase().trim() },
      data: { passwordResetRequestedAt: new Date() },
    });
  }

  res.status(200).json({ ok: true });
}
