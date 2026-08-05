import { prisma } from "../../server/prisma.js";
import { parseCookies, clearSessionCookie, SESSION_COOKIE } from "../../server/auth.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const token = parseCookies(req)[SESSION_COOKIE];
  if (token) await prisma.session.deleteMany({ where: { token } });

  res.setHeader("Set-Cookie", clearSessionCookie());
  res.status(200).json({ ok: true });
}
