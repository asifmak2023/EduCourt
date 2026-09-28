"use client";
import { useAuth } from "@/lib/auth";
import { MasterList } from "@/components/MasterList";
import { Badge } from "@/components/ui";
import { formatCurrency, formatNumber } from "@/lib/format";
import type { Scholarship } from "@/lib/types";

const TYPES = [
  { value: "merit", label: "Merit" },
  { value: "need_based", label: "Need based" },
  { value: "sports", label: "Sports" },
  { value: "sibling", label: "Sibling" },
  { value: "staff_ward", label: "Staff ward" },
  { value: "other", label: "Other" },
];

function discountLabel(scholarship: Scholarship) {
  return scholarship.discount_type === "percentage"
    ? `${formatNumber(scholarship.value)}%`
    : formatCurrency(scholarship.value);
}

export default function ScholarshipSchemesPage() {
  const { can } = useAuth();

  return (
    <MasterList<Scholarship>
      title="Scholarships"
      description="Fee concession schemes available to students."
      endpoint="/v1/scholarships"
      searchPlaceholder="Search name, code or sponsor"
      createHref={
        can("scholarship.create")
          ? "/dashboard/scholarships/schemes/new"
          : undefined
      }
      createLabel="New scholarship"
      editHref={(item) => `/dashboard/scholarships/schemes/${item.id}/edit`}
      filters={[
        { param: "type", placeholder: "All types", options: TYPES },
        {
          param: "is_active",
          placeholder: "Active status",
          options: [
            { value: "1", label: "Active" },
            { value: "0", label: "Inactive" },
          ],
        },
      ]}
      columns={[
        { header: "Name", render: (item) => item.name },
        { header: "Code", render: (item) => item.code },
        {
          header: "Type",
          render: (item) => item.type_label ?? item.type ?? "-",
        },
        { header: "Discount", render: (item) => discountLabel(item) },
        { header: "Sponsor", render: (item) => item.sponsor ?? "-" },
        {
          header: "Awards",
          align: "right",
          render: (item) => item.awards_count ?? 0,
        },
        {
          header: "Active",
          render: (item) => (
            <Badge value={item.is_active ? "active" : "inactive"} />
          ),
        },
      ]}
    />
  );
}
