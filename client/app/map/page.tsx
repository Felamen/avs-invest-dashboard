"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import AccessGuard from "@/components/AccessGuard";
import {
  fetchNotionProperties,
  fetchNotionPipeline,
  refreshNotion,
  type NotionProperty,
  type NotionDeal,
  type NotionMeta,
} from "@/lib/notionApi";

type LoadState = "loading" | "ok" | "error";

type GeoResult = {
  lat: number;
  lng: number;
  displayName: string;
  type: string;
  importance: number;
};

async function geocodeUK(query: string): Promise<GeoResult[]> {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
    query
  )}&format=json&countrycodes=gb&limit=6&addressdetails=0`;
  try {
    const res = await fetch(url, { headers: { "Accept-Language": "en" } });
    if (!res.ok) return [];
    const data = (await res.json()) as Array<{
      lat: string;
      lon: string;
      display_name: string;
      type: string;
      importance: number;
    }>;
    return data.map((d) => ({
      lat: parseFloat(d.lat),
      lng: parseFloat(d.lon),
      displayName: d.display_name,
      type: d.type,
      importance: d.importance,
    }));
  } catch {
    return [];
  }
}

const PropertyMap = dynamic(() => import("@/components/PropertyMap"), {
  ssr: false,
  loading: () => (
    <div className="h-full rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-sm text-slate-500">
      Loading map...
    </div>
  ),
});

export default function PropertiesMapPage() {
  const [avsOwned, setAvsOwned] = useState<NotionProperty[]>([]);
  const [pipelineDeals, setPipelineDeals] = useState<NotionDeal[]>([]);
  const [showOwned, setShowOwned] = useState(true);
  const [showPipeline, setShowPipeline] = useState(true);
  const [meta, setMeta] = useState<NotionMeta | null>(null);
  const [state, setState] = useState<LoadState>("loading");
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const [priceMin, setPriceMin] = useState<string>("");
  const [priceMax, setPriceMax] = useState<string>("");
  const [stageSelection, setStageSelection] = useState<Set<string>>(new Set());
  const [confidenceSelection, setConfidenceSelection] = useState<Set<string>>(new Set());
  const [filtersOpen, setFiltersOpen] = useState(false);

  const [search, setSearch] = useState("");
  const [geoResults, setGeoResults] = useState<GeoResult[]>([]);
  const [geoLoading, setGeoLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [flyTarget, setFlyTarget] = useState<{
    lat: number;
    lng: number;
    label: string;
    ts: number;
  } | null>(null);

  async function load() {
    setState("loading");
    const [propsRes, pipeRes] = await Promise.all([
      fetchNotionProperties(),
      fetchNotionPipeline(),
    ]);
    let anyOk = false;
    if (propsRes.ok) {
      setAvsOwned(propsRes.properties.filter((p) => p.place));
      setMeta(propsRes.meta);
      anyOk = true;
    }
    if (pipeRes.ok) {
      setPipelineDeals(pipeRes.deals);
      anyOk = true;
    }
    if (anyOk) {
      setState("ok");
      setError(null);
    } else {
      setError(!propsRes.ok ? propsRes.error : "");
      setState("error");
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function onRefresh() {
    setRefreshing(true);
    await refreshNotion();
    await load();
    setRefreshing(false);
  }

  useEffect(() => {
    const q = search.trim();
    if (q.length < 3) {
      setGeoResults([]);
      setGeoLoading(false);
      return;
    }
    setGeoLoading(true);
    const handle = setTimeout(async () => {
      const results = await geocodeUK(q);
      setGeoResults(results);
      setGeoLoading(false);
    }, 400);
    return () => clearTimeout(handle);
  }, [search]);

  const portfolioMatches = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];
    return avsOwned.filter(
      (p) =>
        p.address.toLowerCase().includes(q) ||
        (p.place?.address || "").toLowerCase().includes(q)
    );
  }, [avsOwned, search]);

  const allStages = useMemo(() => {
    const s = new Set<string>();
    pipelineDeals.forEach((d) => d.coreStage && s.add(d.coreStage));
    return Array.from(s).sort();
  }, [pipelineDeals]);

  const allConfidences = useMemo(() => {
    const s = new Set<string>();
    pipelineDeals.forEach((d) => d.confidence && s.add(d.confidence));
    return Array.from(s).sort();
  }, [pipelineDeals]);

  const filteredPipeline = useMemo(() => {
    const min = priceMin.trim() ? Number(priceMin) : null;
    const max = priceMax.trim() ? Number(priceMax) : null;
    return pipelineDeals.filter((d) => {
      if (min !== null && (d.monthlyCashflow === null || d.monthlyCashflow < min)) return false;
      if (max !== null && (d.monthlyCashflow === null || d.monthlyCashflow > max)) return false;
      if (stageSelection.size > 0 && (!d.coreStage || !stageSelection.has(d.coreStage))) return false;
      if (confidenceSelection.size > 0 && (!d.confidence || !confidenceSelection.has(d.confidence))) return false;
      return true;
    });
  }, [pipelineDeals, priceMin, priceMax, stageSelection, confidenceSelection]);

  const filtersActive =
    priceMin.trim() !== "" ||
    priceMax.trim() !== "" ||
    stageSelection.size > 0 ||
    confidenceSelection.size > 0;

  function toggleSet(set: Set<string>, val: string, setter: (s: Set<string>) => void) {
    const next = new Set(set);
    if (next.has(val)) next.delete(val);
    else next.add(val);
    setter(next);
  }

  return (
    <AccessGuard page="map">
      <div className="flex flex-col h-screen">
        <header className="px-6 pt-5 pb-3 border-b border-slate-200 bg-white">
          <div className="flex items-end justify-between gap-4 flex-wrap">
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-xl font-semibold tracking-tight">
                  Properties Map
                </h1>
                <SourceBadge state={state} meta={meta} />
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {avsOwned.length} AVS-owned · {pipelineDeals.filter((d) => d.lat != null).length} pipeline deals on map · live from Notion
              </p>
            </div>
            <button
              onClick={onRefresh}
              disabled={refreshing || state === "loading"}
              className="bg-slate-900 text-white text-xs px-3 py-1.5 rounded-md hover:bg-slate-800 disabled:opacity-50"
            >
              {refreshing ? "Refreshing…" : "↻ Refresh from Notion"}
            </button>
          </div>
        </header>

        {state === "error" && (
          <div className="bg-rose-50 border-b border-rose-200 text-rose-800 px-6 py-3 text-sm">
            Couldn't reach the API: {error}
          </div>
        )}

        <div className="relative flex-1 min-h-0">
          <PropertyMap
            properties={[]}
            avsOwned={showOwned ? avsOwned : []}
            pipelineDeals={showPipeline ? filteredPipeline : []}
            flyTarget={flyTarget}
            height="100%"
          />

          <div className="absolute top-4 left-4 z-[1000] w-[min(420px,calc(100%-2rem))] space-y-2">
            <div className="relative">
              <div className="bg-white rounded-lg shadow-md border border-slate-200 flex items-center gap-2 px-3 py-2">
                <svg
                  className="w-4 h-4 text-slate-400 flex-shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M11 17a6 6 0 100-12 6 6 0 000 12z" />
                </svg>
                <input
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setShowSuggestions(true);
                  }}
                  onFocus={() => setShowSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && geoResults.length > 0) {
                      const top = geoResults[0];
                      setFlyTarget({
                        lat: top.lat,
                        lng: top.lng,
                        label: top.displayName,
                        ts: Date.now(),
                      });
                      setShowSuggestions(false);
                      (e.target as HTMLInputElement).blur();
                    }
                  }}
                  placeholder="Search any UK postcode, street, or your portfolio..."
                  className="flex-1 text-sm bg-transparent border-0 focus:outline-none placeholder:text-slate-400"
                />
                {geoLoading && (
                  <span className="w-3 h-3 rounded-full border-2 border-slate-200 border-t-slate-500 animate-spin" />
                )}
                {search && (
                  <button
                    onClick={() => {
                      setSearch("");
                      setGeoResults([]);
                    }}
                    className="text-slate-400 hover:text-slate-600 text-sm px-1"
                    aria-label="Clear search"
                  >
                    ✕
                  </button>
                )}
              </div>

              {showSuggestions &&
                search.trim().length >= 3 &&
                (geoResults.length > 0 || portfolioMatches.length > 0 || geoLoading) && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-lg border border-slate-200 overflow-hidden max-h-[60vh] overflow-y-auto">
                    {portfolioMatches.length > 0 && (
                      <div>
                        <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-700 bg-emerald-50 border-b border-emerald-100">
                          AVS Owned ({portfolioMatches.length})
                        </div>
                        {portfolioMatches.map((p) => (
                          <button
                            key={p.id}
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => {
                              if (p.place) {
                                setFlyTarget({
                                  lat: p.place.lat,
                                  lng: p.place.lng,
                                  label: p.address,
                                  ts: Date.now(),
                                });
                              }
                              setShowSuggestions(false);
                            }}
                            className="w-full px-3 py-2 text-left hover:bg-emerald-50 flex items-start gap-2 border-b border-slate-50 last:border-b-0"
                          >
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 mt-1.5 flex-shrink-0 ring-2 ring-white" />
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium truncate">{p.address}</div>
                              <div className="text-xs text-slate-500 truncate">
                                {p.place?.address}
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}

                    {geoResults.length > 0 && (
                      <div>
                        <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500 bg-slate-50 border-b border-slate-100">
                          Fly to UK location
                        </div>
                        {geoResults.map((g, i) => (
                          <button
                            key={`${g.lat}-${g.lng}-${i}`}
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => {
                              setFlyTarget({
                                lat: g.lat,
                                lng: g.lng,
                                label: g.displayName,
                                ts: Date.now(),
                              });
                              setShowSuggestions(false);
                            }}
                            className="w-full px-3 py-2 text-left hover:bg-slate-50 flex items-start gap-2 border-b border-slate-50 last:border-b-0"
                          >
                            <svg className="w-4 h-4 text-slate-500 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0zM15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm text-slate-800 line-clamp-2">{g.displayName}</div>
                              <div className="text-[10px] text-slate-400 uppercase tracking-wider">{g.type}</div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
            </div>
          </div>

          <div className="absolute bottom-4 left-4 z-[1000] flex flex-col gap-2 items-start max-h-[60vh]">
            <div className="bg-white/95 backdrop-blur-sm rounded-lg shadow-md border border-slate-200 px-3 py-2 flex flex-col gap-1.5 text-xs">
              <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">
                Layers
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showOwned}
                  onChange={(e) => setShowOwned(e.target.checked)}
                  className="accent-emerald-600"
                />
                <span className="inline-flex items-center gap-1.5">
                  <span className="inline-block w-3 h-3 rounded-full bg-gradient-to-br from-teal-700 to-emerald-500 border border-white shadow-sm" />
                  AVS Owned ({avsOwned.length})
                </span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showPipeline}
                  onChange={(e) => setShowPipeline(e.target.checked)}
                  className="accent-amber-600"
                />
                <span className="inline-flex items-center gap-1.5">
                  <span className="inline-block w-3 h-3 rounded-full bg-gradient-to-br from-amber-700 to-amber-500 border border-white shadow-sm" />
                  Pipeline ({filteredPipeline.filter((d) => d.lat != null).length}
                  {filtersActive ? `/${pipelineDeals.filter((d) => d.lat != null).length}` : ""})
                </span>
              </label>
              <button
                onClick={() => setFiltersOpen((v) => !v)}
                className={[
                  "mt-1 text-[11px] font-medium px-2 py-1 rounded border transition-colors text-left",
                  filtersActive
                    ? "bg-amber-50 border-amber-300 text-amber-900 hover:bg-amber-100"
                    : "bg-white border-slate-300 text-slate-700 hover:bg-slate-50",
                ].join(" ")}
              >
                {filtersOpen ? "▾ " : "▸ "}
                {filtersActive ? "Filters on" : "Filter pipeline"}
              </button>

              {filtersOpen && (
                <div className="mt-1 pt-2 border-t border-slate-200 space-y-2 text-[11px] w-56">
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-1">
                      Monthly cashflow (£)
                    </div>
                    <div className="flex gap-1 items-center">
                      <input
                        type="number"
                        value={priceMin}
                        onChange={(e) => setPriceMin(e.target.value)}
                        placeholder="Min"
                        className="w-full px-2 py-1 rounded border border-slate-300 bg-white text-[11px]"
                      />
                      <span className="text-slate-400">–</span>
                      <input
                        type="number"
                        value={priceMax}
                        onChange={(e) => setPriceMax(e.target.value)}
                        placeholder="Max"
                        className="w-full px-2 py-1 rounded border border-slate-300 bg-white text-[11px]"
                      />
                    </div>
                  </div>

                  {allStages.length > 0 && (
                    <div>
                      <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-1">
                        Stage
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {allStages.map((s) => {
                          const on = stageSelection.has(s);
                          return (
                            <button
                              key={s}
                              onClick={() => toggleSet(stageSelection, s, setStageSelection)}
                              className={[
                                "text-[10px] px-1.5 py-0.5 rounded-full border",
                                on
                                  ? "bg-slate-900 text-white border-slate-900"
                                  : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50",
                              ].join(" ")}
                            >
                              {s}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {allConfidences.length > 0 && (
                    <div>
                      <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-1">
                        Confidence
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {allConfidences.map((c) => {
                          const on = confidenceSelection.has(c);
                          const tone =
                            c === "High"
                              ? on
                                ? "bg-emerald-600 text-white border-emerald-700"
                                : "bg-white text-emerald-800 border-emerald-300"
                              : c === "Medium"
                              ? on
                                ? "bg-amber-600 text-white border-amber-700"
                                : "bg-white text-amber-800 border-amber-300"
                              : on
                              ? "bg-slate-700 text-white border-slate-800"
                              : "bg-white text-slate-700 border-slate-300";
                          return (
                            <button
                              key={c}
                              onClick={() =>
                                toggleSet(confidenceSelection, c, setConfidenceSelection)
                              }
                              className={`text-[10px] px-1.5 py-0.5 rounded-full border ${tone}`}
                            >
                              {c}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {filtersActive && (
                    <button
                      onClick={() => {
                        setPriceMin("");
                        setPriceMax("");
                        setStageSelection(new Set());
                        setConfidenceSelection(new Set());
                      }}
                      className="w-full text-[10px] font-semibold text-emerald-700 hover:text-emerald-900 pt-1 border-t border-slate-100"
                    >
                      Clear all filters
                    </button>
                  )}
                </div>
              )}
            </div>

            {avsOwned.length > 0 && showOwned && (
              <div className="bg-white/95 backdrop-blur-sm rounded-lg shadow-md border border-slate-200 p-3 max-w-xs overflow-y-auto">
                <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-2">
                  AVS Owned ({avsOwned.length})
                </div>
                <ul className="space-y-1">
                  {avsOwned.map((p) => (
                    <li key={p.id}>
                      <button
                        onClick={() =>
                          p.place &&
                          setFlyTarget({
                            lat: p.place.lat,
                            lng: p.place.lng,
                            label: p.address,
                            ts: Date.now(),
                          })
                        }
                        className="w-full text-left text-xs hover:bg-slate-50 -mx-1 px-1 py-1 rounded flex items-center gap-2"
                      >
                        <span
                          className={`w-2 h-2 rounded-full shrink-0 ${
                            p.compliance === "Green"
                              ? "bg-emerald-500"
                              : p.compliance === "Amber"
                              ? "bg-amber-500"
                              : p.compliance === "Red"
                              ? "bg-rose-500"
                              : "bg-slate-300"
                          }`}
                        />
                        <span className="font-medium truncate">{p.address}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    </AccessGuard>
  );
}

function SourceBadge({ state, meta }: { state: LoadState; meta: NotionMeta | null }) {
  if (state === "loading") {
    return (
      <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 font-medium">
        Loading…
      </span>
    );
  }
  if (state === "error") {
    return (
      <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 font-medium">
        Error
      </span>
    );
  }
  const cached = meta?.cached;
  return (
    <span
      className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-medium flex items-center gap-1 ${
        cached ? "bg-slate-100 text-slate-700" : "bg-emerald-100 text-emerald-800"
      }`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${
          cached ? "bg-slate-500" : "bg-emerald-600 animate-pulse"
        }`}
      />
      {cached ? "Cached" : "Live Notion"}
    </span>
  );
}
