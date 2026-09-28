"use client";

import { useState } from "react";
import Link from "next/link";
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
import { formatDate, formatNumber } from "@/lib/format";
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
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3 font-medium">Date</th>
                  <th className="px-5 py-3 font-medium">Class</th>
                  <th className="px-5 py-3 font-medium">Subject</th>
                  <th className="px-5 py-3 font-medium">Room</th>
                  <th className="px-5 py-3 font-medium">Time</th>
                  <th className="px-5 py-3 font-medium text-right">Max</th>
                  <th className="px-5 py-3 font-medium text-right">Pass</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((paper) => (
                  <tr key={paper.id} className="hover:bg-slate-50">
                    <td className="px-5 py-3 text-slate-500">
                      {formatDate(paper.exam_date)}
                    </td>
                    <td className="px-5 py-3 font-medium text-slate-900">
                      <Link
                        href={`/dashboard/exams/papers/${paper.id}/edit`}
                        className="hover:underline"
                      >
                        {paper.class_room?.name ?? `#${paper.class_room_id}`}
                      </Link>
                    </td>
                    <td className="px-5 py-3 text-slate-600">
                      {paper.subject?.name ?? `#${paper.subject_id}`}
                    </td>
                    <td className="px-5 py-3 text-slate-600">
                      {paper.room?.name ?? "-"}
                    </td>
                    <td className="px-5 py-3 text-slate-500">
                      {paper.starts_at && paper.ends_at
                        ? `${paper.starts_at} - ${paper.ends_at}`
                        : paper.starts_at ?? "-"}
                    </td>
                    <td className="px-5 py-3 text-right text-slate-600">
                      {formatNumber(paper.max_marks)}
                    </td>
                    <td className="px-5 py-3 text-right text-slate-600">
                      {formatNumber(paper.pass_marks)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
