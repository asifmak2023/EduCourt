"use client";

import { StudentAffairsTabs } from "@/components/StudentAffairsTabs";
import { MasterList } from "@/components/MasterList";
import type { AlumniProfile } from "@/lib/types";

export default function AlumniPage() {
  return (
    <div className="space-y-6">
      <StudentAffairsTabs active="alumni" />
      <MasterList<AlumniProfile>
        title="Alumni"
        description="Alumni directory with graduation years and contact details."
        endpoint="/v1/student-affairs/alumni"
        searchPlaceholder="Search name or email"
        createHref="/dashboard/student-affairs/alumni/new"
        createPermission="student_affairs.create"
        createLabel="New alumnus"
        editHref={(alumnus) =>
          `/dashboard/student-affairs/alumni/${alumnus.id}/edit`
        }
        columns={[
          { header: "Name", render: (alumnus) => alumnus.full_name },
          {
            header: "Graduation year",
            render: (alumnus) => alumnus.graduation_year ?? "-",
          },
          {
            header: "Occupation",
            render: (alumnus) => alumnus.current_occupation ?? "-",
          },
          { header: "Employer", render: (alumnus) => alumnus.employer ?? "-" },
          { header: "Email", render: (alumnus) => alumnus.email ?? "-" },
          { header: "City", render: (alumnus) => alumnus.city ?? "-" },
        ]}
      />
    </div>
  );
}
