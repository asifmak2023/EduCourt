"use client";

import { MasterForm } from "@/components/MasterForm";
import { PermissionGate } from "@/components/PermissionGate";
import { useDepartments, useDesignations, useUsers } from "@/lib/useLookups";
import {
  EMPLOYMENT_TYPE_OPTIONS,
  GENDER_OPTIONS,
  STAFF_STATUS_OPTIONS,
} from "@/lib/staffOptions";
import { Spinner } from "@/components/ui";

export default function NewStaffPage() {
  const { items: users, loading: loadingUsers } = useUsers();
  const { items: departments, loading: loadingDepartments } = useDepartments();
  const { items: designations, loading: loadingDesignations } =
    useDesignations();

  if (loadingUsers || loadingDepartments || loadingDesignations) {
    return <Spinner />;
  }

  return (
    <PermissionGate permission="hr.create">
      <MasterForm
        title="New staff member"
        description="Add a member to the staff register."
        endpoint="/v1/staff"
        redirectTo="/dashboard/hr/staff"
        initial={{
          employment_type: "permanent",
          status: "active",
          gender: "male",
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
          {
            name: "employee_no",
            label: "Employee no",
            type: "text",
            hint: "Auto-generated when left blank.",
          },
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
          { name: "emergency_contact_name", label: "Emergency contact", type: "text" },
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
