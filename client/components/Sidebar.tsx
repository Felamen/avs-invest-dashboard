"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { orgLabel, type PageKey } from "@/lib/teamData";
import AccountModal from "@/components/AccountModal";

type NavItem = {
  label: string;
  href: string;
  icon: string;
  page: PageKey;
};

const navItems: NavItem[] = [
  { label: "Dashboard",  href: "/",            icon: "▦", page: ""           },
  { label: "Properties", href: "/properties",  icon: "🏠", page: "properties" },
  { label: "Pipeline",   href: "/pipeline",    icon: "🧱", page: "pipeline"   },
  { label: "Map",        href: "/map",         icon: "🗺", page: "map"        },
  { label: "Settings",   href: "/settings",    icon: "⚙", page: "settings"   },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { currentUser, isAuthenticated, isHydrated, logout, canAccess } = useAuth();
  const [accountOpen, setAccountOpen] = useState(false);

  // Hide the sidebar entirely on the login route or when not signed in.
  if (!isHydrated) return null;
  if (pathname === "/login" || !isAuthenticated || !currentUser) return null;

  // First-login: force a set-your-password popup. Otherwise opened manually.
  const mustChange = !!currentUser.mustChangePassword;

  const visibleNav = navItems.filter((item) => canAccess(item.page));

  // Only the Owner can switch between businesses. Other AVS roles stay in AVS.
  const isOwner = currentUser.role === "Owner";

  function handleLogout() {
    logout();
    router.replace("/login");
  }

  return (
    <aside className="w-60 shrink-0 bg-slate-900 text-slate-100 min-h-screen flex flex-col">
      <div className="px-6 py-6 border-b border-slate-800/70">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-teal-300 via-emerald-400 to-teal-600 flex items-center justify-center font-black text-slate-900 shadow-lg shadow-emerald-900/40 ring-1 ring-emerald-300/30">
            A
          </div>
          <div>
            <div className="font-bold tracking-tight text-white">
              AVS Invest
            </div>
            <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
              Dashboard
            </div>
          </div>
        </div>
      </div>

      {isOwner && (
        <div className="px-3 py-3 border-b border-slate-800">
          <a
            href={`http://localhost:3002?sso=${currentUser.id}`}
            className="flex items-center gap-2 px-2 py-1.5 rounded text-xs text-slate-400 hover:bg-slate-800/60 hover:text-white transition-colors"
            title="Owner Hub — switch between your businesses"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
            Owner Hub
            <span className="ml-auto text-[10px]">↗</span>
          </a>
        </div>
      )}

      <nav className="flex-1 px-3 py-4 space-y-1">
        <Link
          href="/assistant"
          className={[
            "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all relative mb-1 border",
            pathname === "/assistant"
              ? "bg-gradient-to-r from-emerald-600/40 to-teal-600/20 text-white border-emerald-400/40"
              : "bg-gradient-to-r from-emerald-600/20 to-teal-600/10 text-emerald-200 hover:from-emerald-600/30 hover:to-teal-600/20 border-emerald-500/20",
          ].join(" ")}
          title="Fikermenpiken — your AI assistant for ads, deals, documents & research"
        >
          <span className="w-5 text-center">✨</span>
          <span className="font-medium">Fikermenpiken</span>
          <span className="ml-auto text-[9px] uppercase tracking-wider font-bold bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded">AI</span>
        </Link>

        {visibleNav.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={[
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all relative",
                isActive
                  ? "bg-gradient-to-r from-slate-800 to-slate-800/60 text-white shadow-sm"
                  : "text-slate-300 hover:bg-slate-800/60 hover:text-white",
              ].join(" ")}
            >
              {isActive && (
                <span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r-full bg-gradient-to-b from-emerald-400 to-teal-500" />
              )}
              <span className="w-5 text-center">{item.icon}</span>
              <span className="font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="px-3 py-3 border-t border-slate-800">
        <div className="text-[10px] uppercase tracking-wider text-slate-500 px-1 mb-1">
          Signed in as
        </div>
        <div className="flex items-center gap-2 px-1 mb-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-slate-900 text-xs font-semibold">
            {currentUser.initials}
          </div>
          <div className="min-w-0">
            <div className="text-xs font-medium text-white truncate">
              {currentUser.name}
            </div>
            <div className="text-[10px] text-slate-400 truncate">
              {currentUser.role} - {orgLabel[currentUser.org]}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setAccountOpen(true)}
            className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-100 text-xs rounded px-2 py-1.5 border border-slate-700 flex items-center justify-center gap-1.5 transition-colors"
            title="Change your email or password"
          >
            <span aria-hidden>⚙</span> Account
          </button>
          <button
            onClick={handleLogout}
            className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-100 text-xs rounded px-2 py-1.5 border border-slate-700 flex items-center justify-center gap-1.5 transition-colors"
          >
            <span aria-hidden>⎋</span> Sign out
          </button>
        </div>
      </div>

      <div className="px-6 py-3 border-t border-slate-800 text-[10px] text-slate-500">
        AVS Invest v0.2
      </div>

      <AccountModal
        open={mustChange || accountOpen}
        forced={mustChange}
        onClose={() => setAccountOpen(false)}
      />
    </aside>
  );
}
