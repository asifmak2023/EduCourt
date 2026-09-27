"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { findNavItem, visibleSections } from "@/lib/nav";
import { Icon } from "@/components/Icons";

function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [loading, user, router]);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-slate-500">
        Loading...
      </div>
    );
  }

  const sections = visibleSections(user.permissions);
  const activeItem = findNavItem(pathname);
  const roleLabel = user.roles
    .map((role) => role.replace(/_/g, " "))
    .join(", ");

  const sidebar = (
    <div className="flex h-full flex-col bg-slate-900 text-slate-300">
      <div className="flex items-center gap-3 px-5 py-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 text-sm font-semibold text-white">
          EC
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-white">EduCourt</p>
          <p className="truncate text-xs text-slate-400">
            {user.institution?.name ?? "Education System"}
          </p>
        </div>
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto px-3 pb-4">
        {sections.map((section) => (
          <div key={section.label}>
            <p className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              {section.label}
            </p>
            <ul className="space-y-0.5">
              {section.items.map((item) => {
                const isActive = pathname === item.href;

                if (!item.ready) {
                  return (
                    <li key={item.href}>
                      <span className="flex cursor-not-allowed items-center gap-3 rounded-lg px-2 py-2 text-sm text-slate-500">
                        <Icon name={item.icon} className="h-4 w-4 shrink-0" />
                        <span className="flex-1 truncate">{item.label}</span>
                        <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] font-medium uppercase text-slate-500">
                          Soon
                        </span>
                      </span>
                    </li>
                  );
                }

                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={() => setMenuOpen(false)}
                      className={`flex items-center gap-3 rounded-lg px-2 py-2 text-sm transition ${
                        isActive
                          ? "bg-white/10 font-medium text-white"
                          : "hover:bg-white/5 hover:text-white"
                      }`}
                    >
                      <Icon name={item.icon} className="h-4 w-4 shrink-0" />
                      <span className="flex-1 truncate">{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-t border-white/10 px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-xs font-semibold text-white">
            {initials(user.name)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-white">{user.name}</p>
            <p className="truncate text-xs capitalize text-slate-400">{roleLabel}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            void logout().then(() => router.replace("/login"));
          }}
          className="mt-3 w-full rounded-lg border border-white/15 px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:bg-white/5 hover:text-white"
        >
          Sign out
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 lg:flex">
      <aside className="hidden w-64 shrink-0 lg:block">
        <div className="fixed inset-y-0 left-0 w-64">{sidebar}</div>
      </aside>

      {menuOpen ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-slate-900/50"
            onClick={() => setMenuOpen(false)}
            aria-hidden="true"
          />
          <div className="absolute inset-y-0 left-0 w-64">{sidebar}</div>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
          <div className="flex items-center gap-3 px-4 py-3 sm:px-6 lg:px-8">
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              className="rounded-lg border border-slate-300 p-2 text-slate-600 lg:hidden"
              aria-label="Open navigation"
            >
              <Icon name="list" className="h-5 w-5" />
            </button>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-slate-900">
                {activeItem?.label ?? "Dashboard"}
              </p>
              <p className="truncate text-xs text-slate-500">
                {user.campus?.name ?? "All campuses"}
              </p>
            </div>
            <span className="hidden rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600 sm:inline">
              {roleLabel}
            </span>
          </div>
        </header>

        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}
