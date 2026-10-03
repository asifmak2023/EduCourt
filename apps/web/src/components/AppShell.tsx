"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTranslation } from "@eis/i18n";
import { useAuth } from "@/lib/auth";
import { useTr } from "@/lib/i18n";
import { findNavItem, sectionForPath, visibleSections } from "@/lib/nav";
import { Icon } from "@/components/Icons";
import { Avatar } from "@/components/Avatar";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

const SIDEBAR_KEY = "eis.sidebar.section";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();
  const { t } = useTranslation();
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

  const sections = visibleSections(user.permissions);
  const activeItem = findNavItem(pathname);
  const roleLabel = user.roles
    .map((role) => role.replace(/_/g, " "))
    .join(", ");

  const sidebar = (
    <div className="app-glass app-sidebar flex h-full flex-col bg-surface-secondary text-foreground">
      <Link
        href="/dashboard"
        onClick={() => setMenuOpen(false)}
        aria-label={t("navigation.home")}
        className="flex items-center gap-3 px-5 py-5 transition-colors hover:bg-surface-tertiary"
      >
        <div className="min-w-0">
          <p className="truncate font-logo text-2xl font-bold tracking-tight text-foreground">
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
        className="app-sidebar-nav flex-1 space-y-2 overflow-y-auto px-3 pb-4 outline-none"
      >
        {sections.map((section) => {
          const isOpen = openSection === section.label;

          return (
            <div key={section.label}>
              <button
                type="button"
                onClick={() => toggleSection(section.label)}
                aria-expanded={isOpen}
                className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted transition-colors hover:bg-accent-soft hover:text-accent-soft-foreground"
              >
                <span className="flex-1 text-left">{tr(section.label)}</span>
                <Icon
                  name="chevronDown"
                  className={`h-3.5 w-3.5 shrink-0 transition-transform duration-200 ${
                    isOpen ? "rotate-0" : "-rotate-90"
                  }`}
                />
              </button>

              <div className="collapse-grid" data-open={isOpen}>
                <div className="overflow-hidden">
                  <ul className="space-y-0.5 pt-1">
                    {section.items.map((item) => {
                      const isActive = pathname === item.href;

                      if (!item.ready) {
                        return (
                          <li key={item.href}>
                            <span className="flex cursor-not-allowed items-center gap-3 rounded-lg px-2 py-2 text-sm text-muted">
                              <Icon name={item.icon} className="h-4 w-4 shrink-0" />
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
                            className={`flex items-center gap-3 rounded-lg px-2 py-2 text-sm transition-colors duration-150 ${
                              isActive
                                ? "bg-accent-soft font-medium text-accent-soft-foreground"
                                : "hover:bg-accent-soft hover:text-accent-soft-foreground"
                            }`}
                          >
                            <Icon name={item.icon} className="h-4 w-4 shrink-0" />
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
            <p className="truncate text-xs capitalize text-muted">{roleLabel}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            void logout().then(() => router.replace("/login"));
          }}
          className="mt-3 w-full rounded-lg border border-border-secondary px-3 py-1.5 text-xs font-medium text-muted transition-colors hover:bg-surface-tertiary"
        >
          {t("common.signOut")}
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen lg:flex">
      <aside className="hidden w-64 shrink-0 lg:block">
        <div className="fixed inset-y-0 left-0 w-64">{sidebar}</div>
      </aside>

      {menuOpen ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setMenuOpen(false)}
            aria-hidden="true"
          />
          <div className="absolute inset-y-0 left-0 w-64">{sidebar}</div>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
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
              {roleLabel}
            </span>
            <LanguageSwitcher />
          </div>
        </header>

        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <div key={pathname} className="page-enter">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
