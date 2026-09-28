"use client";

import { useParams } from "next/navigation";
import { StudentAffairsTabs } from "@/components/StudentAffairsTabs";
import { MasterForm } from "@/components/MasterForm";
import { PermissionGate } from "@/components/PermissionGate";
import { useStudents } from "@/lib/useLookups";
import { useResource } from "@/lib/useResource";
import { ErrorNotice, Spinner } from "@/components/ui";
import type { AlumniProfile } from "@/lib/types";

export default function EditAlumnusPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ? Number(params.id) : undefined;
  const { data, loading, error } = useResource<AlumniProfile>(
    id ? `/v1/student-affairs/alumni/${id}` : null
  );
  const { items: students } = useStudents();

  if (loading) return <Spinner />;
  if (error) return <ErrorNotice message={error} />;
  if (!data) return <ErrorNotice message="Alumnus not found." />;

  return (
    <PermissionGate permission="student_affairs.edit">
      <div className="space-y-6">
        <StudentAffairsTabs active="alumni" />
        <MasterForm
          title="Edit alumnus"
          description={data.full_name}
          endpoint="/v1/student-affairs/alumni"
          recordId={data.id}
          redirectTo="/dashboard/student-affairs/alumni"
          initial={{
            student_id: data.student_id === null ? "" : String(data.student_id),
            full_name: data.full_name,
            graduation_year: data.graduation_year ?? "",
            city: data.city ?? "",
            current_occupation: data.current_occupation ?? "",
            employer: data.employer ?? "",
            email: data.email ?? "",
            phone: data.phone ?? "",
            notes: data.notes ?? "",
          }}
          fields={[
            {
              name: "student_id",
              label: "Student",
              type: "select",
              placeholder: "Not linked to a student",
              span: 2,
              options: students.map((student) => ({
                value: String(student.id),
                label: `${student.full_name} (${student.admission_no})`,
              })),
            },
            { name: "full_name", label: "Full name", required: true, span: 2 },
            { name: "graduation_year", label: "Graduation year" },
            { name: "city", label: "City" },
            { name: "current_occupation", label: "Occupation" },
            { name: "employer", label: "Employer" },
            { name: "email", label: "Email" },
            { name: "phone", label: "Phone" },
            { name: "notes", label: "Notes", span: 2 },
          ]}
        />
      </div>
    </PermissionGate>
  );
}
