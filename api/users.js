// Admin-gated user list for the User Management module. Gate is checked here
// server-side against the caller's own session — the nav entry being hidden
// client-side for non-admins is not a security boundary on its own.
import { prisma } from "../server/prisma.js";
import { getSessionUser } from "../server/auth.js";
import { toClientUser } from "../server/userShape.js";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const caller = await getSessionUser(req, res, prisma);
  if (!caller) return res.status(401).json({ error: "No session" });
  if (caller.role !== "admin" && caller.role !== "sr_pm") {
    return res.status(403).json({ error: "Forbidden" });
  }

  const users = await prisma.user.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true, email: true, name: true, initials: true, color: true, position: true,
      role: true, department: true, canRespond: true, stdWrite: true, mustChangePassword: true,
      lastLoginAt: true, passwordResetRequestedAt: true,
    },
  });

  // Reshaped via toClientUser — the same function login/session use — so
  // each entry here (tier, badge, department as a {label,color,bg} object)
  // is byte-for-byte what a real login as that person would produce. The
  // "View As" testing mode in Shell.jsx depends on that being exact.
  res.status(200).json({
    users: users.map(u => ({
      ...toClientUser(u),
      lastLoginAt: u.lastLoginAt,
      passwordResetRequested: !!u.passwordResetRequestedAt,
    })),
  });
}
