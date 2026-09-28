"use client";

import { StudentAffairsTabs } from "@/components/StudentAffairsTabs";
import { MasterForm } from "@/components/MasterForm";
import { PermissionGate } from "@/components/PermissionGate";
import { useStudents } from "@/lib/useLookups";

export default function NewCouncilMemberPage() {
  return (
    <PermissionGate permission="student_affairs.create">
      <NewCouncilMemberForm />
    </PermissionGate>
  );
}

function NewCouncilMemberForm() {
  const { items: students } = useStudents();

  return (
    <div className="space-y-6">
      <StudentAffairsTabs active="council" />
      <MasterForm
        title="New council member"
        description="Add a student to the student council."
        endpoint="/v1/student-affairs/council-members"
        redirectTo="/dashboard/student-affairs/council"
        submitLabel="Add member"
        fields={[
          {
            name: "student_id",
            label: "Student",
            type: "select",
            required: true,
            options: students.map((student) => ({
              value: String(student.id),
              label: `${student.full_name} (${student.admission_no})`,
            })),
          },
          { name: "position", label: "Position", required: true },
          { name: "term", label: "Term" },
          { name: "from_date", label: "From", type: "date" },
          { name: "to_date", label: "To", type: "date" },
          {
            name: "is_active",
            label: "Active",
            type: "checkbox",
            span: 2,
          },
        ]}
        initial={{
          student_id: "",
          position: "",
          term: "",
          from_date: "",
          to_date: "",
          is_active: true,
        }}
      />
    </div>
  );
}
