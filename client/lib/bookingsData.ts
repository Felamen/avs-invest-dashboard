import { properties, type Property } from "@/lib/mockData";

// ---------------------------------------------------------------
// Bookings data layer (multi-org).
//
// Two booking flows:
//   - AVS bookings = guest stays at AVS short-let properties.
//     Sources: Airbnb / Booking.com / Direct / Vrbo.
//   - Vertex Hygiene bookings = cleaning service appointments
//     booked directly through the Vertex Hygiene website
//     (WordPress site). One-day jobs at non-AVS client addresses.
//
// The Bookings page filters by the logged-in user's org, so AVS
// staff see AVS bookings and Vertex staff see Vertex bookings.
// ---------------------------------------------------------------

export type BookingOrg = "AVS" | "Vertex";

export type BookingSource =
  | "Airbnb"
  | "Booking.com"
  | "Direct"
  | "Vrbo"
  | "Vertex Website";

export type BookingStatus =
  | "Confirmed"
  | "Checked In"
  | "Completed"
  | "Cancelled";

// Service type only applies to Vertex bookings. For AVS bookings
// it stays undefined.
export type CleaningServiceType =
  | "Standard"
  | "Deep"
  | "End of Tenancy"
  | "Office"
  | "Move-in / Move-out";

export type Booking = {
  id: string;
  org: BookingOrg;
  // For AVS bookings this is an AVS property ID.
  // For Vertex bookings this is a Vertex client / location ID.
  propertyId: string;
  // Optional client-friendly address shown on Vertex bookings.
  serviceAddress?: string;
  // Only set on Vertex bookings.
  serviceType?: CleaningServiceType;
  guestName: string;   // guest (AVS) or client (Vertex)
  guests: number;      // group size (AVS) or crew size (Vertex)
  checkIn: string;     // ISO yyyy-mm-dd  (service date for Vertex)
  checkOut: string;    // ISO yyyy-mm-dd  (same/next day for Vertex)
  nights: number;
  nightlyRate: number; // GBP
  total: number;       // GBP
  source: BookingSource;
  status: BookingStatus;
  notes?: string;
};

// Brand colours per source for the calendar bars.
export const sourceColor: Record<BookingSource, string> = {
  "Airbnb":         "#FF5A5F",
  "Booking.com":    "#003580",
  "Direct":         "#10B981",
  "Vrbo":           "#3B82F6",
  "Vertex Website": "#0DB39E",
};

function nightsBetween(checkIn: string, checkOut: string): number {
  const a = new Date(checkIn).getTime();
  const b = new Date(checkOut).getTime();
  return Math.max(1, Math.round((b - a) / (1000 * 60 * 60 * 24)));
}

// AVS booking factory.
function avs(
  id: string, propertyId: string, guestName: string, guests: number,
  checkIn: string, checkOut: string, nightlyRate: number,
  source: Exclude<BookingSource, "Vertex Website">,
  status: BookingStatus, notes?: string,
): Booking {
  const nights = nightsBetween(checkIn, checkOut);
  return {
    id, org: "AVS", propertyId, guestName, guests,
    checkIn, checkOut, nights, nightlyRate, total: nights * nightlyRate,
    source, status, notes,
  };
}

// Vertex booking factory (cleaning service appointment).
function vertex(
  id: string, clientId: string, clientName: string, crewSize: number,
  serviceDate: string, serviceType: CleaningServiceType,
  serviceAddress: string, fee: number,
  status: BookingStatus, notes?: string,
): Booking {
  return {
    id, org: "Vertex",
    propertyId: clientId,
    serviceAddress,
    serviceType,
    guestName: clientName,
    guests: crewSize,
    checkIn: serviceDate,
    checkOut: serviceDate,   // single-day service
    nights: 1,
    nightlyRate: fee,
    total: fee,
    source: "Vertex Website",
    status,
    notes,
  };
}

export const bookings: Booking[] = [
  // ============== AVS bookings (guest stays) ==============
  // AVS-001 Canary Wharf
  avs("BK-001", "AVS-001", "Marcus Reid",       2, "2026-02-03", "2026-02-08", 195, "Airbnb",      "Completed"),
  avs("BK-002", "AVS-001", "Lin Chen",          2, "2026-02-14", "2026-02-21", 215, "Booking.com", "Completed"),
  avs("BK-003", "AVS-001", "Henrik Larsen",     1, "2026-02-25", "2026-03-02", 185, "Direct",      "Completed", "Corporate let, weekly invoice"),
  avs("BK-004", "AVS-001", "Aisha Khan",        2, "2026-03-09", "2026-03-15", 200, "Airbnb",      "Completed"),
  avs("BK-005", "AVS-001", "Tomasso Greco",     2, "2026-03-22", "2026-03-29", 210, "Booking.com", "Completed"),
  avs("BK-006", "AVS-001", "Dele Adekunle",     2, "2026-04-04", "2026-04-12", 220, "Airbnb",      "Completed"),
  avs("BK-007", "AVS-001", "Jana Novakova",     1, "2026-04-18", "2026-04-25", 195, "Booking.com", "Checked In"),
  avs("BK-008", "AVS-001", "Sasha Petrov",      2, "2026-05-02", "2026-05-09", 230, "Airbnb",      "Confirmed"),
  avs("BK-009", "AVS-001", "Maya Kapoor",       2, "2026-05-15", "2026-05-22", 240, "Direct",      "Confirmed"),
  // AVS-002 Deansgate
  avs("BK-010", "AVS-002", "Rosie Whitlock",    1, "2026-02-05", "2026-02-12", 95,  "Airbnb",      "Completed"),
  avs("BK-011", "AVS-002", "Daniel Frost",      1, "2026-02-15", "2026-02-22", 105, "Booking.com", "Completed"),
  avs("BK-012", "AVS-002", "Priya Shah",        1, "2026-03-01", "2026-03-07", 90,  "Airbnb",      "Completed"),
  avs("BK-013", "AVS-002", "Connor McKee",      1, "2026-03-12", "2026-03-19", 100, "Direct",      "Completed"),
  avs("BK-014", "AVS-002", "Isabel Romero",     1, "2026-03-23", "2026-03-30", 95,  "Vrbo",        "Completed"),
  avs("BK-015", "AVS-002", "Akira Tanaka",      1, "2026-04-08", "2026-04-15", 110, "Booking.com", "Completed"),
  avs("BK-016", "AVS-002", "Olu Bankole",       1, "2026-04-22", "2026-04-29", 100, "Airbnb",      "Checked In"),
  avs("BK-017", "AVS-002", "Sven Magnusson",    1, "2026-05-06", "2026-05-13", 115, "Direct",      "Confirmed"),
  // AVS-003 Holloway
  avs("BK-018", "AVS-003", "Charlotte Bailey",  1, "2026-02-06", "2026-02-11", 78,  "Airbnb",      "Completed"),
  avs("BK-019", "AVS-003", "Ravi Subramaniam",  1, "2026-02-13", "2026-02-19", 85,  "Booking.com", "Completed"),
  avs("BK-020", "AVS-003", "Mia Dubois",        1, "2026-02-22", "2026-03-01", 80,  "Airbnb",      "Completed"),
  avs("BK-021", "AVS-003", "Felix Trent",       1, "2026-03-04", "2026-03-12", 90,  "Direct",      "Completed", "Returning guest"),
  avs("BK-022", "AVS-003", "Hana Lee",          1, "2026-03-18", "2026-03-25", 85,  "Airbnb",      "Completed"),
  avs("BK-023", "AVS-003", "Eddie Walsh",       1, "2026-04-01", "2026-04-09", 95,  "Booking.com", "Completed"),
  avs("BK-024", "AVS-003", "Yara Haddad",       1, "2026-04-15", "2026-04-22", 88,  "Airbnb",      "Checked In"),
  avs("BK-025", "AVS-003", "Theo Kowalski",     1, "2026-05-01", "2026-05-08", 95,  "Direct",      "Confirmed"),
  // AVS-004 Birmingham
  avs("BK-026", "AVS-004", "Patrick OConnor",   2, "2026-02-09", "2026-02-13", 140, "Booking.com", "Completed"),
  avs("BK-027", "AVS-004", "Group: Stag party", 4, "2026-02-26", "2026-02-28", 220, "Airbnb",      "Cancelled", "Cancelled by host - noise complaint risk"),
  avs("BK-028", "AVS-004", "Lucy Brennan",      2, "2026-03-15", "2026-03-19", 135, "Direct",      "Completed"),
  // AVS-005 Wapping
  avs("BK-029", "AVS-005", "Werner Group LLP",  4, "2026-02-01", "2026-02-08", 320, "Direct",      "Completed", "Corporate relocation"),
  avs("BK-030", "AVS-005", "Family Anderson",   5, "2026-02-15", "2026-02-22", 280, "Airbnb",      "Completed"),
  avs("BK-031", "AVS-005", "Bjorn Eriksson",    3, "2026-03-02", "2026-03-09", 295, "Booking.com", "Completed"),
  avs("BK-032", "AVS-005", "Group: Birthday",   6, "2026-03-20", "2026-03-23", 350, "Airbnb",      "Completed"),
  avs("BK-033", "AVS-005", "Khaled Al-Mansour", 4, "2026-04-05", "2026-04-12", 310, "Direct",      "Completed"),
  // AVS-006 Bristol
  avs("BK-035", "AVS-006", "Megan Hartley",     2, "2026-02-08", "2026-02-14", 95,  "Airbnb",      "Completed"),
  avs("BK-036", "AVS-006", "Ahmed Yusuf",       2, "2026-02-20", "2026-02-26", 105, "Booking.com", "Completed"),
  avs("BK-037", "AVS-006", "Sophia Ricci",      2, "2026-03-08", "2026-03-15", 90,  "Airbnb",      "Completed"),
  avs("BK-038", "AVS-006", "Cameron Reid",      2, "2026-03-25", "2026-04-01", 100, "Direct",      "Completed"),
  avs("BK-039", "AVS-006", "Lara Petersen",     2, "2026-04-10", "2026-04-17", 95,  "Vrbo",        "Completed"),
  avs("BK-040", "AVS-006", "Ben Thatcher",      2, "2026-04-24", "2026-05-01", 110, "Airbnb",      "Checked In"),
  avs("BK-041", "AVS-006", "Erica Larsson",     2, "2026-05-08", "2026-05-15", 105, "Booking.com", "Confirmed"),
  // AVS-007 Liverpool
  avs("BK-042", "AVS-007", "Concert: Oasis fan", 2, "2026-02-14", "2026-02-17", 160, "Airbnb",      "Completed", "Anfield event weekend"),
  avs("BK-043", "AVS-007", "Connie McGrath",     2, "2026-03-01", "2026-03-08", 80,  "Booking.com", "Completed"),
  avs("BK-044", "AVS-007", "Marcus Tombs",       1, "2026-03-15", "2026-03-22", 75,  "Airbnb",      "Completed"),
  avs("BK-045", "AVS-007", "Group: Hen do",      4, "2026-04-05", "2026-04-08", 145, "Airbnb",      "Completed"),
  avs("BK-046", "AVS-007", "Cruise pax",         2, "2026-04-19", "2026-04-22", 130, "Direct",      "Completed", "Cruise terminal pickup"),
  avs("BK-047", "AVS-007", "Wei Liu",            2, "2026-05-03", "2026-05-10", 90,  "Booking.com", "Confirmed"),
  // AVS-008 Spinningfields
  avs("BK-048", "AVS-008", "Linklaters team",    3, "2026-02-02", "2026-02-09", 165, "Direct",      "Completed", "Legal secondment"),
  avs("BK-049", "AVS-008", "Greg Holt",          2, "2026-02-16", "2026-02-23", 130, "Airbnb",      "Completed"),
  avs("BK-050", "AVS-008", "Naomi Carter",       2, "2026-03-02", "2026-03-09", 125, "Booking.com", "Completed"),
  avs("BK-051", "AVS-008", "Audit team Q1",      4, "2026-03-16", "2026-03-23", 175, "Direct",      "Completed", "End-of-quarter audit week"),
  avs("BK-052", "AVS-008", "Charles Pemberton",  2, "2026-04-06", "2026-04-13", 140, "Airbnb",      "Completed"),
  avs("BK-053", "AVS-008", "Nadia Farooq",       2, "2026-04-20", "2026-04-27", 135, "Booking.com", "Checked In"),
  avs("BK-054", "AVS-008", "Pierre Lemoine",     2, "2026-05-04", "2026-05-11", 150, "Direct",      "Confirmed"),

  // ============ Vertex Hygiene bookings (cleaning service via Vertex website) ============
  vertex("VH-BK-001", "VC-001", "Mrs J. Patel",          2, "2026-04-08", "Standard",            "12 Linden Gardens, Notting Hill, W2 4HE",   135, "Completed",  "Bi-weekly recurring"),
  vertex("VH-BK-002", "VC-002", "Bennett & Sons LLP",    3, "2026-04-09", "Office",              "Suite 4, 18 Hatton Garden, EC1N 8AT",       260, "Completed",  "Office, every Friday"),
  vertex("VH-BK-003", "VC-003", "Mr K. Onyeka",          2, "2026-04-11", "End of Tenancy",      "Flat 7, 22 Goswell Road, EC1V 7DA",         320, "Completed",  "Landlord requested before viewings"),
  vertex("VH-BK-004", "VC-004", "Mrs S. Williams",       1, "2026-04-15", "Standard",            "44 Cleveland Square, W2 6DA",               95,  "Completed"),
  vertex("VH-BK-005", "VC-005", "Northwood Lettings",    2, "2026-04-18", "Move-in / Move-out",  "Flat 2, 9 Heath Drive, NW3 7SE",            280, "Completed",  "Repeat lettings agent"),
  vertex("VH-BK-006", "VC-006", "Mr & Mrs Greenwood",    2, "2026-04-22", "Deep",                "61 Lancaster Mews, W2 3QH",                 220, "Completed",  "Annual deep clean"),
  vertex("VH-BK-007", "VC-002", "Bennett & Sons LLP",    3, "2026-04-26", "Office",              "Suite 4, 18 Hatton Garden, EC1N 8AT",       260, "Completed",  "Recurring"),

  vertex("VH-BK-008", "VC-007", "Mr R. Saraswati",       2, "2026-04-30", "Standard",            "11 Albany Street, NW1 4DE",                  110, "Checked In", "Today"),
  vertex("VH-BK-009", "VC-008", "Greenfield Lettings",   2, "2026-04-30", "End of Tenancy",      "Flat 1, 4 Tachbrook Road, SW1V 2NA",         350, "Confirmed",  "Today afternoon"),

  vertex("VH-BK-010", "VC-009", "Mrs T. Onafuwa",        1, "2026-05-02", "Standard",            "27 Park West, W2 1HF",                       95,  "Confirmed"),
  vertex("VH-BK-011", "VC-010", "Solomon & Co Solicitors", 4, "2026-05-04", "Office",            "Ground floor, 3 Gray's Inn Square, WC1R 5AH", 380, "Confirmed", "First clean"),
  vertex("VH-BK-012", "VC-011", "Mrs E. Adebayo",        2, "2026-05-06", "Deep",                "82 Maida Vale, W9 1PT",                      230, "Confirmed"),
  vertex("VH-BK-013", "VC-005", "Northwood Lettings",    2, "2026-05-09", "Move-in / Move-out",  "Flat 6, 14 Belsize Lane, NW3 5AB",            260, "Confirmed", "Recurring agent client"),
  vertex("VH-BK-014", "VC-012", "Mr P. Lekic",           2, "2026-05-11", "Standard",            "5 Royal Crescent Mews, W11 4SY",              115, "Confirmed", "First booking"),
  vertex("VH-BK-015", "VC-013", "Mrs C. Iwuoha",         3, "2026-05-13", "End of Tenancy",      "33 Maddox Street, W1S 2PJ",                   340, "Confirmed", "Booked from Vertex website 30/04"),
];

// ----------------- Helper functions -----------------

export type DayCell = { date: Date; iso: string; inMonth: boolean };

export function buildMonthCells(year: number, month: number): DayCell[] {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: DayCell[] = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month, d);
    cells.push({ date, iso: toISO(date), inMonth: true });
  }
  return cells;
}

export function toISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// All bookings for an org.
export function bookingsForOrg(org: BookingOrg): Booking[] {
  return bookings.filter((b) => b.org === org);
}

// Bookings overlapping a specific calendar month, optionally per org.
export function bookingsOverlappingMonth(
  year: number,
  month: number,
  org?: BookingOrg,
): Booking[] {
  const monthStart = new Date(year, month, 1).getTime();
  const monthEnd = new Date(year, month + 1, 1).getTime();
  return bookings.filter((b) => {
    if (org && b.org !== org) return false;
    const start = new Date(b.checkIn).getTime();
    const end = new Date(b.checkOut).getTime();
    return start < monthEnd && end >= monthStart;
  });
}

// KPIs for a month, scoped to an org.
export function bookingsMonthKpis(
  year: number,
  month: number,
  org?: BookingOrg,
) {
  const monthly = bookingsOverlappingMonth(year, month, org).filter(
    (b) => b.status !== "Cancelled",
  );
  const totalBookings = monthly.length;
  const totalNights = monthly.reduce((s, b) => s + b.nights, 0);
  const revenue = monthly.reduce((s, b) => s + b.total, 0);
  const avgRate = totalNights > 0 ? Math.round(revenue / totalNights) : 0;

  // Occupancy is only meaningful for AVS short-lets (units * days).
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const occupancy =
    org === "Vertex"
      ? 0
      : (totalNights / (properties.length * daysInMonth)) * 100;

  return { totalBookings, totalNights, revenue, avgRate, occupancy };
}

export function getPropertyById(id: string): Property | undefined {
  return properties.find((p) => p.id === id);
}
