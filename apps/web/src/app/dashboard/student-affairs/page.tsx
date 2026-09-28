"use client";

import { useList } from "@/lib/useList";
import { PermissionGate } from "@/components/PermissionGate";
import { StudentAffairsTabs } from "@/components/StudentAffairsTabs";
import { Card, PageHeader, StatCard } from "@/components/ui";
import { formatNumber } from "@/lib/format";
import type {
  Complaint,
  CounsellingSession,
  StudentClub,
  StudentEvent,
} from "@/lib/types";

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
    <div className="space-y-6">
      <PageHeader
        title="Student affairs"
        description="Clubs, events, student council, welfare, counselling and alumni."
      />

      <StudentAffairsTabs active="overview" />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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

      <Card className="p-5">
        <p className="text-sm text-slate-600">
          Use the tabs above to manage clubs and rosters, plan events with
          participants, record council members, issue certificates, log welfare
          and counselling records, and follow complaints through to resolution.
        </p>
      </Card>
    </div>
  );
}
