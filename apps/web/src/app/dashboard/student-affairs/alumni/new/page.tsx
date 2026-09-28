"use client";

import { StudentAffairsTabs } from "@/components/StudentAffairsTabs";
import { MasterForm } from "@/components/MasterForm";
import { PermissionGate } from "@/components/PermissionGate";
import { useStudents } from "@/lib/useLookups";

export default function NewAlumnusPage() {
  return (
    <PermissionGate permission="student_affairs.create">
      <NewAlumnusForm />
    </PermissionGate>
  );
}

function NewAlumnusForm() {
  const { items: students } = useStudents();

  return (
    <div className="space-y-6">
      <StudentAffairsTabs active="alumni" />
      <MasterForm
        title="New alumnus"
        description="Add an alumnus to the directory."
        endpoint="/v1/student-affairs/alumni"
        redirectTo="/dashboard/student-affairs/alumni"
        submitLabel="Add alumnus"
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
        initial={{
          student_id: "",
          full_name: "",
          graduation_year: "",
          city: "",
          current_occupation: "",
          employer: "",
          email: "",
          phone: "",
          notes: "",
        }}
      />
    </div>
  );
}
