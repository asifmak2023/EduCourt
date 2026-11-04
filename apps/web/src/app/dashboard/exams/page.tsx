"use client";

import { PermissionGate } from "@/components/PermissionGate";
import { ModuleHub, type HubSection } from "@/components/ModuleHub";

const SECTIONS: HubSection[] = [
  {
    href: "/dashboard/exams/records",
    title: "Examinations",
    description: "Schedule exams, publish results and rank students.",
    icon: "clipboard",
  },
  {
    href: "/dashboard/exams/papers",
    title: "Exam papers",
    description: "Papers, dates, rooms and maximum marks per class.",
    icon: "list",
  },
  {
    href: "/dashboard/exams/marks",
    title: "Marks entry",
    description: "Capture subject marks against each paper.",
    icon: "receipt",
  },
  {
    href: "/dashboard/exams/result-card",
    title: "Result card",
    description: "Per-student subject breakdown with grade.",
    icon: "award",
  },
  {
    href: "/dashboard/exams/types",
    title: "Exam types",
    description: "Terms, mid-terms and other assessment types.",
    icon: "list",
  },
  {
    href: "/dashboard/exams/grade-scales",
    title: "Grade scales",
    description: "Percentage bands and grade points.",
    icon: "chart",
  },
  {
    href: "/dashboard/exams/moderations",
    title: "Moderations",
    description: "Grace marks and scaling applied to papers.",
    icon: "check",
  },
  {
    href: "/dashboard/exams/reevaluations",
    title: "Re-evaluations",
    description: "Review requests to revise a student's marks.",
    icon: "history",
  },
  {
    href: "/dashboard/exams/supplementaries",
    title: "Supplementary exams",
    description: "Register failed students for a re-sit.",
    icon: "clipboard",
  },
  {
    href: "/dashboard/exams/invigilation",
    title: "Invigilation duties",
    description: "Assign chief and assistant invigilators to papers.",
    icon: "shield",
  },
  {
    href: "/dashboard/exams/analysis",
    title: "Result analysis",
    description: "Class, subject, teacher and year-on-year insights.",
    icon: "trophy",
  },
];

export default function ExamsPage() {
  return (
    <PermissionGate permission="exam.view">
      <ModuleHub
        title="Exams & results"
        description="Plan exams, capture marks and publish results."
        sections={SECTIONS}
      />
    </PermissionGate>
  );
}
