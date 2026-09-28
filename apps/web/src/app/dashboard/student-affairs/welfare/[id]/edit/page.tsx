"use client";

import { useParams } from "next/navigation";
import { StudentAffairsTabs } from "@/components/StudentAffairsTabs";
import { MasterForm } from "@/components/MasterForm";
import { PermissionGate } from "@/components/PermissionGate";
import { useStudents } from "@/lib/useLookups";
import { useResource } from "@/lib/useResource";
import { ErrorNotice, Spinner } from "@/components/ui";
import {
  WELFARE_STATUS_OPTIONS,
  WELFARE_TYPE_OPTIONS,
} from "@/lib/studentAffairsOptions";
import type { WelfareRecord } from "@/lib/types";

export default function EditWelfareRecordPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ? Number(params.id) : undefined;
  const { data, loading, error } = useResource<WelfareRecord>(
    id ? `/v1/student-affairs/welfare-records/${id}` : null
  );
  const { items: students } = useStudents();

  if (loading) return <Spinner />;
  if (error) return <ErrorNotice message={error} />;
  if (!data) return <ErrorNotice message="Welfare record not found." />;

  return (
    <PermissionGate permission="student_affairs.edit">
      <div className="space-y-6">
        <StudentAffairsTabs active="welfare" />
        <MasterForm
          title="Edit welfare record"
          description={data.title}
          endpoint="/v1/student-affairs/welfare-records"
          recordId={data.id}
          redirectTo="/dashboard/student-affairs/welfare"
          initial={{
            student_id: String(data.student_id),
            type: data.type ?? "welfare",
            status: data.status ?? "open",
            title: data.title,
            recorded_on: data.recorded_on ?? "",
            description: data.description ?? "",
            follow_up: data.follow_up ?? "",
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
              name: "type",
              label: "Type",
              type: "select",
              required: true,
              options: WELFARE_TYPE_OPTIONS,
            },
            {
              name: "status",
              label: "Status",
              type: "select",
              options: WELFARE_STATUS_OPTIONS,
            },
            { name: "title", label: "Title", required: true },
            {
              name: "recorded_on",
              label: "Recorded on",
              type: "date",
              required: true,
            },
            { name: "description", label: "Description", span: 2 },
            { name: "follow_up", label: "Follow up", span: 2 },
          ]}
        />
      </div>
    </PermissionGate>
  );
}
