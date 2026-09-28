"use client";

import Link from "next/link";
import { PermissionGate } from "@/components/PermissionGate";
import { Card, PageHeader } from "@/components/ui";

const SECTIONS = [
  {
    href: "/dashboard/credits/registrations",
    title: "Course registrations",
    description: "Register students for term courses and manage drops.",
  },
  {
    href: "/dashboard/credits/term-gpa",
    title: "Term GPA",
    description: "Credit-weighted grade point average for one term.",
  },
  {
    href: "/dashboard/credits/transcript",
    title: "Transcript",
    description: "Cumulative GPA with a per-term breakdown.",
  },
];

export default function CreditsPage() {
  return (
    <PermissionGate permission="credit.view">
      <div className="space-y-6">
        <PageHeader
          title="Credits & GPA"
          description="Credit-hour course registration and GPA for college campuses."
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
