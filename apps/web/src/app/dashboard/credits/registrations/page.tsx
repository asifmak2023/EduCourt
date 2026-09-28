"use client";

import { useState } from "react";
import Link from "next/link";
import { useList } from "@/lib/useList";
import { useStudents, useSubjects, useTerms } from "@/lib/useLookups";
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
import { formatNumber } from "@/lib/format";
import type { CourseRegistration } from "@/lib/types";

const STATUSES = [
  { value: "registered", label: "Registered" },
  { value: "completed", label: "Completed" },
  { value: "failed", label: "Failed" },
  { value: "dropped", label: "Dropped" },
];

export default function RegistrationsPage() {
  return (
    <PermissionGate permission="credit.view">
      <RegistrationsTable />
    </PermissionGate>
  );
}

function RegistrationsTable() {
  const { can } = useAuth();
  const { items: students } = useStudents();
  const { items: terms } = useTerms();
  const { items: subjects } = useSubjects();

  const [studentId, setStudentId] = useState("");
  const [termId, setTermId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [status, setStatus] = useState("");

  const params: Record<string, string | number> = {};
  if (studentId) params.student_id = Number(studentId);
  if (termId) params.term_id = Number(termId);
  if (subjectId) params.subject_id = Number(subjectId);
  if (status) params.status = status;

  const { items, meta, loading, error, page, setPage } =
    useList<CourseRegistration>("/v1/course-registrations", params);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Course registrations"
        description="Term course enrolment with credit hours."
        actions={
          <>
            <Link
              href="/dashboard/credits"
              className={buttonClasses("secondary")}
            >
              Back
            </Link>
            {can("credit.create") ? (
              <Link
                href="/dashboard/credits/registrations/new"
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
        <div className="w-48">
          <Select
            value={termId}
            onChange={(event) => {
              setPage(1);
              setTermId(event.target.value);
            }}
          >
            <option value="">All terms</option>
            {terms.map((term) => (
              <option key={term.id} value={term.id}>
                {term.name}
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
        <div className="w-40">
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
          <EmptyState message="No course registrations match your filters." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3 font-medium">Student</th>
                  <th className="px-5 py-3 font-medium">Term</th>
                  <th className="px-5 py-3 font-medium">Subject</th>
                  <th className="px-5 py-3 font-medium text-right">Credits</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50">
                    <td className="px-5 py-3 font-medium text-slate-900">
                      <Link
                        href={`/dashboard/credits/registrations/${row.id}`}
                        className="hover:underline"
                      >
                        {row.student?.full_name ?? `#${row.student_id}`}
                      </Link>
                    </td>
                    <td className="px-5 py-3 text-slate-600">
                      {row.term?.name ?? "-"}
                    </td>
                    <td className="px-5 py-3 text-slate-600">
                      {row.subject?.name ?? "-"}
                    </td>
                    <td className="px-5 py-3 text-right text-slate-600">
                      {formatNumber(row.credit_hours)}
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
