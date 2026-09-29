"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { MasterList } from "@/components/MasterList";
import { Badge } from "@/components/ui";
import { formatNumber } from "@/lib/format";
import type { Lab } from "@/lib/types";

const TYPES = [
  { value: "science", label: "Science" },
  { value: "computer", label: "Computer" },
  { value: "language", label: "Language" },
  { value: "other", label: "Other" },
];

export default function LabsPage() {
  const { can } = useAuth();

  return (
    <MasterList<Lab>
      title="Labs"
      description="Laboratory spaces and their in-charge staff."
      endpoint="/v1/labs"
      searchable={false}
      createHref={can("lab.create") ? "/dashboard/labs/new" : undefined}
      createLabel="New lab"
      editHref={(item) => `/dashboard/labs/${item.id}/edit`}
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
        { header: "Type", render: (item) => item.type ?? "-" },
        { header: "Location", render: (item) => item.location ?? "-" },
        {
          header: "Capacity",
          align: "right",
          render: (item) => formatNumber(item.capacity),
        },
        { header: "In charge", render: (item) => item.incharge?.name ?? "-" },
        {
          header: "Active",
          render: (item) => (
            <Badge value={item.is_active ? "active" : "inactive"} />
          ),
        },
        {
          header: "",
          align: "right",
          render: (item) => (
            <Link
              href={`/dashboard/labs/${item.id}`}
              className="text-sm font-medium text-foreground hover:underline"
            >
              Open
            </Link>
          ),
        },
      ]}
    />
  );
}
