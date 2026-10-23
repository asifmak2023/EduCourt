"use client";

import { Suspense, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { useScholarships, useStudents } from "@/lib/useLookups";
import { MasterList } from "@/components/MasterList";
import { Badge, Spinner } from "@/components/ui";
import { formatCurrency, formatDate } from "@/lib/format";
import type { ScholarshipAward } from "@/lib/types";

export default function ScholarshipAwardsPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <ScholarshipAwardsList />
    </Suspense>
  );
}

function ScholarshipAwardsList() {
  const { can } = useAuth();
  const searchParams = useSearchParams();
  const { items: scholarships } = useScholarships();
  const { items: students } = useStudents();
  const scholarshipId = searchParams.get("scholarship_id") ?? "";
  const studentOptions = useMemo(() => {
    const names = new Map<string, string>();

    for (const student of students) {
      const name = student.full_name.trim();
      if (name !== "" && !names.has(name)) {
        names.set(name, name);
      }
    }

    return Array.from(names.values())
      .sort((left, right) => left.localeCompare(right))
      .map((name) => ({ value: name, label: name }));
  }, [students]);

  return (
    <MasterList<ScholarshipAward>
      title="Scholarship awards"
      description="Students holding a scholarship, monthly grant, and amount obtained so far."
      endpoint="/v1/scholarship-awards"
      searchable={false}
      createHref={
        can("scholarship.create")
          ? "/dashboard/scholarships/awards/new"
          : undefined
      }
      createLabel="New award"
      editHref={(award) => `/dashboard/scholarships/awards/${award.id}`}
      defaultFilters={scholarshipId ? { scholarship_id: scholarshipId } : undefined}
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
          param: "search",
          placeholder: "Search student",
          type: "searchable",
          label: "Student",
          options: studentOptions,
        },
        {
          param: "status",
          placeholder: "All statuses",
          options: [
            { value: "active", label: "Active" },
            { value: "revoked", label: "Revoked" },
          ],
        },
        {
          param: "from",
          placeholder: "From",
          type: "date",
          label: "From",
          group: "Grant",
        },
        {
          param: "to",
          placeholder: "To",
          type: "date",
          label: "To",
          group: "Grant",
        },
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
          header: "From",
          render: (award) => formatDate(award.starts_on ?? award.awarded_on),
        },
        {
          header: "To",
          render: (award) => formatDate(award.ends_on),
        },
        {
          header: "Monthly",
          align: "right",
          render: (award) => formatCurrency(award.monthly_amount ?? null),
          footer: ({ summary }) => formatCurrency(summary?.total_monthly ?? 0),
        },
        {
          header: "Obtained",
          align: "right",
          render: (award) => formatCurrency(award.obtained_amount ?? null),
          footer: ({ summary }) => formatCurrency(summary?.total_obtained ?? 0),
        },
        {
          header: "Awarded",
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
