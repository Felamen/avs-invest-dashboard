"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { orgLabel, type PageKey } from "@/lib/teamData";

/**
 * AccessGuard
 *
 * Wrap any page's content in <AccessGuard page="X">...</AccessGuard>
 * to make sure only roles with permission can see it. Stops users from
 * jumping straight to a URL the sidebar would have hidden.
 *
 * Unauthenticated visitors are sent to /login. Authenticated users
 * whose role doesn't include this page see the access-denied screen.
 *
 * In production this would also be enforced on the Express API server
 * so the data itself never leaves the database for unauthorised users.
 */
export default function AccessGuard({
  page,
  children,
}: {
  page: PageKey;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { currentUser, isAuthenticated, isHydrated, canAccess } = useAuth();

  useEffect(() => {
    if (!isHydrated) return;
    if (!isAuthenticated) {
      const qs = searchParams.toString();
      const fullPath = (pathname || "/") + (qs ? `?${qs}` : "");
      router.replace(`/login?next=${encodeURIComponent(fullPath)}`);
    }
  }, [isHydrated, isAuthenticated, router, pathname, searchParams]);

  // Pre-hydration: render nothing (avoids flash of guard screen on refresh).
  if (!isHydrated) return null;

  // Not signed in: useEffect above kicks to /login; render nothing meanwhile.
  if (!isAuthenticated || !currentUser) return null;

  if (canAccess(page)) {
    return <>{children}</>;
  }

  return (
    <div className="px-8 py-16 max-w-2xl">
      <div className="bg-white rounded-xl border border-slate-200 p-8 text-center space-y-4">
        <div className="inline-flex w-12 h-12 rounded-full bg-rose-100 text-rose-700 items-center justify-center text-xl font-semibold mx-auto">
          ✕
        </div>
        <div>
          <h1 className="text-xl font-semibold tracking-tight">
            No access to this page
          </h1>
          <p className="text-sm text-slate-500 mt-2">
            You're signed in as{" "}
            <span className="font-medium">{currentUser.name}</span>
            {" "}({currentUser.role}, {orgLabel[currentUser.org]}).
            This role can't view this section.
          </p>
        </div>
        <div className="text-xs text-slate-400">
          If you believe this is wrong, ask an admin to update your role
          in Settings &gt; Team.
        </div>
        <Link
          href="/"
          className="inline-block bg-slate-900 text-white text-sm px-4 py-2 rounded-md hover:bg-slate-800"
        >
          Go to home
        </Link>
      </div>
    </div>
  );
}
