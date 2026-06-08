// ---------------------------------------------------------------
// Team + role-based access control (RBAC).
// Two organisations: "AVS" (your team) and "Vertex" (Vertex Hygiene).
// AVS dashboard only shows AVS pages. Vertex / Owner Hub are
// separate dashboards (ports 3001 / 3002).
// ---------------------------------------------------------------

export type Org = "AVS" | "Vertex";
export type Role = "Owner" | "Admin" | "Manager" | "Cleaner" | "Investor";

export type TeamMember = {
  id: string;
  name: string;
  email: string;
  role: Role;
  org: Org;
  status: "Active" | "Invited";
  initials: string;
};

// Demo password — shared across all users.
// In production this is replaced with per-user bcrypt hashes in the DB.
export const DEMO_PASSWORD = "demo123";

// Who is ALLOWED on the AVS dashboard once signed in (used by SSO + session
// restoration). Owners come in via Owner Hub → tile click (SSO) and are fully
// allowed here. AVS workers (Admin / Manager / Investor) are allowed too.
export function canSignInAvs(member: TeamMember): boolean {
  if (member.role === "Owner") return true;
  return member.org === "AVS";
}

// Who is allowed to use the business-login FORM directly. Owners are NOT —
// they must sign in via Owner Hub first. This is the stricter gate.
export function canFormSignInAvs(member: TeamMember): boolean {
  if (member.role === "Owner") return false;
  return member.org === "AVS";
}

// Shared business login (AVS + Vertex). Owner has their own dedicated Owner
// Hub login at :3002 — they reach it via the visible CTA on this page.
export function isBusinessWorker(member: TeamMember): boolean {
  return member.role !== "Owner" && member.status === "Active";
}

export function membersForBusinessLogin(): TeamMember[] {
  return team.filter(isBusinessWorker);
}

export function membersForAvsLogin(): TeamMember[] {
  return team.filter(isBusinessWorker);
}

export type PageKey =
  | ""
  | "properties"
  | "pipeline"
  | "map"
  | "settings"
  | "assistant";

// Owner / Admin = all AVS pages.
// Manager       = all AVS pages.
// Investor      = read-only view (Dashboard + Properties + Map).
// Cleaner       = no AVS access — they use the Vertex dashboard instead.
export const rolePermissions: Record<Role, PageKey[]> = {
  Owner:    ["", "properties", "pipeline", "map", "settings", "assistant"],
  Admin:    ["", "properties", "pipeline", "map", "settings", "assistant"],
  Manager:  ["", "properties", "pipeline", "map", "settings", "assistant"],
  Investor: ["", "properties",             "map",             "assistant"],
  Cleaner:  [],
};

export const team: TeamMember[] = [
  { id: "U-1", name: "Craig Okungbowa",  email: "craig@avsinvest.co.uk",    role: "Owner",    org: "AVS",    status: "Active",  initials: "CO" },
  { id: "U-2", name: "Nathan Okungbowa", email: "contact@avsconsultation.com", role: "Admin",  org: "AVS",    status: "Active",  initials: "NO" },
  { id: "U-3", name: "Sara Mendes",     email: "sara@vertexhygiene.co.uk",  role: "Cleaner",  org: "Vertex", status: "Active",  initials: "SM" },
  { id: "U-4", name: "Olu Bankole",     email: "olu@vertexhygiene.co.uk",   role: "Cleaner",  org: "Vertex", status: "Active",  initials: "OB" },
  { id: "U-5", name: "Anita Reid",      email: "anita@vertexhygiene.co.uk", role: "Cleaner",  org: "Vertex", status: "Active",  initials: "AR" },
  { id: "U-6", name: "Rachel Greene",   email: "rachel@example.com",        role: "Investor", org: "AVS",    status: "Invited", initials: "RG" },
];

export function canAccess(role: Role, page: PageKey): boolean {
  return rolePermissions[role].includes(page);
}

export const orgLabel: Record<Org, string> = {
  AVS:    "AVS Invest",
  Vertex: "Vertex Hygiene",
};
