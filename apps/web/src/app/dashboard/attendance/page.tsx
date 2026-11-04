"use client";

import { PermissionGate } from "@/components/PermissionGate";
import { ModuleHub, type HubSection } from "@/components/ModuleHub";

const SECTIONS: HubSection[] = [
  {
    href: "/dashboard/attendance/students",
    title: "Student records",
    description: "Browse daily attendance marks and filters.",
    icon: "clipboard",
  },
  {
    href: "/dashboard/attendance/students/mark",
    title: "Mark attendance",
    description: "Take the register for a class and section.",
    icon: "check",
  },
  {
    href: "/dashboard/attendance/report",
    title: "Attendance report",
    description: "Class summaries and totals for a date range.",
    icon: "chart",
  },
  {
    href: "/dashboard/attendance/staff",
    title: "Staff records",
    description: "Daily attendance for campus staff.",
    icon: "idCard",
  },
  {
    href: "/dashboard/attendance/staff/mark",
    title: "Mark staff attendance",
    description: "Record the staff register for a day.",
    icon: "check",
  },
  {
    href: "/dashboard/attendance/staff/report",
    title: "Staff report",
    description: "Attendance breakdown by employee.",
    icon: "chart",
  },
  {
    href: "/dashboard/attendance/leave",
    title: "Leave requests",
    description: "Submit, approve or reject staff leave.",
    icon: "calendar",
  },
];

export default function AttendancePage() {
  return (
    <PermissionGate permission="attendance.view">
      <ModuleHub
        title="Attendance"
        description="Daily registers and leave, for students and staff."
        sections={SECTIONS}
      />
    </PermissionGate>
  );
}
