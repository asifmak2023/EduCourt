"use client";

import { StudentAffairsTabs } from "@/components/StudentAffairsTabs";
import { MasterList } from "@/components/MasterList";
import { Badge } from "@/components/ui";
import type { StudentClub } from "@/lib/types";

export default function ClubsPage() {
  return (
    <div className="space-y-6">
      <StudentAffairsTabs active="clubs" />
      <MasterList<StudentClub>
        title="Clubs"
        description="Student clubs and societies with patrons and rosters."
        endpoint="/v1/student-affairs/clubs"
        searchable={false}
        createHref="/dashboard/student-affairs/clubs/new"
        createPermission="student_affairs.create"
        createLabel="New club"
        editHref={(club) => `/dashboard/student-affairs/clubs/${club.id}`}
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
          { header: "Club", render: (club) => club.name },
          { header: "Code", render: (club) => club.code },
          { header: "Category", render: (club) => club.category ?? "-" },
          { header: "Patron", render: (club) => club.patron?.name ?? "-" },
          {
            header: "Members",
            align: "right",
            render: (club) => club.members_count ?? 0,
          },
          {
            header: "Status",
            render: (club) => (
              <Badge value={club.is_active ? "active" : "inactive"} />
            ),
          },
        ]}
      />
    </div>
  );
}
