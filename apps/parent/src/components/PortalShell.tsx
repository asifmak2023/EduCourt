"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth, isPortalOnly } from "@/lib/auth";
import { FamilyProvider, useFamily } from "@/lib/family";
import { childName, classLabel, initials } from "@/lib/portal";
import {
  IconAward,
  IconCalendar,
  IconCheck,
  IconChevronDown,
  IconGrid,
  IconLogout,
  IconMoon,
  IconSchool,
  IconSun,
  IconUser,
  IconWallet,
} from "@/components/Icons";

const NAV = [
  { href: "/portal", label: "Overview", icon: IconGrid },
  { href: "/portal/timetable", label: "Timetable", icon: IconCalendar },
  { href: "/portal/attendance", label: "Attendance", icon: IconCheck },
  { href: "/portal/results", label: "Results", icon: IconAward },
  { href: "/portal/fees", label: "Fees", icon: IconWallet },
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
      <div className="grid min-h-screen place-items-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-brand border-t-transparent" />
          <p className="text-sm text-muted">Loading your family portal...</p>
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
  const { children: kids, activeChild, activeChildId, setActiveChildId, loading } =
    useFamily();
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [dark, setDark] = useState(() => {
    if (typeof window === "undefined") {
      return false;
    }
    const stored = window.localStorage.getItem("family.theme") ?? "system";
    const system = window.matchMedia("(prefers-color-scheme: dark)").matches;
    return stored === "dark" || (stored === "system" && system);
  });

  useEffect(() => {
    document.documentElement.dataset.theme = dark ? "dark" : "light";
  }, [dark]);

  function toggleTheme() {
    setDark((current) => {
      const next = !current;
      window.localStorage.setItem("family.theme", next ? "dark" : "light");
      return next;
    });
  }

  async function handleLogout() {
    await logout();
    router.replace("/login");
  }

  const activeName = childName(activeChild) || user?.name || "Account";
  const subtitle = classLabel(activeChild) || activeChild?.admission_no || "";

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-3 pb-24 sm:px-5 lg:pb-8">
      <header className="sticky top-0 z-30 -mx-3 mb-4 px-3 pt-3 sm:-mx-5 sm:px-5">
        <div className="glass flex items-center justify-between gap-3 rounded-[1.75rem] border px-3 py-2.5 shadow-[var(--shadow-soft)] sm:px-4">
          <div className="flex items-center gap-2.5">
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-brand text-brand-foreground">
              <IconSchool width={20} height={20} />
            </span>
            <div className="hidden sm:block">
              <p className="font-[family-name:var(--font-display)] text-sm font-bold leading-tight">
                EduCourt Family
              </p>
              <p className="text-[11px] leading-tight text-muted">
                {user?.institution?.name ?? "Family portal"}
              </p>
            </div>
          </div>

          <div className="relative">
            <button
              type="button"
              onClick={() => setSwitcherOpen((value) => !value)}
              className="flex items-center gap-2.5 rounded-2xl border bg-panel px-2.5 py-1.5 text-left transition hover:border-brand/40"
            >
              <Avatar name={activeName} photo={activeChild?.photo_url} />
              <span className="min-w-0">
                <span className="block max-w-[9rem] truncate text-sm font-semibold leading-tight">
                  {activeName}
                </span>
                {subtitle ? (
                  <span className="block max-w-[9rem] truncate text-[11px] leading-tight text-muted">
                    {subtitle}
                  </span>
                ) : null}
              </span>
              {kids.length > 1 ? (
                <IconChevronDown width={16} height={16} className="text-muted" />
              ) : null}
            </button>

            {switcherOpen && kids.length > 1 ? (
              <>
                <button
                  type="button"
                  className="fixed inset-0 z-30 cursor-default"
                  aria-label="Close"
                  onClick={() => setSwitcherOpen(false)}
                />
                <div className="absolute right-0 z-40 mt-2 w-64 overflow-hidden rounded-2xl border bg-panel p-1.5 shadow-[var(--shadow-lift)]">
                  <p className="px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted">
                    Switch student
                  </p>
                  {kids.map((kid) => {
                    const name = childName(kid);
                    const active = kid.id === activeChildId;
                    return (
                      <button
                        key={kid.id}
                        type="button"
                        onClick={() => {
                          setActiveChildId(kid.id);
                          setSwitcherOpen(false);
                        }}
                        className={`flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left transition ${
                          active ? "bg-brand-soft" : "hover:bg-panel-muted"
                        }`}
                      >
                        <Avatar name={name} photo={kid.photo_url} size={34} />
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-semibold">
                            {name}
                          </span>
                          <span className="block truncate text-[11px] text-muted">
                            {classLabel(kid) || kid.admission_no}
                          </span>
                        </span>
                        {active ? (
                          <span className="ml-auto h-2 w-2 rounded-full bg-brand" />
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              </>
            ) : null}
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={toggleTheme}
              className="grid h-10 w-10 place-items-center rounded-2xl text-muted transition hover:bg-panel-muted hover:text-foreground"
              aria-label="Toggle theme"
            >
              {dark ? <IconSun width={18} height={18} /> : <IconMoon width={18} height={18} />}
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="hidden h-10 w-10 place-items-center rounded-2xl text-muted transition hover:bg-panel-muted hover:text-foreground sm:grid"
              aria-label="Sign out"
            >
              <IconLogout width={18} height={18} />
            </button>
          </div>
        </div>
      </header>

      <div className="flex flex-1 gap-6">
        <aside className="hidden w-52 shrink-0 lg:block">
          <nav className="sticky top-24 flex flex-col gap-1">
            {NAV.map((item) => {
              const active =
                item.href === "/portal"
                  ? pathname === "/portal"
                  : pathname.startsWith(item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 rounded-2xl px-3.5 py-2.5 text-sm font-semibold transition ${
                    active
                      ? "bg-brand text-brand-foreground shadow-[var(--shadow-soft)]"
                      : "text-muted hover:bg-panel hover:text-foreground"
                  }`}
                >
                  <Icon width={18} height={18} />
                  {item.label}
                </Link>
              );
            })}

            <div className="mt-6 rounded-2xl border bg-panel p-4">
              <p className="text-xs font-semibold text-foreground">Need help?</p>
              <p className="mt-1 text-[11px] leading-relaxed text-muted">
                Contact your school office for anything about fees or records.
              </p>
            </div>
          </nav>
        </aside>

        <main className="min-w-0 flex-1">
          {loading ? (
            <div className="grid place-items-center py-24">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand border-t-transparent" />
            </div>
          ) : (
            <div key={activeChildId ?? "none"} className="animate-rise">
              {children}
            </div>
          )}
        </main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-30 lg:hidden">
        <div className="glass mx-auto mb-3 flex max-w-md items-center justify-between gap-1 rounded-[1.75rem] border px-2 py-2 shadow-[var(--shadow-lift)]">
          {NAV.map((item) => {
            const active =
              item.href === "/portal"
                ? pathname === "/portal"
                : pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-1 flex-col items-center gap-0.5 rounded-2xl py-1.5 text-[10px] font-semibold transition ${
                  active ? "text-brand" : "text-muted"
                }`}
              >
                <span
                  className={`grid h-9 w-9 place-items-center rounded-xl transition ${
                    active ? "bg-brand-soft" : ""
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
    </div>
  );
}

function Avatar({
  name,
  photo,
  size = 38,
}: {
  name: string;
  photo?: string | null;
  size?: number;
}) {
  if (photo) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={photo}
        alt={name}
        width={size}
        height={size}
        className="shrink-0 rounded-xl object-cover"
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <span
      className="grid shrink-0 place-items-center rounded-xl bg-brand-soft font-[family-name:var(--font-display)] text-sm font-bold text-brand"
      style={{ width: size, height: size }}
    >
      {initials(name) || "?"}
    </span>
  );
}
