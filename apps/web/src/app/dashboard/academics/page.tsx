"use client";

import { PermissionGate } from "@/components/PermissionGate";
import { ModuleHub, type HubSection } from "@/components/ModuleHub";

const SECTIONS: HubSection[] = [
  {
    href: "/dashboard/academics/academic-years",
    title: "Academic years",
    description: "Sessions, their date range and terms.",
    icon: "calendar",
  },
  {
    href: "/dashboard/academics/terms",
    title: "Terms",
    description: "Terms within each academic year.",
    icon: "calendar",
  },
  {
    href: "/dashboard/academics/stages",
    title: "Stages",
    description: "Education levels such as primary or secondary.",
    icon: "award",
  },
  {
    href: "/dashboard/academics/classes",
    title: "Classes",
    description: "Classes within each stage, with sections.",
    icon: "grid",
  },
  {
    href: "/dashboard/academics/sections",
    title: "Sections",
    description: "Streams or sections inside a class.",
    icon: "list",
  },
  {
    href: "/dashboard/academics/subjects",
    title: "Subjects",
    description: "Subjects taught, with type and credit hours.",
    icon: "book",
  },
  {
    href: "/dashboard/academics/class-subjects",
    title: "Class subjects",
    description: "Which subjects each class studies, per year.",
    icon: "book",
  },
  {
    href: "/dashboard/academics/teaching-assignments",
    title: "Teaching assignments",
    description: "Which teacher takes a subject for a class.",
    icon: "users",
  },
  {
    href: "/dashboard/academics/periods",
    title: "Periods",
    description: "Daily bell schedule used by the timetable.",
    icon: "clock",
  },
  {
    href: "/dashboard/academics/rooms",
    title: "Rooms",
    description: "Physical rooms, labs and halls.",
    icon: "building",
  },
];

export default function AcademicsPage() {
  return (
    <PermissionGate permission="academic.view">
      <ModuleHub
        title="Academic structure"
        description="The building blocks that timetables, attendance and exams hang off."
        sections={SECTIONS}
      />
    </PermissionGate>
  );
}
