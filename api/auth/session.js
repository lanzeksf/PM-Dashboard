import { prisma } from "../../server/prisma.js";
import { getSessionUser } from "../../server/auth.js";
import { toClientUser } from "../../server/userShape.js";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const user = await getSessionUser(req, prisma);
  if (!user) return res.status(401).json({ error: "No session" });

  res.status(200).json({ user: toClientUser(user) });
}
