// ---------------------------------------------------------------
// Team + role-based access control for Owner Hub.
// Owner Hub is the cross-business overview, ONLY accessible to
// the Owner role. Everyone else gets sent to their dashboard.
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

export const team: TeamMember[] = [
  { id: "U-1", name: "Craig Okungbowa", email: "craig@avsinvest.co.uk",     role: "Owner",    org: "AVS",    status: "Active",  initials: "CO" },
  { id: "U-2", name: "Felix Okungbowa", email: "felix@avsinvest.co.uk",     role: "Admin",    org: "AVS",    status: "Active",  initials: "FO" },
  { id: "U-3", name: "Sara Mendes",     email: "sara@vertexhygiene.co.uk",  role: "Cleaner",  org: "Vertex", status: "Active",  initials: "SM" },
  { id: "U-4", name: "Olu Bankole",     email: "olu@vertexhygiene.co.uk",   role: "Cleaner",  org: "Vertex", status: "Active",  initials: "OB" },
  { id: "U-5", name: "Anita Reid",      email: "anita@vertexhygiene.co.uk", role: "Cleaner",  org: "Vertex", status: "Active",  initials: "AR" },
  { id: "U-6", name: "Rachel Greene",   email: "rachel@example.com",        role: "Investor", org: "AVS",    status: "Invited", initials: "RG" },
];

export const orgLabel: Record<Org, string> = {
  AVS:    "AVS Invest",
  Vertex: "Vertex Hygiene",
};

export const DEMO_PASSWORD = "demo123";

export function canSignInOwnerHub(member: TeamMember): boolean {
  return member.role === "Owner";
}

export function membersForOwnerLogin(): TeamMember[] {
  return team.filter(canSignInOwnerHub).filter((m) => m.status === "Active");
}
