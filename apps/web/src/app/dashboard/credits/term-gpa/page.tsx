"use client";

import { useState } from "react";
import Link from "next/link";
import { ApiError, apiFetch } from "@/lib/api";
import { useStudents, useTerms } from "@/lib/useLookups";
import { PermissionGate } from "@/components/PermissionGate";
import { Button, Field, Select, buttonClasses } from "@/components/Form";
import {
  Badge,
  Card,
  EmptyState,
  ErrorNotice,
  PageHeader,
  StatCard,
} from "@/components/ui";
import { formatNumber } from "@/lib/format";
import type { TermGpa } from "@/lib/types";

export default function TermGpaPage() {
  return (
    <PermissionGate permission="credit.view">
      <TermGpaView />
    </PermissionGate>
  );
}

function TermGpaView() {
  const { items: students } = useStudents();
  const { items: terms } = useTerms();
  const [studentId, setStudentId] = useState("");
  const [termId, setTermId] = useState("");
  const [result, setResult] = useState<TermGpa | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    setBusy(true);
    setError(null);

    try {
      const response = await apiFetch<{ data: TermGpa }>(
        `/v1/students/${studentId}/term-gpa?term_id=${termId}`
      );
      setResult(response.data);
    } catch (err: unknown) {
      setResult(null);
      setError(err instanceof ApiError ? err.message : "Unable to load GPA.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Term GPA"
        description="Credit-weighted grade point average for one term."
        actions={
          <Link href="/dashboard/credits" className={buttonClasses("secondary")}>
            Back
          </Link>
        }
      />

      <Card className="p-6">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Student" htmlFor="gpa_student" required>
            <Select
              id="gpa_student"
              value={studentId}
              onChange={(event) => setStudentId(event.target.value)}
            >
              <option value="">Select student</option>
              {students.map((student) => (
                <option key={student.id} value={student.id}>
                  {student.full_name} ({student.admission_no})
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Term" htmlFor="gpa_term" required>
            <Select
              id="gpa_term"
              value={termId}
              onChange={(event) => setTermId(event.target.value)}
            >
              <option value="">Select term</option>
              {terms.map((term) => (
                <option key={term.id} value={term.id}>
                  {term.name}
                </option>
              ))}
            </Select>
          </Field>
          <div className="flex items-end">
            <Button
              type="button"
              loading={busy}
              disabled={!studentId || !termId}
              onClick={run}
            >
              Calculate
            </Button>
          </div>
        </div>
      </Card>

      {error ? <ErrorNotice message={error} /> : null}

      {result ? (
        <>
          <div className="grid gap-4 sm:grid-cols-4">
            <StatCard
              label="GPA"
              value={result.gpa === null ? "-" : formatNumber(result.gpa)}
            />
            <StatCard
              label="Credits registered"
              value={formatNumber(result.credits_registered)}
            />
            <StatCard
              label="Credits graded"
              value={formatNumber(result.credits_graded)}
            />
            <StatCard
              label="Credits earned"
              value={formatNumber(result.credits_earned)}
            />
          </div>

          <Card>
            {result.subjects.length === 0 ? (
              <EmptyState message="No courses registered for this term." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-5 py-3 font-medium">Subject</th>
                      <th className="px-5 py-3 font-medium text-right">
                        Credits
                      </th>
                      <th className="px-5 py-3 font-medium text-right">
                        Percentage
                      </th>
                      <th className="px-5 py-3 font-medium">Grade</th>
                      <th className="px-5 py-3 font-medium text-right">Points</th>
                      <th className="px-5 py-3 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {result.subjects.map((row) => (
                      <tr
                        key={row.course_registration_id}
                        className="hover:bg-slate-50"
                      >
                        <td className="px-5 py-3 text-slate-900">
                          {row.subject ?? `#${row.subject_id}`}
                        </td>
                        <td className="px-5 py-3 text-right text-slate-600">
                          {formatNumber(row.credit_hours)}
                        </td>
                        <td className="px-5 py-3 text-right text-slate-600">
                          {row.percentage === null
                            ? "-"
                            : `${formatNumber(row.percentage)}%`}
                        </td>
                        <td className="px-5 py-3 text-slate-600">
                          {row.grade ?? "-"}
                        </td>
                        <td className="px-5 py-3 text-right text-slate-600">
                          {row.grade_points === null
                            ? "-"
                            : formatNumber(row.grade_points)}
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
          </Card>
        </>
      ) : null}
    </div>
  );
}
