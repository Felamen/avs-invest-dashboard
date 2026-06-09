"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth";

// Set by the login page after a successful sign-in or "Continue as" click.
// We use sessionStorage (not localStorage) so the flag clears when the tab
// closes — every fresh browser load passes through the login screen first.
const SESSION_PASSED_KEY = "owner-hub-passed-login";

export default function AccessGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { isAuthenticated, isHydrated } = useAuth();
  const [sessionChecked, setSessionChecked] = useState(false);

  useEffect(() => {
    if (!isHydrated) return;

    const qs = searchParams.toString();
    const fullPath = (pathname || "/") + (qs ? `?${qs}` : "");

    // 1. Unauthenticated → standard login redirect
    if (!isAuthenticated) {
      router.replace(`/login?next=${encodeURIComponent(fullPath)}`);
      return;
    }

    // 2. Authenticated but haven't passed login this browser session →
    //    bounce through the login screen so the "Welcome back / Continue / Sign out"
    //    panel can confirm identity.
    if (typeof window !== "undefined") {
      const passed = window.sessionStorage.getItem(SESSION_PASSED_KEY) === "1";
      if (!passed) {
        router.replace(`/login?next=${encodeURIComponent(fullPath)}`);
        return;
      }
    }

    setSessionChecked(true);
  }, [isHydrated, isAuthenticated, router, pathname, searchParams]);

  if (!isHydrated) return null;
  if (!isAuthenticated) return null;
  if (!sessionChecked) return null;
  return <>{children}</>;
}
