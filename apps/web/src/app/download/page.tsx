"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { useTranslation } from "@eis/i18n";
import { BrandMark } from "@/components/BrandMark";
import { Icon } from "@/components/Icons";
import {
  androidDownloadUrl,
  iosDownloadUrl,
  isAndroid,
  isIOS,
} from "@/lib/download";

type Platform = "android" | "ios" | "other";

function detectPlatform(): Platform {
  if (typeof navigator === "undefined") {
    return "other";
  }
  const ua = navigator.userAgent;
  if (isIOS(ua)) {
    return "ios";
  }
  if (isAndroid(ua)) {
    return "android";
  }
  return "other";
}

const subscribe = () => () => {};

export default function DownloadPage() {
  const { t } = useTranslation();
  const platform = useSyncExternalStore(
    subscribe,
    detectPlatform,
    () => "other" as Platform
  );

  const androidHref = androidDownloadUrl();
  const iosHref = iosDownloadUrl();

  const options = [
    {
      key: "android" as const,
      href: androidHref,
      label: t("appDownload.android"),
      hint: t("appDownload.androidHint"),
      available: Boolean(androidHref),
    },
    {
      key: "ios" as const,
      href: iosHref,
      label: t("appDownload.ios"),
      hint: t("appDownload.iosHint"),
      available: Boolean(iosHref),
    },
  ];

  const anyAvailable = options.some((option) => option.available);

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12 sm:px-8">
      <div className="w-full max-w-md">
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
            {t("appDownload.page.title")}
          </h1>
          <p className="mt-1.5 text-sm text-muted">{t("appDownload.page.subtitle")}</p>

          <div className="mt-6 space-y-3">
            {options.map((option) => {
              const preferred = option.key === platform;
              const className =
                "flex w-full items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left transition-colors";
              if (!option.available) {
                return (
                  <div
                    key={option.key}
                    className={`${className} cursor-not-allowed border-border-secondary opacity-60`}
                  >
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-foreground">
                        {option.label}
                      </span>
                      <span className="mt-0.5 block text-xs text-muted">
                        {t("appDownload.unavailable")}
                      </span>
                    </span>
                    <Icon name="download" className="h-5 w-5 shrink-0 text-muted" />
                  </div>
                );
              }
              return (
                <a
                  key={option.key}
                  href={option.href}
                  rel="noopener"
                  className={`${className} ${
                    preferred
                      ? "border-accent bg-accent-soft text-accent-soft-foreground"
                      : "border-border-secondary bg-surface hover:bg-surface-tertiary"
                  }`}
                >
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-foreground">
                      {option.label}
                    </span>
                    <span className="mt-0.5 block text-xs text-muted">{option.hint}</span>
                  </span>
                  <Icon name="download" className="h-5 w-5 shrink-0 text-accent" />
                </a>
              );
            })}
          </div>

          {!anyAvailable ? (
            <p className="mt-4 rounded-xl bg-surface-secondary px-3 py-2 text-xs text-muted">
              {t("appDownload.unavailable")}
            </p>
          ) : null}

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
