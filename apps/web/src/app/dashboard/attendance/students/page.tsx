"use client";

import { useState } from "react";
import Link from "next/link";
import { useList } from "@/lib/useList";
import { useClassRooms, useSections } from "@/lib/useLookups";
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
        <input
          type="date"
          value={date}
          onChange={(event) => {
            setPage(1);
            setDate(event.target.value);
          }}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700"
        />
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
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3 font-medium">Date</th>
                  <th className="px-5 py-3 font-medium">Student</th>
                  <th className="px-5 py-3 font-medium">Class</th>
                  <th className="px-5 py-3 font-medium">Section</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((record) => (
                  <tr key={record.id} className="hover:bg-slate-50">
                    <td className="px-5 py-3 text-slate-500">
                      {formatDate(record.attendance_date)}
                    </td>
                    <td className="px-5 py-3 font-medium text-slate-900">
                      <Link
                        href={`/dashboard/students/${record.student_id}`}
                        className="hover:underline"
                      >
                        {record.student?.name ?? `#${record.student_id}`}
                      </Link>
                      {record.student?.admission_no ? (
                        <span className="ml-2 font-mono text-xs text-slate-400">
                          {record.student.admission_no}
                        </span>
                      ) : null}
                    </td>
                    <td className="px-5 py-3 text-slate-600">
                      {record.class_room ?? "-"}
                    </td>
                    <td className="px-5 py-3 text-slate-600">
                      {record.section ?? "-"}
                    </td>
                    <td className="px-5 py-3">
                      <Badge value={record.status} />
                    </td>
                    <td className="px-5 py-3 text-slate-500">
                      {record.remarks ?? "-"}
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
