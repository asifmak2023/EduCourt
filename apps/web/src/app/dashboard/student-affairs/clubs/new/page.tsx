"use client";

import { StudentAffairsTabs } from "@/components/StudentAffairsTabs";
import { MasterForm } from "@/components/MasterForm";
import { PermissionGate } from "@/components/PermissionGate";
import { useUsers } from "@/lib/useLookups";

export default function NewClubPage() {
  return (
    <PermissionGate permission="student_affairs.create">
      <NewClubForm />
    </PermissionGate>
  );
}

function NewClubForm() {
  const { items: users } = useUsers();

  return (
    <div className="space-y-6">
      <StudentAffairsTabs active="clubs" />
      <MasterForm
        title="New club"
        description="Register a student club or society."
        endpoint="/v1/student-affairs/clubs"
        redirectTo="/dashboard/student-affairs/clubs"
        submitLabel="Create club"
        fields={[
          { name: "name", label: "Name", required: true, span: 2 },
          { name: "code", label: "Code", required: true },
          { name: "category", label: "Category" },
          {
            name: "patron_user_id",
            label: "Patron",
            type: "select",
            placeholder: "No patron",
            options: users.map((user) => ({
              value: String(user.id),
              label: user.name,
            })),
          },
          { name: "description", label: "Description", span: 2 },
          {
            name: "is_active",
            label: "Active",
            type: "checkbox",
            span: 2,
          },
        ]}
        initial={{
          name: "",
          code: "",
          category: "",
          patron_user_id: "",
          description: "",
          is_active: true,
        }}
      />
    </div>
  );
}
