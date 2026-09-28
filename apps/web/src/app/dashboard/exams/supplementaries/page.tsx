"use client";

import { useState } from "react";
import Link from "next/link";
import { useList } from "@/lib/useList";
import { useExams, useStudents } from "@/lib/useLookups";
import { useAuth } from "@/lib/auth";
import { PermissionGate } from "@/components/PermissionGate";
import { Pagination } from "@/components/Pagination";
import { Select, buttonClasses } from "@/components/Form";
import {
  Badge,
  Card,
  EmptyState,
  ErrorNotice,
  PageHeader,
  Spinner,
} from "@/components/ui";
import { formatCurrency } from "@/lib/format";
import type { ExamSupplementary } from "@/lib/types";

const STATUSES = [
  { value: "registered", label: "Registered" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "completed", label: "Completed" },
];

export default function SupplementariesPage() {
  return (
    <PermissionGate permission="exam.view">
      <SupplementariesTable />
    </PermissionGate>
  );
}

function SupplementariesTable() {
  const { can } = useAuth();
  const { items: exams } = useExams();
  const { items: students } = useStudents();

  const [examId, setExamId] = useState("");
  const [studentId, setStudentId] = useState("");
  const [status, setStatus] = useState("");

  const params: Record<string, string | number> = {};
  if (examId) params.original_exam_id = Number(examId);
  if (studentId) params.student_id = Number(studentId);
  if (status) params.status = status;

  const { items, meta, loading, error, page, setPage } =
    useList<ExamSupplementary>("/v1/exam-supplementaries", params);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Supplementary exams"
        description="Re-sit registrations for students who failed a paper."
        actions={
          <>
            <Link href="/dashboard/exams" className={buttonClasses("secondary")}>
              Back
            </Link>
            {can("exam.edit") ? (
              <Link
                href="/dashboard/exams/supplementaries/new"
                className={buttonClasses()}
              >
                New registration
              </Link>
            ) : null}
          </>
        }
      />

      <div className="flex flex-wrap gap-3">
        <div className="w-56">
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
        <div className="w-56">
          <Select
            value={studentId}
            onChange={(event) => {
              setPage(1);
              setStudentId(event.target.value);
            }}
          >
            <option value="">All students</option>
            {students.map((student) => (
              <option key={student.id} value={student.id}>
                {student.full_name}
              </option>
            ))}
          </Select>
        </div>
        <div className="w-44">
          <Select
            value={status}
            onChange={(event) => {
              setPage(1);
              setStatus(event.target.value);
            }}
          >
            <option value="">All statuses</option>
            {STATUSES.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
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
          <EmptyState message="No supplementary registrations match your filters." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3 font-medium">Student</th>
                  <th className="px-5 py-3 font-medium">Original exam</th>
                  <th className="px-5 py-3 font-medium">Subject</th>
                  <th className="px-5 py-3 font-medium text-right">Fee</th>
                  <th className="px-5 py-3 font-medium">Paid</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50">
                    <td className="px-5 py-3 font-medium text-slate-900">
                      <Link
                        href={`/dashboard/exams/supplementaries/${row.id}`}
                        className="hover:underline"
                      >
                        {row.student?.full_name ?? `#${row.student_id}`}
                      </Link>
                    </td>
                    <td className="px-5 py-3 text-slate-600">
                      {row.original_exam?.name ?? "-"}
                    </td>
                    <td className="px-5 py-3 text-slate-600">
                      {row.subject?.name ?? "-"}
                    </td>
                    <td className="px-5 py-3 text-right text-slate-600">
                      {formatCurrency(row.fee_amount)}
                    </td>
                    <td className="px-5 py-3">
                      <Badge value={row.is_paid ? "paid" : "unpaid"} />
                    </td>
                    <td className="px-5 py-3">
                      <Badge value={row.status} />
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
