"use client";

import { StudentAffairsTabs } from "@/components/StudentAffairsTabs";
import { MasterList } from "@/components/MasterList";
import { Badge } from "@/components/ui";
import type { CouncilMember } from "@/lib/types";
import { formatDate } from "@/lib/format";

export default function CouncilPage() {
  return (
    <div className="space-y-6">
      <StudentAffairsTabs active="council" />
      <MasterList<CouncilMember>
        title="Student council"
        description="Elected student council members and their terms."
        endpoint="/v1/student-affairs/council-members"
        searchable={false}
        createHref="/dashboard/student-affairs/council/new"
        createPermission="student_affairs.create"
        createLabel="New member"
        editHref={(member) =>
          `/dashboard/student-affairs/council/${member.id}/edit`
        }
        filters={[
          {
            param: "is_active",
            placeholder: "All states",
            options: [
              { value: "1", label: "Active" },
              { value: "0", label: "Inactive" },
            ],
          },
        ]}
        columns={[
          {
            header: "Student",
            render: (member) =>
              member.student?.full_name ?? `Student #${member.student_id}`,
          },
          { header: "Position", render: (member) => member.position },
          { header: "Term", render: (member) => member.term ?? "-" },
          { header: "From", render: (member) => formatDate(member.from_date) },
          { header: "To", render: (member) => formatDate(member.to_date) },
          {
            header: "Status",
            render: (member) => (
              <Badge value={member.is_active ? "active" : "inactive"} />
            ),
          },
        ]}
      />
    </div>
  );
}
