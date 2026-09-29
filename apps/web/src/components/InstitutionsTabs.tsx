"use client";

import Link from "next/link";
import { buttonClasses } from "@/components/Form";

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
          className={buttonClasses(tab.key === active ? "primary" : "secondary")}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
