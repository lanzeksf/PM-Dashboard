import argon2 from "argon2";
import { prisma } from "../../server/prisma.js";
import { generateToken, sessionCookie, SESSION_TTL_SECONDS } from "../../server/auth.js";
import { toClientUser } from "../../server/userShape.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: "Email and password required" });

  const user = await prisma.user.findUnique({ where: { email: String(email).toLowerCase().trim() } });
  if (!user) return res.status(401).json({ error: "Invalid email or password" });

  const valid = await argon2.verify(user.passwordHash, password);
  if (!valid) return res.status(401).json({ error: "Invalid email or password" });

  const token = generateToken();
  const expiresAt = new Date(Date.now() + SESSION_TTL_SECONDS * 1000);
  await prisma.session.create({ data: { userId: user.id, token, expiresAt } });
  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

  res.setHeader("Set-Cookie", sessionCookie(token));
  res.status(200).json({ user: toClientUser(user) });
}
