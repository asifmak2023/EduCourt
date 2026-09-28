"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ApiError, apiFetch } from "@/lib/api";
import {
  useClassRooms,
  useStudents,
  useSubjects,
  useTerms,
} from "@/lib/useLookups";
import { PermissionGate } from "@/components/PermissionGate";
import {
  Button,
  Field,
  Select,
  TextArea,
  TextInput,
  buttonClasses,
} from "@/components/Form";
import { Card, ErrorNotice, PageHeader, Spinner } from "@/components/ui";

export default function NewRegistrationPage() {
  return (
    <PermissionGate permission="credit.create">
      <RegistrationForm />
    </PermissionGate>
  );
}

function RegistrationForm() {
  const router = useRouter();
  const { items: students, loading } = useStudents();
  const { items: terms } = useTerms();
  const { items: subjects } = useSubjects();
  const { items: classRooms } = useClassRooms();

  const [studentId, setStudentId] = useState("");
  const [termId, setTermId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [classRoomId, setClassRoomId] = useState("");
  const [creditHours, setCreditHours] = useState("");
  const [remarks, setRemarks] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true);
    setError(null);

    try {
      const created = await apiFetch<{ data: { id: number } }>(
        "/v1/course-registrations",
        {
          method: "POST",
          body: {
            student_id: Number(studentId),
            term_id: Number(termId),
            subject_id: Number(subjectId),
            ...(classRoomId ? { class_room_id: Number(classRoomId) } : {}),
            ...(creditHours !== "" ? { credit_hours: Number(creditHours) } : {}),
            ...(remarks ? { remarks } : {}),
          },
        }
      );
      router.push(`/dashboard/credits/registrations/${created.data.id}`);
    } catch (err: unknown) {
      setError(err instanceof ApiError ? err.message : "Unable to register.");
      setBusy(false);
    }
  };

  if (loading) return <Spinner />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="New course registration"
        description="Enrol a student in a subject for a term."
        actions={
          <Link
            href="/dashboard/credits/registrations"
            className={buttonClasses("secondary")}
          >
            Back
          </Link>
        }
      />

      {error ? <ErrorNotice message={error} /> : null}

      <Card className="p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Student" htmlFor="reg_student" required>
            <Select
              id="reg_student"
              value={studentId}
              onChange={(event) => setStudentId(event.target.value)}
            >
              <option value="">Select student</option>
              {students.map((student) => (
                <option key={student.id} value={student.id}>
                  {student.full_name} ({student.admission_no})
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Term" htmlFor="reg_term" required>
            <Select
              id="reg_term"
              value={termId}
              onChange={(event) => setTermId(event.target.value)}
            >
              <option value="">Select term</option>
              {terms.map((term) => (
                <option key={term.id} value={term.id}>
                  {term.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Subject" htmlFor="reg_subject" required>
            <Select
              id="reg_subject"
              value={subjectId}
              onChange={(event) => {
                setSubjectId(event.target.value);
                const subject = subjects.find(
                  (item) => String(item.id) === event.target.value
                );
                setCreditHours(subject?.credit_hours ?? "");
              }}
            >
              <option value="">Select subject</option>
              {subjects.map((subject) => (
                <option key={subject.id} value={subject.id}>
                  {subject.name}
                  {subject.code ? ` (${subject.code})` : ""}
                </option>
              ))}
            </Select>
          </Field>
          <Field
            label="Credit hours"
            htmlFor="reg_credits"
            hint="Defaults to the subject's credit hours."
          >
            <TextInput
              id="reg_credits"
              type="number"
              min="0"
              max="30"
              step="0.5"
              value={creditHours}
              onChange={(event) => setCreditHours(event.target.value)}
            />
          </Field>
          <Field label="Class" htmlFor="reg_class">
            <Select
              id="reg_class"
              value={classRoomId}
              onChange={(event) => setClassRoomId(event.target.value)}
            >
              <option value="">Optional</option>
              {classRooms.map((room) => (
                <option key={room.id} value={room.id}>
                  {room.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Remarks" htmlFor="reg_remarks" className="sm:col-span-2">
            <TextArea
              id="reg_remarks"
              rows={2}
              value={remarks}
              onChange={(event) => setRemarks(event.target.value)}
            />
          </Field>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <Link
            href="/dashboard/credits/registrations"
            className={buttonClasses("secondary")}
          >
            Cancel
          </Link>
          <Button
            type="button"
            loading={busy}
            disabled={!studentId || !termId || !subjectId}
            onClick={submit}
          >
            Register
          </Button>
        </div>
      </Card>
    </div>
  );
}
