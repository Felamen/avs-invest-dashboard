"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "http://localhost:5001";

const TOKEN_KEY = "owner-hub-token";

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: "Owner" | "Admin" | "Manager" | "Cleaner" | "Investor";
  org: "AVS" | "Vertex";
  initials: string;
  mustChangePassword?: boolean;
};

type AuthContextValue = {
  currentUser: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isHydrated: boolean;
  login: (email: string, password: string) => Promise<{ ok: true } | { ok: false; error: string }>;
  logout: () => void;
  refresh: () => Promise<void>;
  apiUrl: string;
};

const AuthContext = createContext<AuthContextValue | null>(null);

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

  useEffect(() => {
    if (typeof window === "undefined") return;
    let cancelled = false;
    (async () => {
      const saved = window.localStorage.getItem(TOKEN_KEY);
      if (saved) {
        const user = await fetchMe(saved);
        if (!cancelled) {
          if (user && user.role === "Owner") {
            setCurrentUser(user);
            setToken(saved);
          } else {
            window.localStorage.removeItem(TOKEN_KEY);
          }
        }
      }
      if (!cancelled) setIsHydrated(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function login(email: string, password: string) {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) return { ok: false as const, error: "Enter an email address." };
    let t: string;
    let user: AuthUser;
    try {
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed, password }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        return { ok: false as const, error: j.error || "Invalid email or password." };
      }
      ({ token: t, user } = (await res.json()) as { token: string; user: AuthUser });
    } catch {
      return { ok: false as const, error: "Couldn't reach the server. Is it running?" };
    }
    if (user.role !== "Owner") {
      return {
        ok: false as const,
        error: "The Owner Hub is for owners only. Sign in at your business dashboard instead.",
      };
    }
    window.localStorage.setItem(TOKEN_KEY, t);
    setCurrentUser(user);
    setToken(t);
    return { ok: true as const };
  }

  async function refresh() {
    const t = token || (typeof window !== "undefined" ? window.localStorage.getItem(TOKEN_KEY) : null);
    if (!t) return;
    const user = await fetchMe(t);
    if (user && user.role === "Owner") setCurrentUser(user);
  }

  function logout() {
    setCurrentUser(null);
    setToken(null);
    if (typeof window !== "undefined") window.localStorage.removeItem(TOKEN_KEY);
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
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider />");
  return ctx;
}
