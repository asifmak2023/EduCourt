"use client";

import { PermissionGate } from "@/components/PermissionGate";
import { ModuleHub, type HubSection } from "@/components/ModuleHub";

const SECTIONS: HubSection[] = [
  {
    href: "/dashboard/curriculum/syllabus-units",
    title: "Syllabus units",
    description: "Sequence topics per class and subject with period estimates.",
    icon: "list",
  },
  {
    href: "/dashboard/curriculum/class-books",
    title: "Class books",
    description: "Text and reference books assigned to each class.",
    icon: "book",
  },
  {
    href: "/dashboard/curriculum/lesson-plans",
    title: "Lesson plans",
    description: "Plan lessons and route them through approval.",
    icon: "clipboard",
  },
];

export default function CurriculumPage() {
  return (
    <PermissionGate permission="curriculum.view">
      <ModuleHub
        title="Curriculum"
        description="Syllabus, prescribed books and lesson planning."
        sections={SECTIONS}
      />
    </PermissionGate>
  );
}
