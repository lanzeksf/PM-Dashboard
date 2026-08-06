// Shared by prisma/seed.js, server/resetPassword.js, and anything else that
// needs to hand a user a one-time temp password.
import crypto from "crypto";

export function randomTempPassword(len = 12) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%";
  return Array.from(crypto.randomFillSync(new Uint8Array(len)))
    .map(b => chars[b % chars.length])
    .join("");
}
