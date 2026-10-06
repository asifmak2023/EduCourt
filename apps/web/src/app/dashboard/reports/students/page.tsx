"use client";

import { useState } from "react";
import { Table } from "@heroui/react";
import { PermissionGate } from "@/components/PermissionGate";
import { ReportsTabs } from "@/components/ReportsTabs";
import { Field, Select } from "@/components/Form";
import { FeeVoucherAction } from "@/components/fee-counter/FeeVoucherAction";
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

  const selectedStudent = students.find(
    (student) => String(student.id) === studentId
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Student yearly report"
        description="A student's attendance, academics and conduct by academic year."
      />
      <ReportsTabs active="students" />

      <Card className="p-4">
        <div className="flex flex-wrap items-end gap-4">
          <div className="w-full max-w-md">
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
          {selectedStudent ? (
            <FeeVoucherAction
              student={{
                id: selectedStudent.id,
                full_name: selectedStudent.full_name,
                admission_no: selectedStudent.admission_no,
              }}
            />
          ) : null}
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
            <div className="border-b border-border-secondary px-5 py-4">
              <h2 className="text-sm font-semibold text-foreground">
                {data.student.name} ({data.student.admission_no})
              </h2>
            </div>
            <div className="overflow-x-auto">
              <Table variant="secondary">
                <Table.ScrollContainer>
                  <Table.Content aria-label="Yearly results">
                  <Table.Header>
                    <Table.Column isRowHeader>Year</Table.Column>
                    <Table.Column>Class</Table.Column>
                    <Table.Column className="text-right">Attendance</Table.Column>
                    <Table.Column className="text-right">Academics</Table.Column>
                    <Table.Column className="text-right">Conduct</Table.Column>
                  </Table.Header>
                  <Table.Body>
                  {data.years.length === 0 ? (
                    <Table.Row id="row-1">
                      <Table.Cell className="text-muted">No enrollment history for this student.</Table.Cell><Table.Cell /><Table.Cell /><Table.Cell /><Table.Cell />
                    </Table.Row>
                  ) : (
                    data.years.map((year) => (
                      <Table.Row key={year.academic_year_id} id={year.academic_year_id}>
                        <Table.Cell className="text-foreground">{year.academic_year ?? `Year #${year.academic_year_id}`}</Table.Cell>
                        <Table.Cell className="text-muted">{year.class_room ?? "-"}
                          {year.section ? ` / ${year.section}` : ""}</Table.Cell>
                        <Table.Cell className="text-right text-muted">{year.attendance.attendance_percentage}%</Table.Cell>
                        <Table.Cell className="text-right text-muted">{year.academics.percentage === null
                            ? "-"
                            : `${year.academics.percentage}%`}</Table.Cell>
                        <Table.Cell className="text-right text-muted">{formatNumber(year.conduct_records)}</Table.Cell>
                      </Table.Row>
                    ))
                  )}
                  </Table.Body>
                  </Table.Content>
                </Table.ScrollContainer>
              </Table>
            </div>
          </Card>
        </>
      ) : null}
    </div>
  );
}
