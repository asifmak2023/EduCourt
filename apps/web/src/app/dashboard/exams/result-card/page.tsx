"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Table } from "@heroui/react";
import { ApiError, apiFetch } from "@/lib/api";
import { useClassRooms, useExams } from "@/lib/useLookups";
import { PermissionGate } from "@/components/PermissionGate";
import { Field, Select, buttonClasses } from "@/components/Form";
import {
  Badge,
  Card,
  DataItem,
  DataList,
  EmptyState,
  ErrorNotice,
  PageHeader,
  Spinner,
} from "@/components/ui";
import { formatNumber } from "@/lib/format";
import type { Paginated, ResultCard, Student } from "@/lib/types";

export default function ResultCardPage() {
  return (
    <PermissionGate permission="exam.view">
      <Suspense fallback={<Spinner />}>
        <ResultCardView />
      </Suspense>
    </PermissionGate>
  );
}

function ResultCardView() {
  const searchParams = useSearchParams();
  const { items: exams } = useExams();
  const { items: classes } = useClassRooms();

  const [examId, setExamId] = useState(searchParams.get("exam") ?? "");
  const [classId, setClassId] = useState("");
  const [studentId, setStudentId] = useState("");

  const [students, setStudents] = useState<Student[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);

  const [card, setCard] = useState<ResultCard | null>(null);
  const [loadingCard, setLoadingCard] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadStudents = useCallback(() => {
    const controller = new AbortController();

    const run = async () => {
      if (!classId) {
        setStudents([]);
        return;
      }

      setLoadingStudents(true);
      setError(null);

      try {
        const response = await apiFetch<Paginated<Student>>(
          `/v1/students?class_room_id=${classId}&per_page=200`,
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
  }, [classId]);

  useEffect(() => loadStudents(), [loadStudents]);

  const loadCard = useCallback(() => {
    const controller = new AbortController();

    const run = async () => {
      if (!examId || !studentId) {
        setCard(null);
        return;
      }

      setLoadingCard(true);
      setError(null);

      try {
        const response = await apiFetch<{ data: ResultCard }>(
          `/v1/exams/${examId}/students/${studentId}/result-card`,
          { signal: controller.signal }
        );
        setCard(response.data);
      } catch (err: unknown) {
        if (!(err instanceof DOMException && err.name === "AbortError")) {
          setError(
            err instanceof ApiError ? err.message : "Unable to load the result."
          );
        }
      } finally {
        setLoadingCard(false);
      }
    };

    void run();

    return () => controller.abort();
  }, [examId, studentId]);

  useEffect(() => loadCard(), [loadCard]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Result card"
        description="Per-student subject breakdown with grade."
        actions={
          <Link href="/dashboard/exams" className={buttonClasses("secondary")}>
            Back
          </Link>
        }
      />

      <Card className="p-5">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Exam" htmlFor="rc_exam" required>
            <Select
              id="rc_exam"
              value={examId}
              onChange={(event) => {
                setExamId(event.target.value);
                setCard(null);
              }}
            >
              <option value="">Select exam</option>
              {exams.map((exam) => (
                <option key={exam.id} value={exam.id}>
                  {exam.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Class" htmlFor="rc_class">
            <Select
              id="rc_class"
              value={classId}
              onChange={(event) => {
                setClassId(event.target.value);
                setStudentId("");
                setCard(null);
              }}
            >
              <option value="">Select class</option>
              {classes.map((room) => (
                <option key={room.id} value={room.id}>
                  {room.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Student" htmlFor="rc_student" required>
            <Select
              id="rc_student"
              value={studentId}
              disabled={!classId || loadingStudents}
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
        </div>
      </Card>

      {error ? <ErrorNotice message={error} /> : null}

      {!examId || !studentId ? (
        <Card>
          <EmptyState message="Choose an exam and student to view the result card." />
        </Card>
      ) : loadingCard ? (
        <Card>
          <Spinner />
        </Card>
      ) : card ? (
        <>
          <Card className="p-6">
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <Badge value={card.result} />
              <span className="text-xs text-muted">
                {card.failed_subjects} failed subject(s)
              </span>
            </div>
            <DataList>
              <DataItem
                label="Total obtained"
                value={formatNumber(card.total_obtained)}
              />
              <DataItem label="Total maximum" value={formatNumber(card.total_max)} />
              <DataItem label="Percentage" value={`${card.percentage}%`} />
              <DataItem label="Grade" value={card.grade ?? "-"} />
              <DataItem label="Grade points" value={card.grade_points ?? "-"} />
            </DataList>
          </Card>

          <Card>
            <div className="border-b border-border-secondary px-6 py-4">
              <h2 className="text-sm font-semibold text-foreground">Subjects</h2>
            </div>
            {card.subjects.length === 0 ? (
              <EmptyState message="No subjects are scheduled for this exam." />
            ) : (
              <Table variant="secondary">
                <Table.ScrollContainer>
                  <Table.Content
                    aria-label="Result card subjects"
                    className="min-w-[820px]"
                  >
                    <Table.Header>
                      <Table.Column isRowHeader>Subject</Table.Column>
                      <Table.Column className="text-right">Max</Table.Column>
                      <Table.Column className="text-right">Pass</Table.Column>
                      <Table.Column className="text-right">Obtained</Table.Column>
                      <Table.Column>Status</Table.Column>
                      <Table.Column>Remarks</Table.Column>
                    </Table.Header>
                    <Table.Body>
                      {card.subjects.map((subject) => (
                        <Table.Row
                          key={subject.exam_paper_id}
                          id={subject.exam_paper_id}
                        >
                          <Table.Cell className="font-medium text-foreground">
                            {subject.subject ?? `#${subject.subject_id}`}
                          </Table.Cell>
                          <Table.Cell className="text-right text-muted">
                            {formatNumber(subject.max_marks)}
                          </Table.Cell>
                          <Table.Cell className="text-right text-muted">
                            {formatNumber(subject.pass_marks)}
                          </Table.Cell>
                          <Table.Cell className="text-right text-foreground">
                            {subject.is_absent
                              ? "Absent"
                              : subject.marks_obtained === null
                                ? "-"
                                : formatNumber(subject.marks_obtained)}
                          </Table.Cell>
                          <Table.Cell>
                            {subject.is_absent ? (
                              <Badge value="inactive" />
                            ) : (
                              <Badge
                                value={subject.passed ? "active" : "rejected"}
                              />
                            )}
                          </Table.Cell>
                          <Table.Cell className="text-muted">
                            {subject.remarks ?? "-"}
                          </Table.Cell>
                        </Table.Row>
                      ))}
                    </Table.Body>
                  </Table.Content>
                </Table.ScrollContainer>
              </Table>
            )}
          </Card>
        </>
      ) : null}
    </div>
  );
}
