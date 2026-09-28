"use client";

import { useParams } from "next/navigation";
import { StudentAffairsTabs } from "@/components/StudentAffairsTabs";
import { MasterForm } from "@/components/MasterForm";
import { PermissionGate } from "@/components/PermissionGate";
import { useStudents } from "@/lib/useLookups";
import { useResource } from "@/lib/useResource";
import { ErrorNotice, Spinner } from "@/components/ui";
import { CERTIFICATE_STATUS_OPTIONS } from "@/lib/studentAffairsOptions";
import type { StudentCertificate } from "@/lib/types";

export default function EditCertificatePage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ? Number(params.id) : undefined;
  const { data, loading, error } = useResource<StudentCertificate>(
    id ? `/v1/student-affairs/certificates/${id}` : null
  );
  const { items: students } = useStudents();

  if (loading) return <Spinner />;
  if (error) return <ErrorNotice message={error} />;
  if (!data) return <ErrorNotice message="Certificate not found." />;

  return (
    <PermissionGate permission="student_affairs.edit">
      <div className="space-y-6">
        <StudentAffairsTabs active="certificates" />
        <MasterForm
          title="Edit certificate"
          description={data.title}
          endpoint="/v1/student-affairs/certificates"
          recordId={data.id}
          redirectTo={`/dashboard/student-affairs/certificates/${data.id}`}
          initial={{
            student_id: String(data.student_id),
            type: data.type,
            title: data.title,
            status: data.status ?? "pending",
            serial_no: data.serial_no ?? "",
            issued_on: data.issued_on ?? "",
            remarks: data.remarks ?? "",
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
            { name: "type", label: "Type", required: true },
            { name: "title", label: "Title", required: true },
            {
              name: "status",
              label: "Status",
              type: "select",
              options: CERTIFICATE_STATUS_OPTIONS,
            },
            { name: "serial_no", label: "Serial number" },
            { name: "issued_on", label: "Issued on", type: "date" },
            { name: "remarks", label: "Remarks", span: 2 },
          ]}
        />
      </div>
    </PermissionGate>
  );
}
