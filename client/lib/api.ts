import type { Property } from "@/lib/mockData";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ||
  "http://localhost:5001";

export type ApiSource = "api" | "fallback";

export type FetchPropertiesResult = {
  properties: Property[];
  source: ApiSource;
  error?: string;
};

export async function fetchProperties(): Promise<{
  ok: true;
  count: number;
  properties: Property[];
} | {
  ok: false;
  error: string;
}> {
  try {
    const res = await fetch(`${API_URL}/api/properties`, { cache: "no-store" });
    if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };
    const data = (await res.json()) as { count: number; properties: Property[] };
    return { ok: true, count: data.count, properties: data.properties };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
