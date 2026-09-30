"use client";

import Link from "next/link";
import { buttonClasses } from "@/components/Form";

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
          className={buttonClasses(tab.key === active ? "primary" : "secondary")}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
