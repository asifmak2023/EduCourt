"use client";

import { useState } from "react";
import Link from "next/link";
import { ApiError, apiFetch } from "@/lib/api";
import { useUsers } from "@/lib/useLookups";
import { PermissionGate } from "@/components/PermissionGate";
import { Button, Field, Select, TextInput, buttonClasses } from "@/components/Form";
import {
  Card,
  EmptyState,
  ErrorNotice,
  PageHeader,
  Spinner,
  SuccessNotice,
} from "@/components/ui";

const STATUS_OPTIONS = [
  { value: "present", label: "Present" },
  { value: "absent", label: "Absent" },
  { value: "late", label: "Late" },
  { value: "leave", label: "Leave" },
  { value: "excused", label: "Excused" },
];

interface Mark {
  status: string;
  checkIn: string;
  checkOut: string;
}

export default function MarkStaffAttendancePage() {
  return (
    <PermissionGate permission="attendance.create">
      <StaffMarkSheet />
    </PermissionGate>
  );
}

function StaffMarkSheet() {
  const { items: users, loading } = useUsers();

  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [marks, setMarks] = useState<Record<number, Mark>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const setAll = (status: string) => {
    setMarks((current) => {
      const next: Record<number, Mark> = {};
      for (const user of users) {
        next[user.id] = {
          status,
          checkIn: current[user.id]?.checkIn ?? "",
          checkOut: current[user.id]?.checkOut ?? "",
        };
      }
      return next;
    });
  };

  const update = (userId: number, patch: Partial<Mark>) => {
    setMarks((current) => ({
      ...current,
      [userId]: {
        status: current[userId]?.status ?? "present",
        checkIn: current[userId]?.checkIn ?? "",
        checkOut: current[userId]?.checkOut ?? "",
        ...patch,
      },
    }));
  };

  const submit = async () => {
    setBusy(true);
    setError(null);
    setNotice(null);

    const records = users.map((user) => ({
      user_id: user.id,
      status: marks[user.id]?.status ?? "present",
      ...(marks[user.id]?.checkIn ? { check_in: marks[user.id].checkIn } : {}),
      ...(marks[user.id]?.checkOut ? { check_out: marks[user.id].checkOut } : {}),
    }));

    try {
      await apiFetch("/v1/attendance/staff/bulk", {
        method: "POST",
        body: { attendance_date: date, records },
      });
      setNotice(`Marked ${records.length} staff member(s) for ${date}.`);
    } catch (err: unknown) {
      setError(err instanceof ApiError ? err.message : "Unable to save.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Mark staff attendance"
        description="Record daily attendance for campus staff."
        actions={
          <Link
            href="/dashboard/attendance/staff"
            className={buttonClasses("secondary")}
          >
            Back
          </Link>
        }
      />

      <Card className="p-5">
        <div className="max-w-xs">
          <Field label="Date" htmlFor="staff_mark_date" required>
            <TextInput
              id="staff_mark_date"
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
            />
          </Field>
        </div>
      </Card>

      {notice ? <SuccessNotice message={notice} /> : null}
      {error ? <ErrorNotice message={error} /> : null}

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-6 py-4">
          <h2 className="text-sm font-semibold text-slate-900">
            Staff {users.length > 0 ? `(${users.length})` : ""}
          </h2>
          {users.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setAll("present")}
              >
                All present
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setAll("absent")}
              >
                All absent
              </Button>
            </div>
          ) : null}
        </div>

        {loading ? (
          <Spinner />
        ) : users.length === 0 ? (
          <EmptyState message="No staff users are available for this campus." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3 font-medium">Employee</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Check in</th>
                  <th className="px-5 py-3 font-medium">Check out</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((user) => (
                  <tr key={user.id}>
                    <td className="px-5 py-3">
                      <div className="font-medium text-slate-900">
                        {user.name}
                      </div>
                      <div className="text-xs text-slate-400">{user.email}</div>
                    </td>
                    <td className="px-5 py-3">
                      <Select
                        value={marks[user.id]?.status ?? "present"}
                        onChange={(event) =>
                          update(user.id, { status: event.target.value })
                        }
                        className="w-36"
                      >
                        {STATUS_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </Select>
                    </td>
                    <td className="px-5 py-3">
                      <TextInput
                        type="time"
                        value={marks[user.id]?.checkIn ?? ""}
                        onChange={(event) =>
                          update(user.id, { checkIn: event.target.value })
                        }
                        className="w-32"
                      />
                    </td>
                    <td className="px-5 py-3">
                      <TextInput
                        type="time"
                        value={marks[user.id]?.checkOut ?? ""}
                        onChange={(event) =>
                          update(user.id, { checkOut: event.target.value })
                        }
                        className="w-32"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {users.length > 0 ? (
          <div className="flex items-center justify-end border-t border-slate-100 px-6 py-4">
            <Button type="button" loading={busy} onClick={submit}>
              Save attendance
            </Button>
          </div>
        ) : null}
      </Card>
    </div>
  );
}
