"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth";
import LoginBackground from "@/components/LoginBackground";
import {
  membersForOwnerLogin,
  type TeamMember,
} from "@/lib/teamData";

const SESSION_PASSED_KEY = "owner-hub-passed-login";
const AVS_URL =
  process.env.NEXT_PUBLIC_AVS_URL?.replace(/\/$/, "") || "http://localhost:3000";

export default function OwnerLoginPage() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/";
  const preview = params.get("preview") === "1";
  const { isAuthenticated, isHydrated, login, logout, currentUser } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const availableUsers = membersForOwnerLogin();

  useEffect(() => {
    // In preview mode, never auto-redirect — the login UI is intentionally shown
    // (e.g. for demos or design walkthroughs).
    if (preview) return;
    // Otherwise, only auto-skip the login page if the user has already explicitly
    // passed through it this browser session (sessionStorage flag set on successful
    // sign-in or "continue as" click). This forces a fresh browser load to always
    // see the login screen first, even when a long-term session exists in localStorage.
    if (!isHydrated) return;
    if (!isAuthenticated) return;
    if (typeof window === "undefined") return;
    if (window.sessionStorage.getItem(SESSION_PASSED_KEY) === "1") {
      router.replace(next);
    }
  }, [isHydrated, isAuthenticated, router, next, preview]);

  function markPassed() {
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem(SESSION_PASSED_KEY, "1");
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const result = await login(email, password);
    setSubmitting(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    markPassed();
    router.replace(next);
  }

  function quickFill(member: TeamMember) {
    setEmail(member.email);
    setError(null);
  }

  return (
    <div className="min-h-screen w-full bg-slate-950 text-slate-100 relative overflow-hidden">
      <LoginBackground
        starCount={300}
        twinkleCount={50}
        brightCount={8}
        shootingCount={4}
        seed={3303}
        blobs={["#a855f7", "#ec4899", "#6b21a8"]}
      />

      <div className="relative z-10 min-h-screen flex flex-col lg:flex-row items-stretch">
        <div className="hidden lg:flex flex-col justify-between w-1/2 px-12 py-12">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-400 to-pink-500 flex items-center justify-center font-black text-slate-900 text-xl">
              ◇
            </div>
            <div>
              <div className="font-bold tracking-tight text-lg">Owner Hub</div>
              <div className="text-xs text-slate-400">Cross-business overview</div>
            </div>
          </div>

          <div>
            <h1 className="text-4xl font-bold tracking-tight leading-tight">
              One view across
              <br />
              both your businesses.
            </h1>
            <p className="text-slate-300 mt-4 text-sm max-w-md leading-relaxed">
              Sign in once to unlock the Owner Hub. From there, jump into either business with one click.
            </p>

            <div className="mt-8 space-y-3">
              <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">
                You'll get access to
              </div>
              <BusinessPreviewCard
                icon="🏠"
                accent="from-emerald-400 to-teal-600"
                name="AVS Invest"
                tagline="Property pipeline & portfolio"
                points={[
                  "45+ sourcing deals on a UK map",
                  "Compliance & cert tracking",
                  "Live Notion sync",
                ]}
              />
              <BusinessPreviewCard
                icon="🧽"
                accent="from-cyan-400 to-blue-600"
                name="Vertex Hygiene"
                tagline="Cleaning operations"
                points={[
                  "Booking map with status pins",
                  "Cleaner schedules & client history",
                  "Photo uploads & job sign-off",
                ]}
              />
            </div>
          </div>

          <div className="text-xs text-slate-500">
            © {new Date().getFullYear()} Craig Okungbowa. Owner-only access.
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center px-6 py-12">
          <div className="w-full max-w-md bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-8 space-y-6">
            <div className="lg:hidden flex items-center gap-2 justify-center mb-2">
              <div className="w-8 h-8 rounded bg-gradient-to-br from-purple-400 to-pink-500 flex items-center justify-center font-bold text-slate-900">
                ◇
              </div>
              <div className="font-semibold tracking-tight text-white">Owner Hub</div>
            </div>

            {isHydrated && isAuthenticated && currentUser && (
              <div className="rounded-xl border border-purple-400/40 bg-purple-500/15 px-3 py-2.5 flex items-start gap-3">
                <span className="w-2 h-2 rounded-full bg-purple-300 mt-1.5 animate-pulse shrink-0" />
                <div className="flex-1 min-w-0 text-xs">
                  <div className="font-semibold text-purple-100">
                    Welcome back, {currentUser.name}
                  </div>
                  <div className="text-purple-200/80 leading-snug mt-0.5">
                    You&apos;re already signed in to Owner Hub. Continue to the dashboard, or sign out to switch accounts.
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    <button
                      type="button"
                      onClick={() => {
                        markPassed();
                        router.replace(next);
                      }}
                      className="px-3 py-1 rounded-md bg-gradient-to-br from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400 text-white text-[11px] font-semibold transition-colors"
                    >
                      Continue to dashboard →
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        logout();
                        if (typeof window !== "undefined") {
                          window.sessionStorage.removeItem(SESSION_PASSED_KEY);
                        }
                      }}
                      className="px-3 py-1 rounded-md bg-white/10 hover:bg-white/20 border border-white/20 text-white text-[11px] font-semibold transition-colors"
                    >
                      Sign out
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div>
              <h2 className="text-2xl font-semibold tracking-tight text-white">Sign in to Owner Hub</h2>
              <p className="text-sm text-slate-300 mt-1">
                Only the Owner role can access this panel. Team members should{" "}
                <a
                  href={`${AVS_URL}/login`}
                  className="text-purple-300 hover:text-purple-200 underline"
                >
                  sign in to the team dashboard
                </a>{" "}
                instead.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="email" className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@avsinvest.co.uk"
                  required
                  className="mt-1 block w-full px-3 py-2 rounded-md border border-white/15 bg-white/5 text-white placeholder:text-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-purple-400"
                />
              </div>

              <div>
                <label htmlFor="password" className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="mt-1 block w-full px-3 py-2 rounded-md border border-white/15 bg-white/5 text-white placeholder:text-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-purple-400"
                />
              </div>

              {error && (
                <div className="text-sm text-rose-200 bg-rose-900/40 border border-rose-700/50 rounded-md px-3 py-2">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-gradient-to-br from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400 disabled:opacity-50 text-white font-medium py-2.5 rounded-md transition-all shadow-lg shadow-purple-900/30"
              >
                {submitting ? "Signing in…" : "Sign in"}
              </button>
            </form>

            <div className="pt-4 border-t border-white/10">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Owner accounts (click to autofill)
              </div>
              <div className="space-y-1">
                {availableUsers.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => quickFill(m)}
                    className="w-full text-left px-3 py-2 rounded-md hover:bg-white/10 border border-white/5 text-xs flex items-center gap-3 transition-colors"
                  >
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-400 to-pink-500 flex items-center justify-center text-slate-900 text-[10px] font-semibold shrink-0">
                      {m.initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-white truncate">{m.name}</div>
                      <div className="text-[10px] text-slate-400 truncate">{m.email} · {m.role}</div>
                    </div>
                  </button>
                ))}
              </div>
              <div className="text-[10px] text-slate-500 mt-2 px-1">
                Use your owner password.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function BusinessPreviewCard({
  icon,
  accent,
  name,
  tagline,
  points,
}: {
  icon: string;
  accent: string;
  name: string;
  tagline: string;
  points: string[];
}) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-3 backdrop-blur-sm">
      <div className="flex items-center gap-3 mb-2">
        <div
          className={`w-10 h-10 rounded-xl bg-gradient-to-br ${accent} flex items-center justify-center text-xl shrink-0`}
        >
          {icon}
        </div>
        <div className="min-w-0">
          <div className="font-semibold text-sm text-white">{name}</div>
          <div className="text-[11px] text-slate-400">{tagline}</div>
        </div>
      </div>
      <ul className="space-y-0.5 ml-1">
        {points.map((p) => (
          <li key={p} className="text-[11px] text-slate-300 flex items-start gap-1.5">
            <span className="text-slate-500 mt-0.5">·</span>
            <span>{p}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
