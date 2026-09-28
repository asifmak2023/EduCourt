"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ApiError, apiFetch } from "@/lib/api";
import { useExamPapers, useExams } from "@/lib/useLookups";
import { PermissionGate } from "@/components/PermissionGate";
import { Button, Checkbox, Field, Select, TextInput, buttonClasses } from "@/components/Form";
import {
  Card,
  EmptyState,
  ErrorNotice,
  PageHeader,
  Spinner,
  SuccessNotice,
} from "@/components/ui";
import type { ExamMark, ExamPaper, Paginated, Student } from "@/lib/types";

interface MarkDraft {
  marks: string;
  absent: boolean;
  remarks: string;
}

export default function MarksEntryPage() {
  return (
    <PermissionGate permission="exam.marks">
      <Suspense fallback={<Spinner />}>
        <MarksSheet />
      </Suspense>
    </PermissionGate>
  );
}

function MarksSheet() {
  const searchParams = useSearchParams();
  const { items: exams } = useExams();
  const { items: papers, loading: papersLoading } = useExamPapers();

  const [examId, setExamId] = useState("");
  const [paperId, setPaperId] = useState(searchParams.get("paper") ?? "");

  const [students, setStudents] = useState<Student[]>([]);
  const [drafts, setDrafts] = useState<Record<number, MarkDraft>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const selectedPaper: ExamPaper | undefined = papers.find(
    (paper) => String(paper.id) === paperId
  );

  const filteredPapers = examId
    ? papers.filter((paper) => String(paper.exam_id) === examId)
    : papers;

  const load = useCallback(() => {
    const controller = new AbortController();

    const run = async () => {
      if (!selectedPaper) {
        setStudents([]);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const [studentResponse, markResponse] = await Promise.all([
          apiFetch<Paginated<Student>>(
            `/v1/students?class_room_id=${selectedPaper.class_room_id}&per_page=200`,
            { signal: controller.signal }
          ),
          apiFetch<Paginated<ExamMark>>(
            `/v1/exam-marks?exam_paper_id=${selectedPaper.id}&per_page=200`,
            { signal: controller.signal }
          ),
        ]);

        const existing = new Map<number, ExamMark>();
        for (const mark of markResponse.data) {
          existing.set(mark.student_id, mark);
        }

        setStudents(studentResponse.data);
        setDrafts(
          Object.fromEntries(
            studentResponse.data.map((student) => {
              const mark = existing.get(student.id);
              return [
                student.id,
                {
                  marks: mark?.marks_obtained ?? "",
                  absent: mark?.is_absent ?? false,
                  remarks: mark?.remarks ?? "",
                },
              ];
            })
          )
        );
      } catch (err: unknown) {
        if (!(err instanceof DOMException && err.name === "AbortError")) {
          setError(
            err instanceof ApiError ? err.message : "Unable to load the sheet."
          );
        }
      } finally {
        setLoading(false);
      }
    };

    void run();

    return () => controller.abort();
  }, [selectedPaper]);

  useEffect(() => load(), [load]);

  const update = (studentId: number, patch: Partial<MarkDraft>) => {
    setDrafts((current) => ({
      ...current,
      [studentId]: {
        marks: current[studentId]?.marks ?? "",
        absent: current[studentId]?.absent ?? false,
        remarks: current[studentId]?.remarks ?? "",
        ...patch,
      },
    }));
  };

  const submit = async () => {
    if (!selectedPaper) return;

    const rows = students
      .map((student) => ({ student, draft: drafts[student.id] }))
      .filter(
        ({ draft }) => draft && (draft.absent || draft.marks.trim() !== "")
      )
      .map(({ student, draft }) => ({
        student_id: student.id,
        is_absent: draft.absent,
        ...(draft.marks.trim() !== ""
          ? { marks_obtained: Number(draft.marks) }
          : {}),
        ...(draft.remarks.trim() !== "" ? { remarks: draft.remarks.trim() } : {}),
      }));

    if (rows.length === 0) {
      setError("Enter marks or mark absence for at least one student.");
      return;
    }

    setBusy(true);
    setError(null);
    setNotice(null);

    try {
      await apiFetch("/v1/exam-marks/bulk", {
        method: "POST",
        body: { exam_paper_id: selectedPaper.id, marks: rows },
      });
      setNotice(`Saved marks for ${rows.length} student(s).`);
    } catch (err: unknown) {
      setError(err instanceof ApiError ? err.message : "Unable to save marks.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Marks entry"
        description="Capture subject marks against an exam paper."
        actions={
          <Link
            href="/dashboard/exams"
            className={buttonClasses("secondary")}
          >
            Back
          </Link>
        }
      />

      <Card className="p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Exam" htmlFor="marks_exam">
            <Select
              id="marks_exam"
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
          <Field label="Paper" htmlFor="marks_paper" required>
            <Select
              id="marks_paper"
              value={paperId}
              onChange={(event) => setPaperId(event.target.value)}
            >
              <option value="">Select paper</option>
              {filteredPapers.map((paper) => (
                <option key={paper.id} value={paper.id}>
                  {paper.class_room?.name ?? `Class ${paper.class_room_id}`} -{" "}
                  {paper.subject?.name ?? `Subject ${paper.subject_id}`}
                  {paper.exam_date ? ` (${paper.exam_date})` : ""}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      </Card>

      {notice ? <SuccessNotice message={notice} /> : null}
      {error ? <ErrorNotice message={error} /> : null}

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-6 py-4">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              Students {students.length > 0 ? `(${students.length})` : ""}
            </h2>
            {selectedPaper ? (
              <p className="mt-0.5 text-xs text-slate-500">
                Maximum marks {selectedPaper.max_marks}, pass marks{" "}
                {selectedPaper.pass_marks}
              </p>
            ) : null}
          </div>
        </div>

        {!selectedPaper && !papersLoading ? (
          <EmptyState message="Choose an exam paper to load the mark sheet." />
        ) : loading || papersLoading ? (
          <Spinner />
        ) : students.length === 0 ? (
          <EmptyState message="No students are enrolled in this class." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3 font-medium">Student</th>
                  <th className="px-5 py-3 font-medium">Marks</th>
                  <th className="px-5 py-3 font-medium">Absent</th>
                  <th className="px-5 py-3 font-medium">Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {students.map((student) => (
                  <tr key={student.id}>
                    <td className="px-5 py-3">
                      <div className="font-medium text-slate-900">
                        {student.full_name}
                      </div>
                      <div className="font-mono text-xs text-slate-400">
                        {student.admission_no}
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <TextInput
                        type="number"
                        min="0"
                        step="0.01"
                        value={drafts[student.id]?.marks ?? ""}
                        disabled={drafts[student.id]?.absent ?? false}
                        onChange={(event) =>
                          update(student.id, { marks: event.target.value })
                        }
                        className="w-28"
                      />
                    </td>
                    <td className="px-5 py-3">
                      <Checkbox
                        label=""
                        checked={drafts[student.id]?.absent ?? false}
                        onChange={(event) =>
                          update(student.id, { absent: event.target.checked })
                        }
                      />
                    </td>
                    <td className="px-5 py-3">
                      <TextInput
                        value={drafts[student.id]?.remarks ?? ""}
                        placeholder="Optional"
                        onChange={(event) =>
                          update(student.id, { remarks: event.target.value })
                        }
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {selectedPaper && students.length > 0 ? (
          <div className="flex items-center justify-end border-t border-slate-100 px-6 py-4">
            <Button type="button" loading={busy} onClick={submit}>
              Save marks
            </Button>
          </div>
        ) : null}
      </Card>
    </div>
  );
}
