"use client";

import Link from "next/link";
import { PermissionGate } from "@/components/PermissionGate";
import { Card, PageHeader } from "@/components/ui";

const SECTIONS = [
  {
    href: "/dashboard/exams/records",
    title: "Examinations",
    description: "Schedule exams, publish results and rank students.",
  },
  {
    href: "/dashboard/exams/papers",
    title: "Exam papers",
    description: "Papers, dates, rooms and maximum marks per class.",
  },
  {
    href: "/dashboard/exams/marks",
    title: "Marks entry",
    description: "Capture subject marks against each paper.",
  },
  {
    href: "/dashboard/exams/result-card",
    title: "Result card",
    description: "Per-student subject breakdown with grade.",
  },
  {
    href: "/dashboard/exams/types",
    title: "Exam types",
    description: "Terms, mid-terms and other assessment types.",
  },
  {
    href: "/dashboard/exams/grade-scales",
    title: "Grade scales",
    description: "Percentage bands and grade points.",
  },
  {
    href: "/dashboard/exams/moderations",
    title: "Moderations",
    description: "Grace marks and scaling applied to papers.",
  },
  {
    href: "/dashboard/exams/reevaluations",
    title: "Re-evaluations",
    description: "Review requests to revise a student's marks.",
  },
  {
    href: "/dashboard/exams/supplementaries",
    title: "Supplementary exams",
    description: "Register failed students for a re-sit.",
  },
  {
    href: "/dashboard/exams/invigilation",
    title: "Invigilation duties",
    description: "Assign chief and assistant invigilators to papers.",
  },
  {
    href: "/dashboard/exams/analysis",
    title: "Result analysis",
    description: "Class, subject, teacher and year-on-year insights.",
  },
];

export default function ExamsPage() {
  return (
    <PermissionGate permission="exam.view">
      <div className="space-y-6">
        <PageHeader
          title="Exams & results"
          description="Plan exams, capture marks and publish results."
        />

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {SECTIONS.map((section) => (
            <Link key={section.href} href={section.href}>
              <Card className="h-full p-5 transition hover:border-accent">
                <p className="text-sm font-semibold text-foreground">
                  {section.title}
                </p>
                <p className="mt-1 text-sm text-muted">
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
