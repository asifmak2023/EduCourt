"use client";

import { useParams } from "next/navigation";
import { StudentAffairsTabs } from "@/components/StudentAffairsTabs";
import { MasterForm } from "@/components/MasterForm";
import { PermissionGate } from "@/components/PermissionGate";
import { useStudents, useUsers } from "@/lib/useLookups";
import { useResource } from "@/lib/useResource";
import { ErrorNotice, Spinner } from "@/components/ui";
import { COMPLAINT_PRIORITY_OPTIONS } from "@/lib/studentAffairsOptions";
import type { Complaint } from "@/lib/types";

export default function EditComplaintPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ? Number(params.id) : undefined;
  const { data, loading, error } = useResource<Complaint>(
    id ? `/v1/student-affairs/complaints/${id}` : null
  );
  const { items: students } = useStudents();
  const { items: users } = useUsers();

  if (loading) return <Spinner />;
  if (error) return <ErrorNotice message={error} />;
  if (!data) return <ErrorNotice message="Complaint not found." />;

  return (
    <PermissionGate permission="student_affairs.edit">
      <div className="space-y-6">
        <StudentAffairsTabs active="complaints" />
        <MasterForm
          title="Edit complaint"
          description={data.reference_no ?? data.subject}
          endpoint="/v1/student-affairs/complaints"
          recordId={data.id}
          redirectTo={`/dashboard/student-affairs/complaints/${data.id}`}
          initial={{
            student_id: data.student_id === null ? "" : String(data.student_id),
            against: data.against ?? "",
            category: data.category ?? "",
            priority: data.priority ?? "medium",
            assigned_to:
              data.assigned_to === null ? "" : String(data.assigned_to),
            subject: data.subject,
            description: data.description,
          }}
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
            {
              name: "assigned_to",
              label: "Assign to",
              type: "select",
              placeholder: "Unassigned",
              options: users.map((user) => ({
                value: String(user.id),
                label: user.name,
              })),
            },
            { name: "subject", label: "Subject", required: true, span: 2 },
            { name: "description", label: "Description", required: true, span: 2 },
          ]}
        />
      </div>
    </PermissionGate>
  );
}
