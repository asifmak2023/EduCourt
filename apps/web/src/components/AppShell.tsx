"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTranslation } from "@eis/i18n";
import { useAuth } from "@/lib/auth";
import { useTr } from "@/lib/i18n";
import { roleLabel as roleText, isPortalOnly } from "@/lib/roles";
import { sectionForPath, visibleSections } from "@/lib/nav";
import { Icon } from "@/components/Icons";
import { Avatar } from "@/components/Avatar";
import { AccountMenu } from "@/components/AccountMenu";
import { Breadcrumbs } from "@/components/Breadcrumbs";

const SIDEBAR_KEY = "eis.sidebar.section";
const COLLAPSE_KEY = "eis.sidebar.collapsed";

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
  const [collapsed, setCollapsed] = useState(false);
  const [collapsedReady, setCollapsedReady] = useState(false);

  useEffect(() => {
    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      let stored = false;
      try {
        stored = window.localStorage.getItem(COLLAPSE_KEY) === "1";
      } catch {
        // Ignore storage failures.
      }
      setCollapsed(stored);
      raf2 = requestAnimationFrame(() => setCollapsedReady(true));
    });
    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
    };
  }, []);

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

  useEffect(() => {
    if (!loading && user && isPortalOnly(user.roles)) {
      router.replace("/portal");
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

  function toggleCollapsed() {
    setCollapsed((current) => {
      const next = !current;
      try {
        window.localStorage.setItem(COLLAPSE_KEY, next ? "1" : "0");
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
      <div className="flex min-h-screen items-center justify-center text-sm text-muted">
        {t("portal.redirecting")}
      </div>
    );
  }

  const sections = visibleSections(user.permissions);
  const roleLabelString = user.roles
    .map((role) => roleText(role, t))
    .join(", ");
  const currentUser = user;

  function renderSidebar(isCollapsed: boolean) {
    return (
    <div className="app-glass app-sidebar flex h-full flex-col bg-surface-secondary text-foreground">
      <nav
        aria-label={t("navigation.primary")}
        tabIndex={0}
        className={`app-sidebar-nav flex-1 overflow-y-auto py-4 outline-none ${
          isCollapsed ? "space-y-1 px-2" : "space-y-3 px-3"
        }`}
      >
        {sections.map((section, sectionIndex) => {
          const isHeaderless = section.collapsible === false;
          const isOpen = isHeaderless ? true : openSection === section.label;

          return (
            <div
              key={section.label}
              className={
                isCollapsed && sectionIndex > 0
                  ? "border-t border-border-secondary pt-1"
                  : ""
              }
            >
              {isCollapsed || isHeaderless ? null : (
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
              )}

              <div
                className={isCollapsed ? "" : "collapse-grid"}
                data-open={isCollapsed ? true : isOpen}
              >
                <div className="overflow-hidden">
                  <ul className={isCollapsed ? "space-y-1" : "space-y-1 pt-1"}>
                    {section.items.map((item) => {
                      const isActive = pathname === item.href;

                      if (!item.ready) {
                        return (
                          <li key={item.href}>
                            <span
                              title={tr(item.label)}
                              className={`flex cursor-not-allowed items-center rounded-lg text-muted ${
                                isCollapsed
                                  ? "justify-center py-2.5"
                                  : "gap-3 px-2.5 py-2.5 text-[15px]"
                              }`}
                            >
                              <Icon name={item.icon} className="h-[18px] w-[18px] shrink-0" />
                              {isCollapsed ? null : (
                                <>
                                  <span className="flex-1 truncate">{tr(item.label)}</span>
                                  <span className="rounded bg-surface-tertiary px-1.5 py-0.5 text-[10px] font-medium uppercase text-muted">
                                    {t("navigation.soon")}
                                  </span>
                                </>
                              )}
                            </span>
                          </li>
                        );
                      }

                      return (
                        <li key={item.href}>
                          <Link
                            href={item.href}
                            onClick={() => setMenuOpen(false)}
                            title={tr(item.label)}
                            className={`flex items-center rounded-lg transition-colors duration-150 ${
                              isCollapsed
                                ? "justify-center py-2.5"
                                : "gap-3 px-2.5 py-2.5 text-[15px]"
                            } ${
                              isActive
                                ? "bg-accent-soft font-semibold text-accent-soft-foreground"
                                : "font-medium text-foreground/80 hover:bg-accent-soft hover:text-accent-soft-foreground"
                            }`}
                          >
                            <Icon name={item.icon} className="h-[18px] w-[18px] shrink-0" />
                            {isCollapsed ? null : (
                              <span className="flex-1 truncate">{tr(item.label)}</span>
                            )}
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
        {isCollapsed ? (
          <div className="flex flex-col items-center gap-3">
            <Link
              href="/dashboard/profile"
              title={t("navigation.profile")}
              onClick={() => setMenuOpen(false)}
            >
              <Avatar name={currentUser.name} photoUrl={currentUser.photo_url} />
            </Link>
            <button
              type="button"
              onClick={() => {
                void logout().then(() => router.replace("/login"));
              }}
              aria-label={t("common.signOut")}
              title={t("common.signOut")}
              className="rounded-lg border border-border-secondary p-2 text-muted transition-colors hover:bg-surface-tertiary hover:text-danger"
            >
              <Icon name="logout" className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <>
            <Link
              href="/dashboard/profile"
              onClick={() => setMenuOpen(false)}
              className="flex items-center gap-3 rounded-lg p-1 transition-colors hover:bg-surface-tertiary"
            >
              <Avatar name={currentUser.name} photoUrl={currentUser.photo_url} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">{currentUser.name}</p>
                <p className="truncate text-xs capitalize text-muted">{roleLabelString}</p>
              </div>
            </Link>
            <button
              type="button"
              onClick={() => {
                void logout().then(() => router.replace("/login"));
              }}
              className="mt-3 w-full rounded-lg border border-border-secondary px-3 py-2 text-sm font-medium text-muted transition-colors hover:bg-surface-tertiary"
            >
              {t("common.signOut")}
            </button>
          </>
        )}
      </div>
    </div>
    );
  }

  return (
    <div className="min-h-screen">
      <aside
        className={`fixed inset-y-0 start-0 z-30 hidden lg:block print:hidden ${
          collapsedReady ? "transition-[width] duration-200" : ""
        } ${collapsed ? "w-[4.5rem]" : "w-64"}`}
      >
        {renderSidebar(collapsed)}
      </aside>

      {menuOpen ? (
        <div className="fixed inset-0 z-40 lg:hidden print:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setMenuOpen(false)}
            aria-hidden="true"
          />
          <div className="absolute inset-y-0 start-0 w-64">{renderSidebar(false)}</div>
        </div>
      ) : null}

      <div
        className={`flex min-h-screen min-w-0 flex-col print:ps-0 ${
          collapsedReady ? "transition-[padding-inline-start] duration-200" : ""
        } ${collapsed ? "lg:ps-[4.5rem]" : "lg:ps-64"}`}
      >
        <header className="app-glass sticky top-0 z-30 border-b border-border-secondary bg-surface/80 backdrop-blur print:hidden">
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 px-4 py-3 sm:px-6 lg:px-8">
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                onClick={toggleCollapsed}
                aria-expanded={!collapsed}
                aria-label={
                  collapsed
                    ? t("navigation.expandSidebar")
                    : t("navigation.collapseSidebar")
                }
                title={
                  collapsed
                    ? t("navigation.expandSidebar")
                    : t("navigation.collapseSidebar")
                }
                className="hidden shrink-0 rounded-lg border border-border-secondary p-2 text-muted transition-colors hover:bg-surface-tertiary hover:text-foreground lg:inline-flex"
              >
                <Icon
                  name="panelLeft"
                  className={`h-5 w-5 transition-transform duration-200 ${
                    collapsed ? "scale-x-[-1]" : ""
                  } ${isRTL ? "rotate-180" : ""}`}
                />
              </button>
              <button
                type="button"
                onClick={() => setMenuOpen(true)}
                className="shrink-0 rounded-lg border border-border-secondary p-2 text-muted transition-colors hover:bg-surface-tertiary lg:hidden"
                aria-label={t("navigation.open")}
              >
                <Icon name="list" className="h-5 w-5" />
              </button>
              <Link
                href="/dashboard"
                onClick={() => setMenuOpen(false)}
                aria-label={t("navigation.home")}
                className="brand-glow shrink-0 font-logo text-xl font-bold tracking-tight text-foreground"
              >
                EduCourt
              </Link>
            </div>
            <div className="min-w-0 text-center">
              <p className="truncate text-base leading-tight text-foreground">
                {user.institution?.name ?? t("navigation.educationSystem")}
              </p>
              <p className="truncate text-sm leading-tight text-muted">
                {user.campus?.name ?? t("navigation.allCampuses")}
              </p>
            </div>
            <div className="flex items-center justify-end gap-3">
              <span className="hidden rounded-full bg-surface-tertiary px-3 py-1 text-xs font-medium text-muted sm:inline">
                {roleLabelString}
              </span>
              <AccountMenu />
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:px-8 print:max-w-none print:px-0 print:py-0">
          <div className="print:hidden">
            <Breadcrumbs />
          </div>
          <div key={pathname} className="page-enter">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
