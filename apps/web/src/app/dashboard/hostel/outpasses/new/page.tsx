"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ApiError, apiFetch } from "@/lib/api";
import { useStudents } from "@/lib/useLookups";
import { PermissionGate } from "@/components/PermissionGate";
import {
  Button,
  buttonClasses,
  Field,
  Select,
  TextInput,
} from "@/components/Form";
import { Card, ErrorNotice, PageHeader } from "@/components/ui";

export default function NewHostelOutpassPage() {
  const router = useRouter();
  const { items: students } = useStudents();

  const [studentId, setStudentId] = useState("");
  const [fromDatetime, setFromDatetime] = useState("");
  const [toDatetime, setToDatetime] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true);
    setError(null);

    try {
      await apiFetch("/v1/hostel-outpasses", {
        method: "POST",
        body: {
          student_id: Number(studentId),
          from_datetime: fromDatetime,
          to_datetime: toDatetime,
          reason,
        },
      });
      router.push("/dashboard/hostel/outpasses");
    } catch (err: unknown) {
      setError(err instanceof ApiError ? err.message : "Unable to submit.");
    } finally {
      setBusy(false);
    }
  };

  const ready =
    studentId !== "" && fromDatetime !== "" && toDatetime !== "" && reason.trim() !== "";

  return (
    <PermissionGate permission="hostel.create">
      <div className="space-y-6">
        <PageHeader
          title="New hostel outpass"
          description="Request permission for a boarder to leave the hostel."
          actions={
            <Link
              href="/dashboard/hostel/outpasses"
              className={buttonClasses("secondary")}
            >
              Cancel
            </Link>
          }
        />

        {error ? <ErrorNotice message={error} /> : null}

        <Card>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void submit();
            }}
          >
            <div className="grid gap-4 px-6 py-5 sm:grid-cols-2">
              <Field label="Student" htmlFor="outpass_student" required>
                <Select
                  id="outpass_student"
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
              <Field label="Reason" htmlFor="outpass_reason" required>
                <TextInput
                  id="outpass_reason"
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                />
              </Field>
              <Field label="From" htmlFor="outpass_from" required>
                <TextInput
                  id="outpass_from"
                  type="datetime-local"
                  value={fromDatetime}
                  onChange={(event) => setFromDatetime(event.target.value)}
                />
              </Field>
              <Field label="To" htmlFor="outpass_to" required>
                <TextInput
                  id="outpass_to"
                  type="datetime-local"
                  value={toDatetime}
                  onChange={(event) => setToDatetime(event.target.value)}
                />
              </Field>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-border-secondary px-6 py-4">
              <Link
                href="/dashboard/hostel/outpasses"
                className={buttonClasses("secondary")}
              >
                Cancel
              </Link>
              <Button type="submit" loading={busy} disabled={!ready}>
                Submit
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </PermissionGate>
  );
}
