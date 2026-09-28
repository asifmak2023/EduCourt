"use client";

import Link from "next/link";
import { PermissionGate } from "@/components/PermissionGate";
import { Card, PageHeader } from "@/components/ui";

const SECTIONS = [
  {
    href: "/dashboard/academics/academic-years",
    title: "Academic years",
    description: "Sessions, their date range and terms.",
  },
  {
    href: "/dashboard/academics/terms",
    title: "Terms",
    description: "Terms within each academic year.",
  },
  {
    href: "/dashboard/academics/stages",
    title: "Stages",
    description: "Education levels such as primary or secondary.",
  },
  {
    href: "/dashboard/academics/classes",
    title: "Classes",
    description: "Classes within each stage, with sections.",
  },
  {
    href: "/dashboard/academics/sections",
    title: "Sections",
    description: "Streams or sections inside a class.",
  },
  {
    href: "/dashboard/academics/subjects",
    title: "Subjects",
    description: "Subjects taught, with type and credit hours.",
  },
  {
    href: "/dashboard/academics/periods",
    title: "Periods",
    description: "Daily bell schedule used by the timetable.",
  },
  {
    href: "/dashboard/academics/rooms",
    title: "Rooms",
    description: "Physical rooms, labs and halls.",
  },
];

export default function AcademicsPage() {
  return (
    <PermissionGate permission="academic.view">
      <div className="space-y-6">
        <PageHeader
          title="Academic structure"
          description="The building blocks that timetables, attendance and exams hang off."
        />

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {SECTIONS.map((section) => (
            <Link key={section.href} href={section.href}>
              <Card className="h-full p-5 transition hover:border-slate-400">
                <p className="text-sm font-semibold text-slate-900">
                  {section.title}
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  {section.description}
                </p>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </PermissionGate>
  );
}
