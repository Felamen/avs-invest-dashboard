"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import AccessGuard from "@/components/AccessGuard";
import {
  fetchNotionPipeline,
  refreshNotion,
  type NotionDeal,
  type NotionMeta,
} from "@/lib/notionApi";

type LoadState = "loading" | "ok" | "error";

const STAGE_ORDER = [
  "Sourced",
  "Contacted",
  "Viewing / Call Held",
  "Negotiating",
  "Offer Made",
  "Agreed",
  "Onboarding",
  "Live",
  "Parked",
  "Lost",
];

function stageRank(stage: string | null): number {
  if (!stage) return 999;
  const i = STAGE_ORDER.findIndex((s) => s.toLowerCase() === stage.toLowerCase());
  return i === -1 ? 500 : i;
}

export default function PipelinePage() {
  const params = useSearchParams();
  const urlConfidence = params.get("confidence");
  const urlOverdueOnly = params.get("overdue") === "1";

  const [deals, setDeals] = useState<NotionDeal[]>([]);
  const [meta, setMeta] = useState<NotionMeta | null>(null);
  const [state, setState] = useState<LoadState>("loading");
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [confidenceFilter, setConfidenceFilter] = useState<string>(
    urlConfidence || "All"
  );
  const [overdueOnly, setOverdueOnly] = useState<boolean>(urlOverdueOnly);

  async function load() {
    setState("loading");
    const r = await fetchNotionPipeline();
    if (r.ok) {
      setDeals(r.deals);
      setMeta(r.meta);
      setState("ok");
      setError(null);
    } else {
      setError(r.error);
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

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const now = Date.now();
    return deals.filter((d) => {
      if (confidenceFilter !== "All" && d.confidence !== confidenceFilter) return false;
      if (overdueOnly) {
        if (!d.nextActionDate || d.isLive) return false;
        if (new Date(d.nextActionDate).getTime() >= now) return false;
      }
      if (!q) return true;
      return (
        d.dealId.toLowerCase().includes(q) ||
        d.propertyAddress.toLowerCase().includes(q) ||
        d.landlord.toLowerCase().includes(q) ||
        (d.source || "").toLowerCase().includes(q)
      );
    });
  }, [deals, search, confidenceFilter, overdueOnly]);

  const stages = useMemo(() => {
    const map = new Map<string, NotionDeal[]>();
    filtered.forEach((d) => {
      const key = d.coreStage || "Unassigned";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(d);
    });
    return Array.from(map.entries())
      .map(([stage, items]) => ({ stage, items }))
      .sort((a, b) => stageRank(a.stage) - stageRank(b.stage));
  }, [filtered]);

  const stats = useMemo(() => {
    const inbound = deals.filter((d) => d.direction === "Inbound").length;
    const outbound = deals.filter((d) => d.direction === "Outbound").length;
    const high = deals.filter((d) => d.confidence === "High").length;
    const live = deals.filter((d) => d.isLive).length;
    const overdue = deals.filter((d) => {
      if (!d.nextActionDate) return false;
      return new Date(d.nextActionDate).getTime() < Date.now() && !d.isLive;
    }).length;
    return { total: deals.length, inbound, outbound, high, live, overdue };
  }, [deals]);

  const confidenceOptions = useMemo(() => {
    const s = new Set<string>();
    deals.forEach((d) => d.confidence && s.add(d.confidence));
    return ["All", ...Array.from(s)];
  }, [deals]);

  return (
    <AccessGuard page="pipeline">
      <div className="px-8 py-8 space-y-6">
        <header className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-semibold tracking-tight">Pipeline</h1>
              <SourceBadge state={state} meta={meta} />
            </div>
            <p className="text-sm text-slate-500 mt-1">
              Live from Notion → CE Pipeline. {deals.length} deals across {stages.length} stage
              {stages.length === 1 ? "" : "s"}.
            </p>
          </div>
          <button
            onClick={onRefresh}
            disabled={refreshing || state === "loading"}
            className="bg-slate-900 text-white text-sm px-4 py-2 rounded-md hover:bg-slate-800 disabled:opacity-50"
          >
            {refreshing ? "Refreshing…" : "↻ Refresh from Notion"}
          </button>
        </header>

        {state === "error" && (
          <div className="bg-rose-50 border border-rose-200 text-rose-800 rounded-xl p-4 text-sm">
            Couldn't reach the API: {error}
          </div>
        )}

        <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          <StatCard label="Total deals" value={String(stats.total)} accent="bg-slate-900" />
          <StatCard
            label="Inbound / Outbound"
            value={`${stats.inbound} / ${stats.outbound}`}
            sub="from Direction"
            accent="bg-emerald-600"
          />
          <StatCard
            label="High confidence"
            value={String(stats.high)}
            accent="bg-indigo-600"
          />
          <StatCard
            label="Live"
            value={String(stats.live)}
            sub="Marked 'Is property Live?'"
            accent="bg-emerald-500"
          />
          <StatCard
            label="Overdue actions"
            value={String(stats.overdue)}
            sub="Next Action Date in the past"
            accent={stats.overdue > 0 ? "bg-rose-600" : "bg-slate-400"}
          />
        </section>

        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center flex-wrap">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search deal ID, address, landlord, source..."
            className="flex-1 max-w-md px-3 py-2 rounded-md border border-slate-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          />
          <div className="flex gap-1 bg-white border border-slate-200 rounded-md p-1 flex-wrap">
            {confidenceOptions.map((c) => (
              <button
                key={c}
                onClick={() => setConfidenceFilter(c)}
                className={[
                  "text-xs px-3 py-1.5 rounded font-medium transition-colors",
                  confidenceFilter === c
                    ? "bg-slate-900 text-white"
                    : "text-slate-600 hover:bg-slate-100",
                ].join(" ")}
              >
                {c}
              </button>
            ))}
          </div>
          <button
            onClick={() => setOverdueOnly((v) => !v)}
            className={[
              "text-xs px-3 py-1.5 rounded-md font-medium border transition-colors",
              overdueOnly
                ? "bg-rose-600 text-white border-rose-700 hover:bg-rose-700"
                : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50",
            ].join(" ")}
            title="Show only deals with Next Action Date in the past"
          >
            {overdueOnly ? "⚠ Overdue only" : "Show overdue only"}
          </button>
        </div>

        {(confidenceFilter !== "All" || overdueOnly) && (
          <div className="flex items-center gap-2 text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
            <span className="font-semibold">Filtered:</span>
            {confidenceFilter !== "All" && (
              <span className="bg-white border border-slate-200 px-2 py-0.5 rounded">
                Confidence: {confidenceFilter}
              </span>
            )}
            {overdueOnly && (
              <span className="bg-rose-100 text-rose-800 border border-rose-200 px-2 py-0.5 rounded">
                Overdue
              </span>
            )}
            <button
              onClick={() => {
                setConfidenceFilter("All");
                setOverdueOnly(false);
              }}
              className="ml-auto text-emerald-700 hover:text-emerald-900 font-medium"
            >
              Clear filters
            </button>
          </div>
        )}

        {state === "loading" && deals.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 py-16 text-center text-slate-400">
            Loading deals from Notion…
          </div>
        ) : stages.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 py-12 text-center text-slate-400">
            No deals match your filter.
          </div>
        ) : (
          <div className="flex gap-4 overflow-x-auto pb-4 -mx-2 px-2">
            {stages.map(({ stage, items }) => (
              <div
                key={stage}
                className="shrink-0 w-80 bg-slate-50 rounded-xl border border-slate-200 flex flex-col max-h-[80vh]"
              >
                <div className="px-4 py-3 border-b border-slate-200 sticky top-0 bg-slate-50 rounded-t-xl">
                  <div className="flex items-center justify-between">
                    <div className="font-semibold text-sm">{stage}</div>
                    <div className="text-xs bg-white border border-slate-200 rounded-full px-2 py-0.5 font-medium text-slate-600">
                      {items.length}
                    </div>
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
                  {items.map((d) => (
                    <DealCard key={d.id} deal={d} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
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
      title={meta ? `Fetched ${meta.fetchedAt}` : ""}
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

function StatCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  accent: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <div className="flex items-center gap-2 mb-3">
        <div className={`w-2 h-2 rounded-full ${accent}`} />
        <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">
          {label}
        </div>
      </div>
      <div className="text-2xl font-semibold tracking-tight">{value}</div>
      {sub && <div className="text-xs mt-1 text-slate-500">{sub}</div>}
    </div>
  );
}

function DealCard({ deal: d }: { deal: NotionDeal }) {
  const overdue =
    d.nextActionDate && new Date(d.nextActionDate).getTime() < Date.now() && !d.isLive;

  return (
    <a
      href={d.notionUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="block bg-white rounded-lg border border-slate-200 p-3 hover:shadow-md hover:border-slate-300 transition-all"
    >
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <div className="text-xs font-semibold leading-tight flex-1 min-w-0">
          {d.dealId || "(no ID)"}
        </div>
        {d.confidence && (
          <span
            className={`text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded font-bold shrink-0 ${confidenceStyle(d.confidence)}`}
          >
            {d.confidence}
          </span>
        )}
      </div>

      {d.propertyAddress && (
        <div className="text-[11px] text-slate-500 mb-2 truncate">📍 {d.propertyAddress}</div>
      )}

      <div className="flex flex-wrap gap-1 mb-2">
        {d.landlord && (
          <span className="text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded">
            👤 {d.landlord}
          </span>
        )}
        {d.source && (
          <span className="text-[10px] bg-indigo-100 text-indigo-800 px-1.5 py-0.5 rounded">
            {d.source}
          </span>
        )}
        {d.direction && (
          <span className="text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded">
            {d.direction}
          </span>
        )}
      </div>

      {d.nextAction && (
        <div
          className={`text-[11px] border-t border-slate-100 pt-2 mt-2 ${overdue ? "text-rose-700" : "text-slate-600"}`}
        >
          <span className="font-semibold">{overdue ? "⚠ Overdue:" : "Next:"}</span>{" "}
          <span className="line-clamp-2">{d.nextAction}</span>
          {d.nextActionDate && (
            <div className={`text-[10px] mt-0.5 ${overdue ? "text-rose-600 font-semibold" : "text-slate-400"}`}>
              {formatDate(d.nextActionDate)}
            </div>
          )}
        </div>
      )}

      {d.blocker && (
        <div className="text-[10px] bg-rose-50 text-rose-700 border border-rose-200 px-1.5 py-0.5 rounded mt-2 font-medium">
          🚧 {d.blocker}
        </div>
      )}
    </a>
  );
}

function confidenceStyle(c: string): string {
  if (c === "High") return "bg-emerald-100 text-emerald-800";
  if (c === "Medium") return "bg-amber-100 text-amber-800";
  if (c === "Low") return "bg-rose-100 text-rose-800";
  return "bg-slate-100 text-slate-700";
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}
