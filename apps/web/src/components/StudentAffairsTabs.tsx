"use client";

import Link from "next/link";

export const STUDENT_AFFAIRS_TABS = [
  { key: "overview", href: "/dashboard/student-affairs", label: "Overview" },
  { key: "clubs", href: "/dashboard/student-affairs/clubs", label: "Clubs" },
  { key: "events", href: "/dashboard/student-affairs/events", label: "Events" },
  {
    key: "council",
    href: "/dashboard/student-affairs/council",
    label: "Council",
  },
  {
    key: "certificates",
    href: "/dashboard/student-affairs/certificates",
    label: "Certificates",
  },
  {
    key: "welfare",
    href: "/dashboard/student-affairs/welfare",
    label: "Welfare",
  },
  {
    key: "counselling",
    href: "/dashboard/student-affairs/counselling",
    label: "Counselling",
  },
  {
    key: "complaints",
    href: "/dashboard/student-affairs/complaints",
    label: "Complaints",
  },
  { key: "alumni", href: "/dashboard/student-affairs/alumni", label: "Alumni" },
];

export function StudentAffairsTabs({ active }: { active: string }) {
  return (
    <nav className="flex flex-wrap gap-2">
      {STUDENT_AFFAIRS_TABS.map((tab) => (
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
