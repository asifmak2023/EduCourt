"use client";

import { StudentAffairsTabs } from "@/components/StudentAffairsTabs";
import { MasterList } from "@/components/MasterList";
import { Badge } from "@/components/ui";
import {
  COUNSELLING_STATUS_OPTIONS,
  COUNSELLING_TYPE_OPTIONS,
} from "@/lib/studentAffairsOptions";
import type { CounsellingSession } from "@/lib/types";

export default function CounsellingPage() {
  return (
    <div className="space-y-6">
      <StudentAffairsTabs active="counselling" />
      <MasterList<CounsellingSession>
        title="Counselling"
        description="Counselling sessions and follow ups."
        endpoint="/v1/student-affairs/counselling"
        searchable={false}
        createHref="/dashboard/student-affairs/counselling/new"
        createPermission="counselling.create"
        createLabel="New session"
        editHref={(session) =>
          `/dashboard/student-affairs/counselling/${session.id}/edit`
        }
        filters={[
          {
            param: "type",
            placeholder: "All types",
            options: COUNSELLING_TYPE_OPTIONS,
          },
          {
            param: "status",
            placeholder: "All statuses",
            options: COUNSELLING_STATUS_OPTIONS,
          },
        ]}
        columns={[
          {
            header: "Student",
            render: (session) =>
              session.student?.full_name ?? `Student #${session.student_id}`,
          },
          { header: "Date", render: (session) => session.session_date ?? "-" },
          {
            header: "Type",
            render: (session) => <Badge value={session.type ?? "unknown"} />,
          },
          {
            header: "Counsellor",
            render: (session) => session.counsellor?.name ?? "-",
          },
          { header: "Follow up", render: (session) => session.follow_up_on ?? "-" },
          {
            header: "Status",
            render: (session) => (
              <Badge value={session.status ?? "scheduled"} />
            ),
          },
        ]}
      />
    </div>
  );
}
