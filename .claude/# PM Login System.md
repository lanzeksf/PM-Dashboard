# PM Login System — Implementation Spec

For: Lanze's local Claude Code (VSCode) session, which has direct access to the
OG / KSF Command Center repo and to the local Postgres instance. This doc is
the brief — hand it to that session as the starting instruction for Goal 1
("set up logins for all my PMs").

This Cowork session can't reach the local repo or the local Postgres
instance directly, so it isn't writing finished code here — that would risk
producing files that don't match what's actually in the repo today, which
breaks the "complete, deployable file" rule already in `CLAUDE.md`. This spec
gives Claude Code everything it needs to do that safely, in the repo's own
context.

---

## Goal

Replace the current no-password `UserPicker` in `Shell.jsx` with real login,
backed by the `User` / `Session` tables already designed (not yet migrated)
per `CLAUDE.md`. Every PM logs in with their own email + password and sees
only the modules their role grants, per `ROLE_MODULES`.

## Before starting

1. Confirm the current state of `prisma/schema.prisma` matches what
   `CLAUDE.md` describes (User/Session designed, RFI/Issue/Submittal/ChangeOrder
   not yet designed). Don't assume — read the actual file first.
2. Decide on a backend approach. Prisma/Postgres can't run in the browser, so
   login verification and session issuance need a server-side layer. Since
   the app deploys on Vercel, the natural fit is Vercel serverless functions
   (an `api/` directory) rather than a separate always-on server — but that's
   Claude Code's call once it sees the actual repo structure.

## 1. Schema additions

Matches the fields already documented in `CLAUDE.md`. Adjust to whatever
naming convention the actual `schema.prisma` already uses for enums/tables.

```prisma
model User {
  id                 String    @id @default(cuid())
  email              String    @unique
  passwordHash       String
  name               String
  initials           String
  color              String?
  position           String
  role               Role
  department         Department?
  canRespond         Boolean   @default(false)
  stdWrite           Boolean   @default(false)
  mustChangePassword Boolean   @default(true)
  lastLoginAt        DateTime?
  createdAt          DateTime  @default(now())
  updatedAt          DateTime  @updatedAt
  sessions           Session[]
}

enum Role {
  admin
  sr_pm
  apm
  coordinator
  superintendent
  mfg_eng
  field
}

enum Department {
  Structural
  Solar
  Aero
}

model Session {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id])
  token     String   @unique
  expiresAt DateTime
  createdAt DateTime @default(now())
}
```

## 2. Seed data — one row per current PM

Source: `USERS_LIST` in `src/core/utils.jsx`, reproduced from `CLAUDE.md`:

| id | Name | Position | Role | Department |
|---|---|---|---|---|
| lanze | Lanze A. | Manufacturing Engineer | admin | — |
| loren | Loren C. | Senior PM | sr_pm | — |
| jr | JR | Superintendent | superintendent | all |
| josh | Josh | Project Manager | coordinator | Structural |
| tony | Tony S. | Project Coordinator | coordinator | Structural |
| luis | Luis A. | Assistant PM | apm | Solar |
| adam | Adam K. | Assistant PM | apm | Aero |
| lisbet | Lisbet L. | Intern | apm | — (sees all) |
| jacob | Jacob T. | Field Coordinator | field | — |

**Blocker before this can run:** the seed script needs a real email address
per person — not yet supplied. Get those from Lanze before generating seed
data; don't guess at a domain/format.

Seed script behavior:
- Generate a random temp password per user (e.g. 12 chars)
- Hash with Argon2id (`argon2` npm package) — never store plaintext
- Set `mustChangePassword: true` for everyone
- Print the plaintext temp passwords to the console **once**, on that seed
  run only, so Lanze can relay them — don't persist plaintext anywhere
  (not in the DB, not in a committed file, not in logs beyond that one run)

## 3. Auth API endpoints (serverless functions under `api/`)

- `POST /api/auth/login` — verify email + password (Argon2 compare), create a
  `Session` row on success, return a session token
- `POST /api/auth/logout` — invalidate the session
- `GET /api/auth/session` — validate current session, return user + role so
  the shell can gate modules
- `POST /api/auth/change-password` — required flow when `mustChangePassword`
  is true; on success, flips it to `false`

Recommend an httpOnly, secure cookie for the session token over
`localStorage` — meaningfully more resistant to XSS. (Note: Cowork/Claude
artifacts can't use browser storage APIs at all, but that restriction
doesn't apply to your actual deployed app — this is just a security
recommendation for the real login design.)

## 4. `Shell.jsx` changes

- Replace `UserPicker` with a `LoginForm` (email + password)
- If `mustChangePassword` comes back true, force a "set your new password"
  screen before the app shell renders
- On load, call `GET /api/auth/session`; if valid, render the shell for that
  user's role — same `ROLE_MODULES` gating as today, just driven by the
  authenticated user instead of a picker selection
- Everything downstream (module visibility, `isAdmin` checks, `stdWrite`
  gating) is unchanged — only the identity source changes

## 5. Env vars

- `DATABASE_URL` — already noted in `CLAUDE.md`, backend/server-only, never
  `VITE_`-prefixed, never in Vercel's client bundle
- Add `SESSION_SECRET` (or similar) for signing session tokens/cookies —
  same rule, server-only, never exposed to the client

## 6. Suggested build order

1. Confirm/finalize schema
2. `npx prisma migrate dev` locally against Lanze's local Postgres
3. Write the seed script, but hold the actual seed run until real PM emails
   are confirmed
4. Build the 4 auth endpoints
5. Update `Shell.jsx` — per `CLAUDE.md`'s existing git rules: show the diff,
   wait for explicit approval, never push without being asked
6. Test via `npm run dev` locally (not a Vercel preview)
7. Only on Lanze's explicit go-ahead: commit, then push to GitHub and/or
   Gitea as she specifies

## Open decisions needed from Lanze

- Real email address for each of the 9 PMs above
- Temp password delivery: relay manually from the seed run's console output,
  or something more automated (out of scope unless requested — automated
  delivery means email sending, a separate piece of infrastructure)
- Cookie vs. token session storage (recommendation above: httpOnly cookie)