// Shared by api/auth/admin-reset-password.js (in-app, requires an admin
// session) and scripts/reset-password.js (CLI, direct DB access — the
// break-glass path for when no admin can log in at all). Same effect either
// way: new temp password, forced change on next login, every existing
// session for that user revoked immediately.
import argon2 from "argon2";
import { randomTempPassword } from "./tempPassword.js";

export async function resetUserPassword(prisma, userId) {
  const tempPassword = randomTempPassword();
  const passwordHash = await argon2.hash(tempPassword);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: { passwordHash, mustChangePassword: true, passwordResetRequestedAt: null },
    }),
    prisma.session.deleteMany({ where: { userId } }),
  ]);

  return tempPassword;
}
