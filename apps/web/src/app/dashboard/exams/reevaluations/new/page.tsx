"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ApiError, apiFetch } from "@/lib/api";
import { useExamPapers, useExams } from "@/lib/useLookups";
import { PermissionGate } from "@/components/PermissionGate";
import { Button, buttonClasses, Field, Select, TextInput } from "@/components/Form";
import {
  Card,
  EmptyState,
  ErrorNotice,
  PageHeader,
  Spinner,
} from "@/components/ui";
import type { ExamPaper, Paginated, Student } from "@/lib/types";

export default function NewReevaluationPage() {
  return (
    <PermissionGate permission="exam.edit">
      <ReevaluationForm />
    </PermissionGate>
  );
}

function ReevaluationForm() {
  const router = useRouter();
  const { items: exams } = useExams();
  const { items: papers, loading } = useExamPapers();

  const [examId, setExamId] = useState("");
  const [paperId, setPaperId] = useState("");
  const [studentId, setStudentId] = useState("");
  const [reason, setReason] = useState("");

  const [students, setStudents] = useState<Student[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedPaper: ExamPaper | undefined = papers.find(
    (paper) => String(paper.id) === paperId
  );

  const filteredPapers = examId
    ? papers.filter((paper) => String(paper.exam_id) === examId)
    : papers;

  const loadStudents = useCallback(() => {
    const controller = new AbortController();

    const run = async () => {
      if (!selectedPaper) {
        setStudents([]);
        return;
      }

      setLoadingStudents(true);
      setError(null);

      try {
        const response = await apiFetch<Paginated<Student>>(
          `/v1/students?class_room_id=${selectedPaper.class_room_id}&per_page=200`,
          { signal: controller.signal }
        );
        setStudents(response.data);
      } catch (err: unknown) {
        if (!(err instanceof DOMException && err.name === "AbortError")) {
          setError(
            err instanceof ApiError ? err.message : "Unable to load students."
          );
        }
      } finally {
        setLoadingStudents(false);
      }
    };

    void run();

    return () => controller.abort();
  }, [selectedPaper]);

  useEffect(() => loadStudents(), [loadStudents]);

  const submit = async () => {
    setBusy(true);
    setError(null);

    try {
      const created = await apiFetch<{ data: { id: number } }>(
        "/v1/exam-reevaluations",
        {
          method: "POST",
          body: {
            exam_paper_id: Number(paperId),
            student_id: Number(studentId),
            ...(reason ? { reason } : {}),
          },
        }
      );
      router.push(`/dashboard/exams/reevaluations/${created.data.id}`);
    } catch (err: unknown) {
      setError(err instanceof ApiError ? err.message : "Unable to save.");
      setBusy(false);
    }
  };

  if (loading) return <Spinner />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="New re-evaluation"
        description="Request a recheck of a student's paper."
        actions={
          <Link
            href="/dashboard/exams/reevaluations"
            className={buttonClasses("secondary")}
          >
            Back
          </Link>
        }
      />

      {error ? <ErrorNotice message={error} /> : null}

      <Card className="p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Exam" htmlFor="re_exam">
            <Select
              id="re_exam"
              value={examId}
              onChange={(event) => {
                setExamId(event.target.value);
                setPaperId("");
                setStudentId("");
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
          <Field label="Paper" htmlFor="re_paper" required>
            <Select
              id="re_paper"
              value={paperId}
              onChange={(event) => {
                setPaperId(event.target.value);
                setStudentId("");
              }}
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
          <Field label="Student" htmlFor="re_student" required className="sm:col-span-2">
            <Select
              id="re_student"
              value={studentId}
              disabled={!selectedPaper || loadingStudents}
              onChange={(event) => setStudentId(event.target.value)}
            >
              <option value="">
                {loadingStudents ? "Loading..." : "Select student"}
              </option>
              {students.map((student) => (
                <option key={student.id} value={student.id}>
                  {student.full_name} ({student.admission_no})
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Reason" htmlFor="re_reason" className="sm:col-span-2">
            <TextInput
              id="re_reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Optional note"
            />
          </Field>
        </div>

        {selectedPaper && !loadingStudents && students.length === 0 ? (
          <div className="mt-4">
            <EmptyState message="No students are enrolled in this paper's class." />
          </div>
        ) : null}

        <div className="mt-6 flex justify-end gap-2">
          <Link
            href="/dashboard/exams/reevaluations"
            className={buttonClasses("secondary")}
          >
            Cancel
          </Link>
          <Button
            type="button"
            loading={busy}
            disabled={!paperId || !studentId}
            onClick={submit}
          >
            Submit request
          </Button>
        </div>
      </Card>
    </div>
  );
}
