"use client";

import Link from "next/link";
import { PermissionGate } from "@/components/PermissionGate";
import { Card, PageHeader } from "@/components/ui";

const SECTIONS = [
  {
    href: "/dashboard/hr/staff",
    title: "Staff",
    description: "Staff register with department, designation and profile.",
  },
  {
    href: "/dashboard/hr/departments",
    title: "Departments",
    description: "Departments and their heads.",
  },
  {
    href: "/dashboard/hr/designations",
    title: "Designations",
    description: "Job titles, grades and descriptions.",
  },
  {
    href: "/dashboard/hr/reports",
    title: "Reports",
    description: "Headcount and joiner/leaver movements.",
  },
];

export default function HrPage() {
  return (
    <PermissionGate permission="hr.view">
      <div className="space-y-6">
        <PageHeader
          title="Human resources"
          description="Staff register, organisation structure and reports."
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
