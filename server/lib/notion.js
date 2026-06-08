import { geocodeMany, lookupCached } from "./geocode.js";

const NOTION_VERSION = "2022-06-28";

function env() {
  return {
    token: process.env.NOTION_TOKEN,
    propertiesDb: process.env.NOTION_PROPERTIES_DB,
    pipelineDb: process.env.NOTION_PIPELINE_DB,
    ttlMs: Number(process.env.NOTION_CACHE_TTL_MS) || 5 * 60 * 1000,
  };
}

const cache = {
  properties: { value: null, fetchedAt: 0, error: null },
  pipeline: { value: null, fetchedAt: 0, error: null },
};

function plainTitle(prop) {
  return prop?.title?.map((t) => t.plain_text).join("") || "";
}
function plainText(prop) {
  return prop?.rich_text?.map((t) => t.plain_text).join("") || "";
}

function mapProperty(row) {
  const p = row.properties;
  const place = p["Place"]?.place;
  return {
    id: row.id,
    address: plainTitle(p["Property Address (Title)"]),
    status: p["Status "]?.select?.name || null,
    statusBackOffice: p["Status (Back Office)"]?.select?.name || null,
    managementModel: p["Management Model"]?.select?.name || null,
    propertyType: p["Property Type"]?.multi_select?.map((o) => o.name) || [],
    monthlyIncome: p["Expected Monthly Income"]?.number ?? null,
    compliance: p["Compliance Status"]?.select?.name || null,
    gasExpiry: p["Gas Cert Expiry (Date)"]?.date?.start || null,
    hmoExpiry: p["HMO Licence Expiry (Date)"]?.date?.start || null,
    eicrExpiry: p["EICR Expiry (Date)"]?.date?.start || null,
    nextInspection: p["Next Inspection Due (Date)"]?.date?.start || null,
    place: place
      ? {
          lat: place.lat,
          lng: place.lon,
          address: place.address || place.name || null,
        }
      : null,
    notionUrl: row.url,
    lastEdited: row.last_edited_time,
  };
}

function mapDeal(row) {
  const p = row.properties;
  return {
    id: row.id,
    dealId: plainTitle(p["Core Deal ID"]),
    propertyAddress: plainText(p["Property Address"]),
    landlord: plainText(p["Landlord / Contact Name"]),
    notes: plainText(p["Notes"]),
    nextAction: plainText(p["Next Action"]),
    nextActionDate: p["Next Action Date"]?.date?.start || null,
    interactionDate: p["Interaction Datetime"]?.date?.start || null,
    targetStartDate: p["Start Date (Target)"]?.date?.start || null,
    lastReviewed: p["Last Reviewed"]?.date?.start || null,
    coreStage: p["Core Stage (PIPELINE HEART)"]?.select?.name || null,
    confidence: p["Confidence Level"]?.select?.name || null,
    blocker: p["Blocker (If Any)"]?.select?.name || null,
    direction: p["Direction"]?.select?.name || null,
    dealType: p["Deal Type"]?.select?.name || null,
    contactChannel: p["Contact Channel"]?.select?.name || null,
    source: p["Source (Core)"]?.select?.name || null,
    propertyType: p["Property type"]?.multi_select?.map((o) => o.name) || [],
    monthlyCashflow: p["Expected Monthly Cashflow (£)"]?.number ?? null,
    contactMade: p["Contact made"]?.checkbox || false,
    isLive: p["Is property Live?"]?.checkbox || false,
    notionUrl: row.url,
    lastEdited: row.last_edited_time,
  };
}

async function notionFetch(path, { method = "GET", body } = {}) {
  const { token } = env();
  if (!token) throw new Error("NOTION_TOKEN not set");
  const res = await fetch(`https://api.notion.com/v1${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Notion-Version": NOTION_VERSION,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(`Notion ${res.status}: ${json.message || res.statusText}`);
  }
  return json;
}

async function queryAll(databaseId) {
  const results = [];
  let cursor;
  do {
    const body = { page_size: 100 };
    if (cursor) body.start_cursor = cursor;
    const res = await notionFetch(`/databases/${databaseId}/query`, {
      method: "POST",
      body,
    });
    results.push(...res.results);
    cursor = res.has_more ? res.next_cursor : undefined;
  } while (cursor);
  return results;
}

async function fetchFresh(kind) {
  const { propertiesDb, pipelineDb } = env();
  if (kind === "properties") {
    if (!propertiesDb) throw new Error("NOTION_PROPERTIES_DB not set");
    const rows = await queryAll(propertiesDb);
    return rows.map(mapProperty);
  }
  if (kind === "pipeline") {
    if (!pipelineDb) throw new Error("NOTION_PIPELINE_DB not set");
    const rows = await queryAll(pipelineDb);
    const deals = rows.map(mapDeal);

    const addresses = deals.map((d) => d.propertyAddress).filter(Boolean);
    console.log(`[pipeline] geocoding ${addresses.length} addresses…`);
    const geoMap = await geocodeMany(addresses);
    console.log(`[pipeline] geocoded; ${Object.values(geoMap).filter((g) => g && g.lat != null).length} hit, ${Object.values(geoMap).filter((g) => g === null).length} miss`);
    for (const d of deals) {
      if (!d.propertyAddress) continue;
      const key = d.propertyAddress.trim().toLowerCase().replace(/\s+/g, " ");
      const g = geoMap[key];
      if (g && g.lat != null) {
        d.lat = g.lat;
        d.lng = g.lng;
        d.geoDisplayName = g.displayName;
      }
    }
    return deals;
  }
  throw new Error("Unknown kind: " + kind);
}

async function getCached(kind, force) {
  const { ttlMs } = env();
  const slot = cache[kind];
  const fresh = !force && slot.value && Date.now() - slot.fetchedAt < ttlMs;
  if (fresh) {
    return { data: slot.value, cached: true, fetchedAt: slot.fetchedAt };
  }
  try {
    const data = await fetchFresh(kind);
    slot.value = data;
    slot.fetchedAt = Date.now();
    slot.error = null;
    return { data, cached: false, fetchedAt: slot.fetchedAt };
  } catch (err) {
    slot.error = err.message;
    if (slot.value) {
      return {
        data: slot.value,
        cached: true,
        fetchedAt: slot.fetchedAt,
        stale: true,
        error: err.message,
      };
    }
    throw err;
  }
}

export async function getProperties({ force = false } = {}) {
  return getCached("properties", force);
}
export async function getPipeline({ force = false } = {}) {
  return getCached("pipeline", force);
}
export function refreshAll() {
  cache.properties.fetchedAt = 0;
  cache.pipeline.fetchedAt = 0;
}
