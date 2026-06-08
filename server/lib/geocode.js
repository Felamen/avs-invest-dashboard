import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

const CACHE_PATH = path.join(process.cwd(), "data", "geocodes.json");
const USER_AGENT = "AVS-Invest-Dashboard/0.2 (contact: craig@avsinvest.co.uk)";
const NOMINATIM_DELAY_MS = 1100;

let cache = null;
let lastRequestAt = 0;
let inFlight = Promise.resolve();

async function loadCache() {
  if (cache) return cache;
  try {
    if (existsSync(CACHE_PATH)) {
      const txt = await readFile(CACHE_PATH, "utf8");
      cache = JSON.parse(txt);
    } else {
      cache = {};
    }
  } catch {
    cache = {};
  }
  return cache;
}

async function saveCache() {
  try {
    const dir = path.dirname(CACHE_PATH);
    if (!existsSync(dir)) await mkdir(dir, { recursive: true });
    await writeFile(CACHE_PATH, JSON.stringify(cache, null, 2), "utf8");
  } catch (err) {
    console.error("geocode cache save failed:", err.message);
  }
}

function normalizeKey(address) {
  return address.trim().toLowerCase().replace(/\s+/g, " ");
}

async function rateLimit() {
  const since = Date.now() - lastRequestAt;
  if (since < NOMINATIM_DELAY_MS) {
    await new Promise((r) => setTimeout(r, NOMINATIM_DELAY_MS - since));
  }
  lastRequestAt = Date.now();
}

async function nominatim(query) {
  await rateLimit();
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&countrycodes=gb&limit=1&addressdetails=0`;
  const res = await fetch(url, {
    headers: { "User-Agent": USER_AGENT, "Accept-Language": "en" },
  });
  if (!res.ok) return null;
  const data = await res.json();
  if (!Array.isArray(data) || data.length === 0) return null;
  const top = data[0];
  return {
    lat: parseFloat(top.lat),
    lng: parseFloat(top.lon),
    displayName: top.display_name,
  };
}

export async function geocodeOne(address) {
  if (!address || !address.trim()) return null;
  await loadCache();
  const key = normalizeKey(address);
  if (key in cache) return cache[key];
  const result = await nominatim(address);
  cache[key] = result;
  await saveCache();
  return result;
}

export async function geocodeMany(addresses) {
  await loadCache();
  const unique = Array.from(
    new Set(
      addresses
        .filter((a) => a && a.trim())
        .map((a) => normalizeKey(a))
    )
  );
  const toFetch = unique.filter((k) => !(k in cache));

  if (toFetch.length === 0) {
    return Object.fromEntries(unique.map((k) => [k, cache[k]]));
  }

  inFlight = inFlight.then(async () => {
    for (const key of toFetch) {
      if (key in cache) continue;
      cache[key] = await nominatim(key);
    }
    await saveCache();
  });
  await inFlight;

  return Object.fromEntries(unique.map((k) => [k, cache[k]]));
}

export function lookupCached(address) {
  if (!cache) return undefined;
  if (!address || !address.trim()) return null;
  const key = normalizeKey(address);
  return cache[key];
}
