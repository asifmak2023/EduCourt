"use client";

import { useParams } from "next/navigation";
import { StudentAffairsTabs } from "@/components/StudentAffairsTabs";
import { MasterForm } from "@/components/MasterForm";
import { PermissionGate } from "@/components/PermissionGate";
import { useStudents } from "@/lib/useLookups";
import { useResource } from "@/lib/useResource";
import { ErrorNotice, Spinner } from "@/components/ui";
import type { CouncilMember } from "@/lib/types";

export default function EditCouncilMemberPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ? Number(params.id) : undefined;
  const { data, loading, error } = useResource<CouncilMember>(
    id ? `/v1/student-affairs/council-members/${id}` : null
  );
  const { items: students } = useStudents();

  if (loading) return <Spinner />;
  if (error) return <ErrorNotice message={error} />;
  if (!data) return <ErrorNotice message="Council member not found." />;

  return (
    <PermissionGate permission="student_affairs.edit">
      <div className="space-y-6">
        <StudentAffairsTabs active="council" />
        <MasterForm
          title="Edit council member"
          description={data.position}
          endpoint="/v1/student-affairs/council-members"
          recordId={data.id}
          redirectTo="/dashboard/student-affairs/council"
          initial={{
            student_id: String(data.student_id),
            position: data.position,
            term: data.term ?? "",
            from_date: data.from_date ?? "",
            to_date: data.to_date ?? "",
            is_active: data.is_active,
          }}
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
            { name: "is_active", label: "Active", type: "checkbox", span: 2 },
          ]}
        />
      </div>
    </PermissionGate>
  );
}
