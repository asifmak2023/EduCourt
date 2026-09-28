"use client";

import { MasterList } from "@/components/MasterList";
import { Badge } from "@/components/ui";
import { formatDate, formatNumber } from "@/lib/format";
import type { LeaveRequest } from "@/lib/types";

const LEAVE_TYPES = [
  { value: "sick", label: "Sick" },
  { value: "casual", label: "Casual" },
  { value: "annual", label: "Annual" },
  { value: "maternity", label: "Maternity" },
  { value: "unpaid", label: "Unpaid" },
  { value: "other", label: "Other" },
];

const STATUSES = [
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "cancelled", label: "Cancelled" },
];

export default function LeaveRequestsPage() {
  return (
    <MasterList<LeaveRequest>
      title="Leave requests"
      description="Staff leave applications and their decisions."
      endpoint="/v1/leave-requests"
      searchable={false}
      createHref="/dashboard/attendance/leave/new"
      createPermission="attendance.create"
      createLabel="New request"
      editHref={(item) => `/dashboard/attendance/leave/${item.id}`}
      filters={[
        { param: "status", placeholder: "All statuses", options: STATUSES },
        { param: "leave_type", placeholder: "All types", options: LEAVE_TYPES },
      ]}
      columns={[
        {
          header: "Employee",
          render: (item) => item.user?.name ?? `#${item.user_id}`,
        },
        {
          header: "Type",
          render: (item) => item.leave_type_label ?? "-",
        },
        {
          header: "From",
          render: (item) => formatDate(item.from_date),
        },
        {
          header: "To",
          render: (item) => formatDate(item.to_date),
        },
        {
          header: "Days",
          align: "right",
          render: (item) =>
            item.days === null ? "-" : formatNumber(item.days),
        },
        {
          header: "Status",
          render: (item) => <Badge value={item.status} />,
        },
      ]}
    />
  );
}
