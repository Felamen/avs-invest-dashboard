"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import AccessGuard from "@/components/AccessGuard";
import {
  fetchNotionProperties,
  refreshNotion,
  daysUntil,
  type NotionProperty,
  type NotionMeta,
} from "@/lib/notionApi";

type LoadState = "loading" | "ok" | "error";

export default function PropertiesPage() {
  const params = useSearchParams();
  const [statusFilter, setStatusFilter] = useState<string>(
    params.get("status") || "All"
  );
  const [complianceFilter, setComplianceFilter] = useState<string>(
    params.get("compliance") || "All"
  );

  const [items, setItems] = useState<NotionProperty[]>([]);
  const [meta, setMeta] = useState<NotionMeta | null>(null);
  const [state, setState] = useState<LoadState>("loading");
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  async function load() {
    setState("loading");
    const r = await fetchNotionProperties();
    if (r.ok) {
      setItems(r.properties);
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

  const filled = useMemo(() => items.filter((p) => p.address.trim()), [items]);

  const visible = useMemo(() => {
    return filled.filter((p) => {
      if (statusFilter === "Live" && p.statusBackOffice !== "Live") return false;
      if (statusFilter === "Tenanted" && p.status !== "Tenanted - OK") return false;
      if (complianceFilter === "Green" && p.compliance !== "Green") return false;
      if (complianceFilter === "Amber" && p.compliance !== "Amber") return false;
      if (complianceFilter === "Red" && p.compliance !== "Red") return false;
      if (complianceFilter === "issues" && p.compliance !== "Amber" && p.compliance !== "Red") return false;
      return true;
    });
  }, [filled, statusFilter, complianceFilter]);

  const isFiltered = statusFilter !== "All" || complianceFilter !== "All";

  const stats = useMemo(() => {
    const live = filled.filter((p) => p.statusBackOffice === "Live").length;
    const tenanted = filled.filter((p) => p.status === "Tenanted - OK").length;
    const green = filled.filter((p) => p.compliance === "Green").length;
    const amber = filled.filter((p) => p.compliance === "Amber").length;
    const red = filled.filter((p) => p.compliance === "Red").length;
    const noCompliance = filled.filter((p) => !p.compliance).length;
    const monthlyIncome = filled.reduce(
      (s, p) => s + (p.monthlyIncome || 0),
      0
    );
    return { total: filled.length, live, tenanted, green, amber, red, noCompliance, monthlyIncome };
  }, [filled]);

  return (
    <AccessGuard page="properties">
      <div className="px-8 py-8 space-y-6">
        <header className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-semibold tracking-tight">
                Properties
              </h1>
              <SourceBadge state={state} meta={meta} />
            </div>
            <p className="text-sm text-slate-500 mt-1">
              Live from Notion → AVS HQ Database → Properties.{" "}
              {filled.length > 0 && (
                <>{filled.length} {filled.length === 1 ? "property" : "properties"} with data{items.length - filled.length > 0 ? `, ${items.length - filled.length} empty draft row${items.length - filled.length === 1 ? "" : "s"}` : ""}.</>
              )}
            </p>
          </div>
          <button
            onClick={onRefresh}
            disabled={refreshing || state === "loading"}
            className="bg-slate-900 text-white text-sm px-4 py-2 rounded-md hover:bg-slate-800 disabled:opacity-50 flex items-center gap-1.5"
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
          <StatCard label="Total" value={String(stats.total)} accent="bg-slate-900" />
          <StatCard
            label="Live"
            value={String(stats.live)}
            sub={`${stats.tenanted} tenanted`}
            accent="bg-emerald-600"
          />
          <StatCard
            label="Compliance Green"
            value={String(stats.green)}
            sub={`${stats.amber} amber · ${stats.red} red · ${stats.noCompliance} unset`}
            accent="bg-emerald-500"
          />
          <StatCard
            label="Monthly Income"
            value={formatGBP(stats.monthlyIncome)}
            sub="Sum of Expected Monthly Income"
            accent="bg-teal-600"
          />
          <StatCard
            label="Empty draft rows"
            value={String(items.length - filled.length)}
            sub={items.length - filled.length > 0 ? "Fill or delete in Notion" : "All clean"}
            accent="bg-slate-400"
          />
        </section>

        {isFiltered && (
          <div className="flex items-center gap-2 text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 flex-wrap">
            <span className="font-semibold">Filtered:</span>
            {statusFilter !== "All" && (
              <span className="bg-white border border-slate-200 px-2 py-0.5 rounded">
                Status: {statusFilter}
              </span>
            )}
            {complianceFilter !== "All" && (
              <span
                className={`px-2 py-0.5 rounded border ${
                  complianceFilter === "issues" || complianceFilter === "Red"
                    ? "bg-rose-100 text-rose-800 border-rose-200"
                    : complianceFilter === "Amber"
                    ? "bg-amber-100 text-amber-800 border-amber-200"
                    : "bg-emerald-100 text-emerald-800 border-emerald-200"
                }`}
              >
                Compliance: {complianceFilter === "issues" ? "Amber + Red" : complianceFilter}
              </span>
            )}
            <span className="text-slate-500">
              {visible.length} of {filled.length} shown
            </span>
            <button
              onClick={() => {
                setStatusFilter("All");
                setComplianceFilter("All");
              }}
              className="ml-auto text-emerald-700 hover:text-emerald-900 font-medium"
            >
              Clear filters
            </button>
          </div>
        )}

        {state === "loading" && filled.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 py-16 text-center text-slate-400">
            Loading from Notion…
          </div>
        ) : filled.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 py-12 text-center">
            <div className="text-slate-500 text-sm mb-2">
              No filled-in properties yet in your Notion "Properties" database.
            </div>
            <div className="text-xs text-slate-400">
              Add a row in Notion with at least a Property Address, then hit Refresh.
            </div>
          </div>
        ) : visible.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 py-12 text-center text-slate-400">
            No properties match these filters.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {visible.map((p) => (
              <PropertyCard key={p.id} property={p} />
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

function PropertyCard({ property: p }: { property: NotionProperty }) {
  const gas = daysUntil(p.gasExpiry);
  const eicr = daysUntil(p.eicrExpiry);
  const hmo = daysUntil(p.hmoExpiry);
  const insp = daysUntil(p.nextInspection);
  const certs = [
    { label: "Gas", days: gas, hasDate: !!p.gasExpiry },
    { label: "EICR", days: eicr, hasDate: !!p.eicrExpiry },
    { label: "HMO", days: hmo, hasDate: !!p.hmoExpiry },
    { label: "Inspection", days: insp, hasDate: !!p.nextInspection },
  ];

  return (
    <a
      href={p.notionUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="bg-white rounded-xl border border-slate-200 overflow-hidden hover:shadow-lg transition-shadow flex flex-col"
    >
      <div className="px-4 py-3 border-b border-slate-100 flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold leading-tight truncate">
            {p.address || "(no address)"}
          </div>
          {p.place?.address && (
            <div className="text-[11px] text-slate-500 truncate mt-0.5">
              {p.place.address}
            </div>
          )}
        </div>
        <ComplianceDot compliance={p.compliance} />
      </div>

      <div className="px-4 py-3 space-y-2.5 flex-1 flex flex-col">
        <div className="flex flex-wrap gap-1.5">
          {p.status && <Pill tone={statusTone(p.status)}>{p.status}</Pill>}
          {p.statusBackOffice && <Pill tone="slate">{p.statusBackOffice}</Pill>}
          {p.managementModel && <Pill tone="indigo">{p.managementModel}</Pill>}
          {p.propertyType.map((t) => (
            <Pill key={t} tone="slate">
              {t}
            </Pill>
          ))}
        </div>

        {p.monthlyIncome !== null && (
          <div className="text-xs">
            <span className="text-slate-500">Expected income</span>{" "}
            <span className="font-semibold">{formatGBP(p.monthlyIncome)}/mo</span>
          </div>
        )}

        <div className="pt-2 border-t border-slate-100 mt-auto">
          <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold mb-1.5">
            Compliance dates
          </div>
          <div className="grid grid-cols-2 gap-1.5 text-[11px]">
            {certs.map((c) => (
              <CertChip key={c.label} {...c} />
            ))}
          </div>
        </div>
      </div>
    </a>
  );
}

function ComplianceDot({ compliance }: { compliance: NotionProperty["compliance"] }) {
  if (!compliance) {
    return (
      <span
        className="w-2.5 h-2.5 rounded-full bg-slate-200 mt-1.5"
        title="No compliance status"
      />
    );
  }
  const cls = {
    Green: "bg-emerald-500",
    Amber: "bg-amber-500",
    Red: "bg-rose-500",
  }[compliance];
  return (
    <span
      className={`w-2.5 h-2.5 rounded-full ${cls} mt-1.5 shrink-0`}
      title={`Compliance: ${compliance}`}
    />
  );
}

function CertChip({
  label,
  days,
  hasDate,
}: {
  label: string;
  days: number | null;
  hasDate: boolean;
}) {
  if (!hasDate || days === null) {
    return (
      <div className="text-slate-400">
        <span className="font-medium">{label}</span>{" "}
        <span className="text-[10px]">— not set</span>
      </div>
    );
  }
  const tone =
    days < 0 ? "text-rose-700" : days < 30 ? "text-amber-700" : "text-emerald-700";
  const word = days < 0 ? `${-days}d overdue` : `${days}d`;
  return (
    <div className={tone}>
      <span className="font-medium text-slate-700">{label}</span>{" "}
      <span className="text-[10px] font-semibold">{word}</span>
    </div>
  );
}

function Pill({
  tone,
  children,
}: {
  tone: "emerald" | "amber" | "rose" | "slate" | "indigo";
  children: React.ReactNode;
}) {
  const cls = {
    emerald: "bg-emerald-100 text-emerald-800",
    amber: "bg-amber-100 text-amber-800",
    rose: "bg-rose-100 text-rose-800",
    slate: "bg-slate-100 text-slate-700",
    indigo: "bg-indigo-100 text-indigo-800",
  }[tone];
  return (
    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${cls}`}>
      {children}
    </span>
  );
}

function statusTone(status: string): "emerald" | "amber" | "rose" | "slate" {
  if (status === "Tenanted - OK") return "emerald";
  if (status === "End of Tenancy / Turnover") return "rose";
  if (status === "Maintenance in Progress") return "amber";
  if (status === "Marketing & Lettings") return "amber";
  if (status === "Onboarding") return "slate";
  if (status === "Archived") return "slate";
  return "slate";
}

function formatGBP(value: number): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 0,
  }).format(value);
}
