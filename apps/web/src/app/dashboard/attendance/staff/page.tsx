"use client";

import { useState } from "react";
import Link from "next/link";
import { useList } from "@/lib/useList";
import { useUsers } from "@/lib/useLookups";
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
import type { StaffAttendance } from "@/lib/types";

const STATUSES = [
  { value: "present", label: "Present" },
  { value: "absent", label: "Absent" },
  { value: "late", label: "Late" },
  { value: "leave", label: "Leave" },
  { value: "excused", label: "Excused" },
];

export default function StaffAttendancePage() {
  return (
    <PermissionGate permission="attendance.view">
      <StaffRecords />
    </PermissionGate>
  );
}

function StaffRecords() {
  const { items: users } = useUsers();

  const [date, setDate] = useState("");
  const [status, setStatus] = useState("");
  const [userId, setUserId] = useState("");

  const params: Record<string, string | number> = {};
  if (date) params.attendance_date = date;
  if (status) params.status = status;
  if (userId) params.user_id = Number(userId);

  const { items, meta, loading, error, page, setPage } = useList<StaffAttendance>(
    "/v1/attendance/staff",
    params
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Staff attendance"
        description="Daily attendance for campus staff."
        actions={
          <>
            <Link
              href="/dashboard/attendance"
              className={buttonClasses("secondary")}
            >
              Back
            </Link>
            <Link
              href="/dashboard/attendance/staff/mark"
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
        <div className="w-56">
          <Select
            value={userId}
            onChange={(event) => {
              setPage(1);
              setUserId(event.target.value);
            }}
          >
            <option value="">All staff</option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name}
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
          <EmptyState message="No staff attendance records match your filters." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3 font-medium">Date</th>
                  <th className="px-5 py-3 font-medium">Employee</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Check in</th>
                  <th className="px-5 py-3 font-medium">Check out</th>
                  <th className="px-5 py-3 font-medium">Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((record) => (
                  <tr key={record.id} className="hover:bg-slate-50">
                    <td className="px-5 py-3 text-slate-500">
                      {formatDate(record.attendance_date)}
                    </td>
                    <td className="px-5 py-3">
                      <div className="font-medium text-slate-900">
                        {record.user?.name ?? `#${record.user_id}`}
                      </div>
                      {record.user?.email ? (
                        <div className="text-xs text-slate-400">
                          {record.user.email}
                        </div>
                      ) : null}
                    </td>
                    <td className="px-5 py-3">
                      <Badge value={record.status} />
                    </td>
                    <td className="px-5 py-3 text-slate-600">
                      {record.check_in ?? "-"}
                    </td>
                    <td className="px-5 py-3 text-slate-600">
                      {record.check_out ?? "-"}
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
