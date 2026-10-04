"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslation } from "@eis/i18n";
import { useAuth } from "@/lib/auth";
import { useTr } from "@/lib/i18n";
import { isPortalOnly } from "@/lib/roles";
import { Icon } from "@/components/Icons";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import type { NavIcon } from "@/lib/nav";

const NAV_LINKS = [
  { href: "#features", label: "landing.nav.features" },
  { href: "#modules", label: "landing.nav.modules" },
  { href: "#roles", label: "landing.nav.roles" },
  { href: "#pricing", label: "landing.nav.pricing" },
];

const TRUST_STATS = [
  { value: "250+", label: "landing.trust.campuses" },
  { value: "120K+", label: "landing.trust.students" },
  { value: "8K+", label: "landing.trust.staff" },
  { value: "20+", label: "landing.trust.modules" },
];

const FEATURES: { icon: NavIcon; key: string }[] = [
  { icon: "userPlus", key: "admissions" },
  { icon: "check", key: "attendance" },
  { icon: "award", key: "examinations" },
  { icon: "receipt", key: "fees" },
  { icon: "banknote", key: "payroll" },
  { icon: "bus", key: "transport" },
  { icon: "megaphone", key: "communication" },
  { icon: "chart", key: "analytics" },
];

const MODULES = [
  "admissions",
  "students",
  "academics",
  "attendance",
  "examinations",
  "fees",
  "finance",
  "payroll",
  "transport",
  "hostel",
  "canteen",
  "reports",
];

const ROLES: { icon: NavIcon; key: string }[] = [
  { icon: "shield", key: "admin" },
  { icon: "book", key: "teacher" },
  { icon: "award", key: "student" },
  { icon: "heart", key: "parent" },
];

const PLANS = [
  { key: "starter", popular: false },
  { key: "growth", popular: true },
  { key: "enterprise", popular: false },
];

export default function LandingPage() {
  const { user, loading } = useAuth();
  const { t } = useTranslation();
  const tr = useTr();
  const router = useRouter();

  useEffect(() => {
    if (loading || !user) {
      return;
    }
    router.replace(isPortalOnly(user.roles) ? "/portal" : "/dashboard");
  }, [loading, user, router]);

  return (
    <div className="flex flex-1 flex-col">
      <header className="app-glass sticky top-0 z-40 border-b border-border-secondary bg-surface/80 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center gap-3 px-4 py-3 sm:px-6">
          <Link href="/" className="flex items-center gap-2">
            <span className="brand-glow font-logo text-2xl font-bold tracking-tight text-foreground">
              EduCourt
            </span>
          </Link>

          <nav className="ms-6 hidden items-center gap-1 md:flex">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="rounded-lg px-3 py-2 text-sm font-medium text-foreground/75 transition-colors hover:bg-surface-tertiary hover:text-foreground"
              >
                {tr(link.label)}
              </a>
            ))}
          </nav>

          <div className="ms-auto flex items-center gap-2">
            <LanguageSwitcher />
            <Link
              href="/login"
              className="hidden rounded-lg px-3 py-2 text-sm font-medium text-foreground/80 transition-colors hover:bg-surface-tertiary sm:inline-flex"
            >
              {t("landing.nav.signIn")}
            </Link>
            <Link
              href="/login"
              className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground transition-opacity hover:opacity-90"
            >
              {t("landing.nav.getStarted")}
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <section className="relative overflow-hidden">
          <div className="mx-auto grid w-full max-w-6xl items-center gap-10 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:py-24">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full bg-accent-soft px-3 py-1 text-xs font-semibold text-accent-soft-foreground">
                <Icon name="sparkles" className="h-3.5 w-3.5" />
                {t("landing.hero.badge")}
              </span>
              <h1 className="mt-5 text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
                {t("landing.hero.title")}
              </h1>
              <p className="mt-4 max-w-xl text-base text-muted">
                {t("landing.hero.subtitle")}
              </p>
              <div className="mt-7 flex flex-wrap items-center gap-3">
                <Link
                  href="/login"
                  className="rounded-xl bg-accent px-5 py-3 text-sm font-semibold text-accent-foreground transition-opacity hover:opacity-90"
                >
                  {t("landing.hero.primary")}
                </Link>
                <a
                  href="#features"
                  className="rounded-xl border border-border-secondary px-5 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-surface-tertiary"
                >
                  {t("landing.hero.secondary")}
                </a>
              </div>
            </div>

            <div className="surface-card overflow-hidden rounded-2xl border border-border-secondary">
              <div className="flex items-center gap-2 border-b border-border bg-surface-tertiary px-4 py-2.5">
                <span className="h-2.5 w-2.5 rounded-full bg-danger/70" />
                <span className="h-2.5 w-2.5 rounded-full bg-warning/70" />
                <span className="h-2.5 w-2.5 rounded-full bg-success/70" />
              </div>
              <div className="flex">
                <div className="hidden w-32 shrink-0 flex-col gap-2 border-e border-border bg-surface-secondary p-3 sm:flex">
                  {["grid", "users", "book", "receipt", "chart"].map((icon, index) => (
                    <div
                      key={icon}
                      className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs ${
                        index === 0
                          ? "bg-accent-soft font-semibold text-accent-soft-foreground"
                          : "text-muted"
                      }`}
                    >
                      <Icon name={icon as NavIcon} className="h-3.5 w-3.5" />
                      <span className="h-2 w-12 rounded-full bg-current opacity-20" />
                    </div>
                  ))}
                </div>
                <div className="flex-1 space-y-3 p-4">
                  <div className="grid grid-cols-3 gap-3">
                    {["92%", "1,240", "PKR 6.4M"].map((value) => (
                      <div
                        key={value}
                        className="rounded-xl border border-border-secondary bg-surface p-3"
                      >
                        <p className="text-sm font-semibold text-foreground">{value}</p>
                        <span className="mt-2 block h-2 w-10 rounded-full bg-accent-soft" />
                      </div>
                    ))}
                  </div>
                  <div className="rounded-xl border border-border-secondary bg-surface p-4">
                    <div className="flex items-end gap-1.5">
                      {[40, 65, 50, 80, 60, 90, 72].map((height, index) => (
                        <span
                          key={index}
                          className="w-full rounded-t bg-accent"
                          style={{ height: `${height}px` }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="border-y border-border-secondary bg-surface-secondary/60">
          <div className="mx-auto grid w-full max-w-6xl grid-cols-2 gap-6 px-4 py-10 sm:px-6 lg:grid-cols-4">
            {TRUST_STATS.map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="text-3xl font-bold text-foreground">{stat.value}</p>
                <p className="mt-1 text-xs font-medium uppercase tracking-wide text-muted">
                  {tr(stat.label)}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section id="features" className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 lg:py-24">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-foreground">
              {t("landing.features.title")}
            </h2>
            <p className="mt-3 text-base text-muted">{t("landing.features.subtitle")}</p>
          </div>
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((feature) => (
              <div
                key={feature.key}
                className="surface-card rounded-2xl border border-border-secondary p-5"
              >
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-accent-soft text-accent-soft-foreground">
                  <Icon name={feature.icon} className="h-5 w-5" />
                </span>
                <h3 className="mt-4 text-sm font-semibold text-foreground">
                  {t(`landing.feature.${feature.key}.title` as never)}
                </h3>
                <p className="mt-2 text-sm text-muted">
                  {t(`landing.feature.${feature.key}.body` as never)}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section id="modules" className="border-y border-border-secondary bg-surface-secondary/60 py-16 lg:py-24">
          <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tight text-foreground">
                {t("landing.modules.title")}
              </h2>
              <p className="mt-3 text-base text-muted">{t("landing.modules.subtitle")}</p>
            </div>
            <div className="mt-10 flex flex-wrap justify-center gap-3">
              {MODULES.map((module) => (
                <span
                  key={module}
                  className="rounded-full border border-border-secondary bg-surface px-4 py-2 text-sm font-medium text-foreground/80"
                >
                  {t(`landing.module.${module}` as never)}
                </span>
              ))}
            </div>
          </div>
        </section>

        <section id="roles" className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 lg:py-24">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-foreground">
              {t("landing.roles.title")}
            </h2>
            <p className="mt-3 text-base text-muted">{t("landing.roles.subtitle")}</p>
          </div>
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {ROLES.map((role) => (
              <div
                key={role.key}
                className="surface-card rounded-2xl border border-border-secondary p-6"
              >
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                  <Icon name={role.icon} className="h-5 w-5" />
                </span>
                <h3 className="mt-4 text-sm font-semibold text-foreground">
                  {t(`landing.role.${role.key}.title` as never)}
                </h3>
                <p className="mt-2 text-sm text-muted">
                  {t(`landing.role.${role.key}.body` as never)}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="border-y border-border-secondary bg-surface-secondary/60 py-16 lg:py-24">
          <div className="mx-auto w-full max-w-4xl px-4 text-center sm:px-6">
            <Icon name="message" className="mx-auto h-8 w-8 text-accent" />
            <blockquote className="mt-6 text-xl font-medium leading-relaxed text-foreground sm:text-2xl">
              &ldquo;{t("landing.testimonial.quote")}&rdquo;
            </blockquote>
            <p className="mt-6 text-sm font-semibold text-foreground">
              {t("landing.testimonial.author")}
            </p>
            <p className="text-xs text-muted">{t("landing.testimonial.role")}</p>
          </div>
        </section>

        <section id="pricing" className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 lg:py-24">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-foreground">
              {t("landing.pricing.title")}
            </h2>
            <p className="mt-3 text-base text-muted">{t("landing.pricing.subtitle")}</p>
          </div>
          <div className="mt-12 grid gap-6 lg:grid-cols-3">
            {PLANS.map((plan) => (
              <div
                key={plan.key}
                className={`surface-card relative rounded-2xl border p-6 ${
                  plan.popular
                    ? "border-accent shadow-lg"
                    : "border-border-secondary"
                }`}
              >
                {plan.popular ? (
                  <span className="absolute -top-3 start-6 rounded-full bg-accent px-3 py-1 text-xs font-semibold text-accent-foreground">
                    {t("landing.plan.popular")}
                  </span>
                ) : null}
                <h3 className="text-sm font-semibold uppercase tracking-wide text-muted">
                  {t(`landing.plan.${plan.key}.name` as never)}
                </h3>
                <p className="mt-3 text-3xl font-bold text-foreground">
                  {t(`landing.plan.${plan.key}.price` as never)}
                </p>
                <p className="text-xs text-muted">
                  {t(`landing.plan.${plan.key}.period` as never)}
                </p>
                <p className="mt-4 text-sm text-muted">
                  {t(`landing.plan.${plan.key}.desc` as never)}
                </p>
                <ul className="mt-6 space-y-2 text-sm text-foreground/80">
                  {["f1", "f2", "f3"].map((feature) => (
                    <li key={feature} className="flex items-center gap-2">
                      <Icon name="check" className="h-4 w-4 shrink-0 text-success" />
                      {t(`landing.plan.${plan.key}.${feature}` as never)}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/login"
                  className={`mt-6 block rounded-xl px-4 py-2.5 text-center text-sm font-semibold transition-colors ${
                    plan.popular
                      ? "bg-accent text-accent-foreground hover:opacity-90"
                      : "border border-border-secondary text-foreground hover:bg-surface-tertiary"
                  }`}
                >
                  {t("landing.nav.getStarted")}
                </Link>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto w-full max-w-6xl px-4 pb-20 sm:px-6">
          <div className="surface-card rounded-3xl border border-border-secondary bg-accent-soft px-8 py-12 text-center">
            <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              {t("landing.cta.title")}
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-sm text-muted">
              {t("landing.cta.body")}
            </p>
            <Link
              href="/login"
              className="mt-6 inline-flex rounded-xl bg-accent px-6 py-3 text-sm font-semibold text-accent-foreground transition-opacity hover:opacity-90"
            >
              {t("landing.cta.button")}
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-border-secondary bg-surface-secondary/60">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-8 sm:px-6">
          <div>
            <p className="brand-glow font-logo text-xl font-bold tracking-tight text-foreground">
              EduCourt
            </p>
            <p className="mt-1 text-xs text-muted">{t("landing.footer.tagline")}</p>
          </div>
          <p className="text-xs text-muted">
            &copy; {new Date().getFullYear()} EduCourt. {t("landing.footer.rights")}
          </p>
        </div>
      </footer>
    </div>
  );
}
