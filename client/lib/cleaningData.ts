import { properties } from "@/lib/mockData";

// ---------------------------------------------------------------
// Cleaning Ops data layer.
//
// In production these jobs come from the Vertex Hygiene API. The
// AVS dashboard reads them and AVS can also push new cleaning
// requests back the other way after a guest checkout.
// ---------------------------------------------------------------

export type CleaningType = "Standard" | "Deep" | "Move-out" | "Mid-stay";
export type CleaningStatus =
  | "Scheduled"
  | "In Progress"
  | "Completed"
  | "Missed";

export type CleaningJob = {
  id: string;
  propertyId: string;
  scheduledDate: string;   // ISO yyyy-mm-dd
  scheduledTime: string;   // HH:mm
  type: CleaningType;
  assignedTo: string;      // cleaner name
  durationHours: number;
  cost: number;            // GBP
  status: CleaningStatus;
  notes?: string;
};

const TODAY = "2026-04-30";

export const cleaningJobs: CleaningJob[] = [
  // --- Past (Completed) ---
  { id: "VH-1001", propertyId: "AVS-001", scheduledDate: "2026-04-08", scheduledTime: "10:00", type: "Standard", assignedTo: "Sara Mendes",   durationHours: 3,   cost: 90,  status: "Completed" },
  { id: "VH-1002", propertyId: "AVS-002", scheduledDate: "2026-04-09", scheduledTime: "11:00", type: "Standard", assignedTo: "Olu Bankole",   durationHours: 2.5, cost: 75,  status: "Completed" },
  { id: "VH-1003", propertyId: "AVS-003", scheduledDate: "2026-04-12", scheduledTime: "09:00", type: "Standard", assignedTo: "Maria Costa",   durationHours: 2,   cost: 60,  status: "Completed" },
  { id: "VH-1004", propertyId: "AVS-005", scheduledDate: "2026-04-12", scheduledTime: "13:00", type: "Deep",     assignedTo: "Sara Mendes",   durationHours: 6,   cost: 220, status: "Completed", notes: "Post-checkout deep clean for family of 5" },
  { id: "VH-1005", propertyId: "AVS-008", scheduledDate: "2026-04-13", scheduledTime: "11:00", type: "Standard", assignedTo: "Olu Bankole",   durationHours: 3,   cost: 90,  status: "Completed" },
  { id: "VH-1006", propertyId: "AVS-006", scheduledDate: "2026-04-17", scheduledTime: "10:00", type: "Standard", assignedTo: "Anita Reid",    durationHours: 2.5, cost: 75,  status: "Completed" },
  { id: "VH-1007", propertyId: "AVS-007", scheduledDate: "2026-04-22", scheduledTime: "12:00", type: "Standard", assignedTo: "Tomas Novak",   durationHours: 2.5, cost: 75,  status: "Completed" },
  { id: "VH-1008", propertyId: "AVS-002", scheduledDate: "2026-04-22", scheduledTime: "14:00", type: "Mid-stay", assignedTo: "Maria Costa",   durationHours: 1.5, cost: 45,  status: "Completed", notes: "Light refresh between long stays" },
  { id: "VH-1009", propertyId: "AVS-003", scheduledDate: "2026-04-22", scheduledTime: "10:00", type: "Standard", assignedTo: "Anita Reid",    durationHours: 2,   cost: 60,  status: "Completed" },
  { id: "VH-1010", propertyId: "AVS-004", scheduledDate: "2026-04-15", scheduledTime: "10:00", type: "Deep",     assignedTo: "Sara Mendes",   durationHours: 5,   cost: 200, status: "Completed", notes: "Deep clean prior to listing refresh" },
  { id: "VH-1011", propertyId: "AVS-008", scheduledDate: "2026-04-26", scheduledTime: "11:00", type: "Standard", assignedTo: "Olu Bankole",   durationHours: 3,   cost: 90,  status: "Completed" },
  { id: "VH-1012", propertyId: "AVS-007", scheduledDate: "2026-04-08", scheduledTime: "10:30", type: "Standard", assignedTo: "Tomas Novak",   durationHours: 2.5, cost: 75,  status: "Completed" },
  { id: "VH-1013", propertyId: "AVS-005", scheduledDate: "2026-04-19", scheduledTime: "10:00", type: "Move-out", assignedTo: "Sara Mendes",   durationHours: 4,   cost: 160, status: "Completed", notes: "Pre-maintenance move-out" },
  { id: "VH-1014", propertyId: "AVS-006", scheduledDate: "2026-04-09", scheduledTime: "10:00", type: "Standard", assignedTo: "Anita Reid",    durationHours: 2.5, cost: 75,  status: "Completed" },
  { id: "VH-1015", propertyId: "AVS-001", scheduledDate: "2026-04-18", scheduledTime: "10:00", type: "Standard", assignedTo: "Sara Mendes",   durationHours: 3,   cost: 90,  status: "Completed" },

  // --- Today (In Progress / Scheduled) ---
  { id: "VH-1016", propertyId: "AVS-001", scheduledDate: TODAY,        scheduledTime: "10:00", type: "Standard", assignedTo: "Sara Mendes",   durationHours: 3,   cost: 90,  status: "In Progress" },
  { id: "VH-1017", propertyId: "AVS-003", scheduledDate: TODAY,        scheduledTime: "13:00", type: "Standard", assignedTo: "Anita Reid",    durationHours: 2,   cost: 60,  status: "Scheduled" },
  { id: "VH-1018", propertyId: "AVS-008", scheduledDate: TODAY,        scheduledTime: "15:00", type: "Mid-stay", assignedTo: "Olu Bankole",   durationHours: 1.5, cost: 45,  status: "Scheduled" },

  // --- Past Missed ---
  { id: "VH-1019", propertyId: "AVS-004", scheduledDate: "2026-04-26", scheduledTime: "10:00", type: "Standard", assignedTo: "Maria Costa",   durationHours: 2.5, cost: 75,  status: "Missed",     notes: "Cleaner unwell - reschedule pending" },

  // --- Future Scheduled ---
  { id: "VH-1020", propertyId: "AVS-002", scheduledDate: "2026-05-02", scheduledTime: "11:00", type: "Standard", assignedTo: "Olu Bankole",   durationHours: 2.5, cost: 75,  status: "Scheduled" },
  { id: "VH-1021", propertyId: "AVS-001", scheduledDate: "2026-05-02", scheduledTime: "10:00", type: "Standard", assignedTo: "Sara Mendes",   durationHours: 3,   cost: 90,  status: "Scheduled" },
  { id: "VH-1022", propertyId: "AVS-006", scheduledDate: "2026-05-03", scheduledTime: "11:00", type: "Standard", assignedTo: "Anita Reid",    durationHours: 2.5, cost: 75,  status: "Scheduled" },
  { id: "VH-1023", propertyId: "AVS-007", scheduledDate: "2026-05-03", scheduledTime: "12:00", type: "Standard", assignedTo: "Tomas Novak",   durationHours: 2.5, cost: 75,  status: "Scheduled" },
  { id: "VH-1024", propertyId: "AVS-008", scheduledDate: "2026-05-04", scheduledTime: "11:00", type: "Standard", assignedTo: "Olu Bankole",   durationHours: 3,   cost: 90,  status: "Scheduled" },
  { id: "VH-1025", propertyId: "AVS-005", scheduledDate: "2026-05-05", scheduledTime: "09:00", type: "Deep",     assignedTo: "Sara Mendes",   durationHours: 6,   cost: 220, status: "Scheduled", notes: "Post-maintenance reset" },
  { id: "VH-1026", propertyId: "AVS-003", scheduledDate: "2026-05-08", scheduledTime: "10:00", type: "Standard", assignedTo: "Anita Reid",    durationHours: 2,   cost: 60,  status: "Scheduled" },
  { id: "VH-1027", propertyId: "AVS-004", scheduledDate: "2026-05-09", scheduledTime: "10:00", type: "Move-out", assignedTo: "Maria Costa",   durationHours: 4,   cost: 160, status: "Scheduled", notes: "Refresh for new tenancy" },
  { id: "VH-1028", propertyId: "AVS-002", scheduledDate: "2026-05-13", scheduledTime: "11:00", type: "Standard", assignedTo: "Olu Bankole",   durationHours: 2.5, cost: 75,  status: "Scheduled" },
  { id: "VH-1029", propertyId: "AVS-001", scheduledDate: "2026-05-09", scheduledTime: "10:00", type: "Standard", assignedTo: "Sara Mendes",   durationHours: 3,   cost: 90,  status: "Scheduled" },
  { id: "VH-1030", propertyId: "AVS-006", scheduledDate: "2026-05-15", scheduledTime: "11:00", type: "Standard", assignedTo: "Anita Reid",    durationHours: 2.5, cost: 75,  status: "Scheduled" },
];

export const cleaners = [
  "Sara Mendes",
  "Olu Bankole",
  "Maria Costa",
  "Anita Reid",
  "Tomas Novak",
];

export const statusColor: Record<CleaningStatus, string> = {
  "Scheduled":   "bg-blue-100 text-blue-800",
  "In Progress": "bg-amber-100 text-amber-800",
  "Completed":   "bg-emerald-100 text-emerald-800",
  "Missed":      "bg-rose-100 text-rose-800",
};

export const typeColor: Record<CleaningType, string> = {
  "Standard": "#0DB39E",
  "Deep":     "#0A6F76",
  "Move-out": "#F59E0B",
  "Mid-stay": "#1F6FEB",
};

// ---------- helpers ----------

export function jobsToday(today = TODAY): CleaningJob[] {
  return cleaningJobs.filter((j) => j.scheduledDate === today);
}

export function jobsUpcoming(today = TODAY, days = 14): CleaningJob[] {
  const now = new Date(today).getTime();
  const limit = now + days * 24 * 60 * 60 * 1000;
  return cleaningJobs
    .filter((j) => {
      const t = new Date(j.scheduledDate).getTime();
      return t > now && t <= limit && j.status === "Scheduled";
    })
    .sort((a, b) => (a.scheduledDate < b.scheduledDate ? -1 : 1));
}

export function jobsRecent(today = TODAY, days = 14): CleaningJob[] {
  const now = new Date(today).getTime();
  const earliest = now - days * 24 * 60 * 60 * 1000;
  return cleaningJobs
    .filter((j) => {
      const t = new Date(j.scheduledDate).getTime();
      return t < now && t >= earliest;
    })
    .sort((a, b) => (a.scheduledDate < b.scheduledDate ? 1 : -1));
}

export function lastCleanFor(propId: string, today = TODAY): CleaningJob | undefined {
  const now = new Date(today).getTime();
  return cleaningJobs
    .filter(
      (j) =>
        j.propertyId === propId &&
        j.status === "Completed" &&
        new Date(j.scheduledDate).getTime() <= now,
    )
    .sort((a, b) => (a.scheduledDate < b.scheduledDate ? 1 : -1))[0];
}

export function nextCleanFor(propId: string, today = TODAY): CleaningJob | undefined {
  const now = new Date(today).getTime();
  return cleaningJobs
    .filter(
      (j) =>
        j.propertyId === propId &&
        new Date(j.scheduledDate).getTime() >= now &&
        (j.status === "Scheduled" || j.status === "In Progress"),
    )
    .sort((a, b) => (a.scheduledDate < b.scheduledDate ? -1 : 1))[0];
}

export function cleaningKpis(today = TODAY) {
  const monthBookmark = today.slice(0, 7); // yyyy-mm
  const monthly = cleaningJobs.filter((j) =>
    j.scheduledDate.startsWith(monthBookmark),
  );
  const completed = monthly.filter((j) => j.status === "Completed");
  const scheduled = monthly.filter((j) => j.status === "Scheduled");
  const inProgress = monthly.filter((j) => j.status === "In Progress");
  const missed = monthly.filter((j) => j.status === "Missed");
  const totalCost = completed.reduce((s, j) => s + j.cost, 0);
  const totalHours = completed.reduce((s, j) => s + j.durationHours, 0);
  const propertiesNeedingClean = properties.filter(
    (p) => !nextCleanFor(p.id, today),
  ).length;

  return {
    monthlyCount: monthly.length,
    completedCount: completed.length,
    scheduledCount: scheduled.length,
    inProgressCount: inProgress.length,
    missedCount: missed.length,
    totalCost,
    totalHours,
    propertiesNeedingClean,
  };
}
