"use client";

import Link from "next/link";
import { PermissionGate } from "@/components/PermissionGate";
import { Card, PageHeader } from "@/components/ui";

const SECTIONS = [
  {
    href: "/dashboard/attendance/students",
    title: "Student records",
    description: "Browse daily attendance marks and filters.",
  },
  {
    href: "/dashboard/attendance/students/mark",
    title: "Mark attendance",
    description: "Take the register for a class and section.",
  },
  {
    href: "/dashboard/attendance/report",
    title: "Attendance report",
    description: "Class summaries and totals for a date range.",
  },
  {
    href: "/dashboard/attendance/staff",
    title: "Staff records",
    description: "Daily attendance for campus staff.",
  },
  {
    href: "/dashboard/attendance/staff/mark",
    title: "Mark staff attendance",
    description: "Record the staff register for a day.",
  },
  {
    href: "/dashboard/attendance/staff/report",
    title: "Staff report",
    description: "Attendance breakdown by employee.",
  },
  {
    href: "/dashboard/attendance/leave",
    title: "Leave requests",
    description: "Submit, approve or reject staff leave.",
  },
];

export default function AttendancePage() {
  return (
    <PermissionGate permission="attendance.view">
      <div className="space-y-6">
        <PageHeader
          title="Attendance"
          description="Daily registers and leave, for students and staff."
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
