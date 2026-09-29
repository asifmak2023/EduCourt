"use client";

import { useState } from "react";
import { PermissionGate } from "@/components/PermissionGate";
import { ReportsTabs } from "@/components/ReportsTabs";
import { Field, Select } from "@/components/Form";
import {
  Card,
  EmptyState,
  ErrorNotice,
  PageHeader,
  Spinner,
  StatCard,
} from "@/components/ui";
import { formatNumber } from "@/lib/format";
import { useStudents } from "@/lib/useLookups";
import { useReport } from "@/lib/useReport";
import type { ReportStudentYearly } from "@/lib/types";

export default function StudentYearlyReportPage() {
  return (
    <PermissionGate permission="report.view">
      <StudentYearlyReport />
    </PermissionGate>
  );
}

function StudentYearlyReport() {
  const { items: students } = useStudents();
  const [studentId, setStudentId] = useState("");

  const { data, loading, error } = useReport<ReportStudentYearly>(
    studentId ? `/v1/reports/students/${studentId}/yearly` : null
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Student yearly report"
        description="A student's attendance, academics and conduct by academic year."
      />
      <ReportsTabs active="students" />

      <Card className="p-4">
        <div className="max-w-md">
          <Field label="Student" htmlFor="yearly_student" required>
            <Select
              id="yearly_student"
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
        </div>
      </Card>

      {error ? <ErrorNotice message={error} /> : null}
      {!studentId ? (
        <EmptyState message="Select a student to view their yearly analysis." />
      ) : loading ? (
        <Spinner />
      ) : data ? (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard label="Academic years" value={formatNumber(data.summary.years)} />
            <StatCard
              label="Overall attendance"
              value={`${data.summary.attendance_percentage}%`}
            />
            <StatCard
              label="Conduct records"
              value={formatNumber(data.summary.conduct_records)}
              tone={data.summary.conduct_records > 0 ? "danger" : "default"}
            />
          </div>

          <Card>
            <div className="border-b border-slate-100 px-5 py-4">
              <h2 className="text-sm font-semibold text-slate-900">
                {data.student.name} ({data.student.admission_no})
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-5 py-3 font-medium">Year</th>
                    <th className="px-5 py-3 font-medium">Class</th>
                    <th className="px-5 py-3 text-right font-medium">Attendance</th>
                    <th className="px-5 py-3 text-right font-medium">Academics</th>
                    <th className="px-5 py-3 text-right font-medium">Conduct</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.years.length === 0 ? (
                    <tr>
                      <td className="px-5 py-3 text-slate-500" colSpan={5}>
                        No enrollment history for this student.
                      </td>
                    </tr>
                  ) : (
                    data.years.map((year) => (
                      <tr key={year.academic_year_id}>
                        <td className="px-5 py-3 text-slate-900">
                          {year.academic_year ?? `Year #${year.academic_year_id}`}
                        </td>
                        <td className="px-5 py-3 text-slate-600">
                          {year.class_room ?? "-"}
                          {year.section ? ` / ${year.section}` : ""}
                        </td>
                        <td className="px-5 py-3 text-right text-slate-600">
                          {year.attendance.attendance_percentage}%
                        </td>
                        <td className="px-5 py-3 text-right text-slate-600">
                          {year.academics.percentage === null
                            ? "-"
                            : `${year.academics.percentage}%`}
                        </td>
                        <td className="px-5 py-3 text-right text-slate-600">
                          {formatNumber(year.conduct_records)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      ) : null}
    </div>
  );
}
