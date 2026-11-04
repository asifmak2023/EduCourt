"use client";

import { useList } from "@/lib/useList";
import { PermissionGate } from "@/components/PermissionGate";
import { StudentAffairsTabs } from "@/components/StudentAffairsTabs";
import { HubGrid, type HubSection } from "@/components/ModuleHub";
import { PageHeader, StatCard } from "@/components/ui";
import { formatNumber } from "@/lib/format";
import type {
  Complaint,
  CounsellingSession,
  StudentClub,
  StudentEvent,
} from "@/lib/types";

const STUDENT_AFFAIRS_SECTIONS: HubSection[] = [
  {
    href: "/dashboard/student-affairs/clubs",
    title: "Clubs",
    description: "Clubs and their rosters.",
    icon: "users",
  },
  {
    href: "/dashboard/student-affairs/events",
    title: "Events",
    description: "Plan events and track participants.",
    icon: "calendar",
  },
  {
    href: "/dashboard/student-affairs/council",
    title: "Council",
    description: "Student council members and posts.",
    icon: "idCard",
  },
  {
    href: "/dashboard/student-affairs/certificates",
    title: "Certificates",
    description: "Issue participation and merit certificates.",
    icon: "award",
  },
  {
    href: "/dashboard/student-affairs/welfare",
    title: "Welfare",
    description: "Welfare cases and support records.",
    icon: "heart",
  },
  {
    href: "/dashboard/student-affairs/counselling",
    title: "Counselling",
    description: "Scheduled sessions and notes.",
    icon: "message",
  },
  {
    href: "/dashboard/student-affairs/complaints",
    title: "Complaints",
    description: "Follow complaints through to resolution.",
    icon: "megaphone",
  },
  {
    href: "/dashboard/student-affairs/alumni",
    title: "Alumni",
    description: "Former students and their records.",
    icon: "book",
  },
];

export default function StudentAffairsPage() {
  return (
    <PermissionGate permission="student_affairs.view">
      <StudentAffairsHome />
    </PermissionGate>
  );
}

function StudentAffairsHome() {
  const clubs = useList<StudentClub>("/v1/student-affairs/clubs", {
    is_active: 1,
    per_page: 1,
  });
  const events = useList<StudentEvent>("/v1/student-affairs/events", {
    status: "ongoing",
    per_page: 1,
  });
  const complaints = useList<Complaint>("/v1/student-affairs/complaints", {
    status: "open",
    per_page: 1,
  });
  const counselling = useList<CounsellingSession>(
    "/v1/student-affairs/counselling",
    { status: "scheduled", per_page: 1 }
  );

  return (
    <div className="space-y-4 sm:space-y-5">
      <PageHeader
        title="Student affairs"
        description="Clubs, events, student council, welfare, counselling and alumni."
      />

      <StudentAffairsTabs active="overview" />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Active clubs"
          value={formatNumber(clubs.meta?.total ?? 0)}
        />
        <StatCard
          label="Ongoing events"
          value={formatNumber(events.meta?.total ?? 0)}
        />
        <StatCard
          label="Open complaints"
          value={formatNumber(complaints.meta?.total ?? 0)}
          tone={(complaints.meta?.total ?? 0) > 0 ? "danger" : "positive"}
        />
        <StatCard
          label="Scheduled counselling"
          value={formatNumber(counselling.meta?.total ?? 0)}
        />
      </div>

      <HubGrid sections={STUDENT_AFFAIRS_SECTIONS} />
    </div>
  );
}
