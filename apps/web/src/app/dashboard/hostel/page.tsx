"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { MasterList } from "@/components/MasterList";
import { Badge } from "@/components/ui";
import { formatNumber } from "@/lib/format";
import type { Hostel } from "@/lib/types";

const TABS = [
  { href: "/dashboard/hostel", label: "Hostels" },
  { href: "/dashboard/hostel/allocations", label: "Allocations" },
  { href: "/dashboard/hostel/outpasses", label: "Outpasses" },
  { href: "/dashboard/hostel/report", label: "Report" },
];

export default function HostelsPage() {
  const { can } = useAuth();

  return (
    <div className="space-y-6">
      <nav className="flex flex-wrap gap-2">
        {TABS.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            className={
              tab.href === "/dashboard/hostel"
                ? "rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-medium text-white"
                : "rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:border-slate-400"
            }
          >
            {tab.label}
          </Link>
        ))}
      </nav>

      <MasterList<Hostel>
      title="Hostels"
      description="Boarding houses, rooms and occupancy."
      endpoint="/v1/hostels"
      searchPlaceholder="Search hostel"
      createHref={can("hostel.create") ? "/dashboard/hostel/new" : undefined}
      createLabel="New hostel"
      editHref={(item) => `/dashboard/hostel/${item.id}`}
      filters={[
        {
          param: "type",
          placeholder: "Type",
          options: [
            { value: "boys", label: "Boys" },
            { value: "girls", label: "Girls" },
            { value: "mixed", label: "Mixed" },
          ],
        },
        {
          param: "is_active",
          placeholder: "Status",
          options: [
            { value: "1", label: "Active" },
            { value: "0", label: "Inactive" },
          ],
        },
      ]}
      columns={[
        { header: "Hostel", render: (item) => item.name },
        { header: "Code", render: (item) => item.code },
        { header: "Type", render: (item) => item.type ?? "-" },
        { header: "Warden", render: (item) => item.warden_name ?? "-" },
        {
          header: "Rooms",
          align: "right",
          render: (item) => formatNumber(item.rooms_count ?? 0),
        },
        {
          header: "Capacity",
          align: "right",
          render: (item) => formatNumber(item.capacity),
        },
        {
          header: "Status",
          render: (item) => (
            <Badge value={item.is_active ? "active" : "inactive"} />
          ),
        },
      ]}
      />
    </div>
  );
}
