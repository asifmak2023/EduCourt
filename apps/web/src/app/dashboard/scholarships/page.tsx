"use client";

import Link from "next/link";
import { PermissionGate } from "@/components/PermissionGate";
import { Card, PageHeader } from "@/components/ui";

const SECTIONS = [
  {
    href: "/dashboard/scholarships/schemes",
    title: "Scholarships",
    description: "Define merit, need-based and sponsored fee concessions.",
  },
  {
    href: "/dashboard/scholarships/awards",
    title: "Awards",
    description: "Assign scholarships to students and revoke when needed.",
  },
];

export default function ScholarshipsPage() {
  return (
    <PermissionGate permission="scholarship.view">
      <div className="space-y-6">
        <PageHeader
          title="Scholarships"
          description="Fee concessions and the students who hold them."
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
