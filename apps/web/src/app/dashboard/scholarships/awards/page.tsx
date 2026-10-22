"use client";

import { useAuth } from "@/lib/auth";
import { useScholarships, useStudents } from "@/lib/useLookups";
import { MasterList } from "@/components/MasterList";
import { Badge } from "@/components/ui";
import { formatCurrency, formatDate } from "@/lib/format";
import type { ScholarshipAward } from "@/lib/types";

export default function ScholarshipAwardsPage() {
  const { can } = useAuth();
  const { items: scholarships } = useScholarships();
  const { items: students } = useStudents();

  return (
    <MasterList<ScholarshipAward>
      title="Scholarship awards"
      description="Students holding a scholarship and its status."
      endpoint="/v1/scholarship-awards"
      searchable={false}
      createHref={
        can("scholarship.create")
          ? "/dashboard/scholarships/awards/new"
          : undefined
      }
      createLabel="New award"
      editHref={(award) => `/dashboard/scholarships/awards/${award.id}`}
      filters={[
        {
          param: "scholarship_id",
          placeholder: "All scholarships",
          options: scholarships.map((scholarship) => ({
            value: String(scholarship.id),
            label: scholarship.name,
          })),
        },
        {
          param: "student_id",
          placeholder: "All students",
          options: students.map((student) => ({
            value: String(student.id),
            label: student.full_name,
          })),
        },
        {
          param: "status",
          placeholder: "All statuses",
          options: [
            { value: "active", label: "Active" },
            { value: "revoked", label: "Revoked" },
          ],
        },
        { param: "from", placeholder: "From date", type: "date" },
        { param: "to", placeholder: "To date", type: "date" },
      ]}
      columns={[
        {
          header: "Student",
          render: (award) => award.student?.name ?? `#${award.student_id}`,
          footer: () => "Grand total",
        },
        {
          header: "Scholarship",
          render: (award) => award.scholarship?.name ?? "-",
        },
        {
          header: "Duration",
          render: (award) =>
            award.starts_on && award.ends_on
              ? `${formatDate(award.starts_on)} – ${formatDate(award.ends_on)}`
              : formatDate(award.awarded_on),
        },
        {
          header: "Value",
          align: "right",
          render: (award) => formatCurrency(award.awarded_amount ?? null),
          footer: ({ summary }) =>
            formatCurrency(summary?.total_awarded ?? 0),
        },
        {
          header: "Status",
          render: (award) => <Badge value={award.status} />,
        },
      ]}
    />
  );
}
