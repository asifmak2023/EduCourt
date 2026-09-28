"use client";

import { StudentAffairsTabs } from "@/components/StudentAffairsTabs";
import { MasterList } from "@/components/MasterList";
import { Badge } from "@/components/ui";
import {
  COMPLAINT_PRIORITY_OPTIONS,
  COMPLAINT_STATUS_OPTIONS,
} from "@/lib/studentAffairsOptions";
import type { Complaint } from "@/lib/types";

export default function ComplaintsPage() {
  return (
    <div className="space-y-6">
      <StudentAffairsTabs active="complaints" />
      <MasterList<Complaint>
        title="Complaints"
        description="Log complaints, assign them and record resolutions."
        endpoint="/v1/student-affairs/complaints"
        searchable={false}
        createHref="/dashboard/student-affairs/complaints/new"
        createPermission="student_affairs.create"
        createLabel="New complaint"
        editHref={(complaint) =>
          `/dashboard/student-affairs/complaints/${complaint.id}`
        }
        filters={[
          {
            param: "status",
            placeholder: "All statuses",
            options: COMPLAINT_STATUS_OPTIONS,
          },
          {
            param: "priority",
            placeholder: "All priorities",
            options: COMPLAINT_PRIORITY_OPTIONS,
          },
        ]}
        columns={[
          { header: "Reference", render: (complaint) => complaint.reference_no ?? "-" },
          { header: "Subject", render: (complaint) => complaint.subject },
          {
            header: "Student",
            render: (complaint) =>
              complaint.student?.full_name ??
              complaint.against ??
              "-",
          },
          { header: "Category", render: (complaint) => complaint.category ?? "-" },
          {
            header: "Priority",
            render: (complaint) => (
              <Badge value={complaint.priority ?? "medium"} />
            ),
          },
          {
            header: "Status",
            render: (complaint) => (
              <Badge value={complaint.status ?? "open"} />
            ),
          },
        ]}
      />
    </div>
  );
}
