"use client";

import { useState } from "react";
import Link from "next/link";
import { Table } from "@heroui/react";
import { useList } from "@/lib/useList";
import { useAuth } from "@/lib/auth";
import {
  useClassRooms,
  useExams,
  useSubjects,
} from "@/lib/useLookups";
import { PermissionGate } from "@/components/PermissionGate";
import { Pagination } from "@/components/Pagination";
import { Select, buttonClasses } from "@/components/Form";
import {
  Card,
  EmptyState,
  ErrorNotice,
  PageHeader,
  Spinner,
} from "@/components/ui";
import { formatDate, formatNumber, formatTime } from "@/lib/format";
import type { ExamPaper } from "@/lib/types";

export default function ExamPapersPage() {
  return (
    <PermissionGate permission="exam.view">
      <PapersTable />
    </PermissionGate>
  );
}

function PapersTable() {
  const { can } = useAuth();
  const { items: exams } = useExams();
  const { items: classes } = useClassRooms();
  const { items: subjects } = useSubjects();

  const [examId, setExamId] = useState("");
  const [classId, setClassId] = useState("");
  const [subjectId, setSubjectId] = useState("");

  const params: Record<string, string | number> = {};
  if (examId) params.exam_id = Number(examId);
  if (classId) params.class_room_id = Number(classId);
  if (subjectId) params.subject_id = Number(subjectId);

  const { items, meta, loading, error, page, setPage } = useList<ExamPaper>(
    "/v1/exam-papers",
    params
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Exam papers"
        description="Subjects, dates and marks for each exam sitting."
        actions={
          <>
            <Link
              href="/dashboard/exams"
              className={buttonClasses("secondary")}
            >
              Back
            </Link>
            {can("exam.create") ? (
              <Link
                href="/dashboard/exams/papers/new"
                className={buttonClasses()}
              >
                New paper
              </Link>
            ) : null}
          </>
        }
      />

      <div className="flex flex-wrap gap-3">
        <div className="w-64">
          <Select
            value={examId}
            onChange={(event) => {
              setPage(1);
              setExamId(event.target.value);
            }}
          >
            <option value="">All exams</option>
            {exams.map((exam) => (
              <option key={exam.id} value={exam.id}>
                {exam.name}
              </option>
            ))}
          </Select>
        </div>
        <div className="w-48">
          <Select
            value={classId}
            onChange={(event) => {
              setPage(1);
              setClassId(event.target.value);
            }}
          >
            <option value="">All classes</option>
            {classes.map((room) => (
              <option key={room.id} value={room.id}>
                {room.name}
              </option>
            ))}
          </Select>
        </div>
        <div className="w-48">
          <Select
            value={subjectId}
            onChange={(event) => {
              setPage(1);
              setSubjectId(event.target.value);
            }}
          >
            <option value="">All subjects</option>
            {subjects.map((subject) => (
              <option key={subject.id} value={subject.id}>
                {subject.name}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {error ? <ErrorNotice message={error} /> : null}

      <Card>
        {loading ? (
          <Spinner />
        ) : items.length === 0 ? (
          <EmptyState message="No exam papers match your filters." />
        ) : (
          <Table variant="secondary">
            <Table.ScrollContainer>
              <Table.Content aria-label="Exam papers" className="min-w-[900px]">
                <Table.Header>
                  <Table.Column isRowHeader>Date</Table.Column>
                  <Table.Column>Class</Table.Column>
                  <Table.Column>Subject</Table.Column>
                  <Table.Column>Room</Table.Column>
                  <Table.Column>Time</Table.Column>
                  <Table.Column className="text-right">Max</Table.Column>
                  <Table.Column className="text-right">Pass</Table.Column>
                </Table.Header>
                <Table.Body>
                  {items.map((paper) => (
                    <Table.Row key={paper.id} id={paper.id}>
                      <Table.Cell className="text-muted">
                        {formatDate(paper.exam_date)}
                      </Table.Cell>
                      <Table.Cell className="font-medium text-foreground">
                        <Link
                          href={`/dashboard/exams/papers/${paper.id}/edit`}
                          className="hover:underline"
                        >
                          {paper.class_room?.name ?? `#${paper.class_room_id}`}
                        </Link>
                      </Table.Cell>
                      <Table.Cell className="text-muted">
                        {paper.subject?.name ?? `#${paper.subject_id}`}
                      </Table.Cell>
                      <Table.Cell className="text-muted">
                        {paper.room?.name ?? "-"}
                      </Table.Cell>
                      <Table.Cell className="text-muted">
                        {paper.starts_at && paper.ends_at
                          ? `${formatTime(paper.starts_at)} - ${formatTime(paper.ends_at)}`
                          : formatTime(paper.starts_at)}
                      </Table.Cell>
                      <Table.Cell className="text-right text-muted">
                        {formatNumber(paper.max_marks)}
                      </Table.Cell>
                      <Table.Cell className="text-right text-muted">
                        {formatNumber(paper.pass_marks)}
                      </Table.Cell>
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table.Content>
            </Table.ScrollContainer>
          </Table>
        )}

        {meta ? (
          <Pagination
            page={page}
            lastPage={meta.last_page}
            total={meta.total}
            onPage={setPage}
          />
        ) : null}
      </Card>
    </div>
  );
}
