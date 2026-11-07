"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useTranslation } from "@eis/i18n";
import { BrandMark } from "@/components/BrandMark";
import { Icon } from "@/components/Icons";
import {
  androidDownloadUrl,
  iosDownloadUrl,
  isAndroid,
  isIOS,
} from "@/lib/download";

const DISMISS_KEY = "eis.appDownload.dismissed";

const DOWNLOAD_PAGE = "/download";

type Mode = "hidden" | "prompt" | "compact";

function bannerHref(ua: string): string {
  if (isIOS(ua)) {
    return iosDownloadUrl() || DOWNLOAD_PAGE;
  }
  if (isAndroid(ua)) {
    return androidDownloadUrl() || DOWNLOAD_PAGE;
  }
  return DOWNLOAD_PAGE;
}

function isMobileBrowser(): boolean {
  if (typeof navigator === "undefined") {
    return false;
  }
  const ua = navigator.userAgent;
  const coarse = window.matchMedia("(pointer: coarse)").matches;
  const mobileUA = /Android|iPhone|iPad|iPod|Mobile|Windows Phone/i.test(ua);
  return mobileUA || (coarse && Math.min(window.screen.width, window.screen.height) <= 900);
}

function isStandalone(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    nav.standalone === true
  );
}

export function AppDownloadBanner() {
  const { t } = useTranslation();
  const pathname = usePathname();
  const [mode, setMode] = useState<Mode>("hidden");
  const [href, setHref] = useState(DOWNLOAD_PAGE);

  const onDownloadPage = pathname === DOWNLOAD_PAGE;

  useEffect(() => {
    function evaluate() {
      if (isStandalone() || !isMobileBrowser()) {
        setMode("hidden");
        return;
      }
      setHref(bannerHref(navigator.userAgent));
      let dismissed = false;
      try {
        dismissed = window.localStorage.getItem(DISMISS_KEY) === "1";
      } catch {
        // Ignore storage failures and show the full prompt.
      }
      // Once dismissed, keep a compact button so the download stays reachable.
      setMode(dismissed ? "compact" : "prompt");
    }

    const raf = requestAnimationFrame(evaluate);
    return () => cancelAnimationFrame(raf);
  }, []);

  function dismiss() {
    setMode("compact");
    try {
      window.localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // Ignore storage failures.
    }
  }

  if (mode === "hidden" || onDownloadPage) {
    return null;
  }

  if (mode === "compact") {
    return (
      <a
        href={href}
        rel="noopener"
        aria-label={t("appDownload.install")}
        className="fixed end-3 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-40 inline-flex items-center gap-2 rounded-full bg-amber px-4 py-2.5 text-xs font-semibold text-amber-foreground shadow-lw-float sm:bottom-4 print:hidden"
      >
        <Icon name="download" className="h-4 w-4" />
        {t("appDownload.install")}
      </a>
    );
  }

  return (
    <div
      role="region"
      aria-label={t("appDownload.title")}
      className="fixed inset-x-3 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-40 rounded-2xl border border-border-secondary bg-surface p-3 shadow-lw-float sm:inset-x-auto sm:right-4 sm:bottom-4 sm:w-80 print:hidden"
    >
      <div className="flex items-start gap-3">
        <BrandMark className="h-10 w-10 shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground">
            {t("appDownload.title")}
          </p>
          <p className="mt-0.5 text-xs text-muted">{t("appDownload.body")}</p>
          <div className="mt-2 flex items-center gap-2">
            <a
              href={href}
              className="inline-flex min-h-9 items-center rounded-full bg-amber px-3 text-xs font-semibold text-amber-foreground"
              rel="noopener"
            >
              {t("appDownload.install")}
            </a>
            <button
              type="button"
              onClick={dismiss}
              className="inline-flex min-h-9 items-center rounded-full px-3 text-xs font-medium text-muted"
            >
              {t("appDownload.dismiss")}
            </button>
          </div>
        </div>
        <button
          type="button"
          onClick={dismiss}
          aria-label={t("appDownload.close")}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-lg leading-none text-muted hover:text-foreground"
        >
          &times;
        </button>
      </div>
    </div>
  );
}
