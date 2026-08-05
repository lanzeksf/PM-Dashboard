// Shared Prisma Client singleton for serverless functions under api/.
// Reused across invocations in dev (via globalThis) to avoid exhausting
// Postgres connections on every hot-reload.
import { PrismaClient } from "@prisma/client";

const g = globalThis;

export const prisma = g.__ksfPrisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  g.__ksfPrisma = prisma;
}
