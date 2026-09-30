"use client";

import { useAuth } from "@/lib/auth";
import { useLabs } from "@/lib/useLookups";
import { MasterList } from "@/components/MasterList";
import { Badge } from "@/components/ui";
import type { LabBooking } from "@/lib/types";
import { formatDate } from "@/lib/format";

export default function LabBookingsPage() {
  const { can } = useAuth();
  const { items: labs } = useLabs();

  return (
    <MasterList<LabBooking>
      title="Lab bookings"
      description="Scheduled lab sessions with clash-free slots."
      endpoint="/v1/lab-bookings"
      searchable={false}
      createHref={can("lab.create") ? "/dashboard/labs/bookings/new" : undefined}
      createLabel="New booking"
      editHref={(item) => `/dashboard/labs/bookings/${item.id}`}
      filters={[
        {
          param: "lab_id",
          placeholder: "All labs",
          options: labs.map((lab) => ({
            value: String(lab.id),
            label: lab.name,
          })),
        },
        {
          param: "status",
          placeholder: "All statuses",
          options: [
            { value: "scheduled", label: "Scheduled" },
            { value: "completed", label: "Completed" },
            { value: "cancelled", label: "Cancelled" },
          ],
        },
      ]}
      columns={[
        { header: "Lab", render: (item) => item.lab?.name ?? `#${item.lab_id}` },
        {
          header: "Class",
          render: (item) => item.class_room?.name ?? "-",
        },
        { header: "Teacher", render: (item) => item.teacher?.name ?? "-" },
        { header: "Date", render: (item) => formatDate(item.session_date) },
        {
          header: "Time",
          render: (item) =>
            item.start_time && item.end_time
              ? `${item.start_time} - ${item.end_time}`
              : "-",
        },
        { header: "Purpose", render: (item) => item.purpose ?? "-" },
        {
          header: "Status",
          render: (item) => <Badge value={item.status ?? "unknown"} />,
        },
      ]}
    />
  );
}
