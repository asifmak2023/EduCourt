"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTranslation } from "@eis/i18n";
import { useAuth } from "@/lib/auth";
import { useTr } from "@/lib/i18n";
import { roleLabel as roleText, isPortalOnly } from "@/lib/roles";
import { findNavItem, sectionForPath, visibleSections } from "@/lib/nav";
import { Icon } from "@/components/Icons";
import { Avatar } from "@/components/Avatar";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

const SIDEBAR_KEY = "eis.sidebar.section";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();
  const { t, isRTL } = useTranslation();
  const tr = useTr();
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [openSection, setOpenSection] = useState<string | null>(() => {
    const active = sectionForPath(pathname)?.label ?? null;
    if (active) {
      return active;
    }
    try {
      return window.localStorage.getItem(SIDEBAR_KEY);
    } catch {
      return null;
    }
  });
  const [lastPath, setLastPath] = useState(pathname);

  if (pathname !== lastPath) {
    setLastPath(pathname);
    const active = sectionForPath(pathname)?.label ?? null;
    if (active && active !== openSection) {
      setOpenSection(active);
    }
  }

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [loading, user, router]);

  function toggleSection(label: string) {
    setOpenSection((current) => {
      const next = current === label ? null : label;
      try {
        if (next) {
          window.localStorage.setItem(SIDEBAR_KEY, next);
        }
      } catch {
        // Ignore storage failures.
      }
      return next;
    });
  }

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted">
        {t("app.loading")}
      </div>
    );
  }

  if (isPortalOnly(user.roles)) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="brand-glow font-logo text-3xl font-bold tracking-tight text-foreground">
          EduCourt
        </p>
        <h1 className="text-lg font-semibold text-foreground">
          {t("portal.webOnly.title")}
        </h1>
        <p className="max-w-md text-sm text-muted">
          {t("portal.webOnly.body")}
        </p>
        <div className="mt-2 flex items-center gap-3">
          <LanguageSwitcher />
          <button
            type="button"
            onClick={() => {
              void logout().then(() => router.replace("/login"));
            }}
            className="rounded-lg border border-border-secondary px-4 py-2 text-sm font-medium text-muted transition-colors hover:bg-surface-tertiary"
          >
            {t("common.signOut")}
          </button>
        </div>
      </div>
    );
  }

  const sections = visibleSections(user.permissions);
  const activeItem = findNavItem(pathname);
  const roleLabelString = user.roles
    .map((role) => roleText(role, t))
    .join(", ");

  const sidebar = (
    <div className="app-glass app-sidebar flex h-full flex-col bg-surface-secondary text-foreground">
      <Link
        href="/dashboard"
        onClick={() => setMenuOpen(false)}
        aria-label={t("navigation.home")}
        className={`flex items-center gap-3 px-5 py-5 transition-colors hover:bg-surface-tertiary ${
          isRTL ? "" : "justify-center text-center"
        }`}
      >
        <div className="min-w-0">
          <p className="brand-glow truncate font-logo text-2xl font-bold tracking-tight text-foreground">
            EduCourt
          </p>
          <p className="truncate text-xs text-muted">
            {user.institution?.name ?? t("navigation.educationSystem")}
          </p>
        </div>
      </Link>

      <nav
        aria-label={t("navigation.primary")}
        tabIndex={0}
        className="app-sidebar-nav flex-1 space-y-3 overflow-y-auto px-3 pb-4 outline-none"
      >
        {sections.map((section) => {
          const isOpen = openSection === section.label;

          return (
            <div key={section.label}>
              <button
                type="button"
                onClick={() => toggleSection(section.label)}
                aria-expanded={isOpen}
                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-semibold uppercase tracking-wide text-muted transition-colors hover:bg-accent-soft hover:text-accent-soft-foreground"
              >
                <span className="flex-1 text-start">{tr(section.label)}</span>
                <Icon
                  name="chevronDown"
                  className={`h-3.5 w-3.5 shrink-0 transition-transform duration-200 ${
                    isOpen ? "rotate-0" : isRTL ? "rotate-90" : "-rotate-90"
                  }`}
                />
              </button>

              <div className="collapse-grid" data-open={isOpen}>
                <div className="overflow-hidden">
                  <ul className="space-y-1 pt-1">
                    {section.items.map((item) => {
                      const isActive = pathname === item.href;

                      if (!item.ready) {
                        return (
                          <li key={item.href}>
                            <span className="flex cursor-not-allowed items-center gap-3 rounded-lg px-2.5 py-2.5 text-[15px] text-muted">
                              <Icon name={item.icon} className="h-[18px] w-[18px] shrink-0" />
                              <span className="flex-1 truncate">{tr(item.label)}</span>
                              <span className="rounded bg-surface-tertiary px-1.5 py-0.5 text-[10px] font-medium uppercase text-muted">
                                {t("navigation.soon")}
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
                            className={`flex items-center gap-3 rounded-lg px-2.5 py-2.5 text-[15px] transition-colors duration-150 ${
                              isActive
                                ? "bg-accent-soft font-semibold text-accent-soft-foreground"
                                : "font-medium text-foreground/80 hover:bg-accent-soft hover:text-accent-soft-foreground"
                            }`}
                          >
                            <Icon name={item.icon} className="h-[18px] w-[18px] shrink-0" />
                            <span className="flex-1 truncate">{tr(item.label)}</span>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </div>
            </div>
          );
        })}
      </nav>

      <div className="border-t border-border-secondary px-4 py-4">
        <div className="flex items-center gap-3">
          <Avatar name={user.name} photoUrl={user.photo_url} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-foreground">{user.name}</p>
            <p className="truncate text-xs capitalize text-muted">{roleLabelString}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            void logout().then(() => router.replace("/login"));
          }}
          className="mt-3 w-full rounded-lg border border-border-secondary px-3 py-2 text-sm font-medium text-muted transition-colors hover:bg-surface-tertiary"
        >
          {t("common.signOut")}
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen">
      <aside className="fixed inset-y-0 start-0 z-30 hidden w-64 lg:block">
        {sidebar}
      </aside>

      {menuOpen ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setMenuOpen(false)}
            aria-hidden="true"
          />
          <div className="absolute inset-y-0 start-0 w-64">{sidebar}</div>
        </div>
      ) : null}

      <div className="flex min-h-screen min-w-0 flex-col lg:ps-64">
        <header className="app-glass sticky top-0 z-30 border-b border-border-secondary bg-surface/80 backdrop-blur">
          <div className="flex items-center gap-3 px-4 py-3 sm:px-6 lg:px-8">
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              className="rounded-lg border border-border-secondary p-2 text-muted transition-colors hover:bg-surface-tertiary lg:hidden"
              aria-label={t("navigation.open")}
            >
              <Icon name="list" className="h-5 w-5" />
            </button>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-foreground">
                {activeItem ? tr(activeItem.label) : t("navigation.dashboard")}
              </p>
              <p className="truncate text-xs text-muted">
                {user.campus?.name ?? t("navigation.allCampuses")}
              </p>
            </div>
            <span className="hidden rounded-full bg-surface-tertiary px-3 py-1 text-xs font-medium text-muted sm:inline">
              {roleLabelString}
            </span>
            <LanguageSwitcher />
          </div>
        </header>

        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <Breadcrumbs />
          <div key={pathname} className="page-enter">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
