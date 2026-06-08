"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import AccessGuard from "@/components/AccessGuard";
import { useAuth } from "@/lib/auth";
import {
  fetchNotionProperties,
  fetchNotionPipeline,
  daysUntil,
  type NotionProperty,
  type NotionDeal,
  type NotionMeta,
} from "@/lib/notionApi";

type LoadState = "loading" | "ok" | "error";

export default function DashboardHome() {
  const { currentUser } = useAuth();
  const [properties, setProperties] = useState<NotionProperty[]>([]);
  const [deals, setDeals] = useState<NotionDeal[]>([]);
  const [propsMeta, setPropsMeta] = useState<NotionMeta | null>(null);
  const [dealsMeta, setDealsMeta] = useState<NotionMeta | null>(null);
  const [state, setState] = useState<LoadState>("loading");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([fetchNotionProperties(), fetchNotionPipeline()]).then(
      ([pRes, dRes]) => {
        if (cancelled) return;
        if (pRes.ok && dRes.ok) {
          setProperties(pRes.properties);
          setDeals(dRes.deals);
          setPropsMeta(pRes.meta);
          setDealsMeta(dRes.meta);
          setState("ok");
        } else {
          const e = !pRes.ok ? pRes.error : !dRes.ok ? dRes.error : "Unknown";
          setError(e);
          setState("error");
        }
      }
    );
    return () => {
      cancelled = true;
    };
  }, []);

  const filled = useMemo(
    () => properties.filter((p) => p.address.trim()),
    [properties]
  );

  const propStats = useMemo(() => {
    return {
      total: filled.length,
      live: filled.filter((p) => p.statusBackOffice === "Live").length,
      tenanted: filled.filter((p) => p.status === "Tenanted - OK").length,
      green: filled.filter((p) => p.compliance === "Green").length,
      amber: filled.filter((p) => p.compliance === "Amber").length,
      red: filled.filter((p) => p.compliance === "Red").length,
      monthlyIncome: filled.reduce((s, p) => s + (p.monthlyIncome || 0), 0),
    };
  }, [filled]);

  const dealStats = useMemo(() => {
    const overdue = deals.filter((d) => {
      if (!d.nextActionDate || d.isLive) return false;
      return new Date(d.nextActionDate).getTime() < Date.now();
    });
    const upcoming = deals
      .filter((d) => d.nextActionDate && !d.isLive)
      .map((d) => ({ deal: d, days: daysUntil(d.nextActionDate) }))
      .filter((x) => x.days !== null && x.days >= 0)
      .sort((a, b) => (a.days || 0) - (b.days || 0))
      .slice(0, 5);
    const byStage = new Map<string, number>();
    deals.forEach((d) => {
      const k = d.coreStage || "Unassigned";
      byStage.set(k, (byStage.get(k) || 0) + 1);
    });
    const sortedStages = Array.from(byStage.entries()).sort((a, b) => b[1] - a[1]);
    return {
      total: deals.length,
      inbound: deals.filter((d) => d.direction === "Inbound").length,
      outbound: deals.filter((d) => d.direction === "Outbound").length,
      high: deals.filter((d) => d.confidence === "High").length,
      overdue,
      upcoming,
      sortedStages,
    };
  }, [deals]);

  return (
    <AccessGuard page="">
      <div className="px-8 py-8 space-y-8">
        <header className="flex items-end justify-between gap-4 flex-wrap fade-up">
          <div>
            {currentUser && (
              <div className="text-xs font-semibold text-emerald-700 mb-1.5">
                Welcome back, {currentUser.name} 👋
              </div>
            )}
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-slate-900 via-emerald-800 to-teal-700 bg-clip-text text-transparent">
                AVS Invest
              </h1>
              <SourceBadge state={state} meta={propsMeta || dealsMeta} />
            </div>
            <p className="text-sm text-slate-500 mt-1.5">
              Live overview of your managed portfolio and sourcing pipeline.
            </p>
          </div>
          <div className="text-right">
            <div className="text-xs uppercase tracking-wider text-slate-400 font-semibold">
              Today
            </div>
            <div className="text-sm text-slate-700 font-medium mt-0.5">
              {new Date().toLocaleDateString("en-GB", {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </div>
          </div>
        </header>

        {state === "error" && (
          <div className="bg-rose-50 border border-rose-200 text-rose-800 rounded-xl p-4 text-sm">
            Couldn't reach Notion: {error}
          </div>
        )}

        <section className="space-y-3 fade-up fade-up-delay-1">
          <div className="flex items-center gap-2">
            <span className="w-1 h-4 rounded-full bg-gradient-to-b from-emerald-500 to-teal-600" />
            <h2 className="text-xs uppercase tracking-wider text-slate-600 font-bold">
              Managed properties
            </h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            <StatCard
              label="Managed total"
              value={String(propStats.total)}
              accent="bg-slate-900"
              href="/properties"
            />
            <StatCard
              label="Live"
              value={String(propStats.live)}
              sub={`${propStats.tenanted} tenanted`}
              accent="bg-emerald-600"
              href="/properties?status=Live"
            />
            <StatCard
              label="Compliance Green"
              value={String(propStats.green)}
              sub={`${propStats.amber} amber · ${propStats.red} red`}
              accent="bg-emerald-500"
              href="/properties?compliance=Green"
            />
            <StatCard
              label="Compliance issues"
              value={String(propStats.amber + propStats.red)}
              sub={propStats.red > 0 ? `${propStats.red} red — urgent` : "Amber only"}
              accent={propStats.red > 0 ? "bg-rose-600" : "bg-amber-500"}
              href="/properties?compliance=issues"
            />
            <StatCard
              label="Monthly income"
              value={formatGBP(propStats.monthlyIncome)}
              sub="Sum of Expected Monthly Income"
              accent="bg-teal-600"
              href="/properties"
            />
          </div>
        </section>

        <section className="space-y-3 fade-up fade-up-delay-2">
          <div className="flex items-center gap-2">
            <span className="w-1 h-4 rounded-full bg-gradient-to-b from-amber-500 to-orange-600" />
            <h2 className="text-xs uppercase tracking-wider text-slate-600 font-bold">
              Sourcing pipeline
            </h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            <StatCard
              label="Pipeline total"
              value={String(dealStats.total)}
              accent="bg-slate-900"
              href="/pipeline"
            />
            <StatCard
              label="Inbound / Outbound"
              value={`${dealStats.inbound} / ${dealStats.outbound}`}
              accent="bg-indigo-600"
              href="/pipeline"
            />
            <StatCard
              label="High confidence"
              value={String(dealStats.high)}
              accent="bg-emerald-600"
              href="/pipeline?confidence=High"
            />
            <StatCard
              label="Overdue actions"
              value={String(dealStats.overdue.length)}
              sub="Next Action Date in past"
              accent={dealStats.overdue.length > 0 ? "bg-rose-600" : "bg-slate-400"}
              href="/pipeline?overdue=1"
            />
            <StatCard
              label="Stages"
              value={String(dealStats.sortedStages.length)}
              sub="Distinct Core Stages"
              accent="bg-teal-600"
              href="/pipeline"
            />
          </div>
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Managed properties</h2>
              <Link
                href="/properties"
                className="text-sm text-emerald-700 hover:text-emerald-900"
              >
                View all →
              </Link>
            </div>
            {filled.length === 0 ? (
              <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-sm text-slate-500">
                No filled-in properties in Notion yet.
                <div className="text-xs text-slate-400 mt-1">
                  Add a row in your AVS HQ → Properties database to see it here.
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {filled.slice(0, 6).map((p) => (
                  <PropertyMini key={p.id} property={p} />
                ))}
              </div>
            )}
          </div>

          <aside className="space-y-6 fade-up fade-up-delay-3">
            <div className="card-elev-flat p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-bold text-slate-900">Pipeline by stage</h2>
                <Link
                  href="/pipeline"
                  className="text-xs text-emerald-700 hover:text-emerald-900 font-semibold flex items-center gap-1 group"
                >
                  Open
                  <span className="transition-transform group-hover:translate-x-0.5">→</span>
                </Link>
              </div>
              {dealStats.sortedStages.length === 0 ? (
                <div className="text-sm text-slate-400">No deals yet.</div>
              ) : (
                <ol className="space-y-3">
                  {dealStats.sortedStages.slice(0, 8).map(([stage, count], i) => {
                    const pct = (count / dealStats.total) * 100;
                    return (
                      <li key={stage} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-slate-700 truncate pr-2">
                            {stage}
                          </span>
                          <span className="text-slate-500 tabular-nums font-medium">
                            {count}{" "}
                            <span className="text-slate-400">·</span>{" "}
                            {pct.toFixed(0)}%
                          </span>
                        </div>
                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-emerald-500 to-teal-600 bar-grow rounded-full"
                            style={{
                              width: `${pct}%`,
                              animationDelay: `${i * 60}ms`,
                            }}
                          />
                        </div>
                      </li>
                    );
                  })}
                </ol>
              )}
            </div>

            <div className="card-elev-flat p-5">
              <h2 className="text-base font-bold text-slate-900 mb-3">Next actions</h2>
              {dealStats.upcoming.length === 0 ? (
                <div className="text-sm text-slate-400">
                  No upcoming dated actions.
                </div>
              ) : (
                <ol className="space-y-3">
                  {dealStats.upcoming.map(({ deal, days }) => (
                    <li key={deal.id} className="border-b border-slate-100 last:border-b-0 pb-2 last:pb-0">
                      <a
                        href={deal.notionUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block hover:bg-slate-50 -mx-1 px-1 rounded"
                      >
                        <div className="flex items-baseline justify-between gap-2">
                          <div className="text-xs font-semibold truncate flex-1">
                            {deal.dealId || "(no ID)"}
                          </div>
                          <span
                            className={`text-[10px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded ${
                              (days || 0) < 3
                                ? "bg-rose-100 text-rose-700"
                                : (days || 0) < 7
                                ? "bg-amber-100 text-amber-700"
                                : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {days === 0 ? "today" : `${days}d`}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-600 mt-0.5 line-clamp-2">
                          {deal.nextAction}
                        </div>
                      </a>
                    </li>
                  ))}
                </ol>
              )}
            </div>

            {dealStats.overdue.length > 0 && (
              <div className="rounded-[0.875rem] border border-rose-200/80 bg-gradient-to-br from-rose-50 to-pink-50/50 p-5 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-base font-bold text-rose-900 flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-rose-500 text-white flex items-center justify-center text-xs">!</span>
                    Overdue actions
                  </h2>
                  <Link
                    href="/pipeline?overdue=1"
                    className="text-xs text-rose-700 hover:text-rose-900 font-semibold flex items-center gap-1 group"
                  >
                    Open
                    <span className="transition-transform group-hover:translate-x-0.5">→</span>
                  </Link>
                </div>
                <ol className="space-y-2">
                  {dealStats.overdue.slice(0, 5).map((d) => {
                    const days = daysUntil(d.nextActionDate);
                    return (
                      <li key={d.id}>
                        <a
                          href={d.notionUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs hover:underline"
                        >
                          <span className="font-semibold">{d.dealId}</span>
                          <span className="text-rose-700 ml-1.5">
                            ({-(days || 0)}d overdue)
                          </span>
                        </a>
                      </li>
                    );
                  })}
                </ol>
              </div>
            )}
          </aside>
        </section>
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

function StatCard({
  label,
  value,
  sub,
  accent,
  href,
}: {
  label: string;
  value: string;
  sub?: string;
  accent: string;
  href?: string;
}) {
  // Map accent class to a gradient used for the top edge & dot.
  const gradient =
    accent === "bg-emerald-600" || accent === "bg-emerald-500"
      ? "from-emerald-500 to-teal-600"
      : accent === "bg-teal-600"
      ? "from-teal-500 to-cyan-600"
      : accent === "bg-indigo-600"
      ? "from-indigo-500 to-blue-600"
      : accent === "bg-rose-600"
      ? "from-rose-500 to-pink-600"
      : accent === "bg-amber-500"
      ? "from-amber-500 to-orange-600"
      : accent === "bg-slate-400"
      ? "from-slate-400 to-slate-500"
      : "from-slate-700 to-slate-900";

  const inner = (
    <>
      <div
        className={`absolute inset-x-0 top-0 h-[3px] rounded-t-[0.875rem] bg-gradient-to-r ${gradient} opacity-0 group-hover:opacity-100 transition-opacity`}
      />
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full bg-gradient-to-br ${gradient}`} />
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            {label}
          </div>
        </div>
      </div>
      <div className="text-[28px] leading-none font-bold tracking-tight text-slate-900">
        {value}
      </div>
      {sub && <div className="text-xs text-slate-500 mt-2 leading-tight">{sub}</div>}
    </>
  );
  if (href) {
    return (
      <Link
        href={href}
        className="card-elev relative overflow-hidden p-5 block group cursor-pointer"
      >
        {inner}
        <div className="text-[10px] text-emerald-700 font-semibold mt-3 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
          View details
          <span className="transition-transform group-hover:translate-x-0.5">→</span>
        </div>
      </Link>
    );
  }
  return <div className="card-elev-flat relative overflow-hidden p-5 group">{inner}</div>;
}

function PropertyMini({ property: p }: { property: NotionProperty }) {
  const dotColor =
    p.compliance === "Green"
      ? "bg-emerald-500"
      : p.compliance === "Amber"
      ? "bg-amber-500"
      : p.compliance === "Red"
      ? "bg-rose-500"
      : "bg-slate-300";
  const accentGradient =
    p.compliance === "Green"
      ? "from-emerald-500 to-teal-600"
      : p.compliance === "Amber"
      ? "from-amber-500 to-orange-600"
      : p.compliance === "Red"
      ? "from-rose-500 to-pink-600"
      : "from-slate-400 to-slate-500";

  return (
    <a
      href={p.notionUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="card-elev relative overflow-hidden flex flex-col group"
    >
      <div
        className={`absolute inset-y-0 left-0 w-[3px] bg-gradient-to-b ${accentGradient}`}
      />
      <div className="px-4 py-3 border-b border-slate-100 pl-5">
        <div className="flex items-start justify-between gap-2">
          <div className="text-sm font-semibold leading-tight truncate flex-1 text-slate-900 group-hover:text-slate-700 transition-colors">
            {p.address}
          </div>
          <span className={`w-2.5 h-2.5 rounded-full ${dotColor} mt-1.5 shrink-0 ring-2 ring-white shadow`} />
        </div>
        {p.place?.address && (
          <div className="text-[11px] text-slate-500 truncate mt-0.5">
            {p.place.address}
          </div>
        )}
      </div>
      <div className="px-4 py-2.5 pl-5 flex flex-wrap gap-1">
        {p.status && (
          <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200/70 px-2 py-0.5 rounded-full font-semibold">
            {p.status}
          </span>
        )}
        {p.managementModel && (
          <span className="text-[10px] bg-indigo-50 text-indigo-700 border border-indigo-200/70 px-2 py-0.5 rounded-full font-semibold">
            {p.managementModel}
          </span>
        )}
      </div>
    </a>
  );
}

function formatGBP(value: number): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 0,
  }).format(value);
}
