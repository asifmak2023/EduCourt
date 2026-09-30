"use client";

import { useAuth } from "@/lib/auth";
import { useDepartments, useDesignations } from "@/lib/useLookups";
import {
  EMPLOYMENT_TYPE_OPTIONS,
  STAFF_STATUS_OPTIONS,
} from "@/lib/staffOptions";
import { MasterList } from "@/components/MasterList";
import { Badge } from "@/components/ui";
import type { StaffMember } from "@/lib/types";
import { formatDate } from "@/lib/format";

export default function StaffPage() {
  const { can } = useAuth();
  const { items: departments } = useDepartments();
  const { items: designations } = useDesignations();

  return (
    <MasterList<StaffMember>
      title="Staff"
      description="Staff register with employment details."
      endpoint="/v1/staff"
      searchPlaceholder="Search name, employee no, CNIC or phone"
      createHref={can("hr.create") ? "/dashboard/hr/staff/new" : undefined}
      createLabel="New staff"
      editHref={(item) => `/dashboard/hr/staff/${item.id}`}
      filters={[
        {
          param: "department_id",
          placeholder: "All departments",
          options: departments.map((department) => ({
            value: String(department.id),
            label: department.name,
          })),
        },
        {
          param: "designation_id",
          placeholder: "All designations",
          options: designations.map((designation) => ({
            value: String(designation.id),
            label: designation.name,
          })),
        },
        {
          param: "status",
          placeholder: "All statuses",
          options: STAFF_STATUS_OPTIONS,
        },
        {
          param: "employment_type",
          placeholder: "All types",
          options: EMPLOYMENT_TYPE_OPTIONS,
        },
      ]}
      columns={[
        { header: "Employee no", render: (item) => item.employee_no },
        { header: "Name", render: (item) => item.full_name },
        {
          header: "Department",
          render: (item) => item.department?.name ?? "-",
        },
        {
          header: "Designation",
          render: (item) => item.designation?.name ?? "-",
        },
        {
          header: "Employment",
          render: (item) =>
            item.employment_type_label ?? item.employment_type ?? "-",
        },
        { header: "Joining", render: (item) => formatDate(item.joining_date) },
        {
          header: "Status",
          render: (item) => (
            <Badge value={item.status ?? "unknown"} />
          ),
        },
      ]}
    />
  );
}
