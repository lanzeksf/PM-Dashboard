// Marks every current update post as seen for the calling user.
import { prisma } from "../../server/prisma.js";
import { getSessionUser } from "../../server/auth.js";

export default async function handler(req, res) {
  if (req.method !== "PATCH") return res.status(405).json({ error: "Method not allowed" });

  const user = await getSessionUser(req, res, prisma);
  if (!user) return res.status(401).json({ error: "No session" });

  await prisma.user.update({ where: { id: user.id }, data: { lastSeenUpdatesAt: new Date() } });
  res.status(200).json({ ok: true });
}
