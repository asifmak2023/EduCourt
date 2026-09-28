"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ApiError, apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useUsers } from "@/lib/useLookups";
import { PermissionGate } from "@/components/PermissionGate";
import { Button, Field, Select, TextArea, TextInput, buttonClasses } from "@/components/Form";
import {
  Card,
  ErrorNotice,
  PageHeader,
} from "@/components/ui";
import type { LeaveRequest } from "@/lib/types";

const LEAVE_TYPES = [
  { value: "sick", label: "Sick" },
  { value: "casual", label: "Casual" },
  { value: "annual", label: "Annual" },
  { value: "maternity", label: "Maternity" },
  { value: "unpaid", label: "Unpaid" },
  { value: "other", label: "Other" },
];

export default function NewLeaveRequestPage() {
  return (
    <PermissionGate permission="attendance.create">
      <LeaveForm />
    </PermissionGate>
  );
}

function LeaveForm() {
  const router = useRouter();
  const { can } = useAuth();
  const canManage = can("attendance.approve");
  const { items: users } = useUsers(canManage);

  const [userId, setUserId] = useState("");
  const [leaveType, setLeaveType] = useState("casual");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [days, setDays] = useState("");
  const [reason, setReason] = useState("");

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true);
    setError(null);

    try {
      const response = await apiFetch<{ data: LeaveRequest }>(
        "/v1/leave-requests",
        {
          method: "POST",
          body: {
            ...(canManage && userId ? { user_id: Number(userId) } : {}),
            leave_type: leaveType,
            from_date: fromDate,
            to_date: toDate,
            ...(days ? { days: Number(days) } : {}),
            ...(reason ? { reason } : {}),
          },
        }
      );

      router.push(`/dashboard/attendance/leave/${response.data.id}`);
    } catch (err: unknown) {
      setError(
        err instanceof ApiError ? err.message : "Unable to submit the request."
      );
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="New leave request"
        description="Submit a staff leave application."
        actions={
          <Link
            href="/dashboard/attendance/leave"
            className={buttonClasses("secondary")}
          >
            Back
          </Link>
        }
      />

      {error ? <ErrorNotice message={error} /> : null}

      <Card className="p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          {canManage ? (
            <Field label="Employee" htmlFor="leave_user" className="sm:col-span-2">
              <Select
                id="leave_user"
                value={userId}
                onChange={(event) => setUserId(event.target.value)}
              >
                <option value="">Myself</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name}
                  </option>
                ))}
              </Select>
            </Field>
          ) : null}

          <Field label="Leave type" htmlFor="leave_type" required>
            <Select
              id="leave_type"
              value={leaveType}
              onChange={(event) => setLeaveType(event.target.value)}
            >
              {LEAVE_TYPES.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Days" htmlFor="leave_days" hint="Leave blank to count calendar days.">
            <TextInput
              id="leave_days"
              type="number"
              min="0.5"
              step="0.5"
              value={days}
              onChange={(event) => setDays(event.target.value)}
              placeholder="Auto"
            />
          </Field>

          <Field label="From" htmlFor="leave_from" required>
            <TextInput
              id="leave_from"
              type="date"
              value={fromDate}
              onChange={(event) => setFromDate(event.target.value)}
            />
          </Field>

          <Field label="To" htmlFor="leave_to" required>
            <TextInput
              id="leave_to"
              type="date"
              value={toDate}
              onChange={(event) => setToDate(event.target.value)}
            />
          </Field>

          <Field label="Reason" htmlFor="leave_reason" className="sm:col-span-2">
            <TextArea
              id="leave_reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Optional note for the approver"
            />
          </Field>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <Link
            href="/dashboard/attendance/leave"
            className={buttonClasses("secondary")}
          >
            Cancel
          </Link>
          <Button
            type="button"
            loading={busy}
            disabled={!fromDate || !toDate}
            onClick={submit}
          >
            Submit request
          </Button>
        </div>
      </Card>
    </div>
  );
}
