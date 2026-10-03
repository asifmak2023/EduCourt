"use client";

import { useState } from "react";
import Link from "next/link";
import { Table } from "@heroui/react";
import { useList } from "@/lib/useList";
import { useClassRooms, useSections } from "@/lib/useLookups";
import { PermissionGate } from "@/components/PermissionGate";
import { Pagination } from "@/components/Pagination";
import { Select, TextInput, buttonClasses } from "@/components/Form";
import {
  Badge,
  Card,
  EmptyState,
  ErrorNotice,
  PageHeader,
  Spinner,
} from "@/components/ui";
import { formatDate } from "@/lib/format";
import type { StudentAttendance } from "@/lib/types";

const STATUSES = [
  { value: "present", label: "Present" },
  { value: "absent", label: "Absent" },
  { value: "late", label: "Late" },
  { value: "leave", label: "Leave" },
  { value: "excused", label: "Excused" },
];

export default function StudentAttendancePage() {
  return (
    <PermissionGate permission="attendance.view">
      <RecordsTable />
    </PermissionGate>
  );
}

function RecordsTable() {
  const { items: classes } = useClassRooms();
  const { items: sections } = useSections();

  const [date, setDate] = useState("");
  const [classId, setClassId] = useState("");
  const [sectionId, setSectionId] = useState("");
  const [status, setStatus] = useState("");

  const params: Record<string, string | number> = {};
  if (date) params.attendance_date = date;
  if (classId) params.class_room_id = Number(classId);
  if (sectionId) params.section_id = Number(sectionId);
  if (status) params.status = status;

  const { items, meta, loading, error, page, setPage } = useList<StudentAttendance>(
    "/v1/attendance/students",
    params
  );

  const filteredSections = sections.filter(
    (section) => !classId || String(section.class_room_id) === classId
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Student attendance"
        description="Daily attendance marks across the campus."
        actions={
          <>
            <Link
              href="/dashboard/attendance"
              className={buttonClasses("secondary")}
            >
              Back
            </Link>
            <Link
              href="/dashboard/attendance/students/mark"
              className={buttonClasses()}
            >
              Mark attendance
            </Link>
          </>
        }
      />

      <div className="flex flex-wrap gap-3">
        <div className="w-44">
          <TextInput
            type="date"
            value={date}
            onChange={(event) => {
              setPage(1);
              setDate(event.target.value);
            }}
          />
        </div>
        <div className="w-48">
          <Select
            value={classId}
            onChange={(event) => {
              setPage(1);
              setClassId(event.target.value);
              setSectionId("");
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
        <div className="w-40">
          <Select
            value={sectionId}
            onChange={(event) => {
              setPage(1);
              setSectionId(event.target.value);
            }}
          >
            <option value="">All sections</option>
            {filteredSections.map((section) => (
              <option key={section.id} value={section.id}>
                {section.name}
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
          <EmptyState message="No attendance records match your filters." />
        ) : (
          <Table variant="secondary">
            <Table.ScrollContainer>
              <Table.Content
                aria-label="Student attendance"
                className="min-w-[880px]"
              >
                <Table.Header>
                  <Table.Column isRowHeader>Date</Table.Column>
                  <Table.Column>Student</Table.Column>
                  <Table.Column>Class</Table.Column>
                  <Table.Column>Section</Table.Column>
                  <Table.Column>Status</Table.Column>
                  <Table.Column>Remarks</Table.Column>
                </Table.Header>
                <Table.Body>
                  {items.map((record) => (
                    <Table.Row key={record.id} id={record.id}>
                      <Table.Cell className="text-muted">
                        {formatDate(record.attendance_date)}
                      </Table.Cell>
                      <Table.Cell className="font-medium text-foreground">
                        <Link
                          href={`/dashboard/students/${record.student_id}`}
                          className="hover:underline"
                        >
                          {record.student?.name ?? `#${record.student_id}`}
                        </Link>
                        {record.student?.admission_no ? (
                          <span className="ms-2 font-mono text-xs text-muted">
                            {record.student.admission_no}
                          </span>
                        ) : null}
                      </Table.Cell>
                      <Table.Cell className="text-muted">
                        {record.class_room ?? "-"}
                      </Table.Cell>
                      <Table.Cell className="text-muted">
                        {record.section ?? "-"}
                      </Table.Cell>
                      <Table.Cell>
                        <Badge value={record.status} />
                      </Table.Cell>
                      <Table.Cell className="text-muted">
                        {record.remarks ?? "-"}
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
