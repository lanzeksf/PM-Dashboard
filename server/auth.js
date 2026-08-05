// Session helpers shared by the api/auth/* endpoints.
//
// Sessions are opaque, random, DB-backed tokens (Session table lookup), not
// signed JWTs — so there's no SESSION_SECRET to manage. A session is revoked
// by deleting its row; that's the whole security model.
import crypto from "crypto";

export const SESSION_COOKIE = "ksf_session";
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 14; // 14 days

export function generateToken() {
  return crypto.randomBytes(32).toString("hex");
}

export function parseCookies(req) {
  const header = req.headers.cookie;
  if (!header) return {};
  return header.split(";").reduce((acc, part) => {
    const idx = part.indexOf("=");
    if (idx === -1) return acc;
    const key = part.slice(0, idx).trim();
    const val = decodeURIComponent(part.slice(idx + 1).trim());
    acc[key] = val;
    return acc;
  }, {});
}

function cookieParts(nameValue, maxAgeSeconds) {
  const parts = [nameValue, "HttpOnly", "Path=/", "SameSite=Lax", `Max-Age=${maxAgeSeconds}`];
  if (process.env.NODE_ENV === "production") parts.push("Secure");
  return parts.join("; ");
}

export function sessionCookie(token) {
  return cookieParts(`${SESSION_COOKIE}=${encodeURIComponent(token)}`, SESSION_TTL_SECONDS);
}

export function clearSessionCookie() {
  return cookieParts(`${SESSION_COOKIE}=`, 0);
}

// Looks up the session for the request's cookie. Returns null if there's no
// cookie, no matching session, or the session has expired (and deletes the
// expired row as a side effect, so it doesn't just pile up).
export async function getSessionUser(req, prisma) {
  const token = parseCookies(req)[SESSION_COOKIE];
  if (!token) return null;

  const session = await prisma.session.findUnique({ where: { token }, include: { user: true } });
  if (!session) return null;

  if (session.expiresAt < new Date()) {
    await prisma.session.delete({ where: { token } }).catch(() => {});
    return null;
  }

  return session.user;
}
