"use client";

import { StudentAffairsTabs } from "@/components/StudentAffairsTabs";
import { MasterForm } from "@/components/MasterForm";
import { PermissionGate } from "@/components/PermissionGate";
import { useStudents, useUsers } from "@/lib/useLookups";
import { COMPLAINT_PRIORITY_OPTIONS } from "@/lib/studentAffairsOptions";

export default function NewComplaintPage() {
  return (
    <PermissionGate permission="student_affairs.create">
      <NewComplaintForm />
    </PermissionGate>
  );
}

function NewComplaintForm() {
  const { items: students } = useStudents();
  const { items: users } = useUsers();

  return (
    <div className="space-y-6">
      <StudentAffairsTabs active="complaints" />
      <MasterForm
        title="New complaint"
        description="Log a complaint. A reference number is assigned automatically."
        endpoint="/v1/student-affairs/complaints"
        redirectTo="/dashboard/student-affairs/complaints"
        submitLabel="Create complaint"
        fields={[
          {
            name: "student_id",
            label: "Student",
            type: "select",
            placeholder: "Not student specific",
            options: students.map((student) => ({
              value: String(student.id),
              label: `${student.full_name} (${student.admission_no})`,
            })),
          },
          { name: "against", label: "Against" },
          { name: "category", label: "Category" },
          {
            name: "priority",
            label: "Priority",
            type: "select",
            options: COMPLAINT_PRIORITY_OPTIONS,
          },
          { name: "assigned_to", label: "Assign to", type: "select", placeholder: "Unassigned", options: users.map((user) => ({ value: String(user.id), label: user.name })) },
          { name: "subject", label: "Subject", required: true, span: 2 },
          { name: "description", label: "Description", required: true, span: 2 },
        ]}
        initial={{
          student_id: "",
          against: "",
          category: "",
          priority: "medium",
          assigned_to: "",
          subject: "",
          description: "",
        }}
      />
    </div>
  );
}
