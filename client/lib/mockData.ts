// Shared mock data for the AVS Invest Dashboard.
// Once we wire up MongoDB + the Express API, the same Property type
// will come back from /api/properties — no UI changes needed.

export type PropertyStatus = "Active" | "Vacant" | "Maintenance";
export type PropertyType = "Studio" | "1 Bed" | "2 Bed" | "3 Bed" | "4 Bed";

export type Property = {
  id: string;
  address: string;
  city: string;
  postcode: string;
  type: PropertyType;
  monthlyIncome: number;
  occupancy: number;
  roi: number;
  lastClean: string;
  status: PropertyStatus;
  accent: string;

  lat: number;
  lng: number;

  bedrooms: number;
  bathrooms: number;
  sqft: number;
  pricePaid: number;
  estimatedValue: number;
  pricePerSqft: number;
  nearestStation: string;
  stationDistance: string;
  amenitiesScore: number;
  transportScore: number;
  safetyScore: number;
  schoolScore: number;
  nearby: string[];
  investmentNote: string;
};

export const properties: Property[] = [
  {
    id: "AVS-001",
    address: "12 Pan Peninsula, Canary Wharf",
    city: "London",
    postcode: "E14 9HN",
    type: "2 Bed",
    monthlyIncome: 4200,
    occupancy: 92,
    roi: 14.2,
    lastClean: "2026-04-28",
    status: "Active",
    accent: "#0A6F76",
    lat: 51.5043,
    lng: -0.0177,
    bedrooms: 2,
    bathrooms: 2,
    sqft: 720,
    pricePaid: 525000,
    estimatedValue: 615000,
    pricePerSqft: 855,
    nearestStation: "Canary Wharf (Jubilee / Elizabeth)",
    stationDistance: "0.2 mi",
    amenitiesScore: 9,
    transportScore: 10,
    safetyScore: 8,
    schoolScore: 7,
    nearby: ["Canary Wharf Mall", "South Quay DLR", "O2 Arena", "Crossrail Place"],
    investmentNote: "Premier finance hub. Strong corporate short-let demand mid-week, leisure on weekends. Reliable Airbnb performer.",
  },
  {
    id: "AVS-002",
    address: "47 Deansgate Square",
    city: "Manchester",
    postcode: "M15 4QH",
    type: "1 Bed",
    monthlyIncome: 1850,
    occupancy: 88,
    roi: 11.8,
    lastClean: "2026-04-25",
    status: "Active",
    accent: "#0DB39E",
    lat: 53.4669,
    lng: -2.2469,
    bedrooms: 1,
    bathrooms: 1,
    sqft: 540,
    pricePaid: 215000,
    estimatedValue: 248000,
    pricePerSqft: 460,
    nearestStation: "Deansgate-Castlefield (Metrolink)",
    stationDistance: "0.3 mi",
    amenitiesScore: 9,
    transportScore: 9,
    safetyScore: 7,
    schoolScore: 6,
    nearby: ["Castlefield Bowl", "Spinningfields", "Hilton Tower", "Bridgewater Hall"],
    investmentNote: "Manchester top-tier skyline cluster. Strong Booking.com performer with steady year-round demand.",
  },
  {
    id: "AVS-003",
    address: "8 Park Hill, Holloway",
    city: "London",
    postcode: "N7 6PB",
    type: "Studio",
    monthlyIncome: 1450,
    occupancy: 95,
    roi: 13.4,
    lastClean: "2026-04-29",
    status: "Active",
    accent: "#1F6FEB",
    lat: 51.5510,
    lng: -0.1175,
    bedrooms: 0,
    bathrooms: 1,
    sqft: 320,
    pricePaid: 198000,
    estimatedValue: 230000,
    pricePerSqft: 720,
    nearestStation: "Holloway Road (Piccadilly)",
    stationDistance: "0.1 mi",
    amenitiesScore: 8,
    transportScore: 9,
    safetyScore: 7,
    schoolScore: 7,
    nearby: ["Emirates Stadium", "Nags Head", "Holloway Road shops", "Highbury Fields"],
    investmentNote: "High occupancy zone. Studio yields punch above their weight thanks to N7 location and Piccadilly line.",
  },
  {
    id: "AVS-004",
    address: "23 Broad Street",
    city: "Birmingham",
    postcode: "B1 2HF",
    type: "2 Bed",
    monthlyIncome: 1950,
    occupancy: 0,
    roi: 9.6,
    lastClean: "2026-04-15",
    status: "Vacant",
    accent: "#9333EA",
    lat: 52.4790,
    lng: -1.9100,
    bedrooms: 2,
    bathrooms: 2,
    sqft: 680,
    pricePaid: 245000,
    estimatedValue: 268000,
    pricePerSqft: 395,
    nearestStation: "Birmingham New Street",
    stationDistance: "0.5 mi",
    amenitiesScore: 8,
    transportScore: 9,
    safetyScore: 6,
    schoolScore: 6,
    nearby: ["Bullring", "ICC", "Brindleyplace", "Symphony Hall"],
    investmentNote: "Currently vacant - needs refresh before next tenancy. Broad Street nightlife means strong weekend short-let pricing.",
  },
  {
    id: "AVS-005",
    address: "5 Harbourside, Wapping",
    city: "London",
    postcode: "E1W 3SS",
    type: "3 Bed",
    monthlyIncome: 5400,
    occupancy: 84,
    roi: 12.1,
    lastClean: "2026-04-20",
    status: "Maintenance",
    accent: "#F59E0B",
    lat: 51.5050,
    lng: -0.0560,
    bedrooms: 3,
    bathrooms: 2,
    sqft: 1120,
    pricePaid: 745000,
    estimatedValue: 825000,
    pricePerSqft: 736,
    nearestStation: "Wapping Overground",
    stationDistance: "0.2 mi",
    amenitiesScore: 7,
    transportScore: 8,
    safetyScore: 8,
    schoolScore: 7,
    nearby: ["St Katharine Docks", "Tobacco Dock", "Tower Bridge", "The Highway"],
    investmentNote: "Larger 3-bed units fill a gap in Airbnb supply for groups and corporate relocations. Currently in scheduled maintenance.",
  },
  {
    id: "AVS-006",
    address: "19 Queen Square, Clifton",
    city: "Bristol",
    postcode: "BS1 4ND",
    type: "1 Bed",
    monthlyIncome: 1620,
    occupancy: 90,
    roi: 10.7,
    lastClean: "2026-04-27",
    status: "Active",
    accent: "#EF4444",
    lat: 51.4538,
    lng: -2.5969,
    bedrooms: 1,
    bathrooms: 1,
    sqft: 510,
    pricePaid: 235000,
    estimatedValue: 258000,
    pricePerSqft: 505,
    nearestStation: "Bristol Temple Meads",
    stationDistance: "0.6 mi",
    amenitiesScore: 8,
    transportScore: 7,
    safetyScore: 8,
    schoolScore: 8,
    nearby: ["Cabot Circus", "Harbourside", "SS Great Britain", "Clifton Suspension Bridge"],
    investmentNote: "Bristol short-let market is undersupplied vs demand. Clifton commands a 25 percent premium over central rates.",
  },
  {
    id: "AVS-007",
    address: "31 Princes Dock, Liverpool Waterfront",
    city: "Liverpool",
    postcode: "L3 1DL",
    type: "1 Bed",
    monthlyIncome: 1480,
    occupancy: 86,
    roi: 11.2,
    lastClean: "2026-04-22",
    status: "Active",
    accent: "#10B981",
    lat: 53.4084,
    lng: -2.9916,
    bedrooms: 1,
    bathrooms: 1,
    sqft: 530,
    pricePaid: 168000,
    estimatedValue: 195000,
    pricePerSqft: 370,
    nearestStation: "Liverpool Lime Street",
    stationDistance: "0.7 mi",
    amenitiesScore: 8,
    transportScore: 8,
    safetyScore: 7,
    schoolScore: 6,
    nearby: ["Royal Albert Dock", "Bank Arena", "Tate Liverpool", "Pier Head"],
    investmentNote: "Strong event-driven demand from concerts, football and the cruise terminal. Lower entry price gives healthy yield.",
  },
  {
    id: "AVS-008",
    address: "2 Spinningfields Apartments",
    city: "Manchester",
    postcode: "M3 3AP",
    type: "2 Bed",
    monthlyIncome: 2350,
    occupancy: 91,
    roi: 12.9,
    lastClean: "2026-04-26",
    status: "Active",
    accent: "#0EA5E9",
    lat: 53.4807,
    lng: -2.2519,
    bedrooms: 2,
    bathrooms: 2,
    sqft: 750,
    pricePaid: 285000,
    estimatedValue: 330000,
    pricePerSqft: 460,
    nearestStation: "Salford Central",
    stationDistance: "0.3 mi",
    amenitiesScore: 9,
    transportScore: 9,
    safetyScore: 8,
    schoolScore: 7,
    nearby: ["Spinningfields", "John Rylands Library", "King Street shops", "AO Arena"],
    investmentNote: "Corporate-let goldmine: legal and financial offices nearby drive constant mid-week demand.",
  },
];

export const monthlyRevenueHistory = [
  { month: "Nov", revenue: 14800 },
  { month: "Dec", revenue: 16200 },
  { month: "Jan", revenue: 15400 },
  { month: "Feb", revenue: 17100 },
  { month: "Mar", revenue: 18250 },
  { month: "Apr", revenue: 19150 },
];

export const topInvestmentAreas = [
  { area: "Canary Wharf",         city: "London",     avgRoi: 14.2, properties: 1, avgNightly: 185 },
  { area: "Holloway",             city: "London",     avgRoi: 13.4, properties: 1, avgNightly: 110 },
  { area: "Spinningfields",       city: "Manchester", avgRoi: 12.9, properties: 1, avgNightly: 95 },
  { area: "Wapping",              city: "London",     avgRoi: 12.1, properties: 1, avgNightly: 220 },
  { area: "Deansgate",            city: "Manchester", avgRoi: 11.8, properties: 1, avgNightly: 88 },
  { area: "Liverpool Waterfront", city: "Liverpool",  avgRoi: 11.2, properties: 1, avgNightly: 78 },
];

export function getDashboardStats() {
  const totalProperties = properties.length;
  const monthlyRevenue = properties
    .filter((p) => p.status === "Active")
    .reduce((sum, p) => sum + p.monthlyIncome, 0);
  const activeProperties = properties.filter((p) => p.status === "Active");
  const avgRoi =
    activeProperties.reduce((s, p) => s + p.roi, 0) /
    Math.max(activeProperties.length, 1);
  const avgOccupancy =
    activeProperties.reduce((s, p) => s + p.occupancy, 0) /
    Math.max(activeProperties.length, 1);

  return {
    totalProperties,
    monthlyRevenue,
    avgRoi,
    avgOccupancy,
    activeCount: activeProperties.length,
    vacantCount: properties.filter((p) => p.status === "Vacant").length,
    maintenanceCount: properties.filter((p) => p.status === "Maintenance").length,
  };
}

export function formatGBP(value: number): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 0,
  }).format(value);
}

export type CityAggregate = {
  city: string;
  count: number;
  totalIncome: number;
  avgRoi: number;
  avgOccupancy: number;
  lat: number;
  lng: number;
};

export function getCityAggregates(): CityAggregate[] {
  const groups = new Map<string, Property[]>();
  for (const p of properties) {
    if (!groups.has(p.city)) groups.set(p.city, []);
    groups.get(p.city)!.push(p);
  }
  return Array.from(groups.entries())
    .map(([city, items]) => {
      const totalIncome = items.reduce((s, p) => s + p.monthlyIncome, 0);
      const avgRoi = items.reduce((s, p) => s + p.roi, 0) / items.length;
      const avgOccupancy =
        items.reduce((s, p) => s + p.occupancy, 0) / items.length;
      const lat = items.reduce((s, p) => s + p.lat, 0) / items.length;
      const lng = items.reduce((s, p) => s + p.lng, 0) / items.length;
      return {
        city,
        count: items.length,
        totalIncome,
        avgRoi,
        avgOccupancy,
        lat,
        lng,
      };
    })
    .sort((a, b) => b.avgRoi - a.avgRoi);
}

export function getStatusBreakdown() {
  return [
    { status: "Active", count: properties.filter((p) => p.status === "Active").length, color: "#10B981" },
    { status: "Vacant", count: properties.filter((p) => p.status === "Vacant").length, color: "#94A3B8" },
    { status: "Maintenance", count: properties.filter((p) => p.status === "Maintenance").length, color: "#F59E0B" },
  ];
}

export function roiColor(roi: number): string {
  if (roi >= 13) return "#059669";
  if (roi >= 11) return "#F59E0B";
  return "#EF4444";
}
