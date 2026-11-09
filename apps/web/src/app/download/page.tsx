"use client";

import Link from "next/link";
import { useTranslation } from "@eis/i18n";
import { BrandMark } from "@/components/BrandMark";
import { Icon } from "@/components/Icons";
import { FAMILY_DOWNLOAD_HREF, STAFF_DOWNLOAD_HREF } from "@/lib/app-links";

const AUDIENCES = [
  {
    key: "staff" as const,
    href: STAFF_DOWNLOAD_HREF,
    title: "appDownload.staff.title" as const,
    body: "appDownload.staff.subtitle" as const,
    cta: "landing.apps.staff.cta" as const,
    icon: "idCard" as const,
  },
  {
    key: "family" as const,
    href: FAMILY_DOWNLOAD_HREF,
    title: "appDownload.family.title" as const,
    body: "appDownload.family.subtitle" as const,
    cta: "landing.apps.family.cta" as const,
    icon: "users" as const,
  },
];

export default function DownloadPage() {
  const { t } = useTranslation();

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12 sm:px-8">
      <div className="w-full max-w-lg">
        <div className="mb-6 flex items-center gap-3">
          <BrandMark className="h-11 w-11" priority />
          <span className="brand-glow font-logo text-2xl font-bold tracking-tight text-foreground">
            EduCourt
          </span>
        </div>

        <div className="rounded-[28px] border border-border-secondary bg-panel p-7 shadow-lw sm:p-9">
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-accent-soft text-accent-soft-foreground">
            <Icon name="download" className="h-6 w-6" />
          </span>
          <h1 className="lw-hero-title mt-4 text-2xl text-foreground sm:text-3xl">
            {t("landing.apps.title")}
          </h1>
          <p className="mt-1.5 text-sm text-muted">{t("landing.apps.subtitle")}</p>

          <div className="mt-6 space-y-3">
            {AUDIENCES.map((audience) => (
              <Link
                key={audience.key}
                href={audience.href}
                className="flex w-full items-center gap-4 rounded-2xl border border-border-secondary bg-surface px-4 py-4 text-left transition-colors hover:bg-surface-tertiary"
              >
                <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent-soft-foreground">
                  <Icon name={audience.icon} className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-foreground">
                    {t(audience.title)}
                  </span>
                  <span className="mt-0.5 block text-xs text-muted">{t(audience.body)}</span>
                </span>
                <Icon name="chevronDown" className="h-4 w-4 shrink-0 -rotate-90 text-muted" />
              </Link>
            ))}
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Link
              href="/login"
              className="rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-accent-foreground transition-opacity hover:opacity-90"
            >
              {t("appDownload.continueWeb")}
            </Link>
            <Link
              href="/"
              className="rounded-xl border border-border-secondary px-4 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-surface-tertiary"
            >
              {t("appDownload.backHome")}
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
