"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { Icon } from "@/components/Icons";
import { Card, PageHeader } from "@/components/ui";
import type { NavIcon } from "@/lib/nav";

export type HubSection = {
  href: string;
  title: string;
  description: string;
  icon?: NavIcon;
};

/**
 * Shared landing grid for module hubs. Keeps every "area of the app" page on
 * the same Luminous rhythm: icon tile, title, description and a trailing cue.
 */
export function ModuleHub({
  title,
  description,
  sections,
  stats,
  footer,
}: {
  title: string;
  description?: string;
  sections: HubSection[];
  stats?: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="space-y-4 sm:space-y-5">
      <PageHeader title={title} description={description} />

      {stats ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{stats}</div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {sections.map((section) => (
          <Link key={section.href} href={section.href} className="block">
            <Card className="group h-full p-5">
              <div className="flex items-start justify-between gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-surface-secondary text-accent">
                  <Icon name={section.icon ?? "grid"} />
                </span>
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-surface-secondary text-muted transition group-hover:bg-accent-soft group-hover:text-accent-soft-foreground">
                  <Icon name="arrowUp" className="h-3.5 w-3.5 rotate-90" />
                </span>
              </div>
              <p className="mt-3.5 text-sm font-semibold tracking-tight text-foreground">
                {section.title}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-muted">
                {section.description}
              </p>
            </Card>
          </Link>
        ))}
      </div>

      {footer}
    </div>
  );
}
