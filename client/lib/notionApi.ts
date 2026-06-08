const API_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ||
  "http://localhost:5001";

export type NotionProperty = {
  id: string;
  address: string;
  status: string | null;
  statusBackOffice: string | null;
  managementModel: string | null;
  propertyType: string[];
  monthlyIncome: number | null;
  compliance: "Green" | "Amber" | "Red" | null;
  gasExpiry: string | null;
  hmoExpiry: string | null;
  eicrExpiry: string | null;
  nextInspection: string | null;
  place: { lat: number; lng: number; address: string | null } | null;
  notionUrl: string;
  lastEdited: string;
};

export type NotionDeal = {
  id: string;
  dealId: string;
  propertyAddress: string;
  landlord: string;
  notes: string;
  nextAction: string;
  nextActionDate: string | null;
  interactionDate: string | null;
  targetStartDate: string | null;
  lastReviewed: string | null;
  coreStage: string | null;
  confidence: string | null;
  blocker: string | null;
  direction: string | null;
  dealType: string | null;
  contactChannel: string | null;
  source: string | null;
  propertyType: string[];
  monthlyCashflow: number | null;
  contactMade: boolean;
  isLive: boolean;
  notionUrl: string;
  lastEdited: string;
  lat?: number;
  lng?: number;
  geoDisplayName?: string;
};

export type NotionMeta = {
  count: number;
  cached: boolean;
  stale: boolean;
  fetchedAt: string;
};

export async function fetchNotionProperties(): Promise<
  | { ok: true; meta: NotionMeta; properties: NotionProperty[] }
  | { ok: false; error: string }
> {
  try {
    const res = await fetch(`${API_URL}/api/notion/properties`, {
      cache: "no-store",
    });
    const json = await res.json();
    if (!res.ok) return { ok: false, error: json.error || `HTTP ${res.status}` };
    return {
      ok: true,
      meta: {
        count: json.count,
        cached: json.cached,
        stale: json.stale,
        fetchedAt: json.fetchedAt,
      },
      properties: json.properties,
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function fetchNotionPipeline(): Promise<
  | { ok: true; meta: NotionMeta; deals: NotionDeal[] }
  | { ok: false; error: string }
> {
  try {
    const res = await fetch(`${API_URL}/api/notion/pipeline`, {
      cache: "no-store",
    });
    const json = await res.json();
    if (!res.ok) return { ok: false, error: json.error || `HTTP ${res.status}` };
    return {
      ok: true,
      meta: {
        count: json.count,
        cached: json.cached,
        stale: json.stale,
        fetchedAt: json.fetchedAt,
      },
      deals: json.deals,
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function refreshNotion(): Promise<boolean> {
  try {
    const res = await fetch(`${API_URL}/api/notion/refresh`, { method: "POST" });
    return res.ok;
  } catch {
    return false;
  }
}

export function daysUntil(iso: string | null): number | null {
  if (!iso) return null;
  const d = new Date(iso).getTime();
  const now = Date.now();
  return Math.floor((d - now) / (1000 * 60 * 60 * 24));
}
