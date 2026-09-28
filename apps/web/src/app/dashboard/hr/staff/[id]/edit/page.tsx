"use client";

import { useParams } from "next/navigation";
import { MasterForm } from "@/components/MasterForm";
import { PermissionGate } from "@/components/PermissionGate";
import { useResource } from "@/lib/useResource";
import { useDepartments, useDesignations, useUsers } from "@/lib/useLookups";
import {
  EMPLOYMENT_TYPE_OPTIONS,
  GENDER_OPTIONS,
  STAFF_STATUS_OPTIONS,
} from "@/lib/staffOptions";
import { ErrorNotice, Spinner } from "@/components/ui";
import type { StaffMember } from "@/lib/types";

export default function EditStaffPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ? Number(params.id) : undefined;

  const { data, loading, error } = useResource<StaffMember>(
    id ? `/v1/staff/${id}` : null
  );
  const { items: users, loading: loadingUsers } = useUsers();
  const { items: departments, loading: loadingDepartments } = useDepartments();
  const { items: designations, loading: loadingDesignations } =
    useDesignations();

  if (loading || loadingUsers || loadingDepartments || loadingDesignations) {
    return <Spinner />;
  }
  if (error) return <ErrorNotice message={error} />;
  if (!data) return <ErrorNotice message="Staff member not found." />;

  return (
    <PermissionGate permission="hr.edit">
      <MasterForm
        title="Edit staff member"
        description={data.full_name}
        endpoint="/v1/staff"
        recordId={data.id}
        redirectTo={`/dashboard/hr/staff/${data.id}`}
        initial={{
          first_name: data.first_name,
          last_name: data.last_name ?? "",
          user_id: data.user_id === null ? "" : String(data.user_id),
          employee_no: data.employee_no,
          department_id:
            data.department?.id === undefined ? "" : String(data.department.id),
          designation_id:
            data.designation?.id === undefined
              ? ""
              : String(data.designation.id),
          employment_type: data.employment_type ?? "permanent",
          status: data.status ?? "active",
          joining_date: data.joining_date ?? "",
          date_of_birth: data.date_of_birth ?? "",
          gender: data.gender ?? "male",
          cnic: data.cnic ?? "",
          phone: data.phone ?? "",
          email: data.email ?? "",
          bank_name: data.bank_name ?? "",
          bank_account_no: data.bank_account_no ?? "",
          tax_number: data.tax_number ?? "",
          emergency_contact_name: data.emergency_contact_name ?? "",
          emergency_contact_phone: data.emergency_contact_phone ?? "",
          address: data.address ?? "",
          notes: data.notes ?? "",
        }}
        fields={[
          {
            name: "first_name",
            label: "First name",
            type: "text",
            required: true,
          },
          { name: "last_name", label: "Last name", type: "text" },
          {
            name: "user_id",
            label: "Linked user account",
            type: "select",
            placeholder: "Optional",
            options: users.map((user) => ({
              value: String(user.id),
              label: user.name,
            })),
          },
          { name: "employee_no", label: "Employee no", type: "text" },
          {
            name: "department_id",
            label: "Department",
            type: "select",
            placeholder: "Optional",
            options: departments.map((department) => ({
              value: String(department.id),
              label: department.name,
            })),
          },
          {
            name: "designation_id",
            label: "Designation",
            type: "select",
            placeholder: "Optional",
            options: designations.map((designation) => ({
              value: String(designation.id),
              label: designation.name,
            })),
          },
          {
            name: "employment_type",
            label: "Employment type",
            type: "select",
            options: EMPLOYMENT_TYPE_OPTIONS,
          },
          { name: "status", label: "Status", type: "select", options: STAFF_STATUS_OPTIONS },
          {
            name: "joining_date",
            label: "Joining date",
            type: "date",
            required: true,
          },
          { name: "date_of_birth", label: "Date of birth", type: "date" },
          { name: "gender", label: "Gender", type: "select", options: GENDER_OPTIONS },
          { name: "cnic", label: "CNIC", type: "text" },
          { name: "phone", label: "Phone", type: "text" },
          { name: "email", label: "Email", type: "text" },
          { name: "bank_name", label: "Bank name", type: "text" },
          { name: "bank_account_no", label: "Bank account no", type: "text" },
          { name: "tax_number", label: "Tax number", type: "text" },
          {
            name: "emergency_contact_name",
            label: "Emergency contact",
            type: "text",
          },
          {
            name: "emergency_contact_phone",
            label: "Emergency phone",
            type: "text",
          },
          { name: "address", label: "Address", type: "text", span: 2 },
          { name: "notes", label: "Notes", type: "text", span: 2 },
        ]}
      />
    </PermissionGate>
  );
}
