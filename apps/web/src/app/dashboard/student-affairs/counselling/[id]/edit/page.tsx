"use client";

import { useParams } from "next/navigation";
import { StudentAffairsTabs } from "@/components/StudentAffairsTabs";
import { MasterForm } from "@/components/MasterForm";
import { PermissionGate } from "@/components/PermissionGate";
import { useStudents, useUsers } from "@/lib/useLookups";
import { useResource } from "@/lib/useResource";
import { ErrorNotice, Spinner } from "@/components/ui";
import {
  COUNSELLING_STATUS_OPTIONS,
  COUNSELLING_TYPE_OPTIONS,
} from "@/lib/studentAffairsOptions";
import type { CounsellingSession } from "@/lib/types";

export default function EditCounsellingSessionPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ? Number(params.id) : undefined;
  const { data, loading, error } = useResource<CounsellingSession>(
    id ? `/v1/student-affairs/counselling/${id}` : null
  );
  const { items: students } = useStudents();
  const { items: users } = useUsers();

  if (loading) return <Spinner />;
  if (error) return <ErrorNotice message={error} />;
  if (!data) return <ErrorNotice message="Counselling session not found." />;

  return (
    <PermissionGate permission="counselling.edit">
      <div className="space-y-6">
        <StudentAffairsTabs active="counselling" />
        <MasterForm
          title="Edit counselling session"
          description={data.student?.full_name ?? undefined}
          endpoint="/v1/student-affairs/counselling"
          recordId={data.id}
          redirectTo="/dashboard/student-affairs/counselling"
          initial={{
            student_id: String(data.student_id),
            counsellor_user_id:
              data.counsellor_user_id === null
                ? ""
                : String(data.counsellor_user_id),
            session_date: data.session_date ?? "",
            type: data.type ?? "individual",
            status: data.status ?? "scheduled",
            follow_up_on: data.follow_up_on ?? "",
            summary: data.summary ?? "",
            confidential_notes: data.confidential_notes ?? "",
          }}
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
            {
              name: "session_date",
              label: "Session date",
              type: "date",
              required: true,
            },
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
        />
      </div>
    </PermissionGate>
  );
}
