"use client";

import { useState } from "react";
import Link from "next/link";
import { ApiError, apiFetch } from "@/lib/api";
import {
  useClassRooms,
  useExamTypes,
  useExams,
  useSubjects,
} from "@/lib/useLookups";
import { PermissionGate } from "@/components/PermissionGate";
import { Button, Field, Select, buttonClasses } from "@/components/Form";
import {
  Card,
  EmptyState,
  ErrorNotice,
  PageHeader,
  StatCard,
} from "@/components/ui";
import { formatNumber } from "@/lib/format";
import type {
  ExamClassAnalysis,
  ExamSubjectAnalysis,
  TeacherAnalysisRow,
  YearOnYearRow,
} from "@/lib/types";

type Tab = "class" | "subject" | "teachers" | "year-on-year";

const TABS: { key: Tab; label: string }[] = [
  { key: "class", label: "Class performance" },
  { key: "subject", label: "Subject across classes" },
  { key: "teachers", label: "Teacher achievement" },
  { key: "year-on-year", label: "Year on year" },
];

export default function ExamAnalysisPage() {
  return (
    <PermissionGate permission="exam.view">
      <AnalysisView />
    </PermissionGate>
  );
}

function AnalysisView() {
  const [tab, setTab] = useState<Tab>("class");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Exam analysis"
        description="Performance insights across classes, subjects and teachers."
        actions={
          <Link href="/dashboard/exams" className={buttonClasses("secondary")}>
            Back
          </Link>
        }
      />

      <div className="flex flex-wrap gap-2">
        {TABS.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setTab(item.key)}
            className={
              tab === item.key
                ? "rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-medium text-white"
                : "rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
            }
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === "class" ? <ClassAnalysis /> : null}
      {tab === "subject" ? <SubjectAnalysis /> : null}
      {tab === "teachers" ? <TeacherAnalysis /> : null}
      {tab === "year-on-year" ? <YearOnYearAnalysis /> : null}
    </div>
  );
}

function ClassAnalysis() {
  const { items: exams } = useExams();
  const { items: classRooms } = useClassRooms();
  const [examId, setExamId] = useState("");
  const [classRoomId, setClassRoomId] = useState("");
  const [result, setResult] = useState<ExamClassAnalysis | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    setBusy(true);
    setError(null);

    try {
      const response = await apiFetch<{ data: ExamClassAnalysis }>(
        `/v1/exams/${examId}/analysis/class?class_room_id=${classRoomId}`
      );
      setResult(response.data);
    } catch (err: unknown) {
      setResult(null);
      setError(err instanceof ApiError ? err.message : "Unable to analyze.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Exam" htmlFor="ca_exam" required>
            <Select
              id="ca_exam"
              value={examId}
              onChange={(event) => setExamId(event.target.value)}
            >
              <option value="">Select exam</option>
              {exams.map((exam) => (
                <option key={exam.id} value={exam.id}>
                  {exam.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Class" htmlFor="ca_class" required>
            <Select
              id="ca_class"
              value={classRoomId}
              onChange={(event) => setClassRoomId(event.target.value)}
            >
              <option value="">Select class</option>
              {classRooms.map((room) => (
                <option key={room.id} value={room.id}>
                  {room.name}
                </option>
              ))}
            </Select>
          </Field>
          <div className="flex items-end">
            <Button
              type="button"
              loading={busy}
              disabled={!examId || !classRoomId}
              onClick={run}
            >
              Analyze
            </Button>
          </div>
        </div>
      </Card>

      {error ? <ErrorNotice message={error} /> : null}

      {result ? (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard label="Students" value={String(result.students)} />
            <StatCard
              label="Average"
              value={`${formatNumber(result.average_percentage)}%`}
            />
            <StatCard
              label="Subjects"
              value={String(result.subjects.length)}
            />
          </div>

          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-5 py-3 font-medium">Subject</th>
                    <th className="px-5 py-3 font-medium text-right">Appeared</th>
                    <th className="px-5 py-3 font-medium text-right">Absent</th>
                    <th className="px-5 py-3 font-medium text-right">Passed</th>
                    <th className="px-5 py-3 font-medium text-right">Pass rate</th>
                    <th className="px-5 py-3 font-medium text-right">Average</th>
                    <th className="px-5 py-3 font-medium text-right">High</th>
                    <th className="px-5 py-3 font-medium text-right">Low</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {result.subjects.map((row) => (
                    <tr key={row.subject_id} className="hover:bg-slate-50">
                      <td className="px-5 py-3 text-slate-900">
                        {row.subject ?? `#${row.subject_id}`}
                      </td>
                      <td className="px-5 py-3 text-right text-slate-600">
                        {row.appeared}
                      </td>
                      <td className="px-5 py-3 text-right text-slate-600">
                        {row.absent}
                      </td>
                      <td className="px-5 py-3 text-right text-slate-600">
                        {row.passed}
                      </td>
                      <td className="px-5 py-3 text-right text-slate-600">
                        {formatNumber(row.pass_rate)}%
                      </td>
                      <td className="px-5 py-3 text-right text-slate-600">
                        {formatNumber(row.average_percentage)}%
                      </td>
                      <td className="px-5 py-3 text-right text-slate-600">
                        {row.highest === null ? "-" : formatNumber(row.highest)}
                      </td>
                      <td className="px-5 py-3 text-right text-slate-600">
                        {row.lowest === null ? "-" : formatNumber(row.lowest)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {Object.keys(result.grade_distribution).length > 0 ? (
              <div className="border-t border-slate-100 px-5 py-4">
                <h3 className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Grade distribution
                </h3>
                <div className="mt-3 flex flex-wrap gap-3">
                  {Object.entries(result.grade_distribution).map(
                    ([grade, count]) => (
                      <div
                        key={grade}
                        className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
                      >
                        <span className="font-medium text-slate-900">
                          {grade}
                        </span>
                        <span className="ml-2 text-slate-500">{count}</span>
                      </div>
                    )
                  )}
                </div>
              </div>
            ) : null}
          </Card>
        </>
      ) : null}
    </div>
  );
}

function SubjectAnalysis() {
  const { items: exams } = useExams();
  const { items: subjects } = useSubjects();
  const [examId, setExamId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [result, setResult] = useState<ExamSubjectAnalysis | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    setBusy(true);
    setError(null);

    try {
      const response = await apiFetch<{ data: ExamSubjectAnalysis }>(
        `/v1/exams/${examId}/analysis/subject?subject_id=${subjectId}`
      );
      setResult(response.data);
    } catch (err: unknown) {
      setResult(null);
      setError(err instanceof ApiError ? err.message : "Unable to analyze.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Exam" htmlFor="sa_exam" required>
            <Select
              id="sa_exam"
              value={examId}
              onChange={(event) => setExamId(event.target.value)}
            >
              <option value="">Select exam</option>
              {exams.map((exam) => (
                <option key={exam.id} value={exam.id}>
                  {exam.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Subject" htmlFor="sa_subject" required>
            <Select
              id="sa_subject"
              value={subjectId}
              onChange={(event) => setSubjectId(event.target.value)}
            >
              <option value="">Select subject</option>
              {subjects.map((subject) => (
                <option key={subject.id} value={subject.id}>
                  {subject.name}
                </option>
              ))}
            </Select>
          </Field>
          <div className="flex items-end">
            <Button
              type="button"
              loading={busy}
              disabled={!examId || !subjectId}
              onClick={run}
            >
              Analyze
            </Button>
          </div>
        </div>
      </Card>

      {error ? <ErrorNotice message={error} /> : null}

      {result ? (
        result.classes.length === 0 ? (
          <EmptyState message="No papers found for this subject in the exam." />
        ) : (
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-5 py-3 font-medium">Class</th>
                    <th className="px-5 py-3 font-medium text-right">Appeared</th>
                    <th className="px-5 py-3 font-medium text-right">Passed</th>
                    <th className="px-5 py-3 font-medium text-right">Pass rate</th>
                    <th className="px-5 py-3 font-medium text-right">Average</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {result.classes.map((row) => (
                    <tr key={row.exam_paper_id} className="hover:bg-slate-50">
                      <td className="px-5 py-3 text-slate-900">
                        Class #{row.class_room_id}
                      </td>
                      <td className="px-5 py-3 text-right text-slate-600">
                        {row.appeared}
                      </td>
                      <td className="px-5 py-3 text-right text-slate-600">
                        {row.passed}
                      </td>
                      <td className="px-5 py-3 text-right text-slate-600">
                        {formatNumber(row.pass_rate)}%
                      </td>
                      <td className="px-5 py-3 text-right text-slate-600">
                        {formatNumber(row.average_percentage)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )
      ) : null}
    </div>
  );
}

function TeacherAnalysis() {
  const { items: exams } = useExams();
  const [examId, setExamId] = useState("");
  const [rows, setRows] = useState<TeacherAnalysisRow[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    setBusy(true);
    setError(null);

    try {
      const response = await apiFetch<{ data: TeacherAnalysisRow[] }>(
        `/v1/exams/${examId}/analysis/teachers`
      );
      setRows(response.data);
    } catch (err: unknown) {
      setRows(null);
      setError(err instanceof ApiError ? err.message : "Unable to analyze.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Exam" htmlFor="ta_exam" required>
            <Select
              id="ta_exam"
              value={examId}
              onChange={(event) => setExamId(event.target.value)}
            >
              <option value="">Select exam</option>
              {exams.map((exam) => (
                <option key={exam.id} value={exam.id}>
                  {exam.name}
                </option>
              ))}
            </Select>
          </Field>
          <div className="flex items-end">
            <Button
              type="button"
              loading={busy}
              disabled={!examId}
              onClick={run}
            >
              Analyze
            </Button>
          </div>
        </div>
      </Card>

      {error ? <ErrorNotice message={error} /> : null}

      {rows ? (
        rows.length === 0 ? (
          <EmptyState message="No teaching assignments found for this exam." />
        ) : (
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-5 py-3 font-medium">Teacher</th>
                    <th className="px-5 py-3 font-medium text-right">Appeared</th>
                    <th className="px-5 py-3 font-medium text-right">Passed</th>
                    <th className="px-5 py-3 font-medium text-right">Pass rate</th>
                    <th className="px-5 py-3 font-medium text-right">Average</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rows.map((row) => (
                    <tr key={row.teacher_id} className="hover:bg-slate-50">
                      <td className="px-5 py-3 text-slate-900">
                        {row.teacher ?? `#${row.teacher_id}`}
                      </td>
                      <td className="px-5 py-3 text-right text-slate-600">
                        {row.appeared}
                      </td>
                      <td className="px-5 py-3 text-right text-slate-600">
                        {row.passed}
                      </td>
                      <td className="px-5 py-3 text-right text-slate-600">
                        {formatNumber(row.pass_rate)}%
                      </td>
                      <td className="px-5 py-3 text-right text-slate-600">
                        {formatNumber(row.average_percentage)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )
      ) : null}
    </div>
  );
}

function YearOnYearAnalysis() {
  const { items: examTypes } = useExamTypes();
  const { items: classRooms } = useClassRooms();
  const [examTypeId, setExamTypeId] = useState("");
  const [classRoomId, setClassRoomId] = useState("");
  const [rows, setRows] = useState<YearOnYearRow[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    setBusy(true);
    setError(null);

    const query = new URLSearchParams({ exam_type_id: examTypeId });
    if (classRoomId) query.set("class_room_id", classRoomId);

    try {
      const response = await apiFetch<{ data: YearOnYearRow[] }>(
        `/v1/exams/analysis/year-on-year?${query.toString()}`
      );
      setRows(response.data);
    } catch (err: unknown) {
      setRows(null);
      setError(err instanceof ApiError ? err.message : "Unable to analyze.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Exam type" htmlFor="yoy_type" required>
            <Select
              id="yoy_type"
              value={examTypeId}
              onChange={(event) => setExamTypeId(event.target.value)}
            >
              <option value="">Select exam type</option>
              {examTypes.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Class (optional)" htmlFor="yoy_class">
            <Select
              id="yoy_class"
              value={classRoomId}
              onChange={(event) => setClassRoomId(event.target.value)}
            >
              <option value="">All classes</option>
              {classRooms.map((room) => (
                <option key={room.id} value={room.id}>
                  {room.name}
                </option>
              ))}
            </Select>
          </Field>
          <div className="flex items-end">
            <Button
              type="button"
              loading={busy}
              disabled={!examTypeId}
              onClick={run}
            >
              Analyze
            </Button>
          </div>
        </div>
      </Card>

      {error ? <ErrorNotice message={error} /> : null}

      {rows ? (
        rows.length === 0 ? (
          <EmptyState message="No exams of this type across academic years." />
        ) : (
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-5 py-3 font-medium">Academic year</th>
                    <th className="px-5 py-3 font-medium text-right">Appeared</th>
                    <th className="px-5 py-3 font-medium text-right">Average</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rows.map((row) => (
                    <tr key={row.exam_id} className="hover:bg-slate-50">
                      <td className="px-5 py-3 text-slate-900">
                        {row.academic_year ?? `#${row.academic_year_id}`}
                      </td>
                      <td className="px-5 py-3 text-right text-slate-600">
                        {row.appeared}
                      </td>
                      <td className="px-5 py-3 text-right text-slate-600">
                        {formatNumber(row.average_percentage)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )
      ) : null}
    </div>
  );
}
