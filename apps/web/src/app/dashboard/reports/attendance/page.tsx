"use client";

import { useState } from "react";
import { Table } from "@heroui/react";
import { PermissionGate } from "@/components/PermissionGate";
import { ReportsTabs } from "@/components/ReportsTabs";
import { Field, Select, TextInput } from "@/components/Form";
import {
  Card,
  ErrorNotice,
  PageHeader,
  Spinner,
  StatCard,
} from "@/components/ui";
import { formatNumber } from "@/lib/format";
import { useAcademicYears, useClassRooms } from "@/lib/useLookups";
import { useReport } from "@/lib/useReport";
import type { ReportAttendance } from "@/lib/types";

export default function AttendanceReportPage() {
  return (
    <PermissionGate permission="report.view">
      <AttendanceReport />
    </PermissionGate>
  );
}

function AttendanceReport() {
  const { items: classRooms } = useClassRooms();
  const { items: academicYears } = useAcademicYears();
  const [classRoomId, setClassRoomId] = useState("");
  const [academicYearId, setAcademicYearId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const params = new URLSearchParams();
  if (classRoomId) params.set("class_room_id", classRoomId);
  if (academicYearId) params.set("academic_year_id", academicYearId);
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  const query = params.toString();

  const { data, loading, error } = useReport<ReportAttendance>(
    `/v1/reports/attendance${query ? `?${query}` : ""}`
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Attendance report"
        description="Attendance rate by campus or class over a period."
      />
      <ReportsTabs active="attendance" />

      <Card className="p-4">
        <div className="grid gap-4 sm:grid-cols-4">
          <Field label="Class" htmlFor="att_class">
            <Select
              id="att_class"
              value={classRoomId}
              onChange={(event) => setClassRoomId(event.target.value)}
            >
              <option value="">All classes</option>
              {classRooms.map((classRoom) => (
                <option key={classRoom.id} value={classRoom.id}>
                  {classRoom.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Academic year" htmlFor="att_year">
            <Select
              id="att_year"
              value={academicYearId}
              onChange={(event) => setAcademicYearId(event.target.value)}
            >
              <option value="">All years</option>
              {academicYears.map((year) => (
                <option key={year.id} value={year.id}>
                  {year.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="From" htmlFor="att_from">
            <TextInput
              id="att_from"
              type="date"
              value={from}
              onChange={(event) => setFrom(event.target.value)}
            />
          </Field>
          <Field label="To" htmlFor="att_to">
            <TextInput
              id="att_to"
              type="date"
              value={to}
              onChange={(event) => setTo(event.target.value)}
            />
          </Field>
        </div>
      </Card>

      {error ? <ErrorNotice message={error} /> : null}
      {loading ? (
        <Spinner />
      ) : data ? (
        <>
          <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-5">
            <StatCard
              label="Attendance rate"
              value={`${data.totals.attendance_percentage}%`}
              tone="positive"
            />
            <StatCard label="Present" value={formatNumber(data.totals.present)} />
            <StatCard label="Late" value={formatNumber(data.totals.late)} />
            <StatCard
              label="Absent"
              value={formatNumber(data.totals.absent)}
              tone={data.totals.absent > 0 ? "danger" : "default"}
            />
            <StatCard label="Records" value={formatNumber(data.totals.total)} />
          </div>

          <Card>
            <div className="overflow-x-auto">
              <Table variant="secondary">
                <Table.ScrollContainer>
                  <Table.Content aria-label="Attendance by class">
                  <Table.Header>
                    <Table.Column isRowHeader>Class</Table.Column>
                    <Table.Column className="text-right">Records</Table.Column>
                    <Table.Column className="text-right">Attended</Table.Column>
                    <Table.Column className="text-right">Absent</Table.Column>
                    <Table.Column className="text-right">Rate</Table.Column>
                  </Table.Header>
                  <Table.Body>
                  {data.by_class.length === 0 ? (
                    <Table.Row id="row-1">
                      <Table.Cell className="text-muted">No attendance records for this selection.</Table.Cell><Table.Cell /><Table.Cell /><Table.Cell /><Table.Cell />
                    </Table.Row>
                  ) : (
                    data.by_class.map((row) => (
                      <Table.Row key={row.class_room_id} id={row.class_room_id}>
                        <Table.Cell className="text-foreground">{row.class_room ?? `Class #${row.class_room_id}`}</Table.Cell>
                        <Table.Cell className="text-right text-muted">{formatNumber(row.total)}</Table.Cell>
                        <Table.Cell className="text-right text-muted">{formatNumber(row.attended)}</Table.Cell>
                        <Table.Cell className="text-right text-muted">{formatNumber(row.absent)}</Table.Cell>
                        <Table.Cell className="text-right text-muted">{row.attendance_percentage}%</Table.Cell>
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
