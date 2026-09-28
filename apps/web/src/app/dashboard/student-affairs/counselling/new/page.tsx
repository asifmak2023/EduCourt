"use client";

import { StudentAffairsTabs } from "@/components/StudentAffairsTabs";
import { MasterForm } from "@/components/MasterForm";
import { PermissionGate } from "@/components/PermissionGate";
import { useStudents, useUsers } from "@/lib/useLookups";
import {
  COUNSELLING_STATUS_OPTIONS,
  COUNSELLING_TYPE_OPTIONS,
} from "@/lib/studentAffairsOptions";

export default function NewCounsellingSessionPage() {
  return (
    <PermissionGate permission="counselling.create">
      <NewCounsellingSessionForm />
    </PermissionGate>
  );
}

function NewCounsellingSessionForm() {
  const { items: students } = useStudents();
  const { items: users } = useUsers();

  return (
    <div className="space-y-6">
      <StudentAffairsTabs active="counselling" />
      <MasterForm
        title="New counselling session"
        description="Schedule a counselling session."
        endpoint="/v1/student-affairs/counselling"
        redirectTo="/dashboard/student-affairs/counselling"
        submitLabel="Create session"
        fields={[
          {
            name: "student_id",
            label: "Student",
            type: "select",
            required: true,
            span: 2,
            options: students.map((student) => ({
              value: String(student.id),
              label: `${student.full_name} (${student.admission_no})`,
            })),
          },
          {
            name: "counsellor_user_id",
            label: "Counsellor",
            type: "select",
            placeholder: "Unassigned",
            options: users.map((user) => ({
              value: String(user.id),
              label: user.name,
            })),
          },
          { name: "session_date", label: "Session date", type: "date", required: true },
          {
            name: "type",
            label: "Type",
            type: "select",
            options: COUNSELLING_TYPE_OPTIONS,
          },
          {
            name: "status",
            label: "Status",
            type: "select",
            options: COUNSELLING_STATUS_OPTIONS,
          },
          { name: "follow_up_on", label: "Follow up on", type: "date" },
          { name: "summary", label: "Summary", span: 2 },
          { name: "confidential_notes", label: "Confidential notes", span: 2 },
        ]}
        initial={{
          student_id: "",
          counsellor_user_id: "",
          session_date: "",
          type: "individual",
          status: "scheduled",
          follow_up_on: "",
          summary: "",
          confidential_notes: "",
        }}
      />
    </div>
  );
}
