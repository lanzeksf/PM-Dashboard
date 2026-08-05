// Reshapes a Prisma User row into the exact object shape the rest of the app
// already depends on (src/core/utils.jsx's USERS_LIST entries) — `tier` and
// `badge` aren't DB columns, they're derived from `role` so there's no
// separate value that can drift out of sync with it. `department` goes from
// the DB's plain enum string to the {label,color,bg} tag object the UI
// expects (DashboardApp.jsx, project cards, etc. all read `.label`/`.color`).
const DEPARTMENT_TAG_COLOR = "#888";
const DEPARTMENT_TAG_BG = "#2a2a2a";

const BADGE_BY_ROLE = {
  admin: { label: "Admin", color: "#a78bfa", bg: "rgba(167,139,250,0.15)" },
  sr_pm: { label: "Senior PM", color: "#c4b5fd", bg: "rgba(196,181,253,0.12)" },
};

export function deriveTier(role) {
  return role === "admin" || role === "sr_pm" ? role : "standard";
}

export function toClientUser(dbUser) {
  return {
    id: dbUser.id,
    email: dbUser.email,
    name: dbUser.name,
    initials: dbUser.initials,
    color: dbUser.color,
    position: dbUser.position,
    role: dbUser.role,
    tier: deriveTier(dbUser.role),
    canRespond: dbUser.canRespond,
    stdWrite: dbUser.stdWrite,
    badge: BADGE_BY_ROLE[dbUser.role] ?? null,
    department: dbUser.department
      ? { label: dbUser.department, color: DEPARTMENT_TAG_COLOR, bg: DEPARTMENT_TAG_BG }
      : null,
    mustChangePassword: dbUser.mustChangePassword,
  };
}
