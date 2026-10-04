"use client";

import { useEffect, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTranslation } from "@eis/i18n";
import { useAuth } from "@/lib/auth";
import { useTr } from "@/lib/i18n";
import { isPortalOnly } from "@/lib/roles";
import { PortalProvider, usePortal } from "@/lib/portal-context";
import { Icon } from "@/components/Icons";
import { Avatar } from "@/components/Avatar";
import { AccountMenu } from "@/components/AccountMenu";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import type { NavIcon } from "@/lib/nav";

const PORTAL_TABS: { href: string; label: string; icon: NavIcon }[] = [
  { href: "/portal", label: "portal.nav.dashboard", icon: "grid" },
  { href: "/portal/timetable", label: "portal.nav.timetable", icon: "calendar" },
  { href: "/portal/attendance", label: "portal.nav.attendance", icon: "check" },
  { href: "/portal/results", label: "portal.nav.results", icon: "award" },
  { href: "/portal/fees", label: "portal.nav.fees", icon: "wallet" },
  { href: "/portal/profile", label: "portal.nav.profile", icon: "idCard" },
];

export function PortalShell({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const { t } = useTranslation();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [loading, user, router]);

  useEffect(() => {
    if (!loading && user && !isPortalOnly(user.roles)) {
      router.replace("/dashboard");
    }
  }, [loading, user, router]);

  if (loading || !user || !isPortalOnly(user.roles)) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted">
        {t("app.loading")}
      </div>
    );
  }

  return (
    <PortalProvider>
      <PortalFrame>{children}</PortalFrame>
    </PortalProvider>
  );
}

function PortalFrame({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const tr = useTr();
  const pathname = usePathname();
  const { students, activeStudent, activeStudentId, setActiveStudentId, loading } =
    usePortal();

  const childName =
    activeStudent?.full_name ??
    [activeStudent?.first_name, activeStudent?.last_name]
      .filter(Boolean)
      .join(" ") ??
    "";

  return (
    <div className="min-h-screen">
      <header className="app-glass sticky top-0 z-30 border-b border-border-secondary bg-surface/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-4 py-3 sm:px-6">
          <Link href="/portal" className="flex items-center gap-3">
            <span className="brand-glow font-logo text-xl font-bold tracking-tight text-foreground">
              EduCourt
            </span>
            <span className="hidden rounded-full bg-accent-soft px-3 py-1 text-xs font-medium text-accent-soft-foreground sm:inline">
              {t("portal.title")}
            </span>
          </Link>

          <div className="ms-auto flex flex-wrap items-center gap-3">
            {!loading && students.length > 1 ? (
              <label className="flex items-center gap-2 text-xs text-muted">
                <span className="hidden sm:inline">{t("portal.selectChild")}</span>
                <select
                  value={activeStudentId ?? ""}
                  onChange={(event) => setActiveStudentId(Number(event.target.value))}
                  className="max-w-[12rem] rounded-lg border border-border-secondary bg-surface px-2.5 py-1.5 text-sm text-foreground"
                >
                  {students.map((student) => (
                    <option key={student.id} value={student.id}>
                      {student.full_name ??
                        [student.first_name, student.last_name]
                          .filter(Boolean)
                          .join(" ")}
                    </option>
                  ))}
                </select>
              </label>
            ) : !loading && childName ? (
              <span className="hidden items-center gap-2 rounded-full bg-surface-tertiary px-3 py-1 text-xs font-medium text-muted sm:flex">
                <Avatar
                  name={childName}
                  photoUrl={activeStudent?.photo_url ?? null}
                  size="sm"
                />
                {childName}
              </span>
            ) : null}
            <LanguageSwitcher />
            <AccountMenu profileHref="/portal/profile" />
          </div>
        </div>

        <nav
          aria-label={t("portal.title")}
          className="mx-auto flex max-w-6xl items-center gap-1 overflow-x-auto px-4 pb-2 sm:px-6"
        >
          {PORTAL_TABS.map((tab) => {
            const isActive = pathname === tab.href;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-accent-soft text-accent-soft-foreground"
                    : "text-foreground/75 hover:bg-surface-tertiary"
                }`}
              >
                <Icon name={tab.icon} className="h-4 w-4" />
                {tr(tab.label)}
              </Link>
            );
          })}
        </nav>
      </header>

      <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">
        <div key={pathname} className="page-enter">
          {children}
        </div>
      </main>
    </div>
  );
}
