// Seed script — writes one User row per current PM (source: USERS_LIST in
// src/core/utils.jsx / CLAUDE.md). Safe to re-run: upsert skips re-hashing
// (and re-printing) a password for a user who already exists.
//
// Per Lanze's instruction: temp passwords are relayed manually, printed once
// to console on this run only — never persisted in plaintext anywhere.

import { PrismaClient } from "@prisma/client";
import argon2 from "argon2";
import crypto from "crypto";

const prisma = new PrismaClient();

const USERS = [
  { id: "lanze",  email: "lanze@kernsteel.com",     name: "Lanze A.",   initials: "LA", color: "#22c55e", position: "Manufacturing Engineer", role: "admin",          department: null,         canRespond: true,  stdWrite: true  },
  { id: "loren",  email: "loren@kernsteel.com",     name: "Loren C.",   initials: "LC", color: "#a78bfa", position: "Senior PM",               role: "sr_pm",          department: null,         canRespond: true,  stdWrite: true  },
  { id: "jr",     email: "jr@kernsteel.com",        name: "JR",         initials: "JR", color: "#f472b6", position: "Superintendent",          role: "superintendent", department: "All",        canRespond: false, stdWrite: false },
  { id: "josh",   email: "jlopez@kernsteel.com",    name: "Josh",       initials: "JO", color: "#60a5fa", position: "Project Manager",         role: "coordinator",    department: "Structural", canRespond: false, stdWrite: false },
  { id: "tony",   email: "antonio@kernsteel.com",   name: "Tony S.",    initials: "TS", color: "#38bdf8", position: "Project Coordinator",     role: "coordinator",    department: "Structural", canRespond: false, stdWrite: false },
  { id: "luis",   email: "larrezola@kernsteel.com", name: "Luis A.",    initials: "LU", color: "#f59e0b", position: "Assistant PM",            role: "apm",            department: "Solar",      canRespond: false, stdWrite: false },
  { id: "adam",   email: "adam@kernsteel.com",      name: "Adam K.",    initials: "AK", color: "#fb923c", position: "Assistant PM",            role: "apm",            department: "Aero",       canRespond: false, stdWrite: false },
  { id: "lisbet", email: "lisbet@kernsteel.com",    name: "Lisbet L.",  initials: "LL", color: "#2dd4bf", position: "Intern",                  role: "apm",            department: null,         canRespond: false, stdWrite: false },
  { id: "jacob",  email: "jtiffany@kernsteel.com",  name: "Jacob T.",   initials: "JT", color: "#4ade80", position: "Field Coordinator",       role: "field",          department: null,         canRespond: false, stdWrite: false },
];

function randomTempPassword(len = 12) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%";
  return Array.from(crypto.randomFillSync(new Uint8Array(len)))
    .map(b => chars[b % chars.length])
    .join("");
}

async function main() {
  if (USERS.some(u => u.email.startsWith("REPLACE_EMAIL_"))) {
    console.error("Refusing to seed: placeholder emails are still in prisma/seed.js. Replace them with real PM emails first.");
    process.exit(1);
  }

  const printed = [];
  for (const u of USERS) {
    const existing = await prisma.user.findUnique({ where: { id: u.id } });
    if (existing) {
      console.log(`skip ${u.id} — already exists`);
      continue;
    }
    const tempPassword = randomTempPassword();
    const passwordHash = await argon2.hash(tempPassword);
    await prisma.user.create({ data: { ...u, passwordHash, mustChangePassword: true } });
    printed.push({ id: u.id, email: u.email, tempPassword });
  }

  if (printed.length) {
    console.log("\n=== TEMP PASSWORDS — relay these once, then forget them ===");
    for (const p of printed) console.log(`${p.id.padEnd(8)} ${p.email.padEnd(35)} ${p.tempPassword}`);
    console.log("=============================================================\n");
  }
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
