"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import AccessGuard from "@/components/AccessGuard";
import AccountModal from "@/components/AccountModal";

// Shared backend (AVS server) + the two business dashboard URLs. Env-driven so
// production points at the live URLs; falls back to localhost for dev.
const API_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "http://localhost:5001";
const AVS_URL =
  process.env.NEXT_PUBLIC_AVS_URL?.replace(/\/$/, "") || "http://localhost:3000";
const VERTEX_URL =
  process.env.NEXT_PUBLIC_VERTEX_URL?.replace(/\/$/, "") || "http://localhost:3001";

type AvsSummary = {
  workspace: string;
  propertyCount: number;
  activeCount: number;
  monthlyIncome: number;
  avgRoi: number;
  avgOccupancy: number;
  totalValue: number;
};

type VertexSummary = {
  workspace: string;
  bookingsToday: number;
  bookingsThisWeek: number;
  activeClients: number;
  openJobs: number;
  totalRevenue: number;
  awaitingConfirmation?: number;
  totalBookings?: number;
  depositsHeld?: number;
  source?: "notion" | "error";
  stale?: boolean;
};

async function fetchJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

function formatGBP(value: number): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 0,
  }).format(value);
}

export default function OwnerHubHome() {
  return (
    <AccessGuard>
      <HubContent />
    </AccessGuard>
  );
}

function HubContent() {
  const router = useRouter();
  const { currentUser, token, logout } = useAuth();
  const [accountOpen, setAccountOpen] = useState(false);
  const mustChange = !!currentUser?.mustChangePassword;
  const [avs, setAvs] = useState<AvsSummary | null>(null);
  const [vertex, setVertex] = useState<VertexSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetchJson<AvsSummary>(`${API_URL}/api/summary`),
      fetchJson<VertexSummary>(`${VERTEX_URL}/api/summary`),
    ]).then(([a, v]) => {
      if (cancelled) return;
      setAvs(a);
      setVertex(v);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  function handleLogout() {
    logout();
    router.replace("/login");
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white flex flex-col">
      <header className="border-b border-white/10">
        <div className="max-w-6xl mx-auto px-8 py-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-400 to-pink-500 flex items-center justify-center font-bold text-xl text-slate-900">
              ◇
            </div>
            <div>
              <div className="font-semibold tracking-tight text-lg">Owner Hub</div>
              <div className="text-xs text-slate-400">
                {currentUser?.name} · all workspaces
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-xs text-slate-400 hidden sm:block">
              {new Date().toLocaleDateString("en-GB", {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </div>
            <button
              onClick={() => setAccountOpen(true)}
              className="text-xs text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-md border border-white/10 transition-colors"
            >
              Account
            </button>
            <button
              onClick={handleLogout}
              className="text-xs text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-md border border-white/10 transition-colors"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <AccountModal open={mustChange || accountOpen} forced={mustChange} onClose={() => setAccountOpen(false)} />

      <main className="flex-1 max-w-6xl mx-auto w-full px-8 py-16 flex flex-col justify-center">
        <div className="mb-12">
          <h1 className="text-4xl font-semibold tracking-tight">Your businesses</h1>
          <p className="text-slate-400 mt-2 max-w-2xl">
            Two dashboards. One overview. Click a tile to open the full dashboard.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <WorkspaceTile
            title="AVS Invest"
            tagline="Property investment & short-let portfolio"
            url={`${AVS_URL}${token ? `?sso=${token}` : ""}`}
            accent="from-emerald-500 to-teal-700"
            icon="🏠"
            online={!!avs}
            loading={loading}
            metrics={
              avs
                ? [
                    { label: "Properties", value: String(avs.propertyCount) },
                    { label: "Avg ROI", value: `${avs.avgRoi}%` },
                    { label: "Monthly income", value: formatGBP(avs.monthlyIncome) },
                  ]
                : [
                    { label: "Properties", value: "—" },
                    { label: "Avg ROI", value: "—" },
                    { label: "Monthly income", value: "—" },
                  ]
            }
          />
          <WorkspaceTile
            title="Vertex Hygiene"
            tagline="Cleaning operations & bookings"
            url={`${VERTEX_URL}${token ? `?sso=${token}` : ""}`}
            accent="from-cyan-500 to-emerald-600"
            icon="🧽"
            online={!!vertex}
            loading={loading}
            metrics={
              vertex
                ? [
                    { label: "Awaiting confirmation", value: String(vertex.awaitingConfirmation ?? vertex.openJobs) },
                    { label: "This week", value: String(vertex.bookingsThisWeek) },
                    { label: "Deposits held", value: formatGBP(vertex.depositsHeld ?? 0) },
                  ]
                : [
                    { label: "Awaiting confirmation", value: "—" },
                    { label: "This week", value: "—" },
                    { label: "Deposits held", value: "—" },
                  ]
            }
            badge={vertex?.source === "notion" ? "Live Notion" : undefined}
          />
        </div>

        <div className="mt-12 text-xs text-slate-500 text-center">
          Each workspace is a separate Next.js app on its own port. AVS = 3000 · Vertex = 3001 · Owner Hub = 3002.
          {" "}Owner role only. Data refreshes on page load.
        </div>
      </main>
    </div>
  );
}

function WorkspaceTile({
  title,
  tagline,
  url,
  accent,
  icon,
  online,
  loading,
  metrics,
  badge,
}: {
  title: string;
  tagline: string;
  url: string;
  accent: string;
  icon: string;
  online: boolean;
  loading: boolean;
  metrics: { label: string; value: string }[];
  badge?: string;
}) {
  const status = loading ? "Loading" : online ? "Live" : "Offline";
  const statusClass = loading
    ? "bg-slate-500/20 text-slate-300"
    : online
    ? "bg-emerald-500/20 text-emerald-300"
    : "bg-rose-500/20 text-rose-300";
  const dotClass = loading
    ? "bg-slate-400 animate-pulse"
    : online
    ? "bg-emerald-400 animate-pulse"
    : "bg-rose-400";

  return (
    <a
      href={url}
      className="group block bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-2xl p-7 transition-all"
    >
      <div className="flex items-start justify-between mb-5">
        <div
          className={`inline-flex w-12 h-12 rounded-xl bg-gradient-to-br ${accent} items-center justify-center text-2xl`}
        >
          {icon}
        </div>
        <div className="flex items-center gap-2">
          {badge && (
            <span className="text-[10px] uppercase tracking-wider font-bold px-2 py-1 rounded-full bg-purple-500/20 text-purple-200 border border-purple-400/30">
              {badge}
            </span>
          )}
        <span
          className={`text-[10px] uppercase tracking-wider font-medium px-2 py-1 rounded-full flex items-center gap-1 ${statusClass}`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${dotClass}`} />
          {status}
        </span>
        </div>
      </div>

      <div className="flex items-start justify-between mb-1">
        <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
        <span className="text-slate-400 group-hover:text-white transition-colors text-xl">↗</span>
      </div>
      <p className="text-sm text-slate-400 mb-6">{tagline}</p>

      <div className="grid grid-cols-3 gap-3 pt-5 border-t border-white/10">
        {metrics.map((m) => (
          <div key={m.label}>
            <div className="text-[10px] uppercase tracking-wider text-slate-500">{m.label}</div>
            <div className="text-base font-semibold mt-0.5">{m.value}</div>
          </div>
        ))}
      </div>

      <div className="mt-5 text-xs text-slate-500 group-hover:text-emerald-400 font-medium transition-colors">
        Open dashboard →
      </div>
    </a>
  );
}
