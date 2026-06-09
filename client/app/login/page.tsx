"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth";
import LoginBackground from "@/components/LoginBackground";

export default function BusinessLoginPage() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/";
  const preview = params.get("preview") === "1";
  const { isAuthenticated, isHydrated, login, logout, currentUser } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [ownerHubUrl, setOwnerHubUrl] = useState<string | null>(null);
  const [redirectStatus, setRedirectStatus] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    // Skip auto-redirect when previewing (e.g. /login?preview=1) so the page
    // can be shown for demos/design walkthroughs even while signed in.
    if (preview) return;
    if (isHydrated && isAuthenticated) {
      router.replace(next);
    }
  }, [isHydrated, isAuthenticated, router, next, preview]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setOwnerHubUrl(null);
    setRedirectStatus(null);
    setSubmitting(true);
    const result = await login(email, password);
    setSubmitting(false);

    if (!result.ok) {
      setError(result.error);
      if (result.ownerHubUrl) setOwnerHubUrl(result.ownerHubUrl);
      return;
    }
    if (result.sameBusiness) {
      router.replace(next);
      return;
    }
    setRedirectStatus("Routing you to your business dashboard…");
    window.location.href = result.redirectTo;
  }

  return (
    <div className="min-h-screen w-full bg-slate-950 text-slate-100 relative overflow-hidden">
      <LoginBackground
        starCount={300}
        twinkleCount={50}
        brightCount={10}
        shootingCount={4}
        seed={5621}
        blobs={["#a855f7", "#7c3aed", "#3b82f6"]}
      />

      <div className="relative z-10 min-h-screen flex flex-col lg:flex-row items-stretch">
        <div className="hidden lg:flex flex-col justify-between w-1/2 px-12 py-12">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-400 to-blue-500 flex items-center justify-center font-black text-slate-900 text-xl">
              ◐
            </div>
            <div>
              <div className="font-bold tracking-tight text-lg">Team Dashboard</div>
              <div className="text-xs text-slate-400">AVS Invest · Vertex Hygiene</div>
            </div>
          </div>

          <div>
            <h1 className="text-4xl font-bold tracking-tight leading-tight">
              One login,
              <br />
              your business dashboard.
            </h1>
            <p className="text-slate-300 mt-4 text-sm max-w-md leading-relaxed">
              Sign in with your work email. We'll route you to your business — AVS Invest if you're on the property team, Vertex Hygiene if you're on the cleaning team. You only see what your business shows.
            </p>

            <ul className="mt-8 space-y-3 text-sm">
              <FeaturePoint>AVS staff → property pipeline & portfolio</FeaturePoint>
              <FeaturePoint>Vertex staff → bookings & cleaning ops</FeaturePoint>
              <FeaturePoint>Separate data — no cross-business access</FeaturePoint>
              <FeaturePoint>Owner has a dedicated Owner Hub login</FeaturePoint>
            </ul>
          </div>

          <div className="text-xs text-slate-500">
            © {new Date().getFullYear()} Craig Okungbowa. All rights reserved.
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center px-6 py-12">
          <div className="w-full max-w-md bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-8 space-y-6">
            <div className="lg:hidden flex items-center gap-2 justify-center mb-2">
              <div className="w-8 h-8 rounded bg-gradient-to-br from-indigo-400 to-blue-500 flex items-center justify-center font-bold text-slate-900">
                ◐
              </div>
              <div className="font-semibold tracking-tight text-white">Team Dashboard</div>
            </div>

            {preview && isHydrated && isAuthenticated && currentUser && (
              <div className="rounded-xl border border-amber-400/40 bg-amber-500/10 px-3 py-2.5 flex items-start gap-3">
                <span className="w-2 h-2 rounded-full bg-amber-300 mt-1.5 animate-pulse shrink-0" />
                <div className="flex-1 min-w-0 text-xs">
                  <div className="font-semibold text-amber-100">Preview mode</div>
                  <div className="text-amber-200/80 leading-snug mt-0.5">
                    You&apos;re signed in as <span className="font-semibold">{currentUser.name}</span>. The login screen would normally redirect you to the dashboard — it&apos;s shown here for design preview.
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    <button
                      type="button"
                      onClick={() => {
                        logout();
                        router.replace("/login");
                      }}
                      className="px-2.5 py-1 rounded-md bg-amber-500/30 hover:bg-amber-500/50 border border-amber-400/40 text-amber-50 text-[11px] font-semibold transition-colors"
                    >
                      Sign out
                    </button>
                    <button
                      type="button"
                      onClick={() => router.replace(next)}
                      className="px-2.5 py-1 rounded-md bg-white/10 hover:bg-white/20 border border-white/20 text-white text-[11px] font-semibold transition-colors"
                    >
                      Back to dashboard →
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div>
              <h2 className="text-2xl font-semibold tracking-tight text-white">Sign in</h2>
              <p className="text-sm text-slate-300 mt-1">
                One login for AVS Invest and Vertex Hygiene team members. Owners — see below.
              </p>
            </div>

            <a
              href="http://localhost:3002/login"
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-purple-500/40 bg-gradient-to-br from-purple-500/15 to-pink-500/15 hover:from-purple-500/25 hover:to-pink-500/25 transition-all group"
            >
              <span className="w-9 h-9 rounded-lg bg-gradient-to-br from-purple-400 to-pink-500 flex items-center justify-center font-black text-slate-900 text-base">
                ◇
              </span>
              <span className="flex-1 min-w-0">
                <span className="block text-xs font-semibold text-white">
                  Are you the Owner?
                </span>
                <span className="block text-[10px] text-slate-300">
                  Sign in at the Owner Hub to see both businesses
                </span>
              </span>
              <span className="text-xs font-semibold text-purple-200 group-hover:text-white whitespace-nowrap">
                Owner Hub →
              </span>
            </a>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="email" className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Work email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@avsinvest.co.uk or you@vertexhygiene.co.uk"
                  required
                  className="mt-1 block w-full px-3 py-2 rounded-md border border-white/15 bg-white/5 text-white placeholder:text-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400"
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
                  className="mt-1 block w-full px-3 py-2 rounded-md border border-white/15 bg-white/5 text-white placeholder:text-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400"
                />
              </div>

              {error && (
                <div className="text-sm text-rose-200 bg-rose-900/40 border border-rose-700/50 rounded-md px-3 py-2">
                  {error}
                  {ownerHubUrl && (
                    <div className="mt-2">
                      <a
                        href={ownerHubUrl}
                        className="inline-block bg-purple-500/30 hover:bg-purple-500/50 border border-purple-400/40 text-purple-100 text-xs font-semibold px-2.5 py-1 rounded-md"
                      >
                        Open Owner Hub →
                      </a>
                    </div>
                  )}
                </div>
              )}

              {redirectStatus && (
                <div className="text-sm text-emerald-200 bg-emerald-900/40 border border-emerald-700/50 rounded-md px-3 py-2 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  {redirectStatus}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-gradient-to-br from-indigo-500 to-blue-600 hover:from-indigo-400 hover:to-blue-500 disabled:opacity-50 text-white font-medium py-2.5 rounded-md transition-all shadow-lg shadow-indigo-900/30"
              >
                {submitting ? "Signing in…" : "Sign in"}
              </button>
            </form>

            <div className="pt-4 border-t border-white/10">
              <div className="text-[10px] text-slate-500 px-1">
                Sign in with your AVS work email. Forgot your password? Ask the owner to reset it.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function FeaturePoint({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2">
      <span className="text-indigo-400 mt-0.5">✓</span>
      <span className="text-slate-300">{children}</span>
    </li>
  );
}
