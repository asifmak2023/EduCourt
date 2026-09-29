"use client";

import Link from "next/link";

export const INSTITUTIONS_TABS = [
  { key: "overview", href: "/dashboard/institutions", label: "Overview" },
  {
    key: "institutions",
    href: "/dashboard/institutions/list",
    label: "Institutions",
  },
  { key: "campuses", href: "/dashboard/institutions/campuses", label: "Campuses" },
];

export function InstitutionsTabs({ active }: { active: string }) {
  return (
    <nav className="flex flex-wrap gap-2">
      {INSTITUTIONS_TABS.map((tab) => (
        <Link
          key={tab.key}
          href={tab.href}
          className={
            tab.key === active
              ? "rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-medium text-white"
              : "rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:border-slate-400"
          }
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
