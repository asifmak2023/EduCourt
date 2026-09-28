"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ApiError, apiFetch } from "@/lib/api";
import { useAcademicYears, useScholarships, useStudents } from "@/lib/useLookups";
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

export default function NewScholarshipAwardPage() {
  return (
    <PermissionGate permission="scholarship.create">
      <AwardForm />
    </PermissionGate>
  );
}

function AwardForm() {
  const router = useRouter();
  const { items: scholarships, loading } = useScholarships();
  const { items: students } = useStudents();
  const { items: years } = useAcademicYears();

  const [scholarshipId, setScholarshipId] = useState("");
  const [studentId, setStudentId] = useState("");
  const [academicYearId, setAcademicYearId] = useState("");
  const [awardedOn, setAwardedOn] = useState("");
  const [valueOverride, setValueOverride] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true);
    setError(null);

    try {
      const created = await apiFetch<{ data: { id: number } }>(
        "/v1/scholarship-awards",
        {
          method: "POST",
          body: {
            scholarship_id: Number(scholarshipId),
            student_id: Number(studentId),
            ...(academicYearId
              ? { academic_year_id: Number(academicYearId) }
              : {}),
            ...(awardedOn ? { awarded_on: awardedOn } : {}),
            ...(valueOverride !== ""
              ? { value_override: Number(valueOverride) }
              : {}),
            ...(notes ? { notes } : {}),
          },
        }
      );
      router.push(`/dashboard/scholarships/awards/${created.data.id}`);
    } catch (err: unknown) {
      setError(err instanceof ApiError ? err.message : "Unable to award.");
      setBusy(false);
    }
  };

  if (loading) return <Spinner />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="New scholarship award"
        description="Assign a scholarship to a student."
        actions={
          <Link
            href="/dashboard/scholarships/awards"
            className={buttonClasses("secondary")}
          >
            Back
          </Link>
        }
      />

      {error ? <ErrorNotice message={error} /> : null}

      <Card className="p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Scholarship" htmlFor="award_scheme" required>
            <Select
              id="award_scheme"
              value={scholarshipId}
              onChange={(event) => setScholarshipId(event.target.value)}
            >
              <option value="">Select scholarship</option>
              {scholarships.map((scholarship) => (
                <option key={scholarship.id} value={scholarship.id}>
                  {scholarship.name} ({scholarship.code})
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Student" htmlFor="award_student" required>
            <Select
              id="award_student"
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
          <Field label="Academic year" htmlFor="award_year">
            <Select
              id="award_year"
              value={academicYearId}
              onChange={(event) => setAcademicYearId(event.target.value)}
            >
              <option value="">Optional</option>
              {years.map((year) => (
                <option key={year.id} value={year.id}>
                  {year.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Awarded on" htmlFor="award_date">
            <TextInput
              id="award_date"
              type="date"
              value={awardedOn}
              onChange={(event) => setAwardedOn(event.target.value)}
            />
          </Field>
          <Field
            label="Value override"
            htmlFor="award_value"
            hint="Leave blank to use the scholarship value."
          >
            <TextInput
              id="award_value"
              type="number"
              min="0"
              step="0.01"
              value={valueOverride}
              onChange={(event) => setValueOverride(event.target.value)}
            />
          </Field>
          <Field label="Notes" htmlFor="award_notes" className="sm:col-span-2">
            <TextArea
              id="award_notes"
              rows={3}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
            />
          </Field>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <Link
            href="/dashboard/scholarships/awards"
            className={buttonClasses("secondary")}
          >
            Cancel
          </Link>
          <Button
            type="button"
            loading={busy}
            disabled={!scholarshipId || !studentId}
            onClick={submit}
          >
            Award
          </Button>
        </div>
      </Card>
    </div>
  );
}
