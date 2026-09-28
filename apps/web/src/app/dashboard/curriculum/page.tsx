"use client";

import Link from "next/link";
import { PermissionGate } from "@/components/PermissionGate";
import { Card, PageHeader } from "@/components/ui";

const SECTIONS = [
  {
    href: "/dashboard/curriculum/syllabus-units",
    title: "Syllabus units",
    description: "Sequence topics per class and subject with period estimates.",
  },
  {
    href: "/dashboard/curriculum/class-books",
    title: "Class books",
    description: "Text and reference books assigned to each class.",
  },
  {
    href: "/dashboard/curriculum/lesson-plans",
    title: "Lesson plans",
    description: "Plan lessons and route them through approval.",
  },
];

export default function CurriculumPage() {
  return (
    <PermissionGate permission="curriculum.view">
      <div className="space-y-6">
        <PageHeader
          title="Curriculum"
          description="Syllabus, prescribed books and lesson planning."
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
