// GET: unseen update posts for the calling user (createdAt > their
// lastSeenUpdatesAt). POST: create a post — admin-gated (Lanze/Loren only,
// same as User Management).
import { prisma } from "../server/prisma.js";
import { getSessionUser } from "../server/auth.js";

export default async function handler(req, res) {
  const user = await getSessionUser(req, res, prisma);
  if (!user) return res.status(401).json({ error: "No session" });

  if (req.method === "GET") {
    const posts = await prisma.updatePost.findMany({
      where: user.lastSeenUpdatesAt ? { createdAt: { gt: user.lastSeenUpdatesAt } } : undefined,
      orderBy: { createdAt: "desc" },
      include: { author: { select: { name: true } } },
    });
    return res.status(200).json({
      posts: posts.map(p => ({ id: p.id, title: p.title, body: p.body, createdAt: p.createdAt, authorName: p.author.name })),
    });
  }

  if (req.method === "POST") {
    if (user.role !== "admin" && user.role !== "sr_pm") {
      return res.status(403).json({ error: "Forbidden" });
    }
    const { title, body } = req.body || {};
    if (!title?.trim() || !body?.trim()) {
      return res.status(400).json({ error: "Title and body required" });
    }
    const post = await prisma.updatePost.create({ data: { title: title.trim(), body: body.trim(), authorId: user.id } });
    return res.status(200).json({ id: post.id });
  }

  return res.status(405).json({ error: "Method not allowed" });
}
