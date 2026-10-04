"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslation } from "@eis/i18n";
import { useTr } from "@/lib/i18n";
import { buildBreadcrumbs, isRoutable } from "@/lib/breadcrumbs";

export function Breadcrumbs() {
  const pathname = usePathname();
  const { t } = useTranslation();
  const tr = useTr();
  const crumbs = buildBreadcrumbs(pathname, tr);

  if (crumbs.length <= 1) {
    return null;
  }

  return (
    <nav aria-label={t("navigation.breadcrumb")} className="mb-4">
      <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-muted sm:text-sm">
        {crumbs.map((crumb, index) => {
          const linkable = !crumb.isCurrent && isRoutable(crumb.href);

          return (
            <li
              key={crumb.href}
              className="flex min-w-0 items-center gap-1.5"
            >
              {index > 0 ? (
                <span aria-hidden="true" className="text-muted/50">
                  /
                </span>
              ) : null}

              {linkable ? (
                <Link
                  href={crumb.href}
                  className="max-w-[14rem] truncate rounded transition-colors hover:text-foreground hover:underline"
                >
                  {crumb.label}
                </Link>
              ) : (
                <span
                  aria-current={crumb.isCurrent ? "page" : undefined}
                  className={`max-w-[14rem] truncate ${
                    crumb.isCurrent ? "font-medium text-foreground" : ""
                  }`}
                >
                  {crumb.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
