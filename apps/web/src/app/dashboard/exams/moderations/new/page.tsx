"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ApiError, apiFetch } from "@/lib/api";
import { useExamPapers, useExams } from "@/lib/useLookups";
import { PermissionGate } from "@/components/PermissionGate";
import { Button, buttonClasses, Field, Select, TextInput } from "@/components/Form";
import { Card, ErrorNotice, PageHeader, Spinner } from "@/components/ui";

const TYPES = [
  { value: "grace_marks", label: "Grace marks (add points)" },
  { value: "scaling", label: "Scaling (percentage uplift)" },
];

export default function NewModerationPage() {
  return (
    <PermissionGate permission="exam.edit">
      <ModerationForm />
    </PermissionGate>
  );
}

function ModerationForm() {
  const router = useRouter();
  const { items: exams } = useExams();
  const { items: papers, loading } = useExamPapers();

  const [examId, setExamId] = useState("");
  const [paperId, setPaperId] = useState("");
  const [type, setType] = useState("grace_marks");
  const [value, setValue] = useState("");
  const [reason, setReason] = useState("");

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filteredPapers = examId
    ? papers.filter((paper) => String(paper.exam_id) === examId)
    : papers;

  const submit = async () => {
    setBusy(true);
    setError(null);

    try {
      const created = await apiFetch<{ data: { id: number } }>(
        "/v1/exam-moderations",
        {
          method: "POST",
          body: {
            exam_paper_id: Number(paperId),
            type,
            value: Number(value),
            ...(reason ? { reason } : {}),
          },
        }
      );
      router.push(`/dashboard/exams/moderations/${created.data.id}`);
    } catch (err: unknown) {
      setError(err instanceof ApiError ? err.message : "Unable to save.");
      setBusy(false);
    }
  };

  if (loading) return <Spinner />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="New moderation"
        description="Apply grace marks or scaling to a paper's captured marks."
        actions={
          <Link
            href="/dashboard/exams/moderations"
            className={buttonClasses("secondary")}
          >
            Back
          </Link>
        }
      />

      {error ? <ErrorNotice message={error} /> : null}

      <Card className="p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Exam" htmlFor="mod_exam">
            <Select
              id="mod_exam"
              value={examId}
              onChange={(event) => {
                setExamId(event.target.value);
                setPaperId("");
              }}
            >
              <option value="">All exams</option>
              {exams.map((exam) => (
                <option key={exam.id} value={exam.id}>
                  {exam.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Paper" htmlFor="mod_paper" required>
            <Select
              id="mod_paper"
              value={paperId}
              onChange={(event) => setPaperId(event.target.value)}
            >
              <option value="">Select paper</option>
              {filteredPapers.map((paper) => (
                <option key={paper.id} value={paper.id}>
                  {paper.class_room?.name ?? `Class ${paper.class_room_id}`} -{" "}
                  {paper.subject?.name ?? `Subject ${paper.subject_id}`}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Type" htmlFor="mod_type" required>
            <Select
              id="mod_type"
              value={type}
              onChange={(event) => setType(event.target.value)}
            >
              {TYPES.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field
            label="Value"
            htmlFor="mod_value"
            required
            hint={
              type === "grace_marks"
                ? "Marks added to each student."
                : "Percentage uplift applied to each mark."
            }
          >
            <TextInput
              id="mod_value"
              type="number"
              step="0.01"
              min="0"
              value={value}
              onChange={(event) => setValue(event.target.value)}
            />
          </Field>
          <Field
            label="Reason"
            htmlFor="mod_reason"
            className="sm:col-span-2"
          >
            <TextInput
              id="mod_reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Optional note for the approver"
            />
          </Field>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <Link
            href="/dashboard/exams/moderations"
            className={buttonClasses("secondary")}
          >
            Cancel
          </Link>
          <Button
            type="button"
            loading={busy}
            disabled={!paperId || value === ""}
            onClick={submit}
          >
            Create moderation
          </Button>
        </div>
      </Card>
    </div>
  );
}
