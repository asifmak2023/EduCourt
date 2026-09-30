"use client";

import { StudentAffairsTabs } from "@/components/StudentAffairsTabs";
import { MasterList } from "@/components/MasterList";
import { Badge } from "@/components/ui";
import {
  WELFARE_STATUS_OPTIONS,
  WELFARE_TYPE_OPTIONS,
} from "@/lib/studentAffairsOptions";
import type { WelfareRecord } from "@/lib/types";
import { formatDate } from "@/lib/format";

export default function WelfarePage() {
  return (
    <div className="space-y-6">
      <StudentAffairsTabs active="welfare" />
      <MasterList<WelfareRecord>
        title="Welfare records"
        description="Student welfare, health, medical and incident records."
        endpoint="/v1/student-affairs/welfare-records"
        searchable={false}
        createHref="/dashboard/student-affairs/welfare/new"
        createPermission="student_affairs.create"
        createLabel="New record"
        editHref={(record) =>
          `/dashboard/student-affairs/welfare/${record.id}/edit`
        }
        filters={[
          {
            param: "type",
            placeholder: "All types",
            options: WELFARE_TYPE_OPTIONS,
          },
          {
            param: "status",
            placeholder: "All statuses",
            options: WELFARE_STATUS_OPTIONS,
          },
        ]}
        columns={[
          { header: "Title", render: (record) => record.title },
          {
            header: "Student",
            render: (record) =>
              record.student?.full_name ?? `Student #${record.student_id}`,
          },
          {
            header: "Type",
            render: (record) => <Badge value={record.type ?? "unknown"} />,
          },
          { header: "Recorded on", render: (record) => formatDate(record.recorded_on) },
          {
            header: "Status",
            render: (record) => (
              <Badge value={record.status ?? "unknown"} />
            ),
          },
        ]}
      />
    </div>
  );
}
