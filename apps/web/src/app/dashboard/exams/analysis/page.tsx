"use client";

import { useState } from "react";
import Link from "next/link";
import { Table } from "@heroui/react";
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
            className={buttonClasses(tab === item.key ? "primary" : "secondary")}
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
            <Table variant="secondary">
              <Table.ScrollContainer>
                <Table.Content
                  aria-label="Class performance analysis"
                  className="min-w-[900px]"
                >
                  <Table.Header>
                    <Table.Column isRowHeader>Subject</Table.Column>
                    <Table.Column className="text-right">Appeared</Table.Column>
                    <Table.Column className="text-right">Absent</Table.Column>
                    <Table.Column className="text-right">Passed</Table.Column>
                    <Table.Column className="text-right">Pass rate</Table.Column>
                    <Table.Column className="text-right">Average</Table.Column>
                    <Table.Column className="text-right">High</Table.Column>
                    <Table.Column className="text-right">Low</Table.Column>
                  </Table.Header>
                  <Table.Body>
                    {result.subjects.map((row) => (
                      <Table.Row key={row.subject_id} id={row.subject_id}>
                        <Table.Cell className="text-foreground">
                          {row.subject ?? `#${row.subject_id}`}
                        </Table.Cell>
                        <Table.Cell className="text-right text-muted">
                          {row.appeared}
                        </Table.Cell>
                        <Table.Cell className="text-right text-muted">
                          {row.absent}
                        </Table.Cell>
                        <Table.Cell className="text-right text-muted">
                          {row.passed}
                        </Table.Cell>
                        <Table.Cell className="text-right text-muted">
                          {formatNumber(row.pass_rate)}%
                        </Table.Cell>
                        <Table.Cell className="text-right text-muted">
                          {formatNumber(row.average_percentage)}%
                        </Table.Cell>
                        <Table.Cell className="text-right text-muted">
                          {row.highest === null ? "-" : formatNumber(row.highest)}
                        </Table.Cell>
                        <Table.Cell className="text-right text-muted">
                          {row.lowest === null ? "-" : formatNumber(row.lowest)}
                        </Table.Cell>
                      </Table.Row>
                    ))}
                  </Table.Body>
                </Table.Content>
              </Table.ScrollContainer>
            </Table>

            {Object.keys(result.grade_distribution).length > 0 ? (
              <div className="border-t border-border-secondary px-5 py-4">
                <h3 className="text-xs font-medium uppercase tracking-wide text-muted">
                  Grade distribution
                </h3>
                <div className="mt-3 flex flex-wrap gap-3">
                  {Object.entries(result.grade_distribution).map(
                    ([grade, count]) => (
                      <div
                        key={grade}
                        className="rounded-lg border border-border px-3 py-2 text-sm"
                      >
                        <span className="font-medium text-foreground">
                          {grade}
                        </span>
                        <span className="ms-2 text-muted">{count}</span>
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
            <Table variant="secondary">
              <Table.ScrollContainer>
                <Table.Content
                  aria-label="Subject analysis"
                  className="min-w-[720px]"
                >
                  <Table.Header>
                    <Table.Column isRowHeader>Class</Table.Column>
                    <Table.Column className="text-right">Appeared</Table.Column>
                    <Table.Column className="text-right">Passed</Table.Column>
                    <Table.Column className="text-right">Pass rate</Table.Column>
                    <Table.Column className="text-right">Average</Table.Column>
                  </Table.Header>
                  <Table.Body>
                    {result.classes.map((row) => (
                      <Table.Row key={row.exam_paper_id} id={row.exam_paper_id}>
                        <Table.Cell className="text-foreground">
                          Class #{row.class_room_id}
                        </Table.Cell>
                        <Table.Cell className="text-right text-muted">
                          {row.appeared}
                        </Table.Cell>
                        <Table.Cell className="text-right text-muted">
                          {row.passed}
                        </Table.Cell>
                        <Table.Cell className="text-right text-muted">
                          {formatNumber(row.pass_rate)}%
                        </Table.Cell>
                        <Table.Cell className="text-right text-muted">
                          {formatNumber(row.average_percentage)}%
                        </Table.Cell>
                      </Table.Row>
                    ))}
                  </Table.Body>
                </Table.Content>
              </Table.ScrollContainer>
            </Table>
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
            <Table variant="secondary">
              <Table.ScrollContainer>
                <Table.Content
                  aria-label="Teacher achievement analysis"
                  className="min-w-[720px]"
                >
                  <Table.Header>
                    <Table.Column isRowHeader>Teacher</Table.Column>
                    <Table.Column className="text-right">Appeared</Table.Column>
                    <Table.Column className="text-right">Passed</Table.Column>
                    <Table.Column className="text-right">Pass rate</Table.Column>
                    <Table.Column className="text-right">Average</Table.Column>
                  </Table.Header>
                  <Table.Body>
                    {rows.map((row) => (
                      <Table.Row key={row.teacher_id} id={row.teacher_id}>
                        <Table.Cell className="text-foreground">
                          {row.teacher ?? `#${row.teacher_id}`}
                        </Table.Cell>
                        <Table.Cell className="text-right text-muted">
                          {row.appeared}
                        </Table.Cell>
                        <Table.Cell className="text-right text-muted">
                          {row.passed}
                        </Table.Cell>
                        <Table.Cell className="text-right text-muted">
                          {formatNumber(row.pass_rate)}%
                        </Table.Cell>
                        <Table.Cell className="text-right text-muted">
                          {formatNumber(row.average_percentage)}%
                        </Table.Cell>
                      </Table.Row>
                    ))}
                  </Table.Body>
                </Table.Content>
              </Table.ScrollContainer>
            </Table>
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
            <Table variant="secondary">
              <Table.ScrollContainer>
                <Table.Content
                  aria-label="Year on year analysis"
                  className="min-w-[520px]"
                >
                  <Table.Header>
                    <Table.Column isRowHeader>Academic year</Table.Column>
                    <Table.Column className="text-right">Appeared</Table.Column>
                    <Table.Column className="text-right">Average</Table.Column>
                  </Table.Header>
                  <Table.Body>
                    {rows.map((row) => (
                      <Table.Row key={row.exam_id} id={row.exam_id}>
                        <Table.Cell className="text-foreground">
                          {row.academic_year ?? `#${row.academic_year_id}`}
                        </Table.Cell>
                        <Table.Cell className="text-right text-muted">
                          {row.appeared}
                        </Table.Cell>
                        <Table.Cell className="text-right text-muted">
                          {formatNumber(row.average_percentage)}%
                        </Table.Cell>
                      </Table.Row>
                    ))}
                  </Table.Body>
                </Table.Content>
              </Table.ScrollContainer>
            </Table>
          </Card>
        )
      ) : null}
    </div>
  );
}
