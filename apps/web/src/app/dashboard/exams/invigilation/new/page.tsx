"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ApiError, apiFetch } from "@/lib/api";
import { useExamPapers, useUsers } from "@/lib/useLookups";
import { PermissionGate } from "@/components/PermissionGate";
import {
  Button,
  Field,
  Select,
  TextArea,
  buttonClasses,
} from "@/components/Form";
import { Card, ErrorNotice, PageHeader, Spinner } from "@/components/ui";

const ROLES = [
  { value: "chief", label: "Chief invigilator" },
  { value: "assistant", label: "Assistant invigilator" },
];

export default function NewInvigilationPage() {
  return (
    <PermissionGate permission="exam.edit">
      <InvigilationForm />
    </PermissionGate>
  );
}

function InvigilationForm() {
  const router = useRouter();
  const { items: papers, loading } = useExamPapers();
  const { items: users } = useUsers();

  const [paperId, setPaperId] = useState("");
  const [userId, setUserId] = useState("");
  const [role, setRole] = useState("assistant");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true);
    setError(null);

    try {
      await apiFetch("/v1/invigilation-duties", {
        method: "POST",
        body: {
          exam_paper_id: Number(paperId),
          user_id: Number(userId),
          role,
          ...(notes ? { notes } : {}),
        },
      });
      router.push("/dashboard/exams/invigilation");
    } catch (err: unknown) {
      setError(err instanceof ApiError ? err.message : "Unable to assign.");
      setBusy(false);
    }
  };

  if (loading) return <Spinner />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Assign invigilator"
        description="Add a staff member to supervise an exam paper."
        actions={
          <Link
            href="/dashboard/exams/invigilation"
            className={buttonClasses("secondary")}
          >
            Back
          </Link>
        }
      />

      {error ? <ErrorNotice message={error} /> : null}

      <Card className="p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Paper" htmlFor="inv_paper" required className="sm:col-span-2">
            <Select
              id="inv_paper"
              value={paperId}
              onChange={(event) => setPaperId(event.target.value)}
            >
              <option value="">Select paper</option>
              {papers.map((paper) => (
                <option key={paper.id} value={paper.id}>
                  {paper.class_room?.name ?? `Class ${paper.class_room_id}`} -{" "}
                  {paper.subject?.name ?? `Subject ${paper.subject_id}`} (
                  {paper.exam_date ?? "unscheduled"})
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Staff" htmlFor="inv_user" required>
            <Select
              id="inv_user"
              value={userId}
              onChange={(event) => setUserId(event.target.value)}
            >
              <option value="">Select staff</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Role" htmlFor="inv_role" required>
            <Select
              id="inv_role"
              value={role}
              onChange={(event) => setRole(event.target.value)}
            >
              {ROLES.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Notes" htmlFor="inv_notes" className="sm:col-span-2">
            <TextArea
              id="inv_notes"
              rows={3}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Optional instructions or room details"
            />
          </Field>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <Link
            href="/dashboard/exams/invigilation"
            className={buttonClasses("secondary")}
          >
            Cancel
          </Link>
          <Button
            type="button"
            loading={busy}
            disabled={!paperId || !userId}
            onClick={submit}
          >
            Assign
          </Button>
        </div>
      </Card>
    </div>
  );
}
