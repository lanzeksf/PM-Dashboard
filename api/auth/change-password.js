import argon2 from "argon2";
import { prisma } from "../../server/prisma.js";
import { getSessionUser } from "../../server/auth.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const user = await getSessionUser(req, prisma);
  if (!user) return res.status(401).json({ error: "No session" });

  const { currentPassword, newPassword } = req.body || {};
  if (!newPassword || newPassword.length < 8) {
    return res.status(400).json({ error: "New password must be at least 8 characters" });
  }

  // The forced first-login reset (mustChangePassword) already proved identity
  // via the temp password at /login — don't ask for it again. Any later,
  // voluntary password change does require it.
  if (!user.mustChangePassword) {
    if (!currentPassword) return res.status(400).json({ error: "Current password required" });
    const valid = await argon2.verify(user.passwordHash, currentPassword);
    if (!valid) return res.status(401).json({ error: "Current password is incorrect" });
  }

  const passwordHash = await argon2.hash(newPassword);
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash, mustChangePassword: false },
  });

  res.status(200).json({ ok: true });
}
