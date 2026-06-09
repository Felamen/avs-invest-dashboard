"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { canAccess, type PageKey } from "@/lib/teamData";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "http://localhost:5001";

const TOKEN_KEY = "avs-auth-token";
const OWNER_HUB_URL =
  (process.env.NEXT_PUBLIC_OWNER_HUB_URL?.replace(/\/$/, "") || "http://localhost:3002") + "/login";
const VERTEX_URL =
  process.env.NEXT_PUBLIC_VERTEX_URL?.replace(/\/$/, "") || "http://localhost:3001";

// The authenticated user as returned by the server (source of truth).
export type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: "Owner" | "Admin" | "Manager" | "Cleaner" | "Investor";
  org: "AVS" | "Vertex";
  initials: string;
  mustChangePassword?: boolean;
};

type LoginResult =
  | { ok: true; sameBusiness: true }
  | { ok: true; sameBusiness: false; redirectTo: string }
  | { ok: false; error: string; ownerHubUrl?: string };

type AuthContextValue = {
  currentUser: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isHydrated: boolean;
  login: (email: string, password: string) => Promise<LoginResult>;
  logout: () => void;
  /** re-fetch the current user from the server (after an account change) */
  refresh: () => Promise<void>;
  /** the auth API base, for direct calls (e.g. account update) */
  apiUrl: string;
  canAccess: (page: PageKey) => boolean;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function saveToken(t: string) {
  if (typeof window !== "undefined") window.localStorage.setItem(TOKEN_KEY, t);
}
function clearToken() {
  if (typeof window !== "undefined") window.localStorage.removeItem(TOKEN_KEY);
}
function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

// Validate a token against the server and return the user (or null).
async function fetchMe(token: string): Promise<AuthUser | null> {
  try {
    const res = await fetch(`${API_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    const { user } = (await res.json()) as { user: AuthUser };
    return user;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);

  // Restore the session from localStorage. Also accept a one-shot `?sso=<token>`
  // so the Owner Hub / cross-dashboard links can hand off a signed token.
  useEffect(() => {
    if (typeof window === "undefined") return;
    let cancelled = false;

    (async () => {
      const url = new URL(window.location.href);
      const ssoToken = url.searchParams.get("sso");
      if (ssoToken) {
        const user = await fetchMe(ssoToken);
        if (!cancelled && user && (user.org === "AVS" || user.role === "Owner")) {
          saveToken(ssoToken);
          setCurrentUser(user);
          setToken(ssoToken);
        }
        url.searchParams.delete("sso");
        window.history.replaceState(null, "", url.pathname + url.search + url.hash);
        if (!cancelled) setIsHydrated(true);
        return;
      }

      const saved = getToken();
      if (saved) {
        const user = await fetchMe(saved);
        if (!cancelled) {
          if (user && (user.org === "AVS" || user.role === "Owner")) {
            setCurrentUser(user);
            setToken(saved);
          } else {
            clearToken();
          }
        }
      }
      if (!cancelled) setIsHydrated(true);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  async function login(email: string, password: string): Promise<LoginResult> {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) return { ok: false, error: "Enter an email address." };

    let tok: string;
    let user: AuthUser;
    try {
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed, password }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        return { ok: false, error: j.error || "Invalid email or password." };
      }
      ({ token: tok, user } = (await res.json()) as { token: string; user: AuthUser });
    } catch {
      return { ok: false, error: "Couldn't reach the server. Is it running?" };
    }

    // Owners sign in at the dedicated Owner Hub (they see both businesses there).
    if (user.role === "Owner") {
      return { ok: false, error: "Owners sign in at the Owner Hub.", ownerHubUrl: OWNER_HUB_URL };
    }
    // AVS team members stay here on :3000.
    if (user.org === "AVS") {
      saveToken(tok);
      setCurrentUser(user);
      setToken(tok);
      return { ok: true, sameBusiness: true };
    }
    // Vertex team members → their dashboard on :3001 (hand off the token).
    return { ok: true, sameBusiness: false, redirectTo: `${VERTEX_URL}/?sso=${tok}` };
  }

  // Re-fetch the user from the server (after an account change).
  async function refresh() {
    const t = getToken();
    if (!t) return;
    const user = await fetchMe(t);
    if (user) setCurrentUser(user);
  }

  function logout() {
    setCurrentUser(null);
    setToken(null);
    clearToken();
  }

  const value: AuthContextValue = {
    currentUser,
    token,
    isAuthenticated: currentUser !== null,
    isHydrated,
    login,
    logout,
    refresh,
    apiUrl: API_URL,
    canAccess: (page) => (currentUser ? canAccess(currentUser.role, page) : false),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider />");
  return ctx;
}
