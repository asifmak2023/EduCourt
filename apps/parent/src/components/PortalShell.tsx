"use client";

import { useEffect, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth, isPortalOnly } from "@/lib/auth";
import { FamilyProvider, useFamily } from "@/lib/family";
import { childName, classLabel, initials } from "@/lib/portal";
import { useTheme } from "@/lib/theme";
import {
  IconCalendar,
  IconCap,
  IconChat,
  IconClipboard,
  IconHome,
  IconLogout,
  IconMoon,
  IconReceipt,
  IconSun,
  IconUser,
} from "@/components/Icons";

const NAV = [
  { href: "/portal", label: "Today", icon: IconHome },
  { href: "/portal/timetable", label: "Timetable", icon: IconCalendar },
  { href: "/portal/attendance", label: "Attendance", icon: IconClipboard },
  { href: "/portal/results", label: "Results", icon: IconCap },
  { href: "/portal/fees", label: "Fees", icon: IconReceipt },
  { href: "/portal/messages", label: "Messages", icon: IconChat },
  { href: "/portal/profile", label: "Profile", icon: IconUser },
];

export function PortalShell({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [loading, user, router]);

  useEffect(() => {
    if (!loading && user && !isPortalOnly(user.roles)) {
      router.replace("/login");
    }
  }, [loading, user, router]);

  if (loading || !user || !isPortalOnly(user.roles)) {
    return (
      <div className="grid min-h-screen place-items-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-sm text-muted">Loading your family portal…</p>
        </div>
      </div>
    );
  }

  return (
    <FamilyProvider>
      <Frame>{children}</Frame>
    </FamilyProvider>
  );
}

function Frame({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { logout, user } = useAuth();
  const { dark, toggle } = useTheme();
  const { children: kids, activeChildId, setActiveChildId, loading } = useFamily();

  async function handleLogout() {
    await logout();
    router.replace("/login");
  }

  const isActive = (href: string) =>
    href === "/portal" ? pathname === "/portal" : pathname.startsWith(href);

  return (
    <div className="min-h-screen bg-background">
      {/* ===== Desktop sidebar ===== */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col bg-sidebar px-5 py-6 lg:flex">
        <Link href="/portal" className="mb-9 block">
          <p className="font-[family-name:var(--font-display)] text-2xl font-bold uppercase leading-none tracking-tight text-board-ink">
            Educourt<span className="text-marigold">.</span>
          </p>
          <p className="mt-1 text-xs text-board-dim">
            {user?.institution?.name ?? "Family portal"}
          </p>
        </Link>

        <nav className="flex flex-col gap-1">
          {NAV.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-md px-3.5 py-2.5 font-[family-name:var(--font-display)] text-sm font-semibold uppercase tracking-wide transition ${
                  active
                    ? "bg-white/10 text-marigold"
                    : "text-board-dim hover:bg-white/5 hover:text-board-ink"
                }`}
              >
                <Icon width={19} height={19} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto">
          <div className="mb-3 flex items-center gap-2">
            <button
              type="button"
              onClick={toggle}
              className="flex flex-1 items-center justify-center gap-2 rounded-md border border-white/10 py-2 text-xs font-semibold text-board-dim transition hover:border-white/25 hover:text-board-ink"
            >
              {dark ? <IconSun width={15} height={15} /> : <IconMoon width={15} height={15} />}
              {dark ? "Light" : "Dark"}
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="flex flex-1 items-center justify-center gap-2 rounded-md border border-white/10 py-2 text-xs font-semibold text-board-dim transition hover:border-white/25 hover:text-board-ink"
            >
              <IconLogout width={15} height={15} />
              Sign out
            </button>
          </div>
          <p className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-wider text-board-dim/70">
            Your children
          </p>
          <div className="flex flex-col gap-2">
            {kids.map((kid) => {
              const active = kid.id === activeChildId;
              const name = childName(kid);
              return (
                <button
                  key={kid.id}
                  type="button"
                  onClick={() => setActiveChildId(kid.id)}
                  className={`flex items-center gap-2.5 rounded-full border px-2 py-1.5 text-left transition ${
                    active
                      ? "border-transparent bg-[color-mix(in_srgb,var(--marigold)_22%,transparent)]"
                      : "border-white/10 hover:border-white/25"
                  }`}
                >
                  <span
                    className={`grid h-8 w-8 shrink-0 place-items-center rounded-full font-[family-name:var(--font-display)] text-sm font-bold ${
                      active
                        ? "bg-marigold text-[var(--marigold-ink)]"
                        : "bg-white/10 text-board-ink"
                    }`}
                  >
                    {initials(name) || "?"}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-board-ink">
                      {name}
                    </span>
                    <span className="block truncate text-[11px] text-board-dim">
                      {classLabel(kid) || kid.admission_no}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </aside>

      {/* ===== Mobile top bar ===== */}
      <header className="sticky top-0 z-30 border-b border-hairline bg-paper/95 backdrop-blur lg:hidden">
        <div className="flex items-center justify-between gap-2 px-4 py-3">
          <Link href="/portal" className="shrink-0">
            <p className="font-[family-name:var(--font-display)] text-xl font-bold uppercase leading-none tracking-tight text-foreground">
              Educourt<span className="text-marigold">.</span>
            </p>
          </Link>
          <div className="flex items-center gap-1.5">
            {kids.map((kid) => {
              const active = kid.id === activeChildId;
              const name = childName(kid);
              return (
                <button
                  key={kid.id}
                  type="button"
                  onClick={() => setActiveChildId(kid.id)}
                  className={`flex items-center gap-2 rounded-full border px-2 py-1 text-left transition ${
                    active
                      ? "border-transparent bg-sidebar text-board-ink"
                      : "border-hairline text-foreground"
                  }`}
                >
                  <span
                    className={`grid h-7 w-7 shrink-0 place-items-center rounded-full font-[family-name:var(--font-display)] text-xs font-bold ${
                      active
                        ? "bg-marigold text-[var(--marigold-ink)]"
                        : "bg-[color-mix(in_srgb,var(--primary)_14%,transparent)] text-primary"
                    }`}
                  >
                    {initials(name) || "?"}
                  </span>
                  <span className="pr-1">
                    <span className="block max-w-[5.5rem] truncate text-xs font-semibold leading-tight">
                      {name.split(" ")[0]}
                    </span>
                    <span
                      className={`block text-[10px] leading-tight ${
                        active ? "text-board-dim" : "text-muted"
                      }`}
                    >
                      {classLabel(kid).replace("Section ", "") || kid.admission_no}
                    </span>
                  </span>
                </button>
              );
            })}
            <button
              type="button"
              onClick={toggle}
              aria-label="Toggle theme"
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-hairline text-muted transition hover:text-foreground"
            >
              {dark ? <IconSun width={16} height={16} /> : <IconMoon width={16} height={16} />}
            </button>
          </div>
        </div>
      </header>

      {/* ===== Main content ===== */}
      <div className="lg:pl-64">
        <div className="mx-auto w-full max-w-6xl px-4 pb-28 pt-5 sm:px-6 lg:pb-10 lg:pt-8">
          {loading ? (
            <div className="grid place-items-center py-24">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : (
            <div key={activeChildId ?? "none"} className="animate-rise">
              {children}
            </div>
          )}
        </div>
      </div>

      {/* ===== Mobile bottom tabs ===== */}
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-hairline bg-paper/95 backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-md items-stretch justify-between px-2 py-1.5">
          {NAV.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-1 flex-col items-center gap-0.5 rounded-lg py-1 text-[10px] font-semibold transition ${
                  active ? "text-primary" : "text-muted"
                }`}
              >
                <span
                  className={`grid h-8 w-8 place-items-center rounded-lg transition ${
                    active
                      ? "bg-[color-mix(in_srgb,var(--primary)_14%,transparent)]"
                      : ""
                  }`}
                >
                  <Icon width={18} height={18} />
                </span>
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* mobile utility row (theme + sign out) lives in profile; keep header clean */}
    </div>
  );
}
