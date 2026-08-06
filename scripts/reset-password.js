// Break-glass password reset — for when no admin can log into the app at
// all (the in-app admin-reset-password flow requires an admin session,
// which doesn't help if every admin is locked out). Run directly against
// the DB by whoever has server access: Lanze locally today, Jose on the
// on-prem server eventually.
//
// Usage: node scripts/reset-password.js <email>
import { PrismaClient } from "@prisma/client";
import { resetUserPassword } from "../server/resetPassword.js";

const prisma = new PrismaClient();

async function main() {
  const email = process.argv[2];
  if (!email) {
    console.error("Usage: node scripts/reset-password.js <email>");
    process.exit(1);
  }

  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
  if (!user) {
    console.error(`No user found with email ${email}`);
    process.exit(1);
  }

  const tempPassword = await resetUserPassword(prisma, user.id);
  console.log(`New temp password for ${user.name} (${user.email}): ${tempPassword}`);
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
