"use client";

import { useState } from "react";
import Link from "next/link";
import { ApiError, apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useClassRooms } from "@/lib/useLookups";
import { useList } from "@/lib/useList";
import { PermissionGate } from "@/components/PermissionGate";
import { Pagination } from "@/components/Pagination";
import { Button, Field, Select, TextInput, buttonClasses } from "@/components/Form";
import {
  Badge,
  Card,
  EmptyState,
  ErrorNotice,
  PageHeader,
  Spinner,
  SuccessNotice,
} from "@/components/ui";
import { formatDateTime } from "@/lib/format";
import type { AppNotification } from "@/lib/types";

export default function NotificationsPage() {
  return (
    <PermissionGate permission="notification.view">
      <NotificationsView />
    </PermissionGate>
  );
}

function NotificationsView() {
  const { can } = useAuth();
  const [status, setStatus] = useState("");
  const [type, setType] = useState("");
  const [channel, setChannel] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const params: Record<string, string | number> = {};
  if (status) params.status = status;
  if (type) params.type = type;
  if (channel) params.channel = channel;
  if (from) params.from = from;
  if (to) params.to = to;

  const { items, meta, loading, error, page, setPage, reload } =
    useList<AppNotification>("/v1/notifications", params);

  const [busyId, setBusyId] = useState<number | null>(null);
  const [batchBusy, setBatchBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const runAction = async (id: number, action: "send" | "cancel") => {
    setBusyId(id);
    setActionError(null);
    setNotice(null);

    try {
      await apiFetch(`/v1/notifications/${id}/${action}`, { method: "POST" });
      setNotice(action === "send" ? "Notification sent." : "Notification cancelled.");
      reload();
    } catch (err: unknown) {
      setActionError(
        err instanceof ApiError ? err.message : "Unable to update the notification."
      );
    } finally {
      setBusyId(null);
    }
  };

  const sendAllPending = async () => {
    setBatchBusy(true);
    setActionError(null);
    setNotice(null);

    try {
      const response = await apiFetch<{ message: string }>(
        "/v1/notifications/send",
        { method: "POST", body: {} }
      );
      setNotice(response.message);
      reload();
    } catch (err: unknown) {
      setActionError(
        err instanceof ApiError ? err.message : "Unable to send notifications."
      );
    } finally {
      setBatchBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notifications"
        description="Guardian notices queued from absences and reminders."
        actions={
          can("notification.send") ? (
            <Button type="button" loading={batchBusy} onClick={sendAllPending}>
              Send all pending
            </Button>
          ) : undefined
        }
      />

      {notice ? <SuccessNotice message={notice} /> : null}
      {actionError ? <ErrorNotice message={actionError} /> : null}

      <Card className="p-4">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <Field label="Status" htmlFor="notification_status">
            <Select
              id="notification_status"
              value={status}
              onChange={(event) => {
                setPage(1);
                setStatus(event.target.value);
              }}
            >
              <option value="">All statuses</option>
              <option value="pending">Pending</option>
              <option value="sent">Sent</option>
              <option value="failed">Failed</option>
              <option value="cancelled">Cancelled</option>
            </Select>
          </Field>
          <Field label="Type" htmlFor="notification_type">
            <Select
              id="notification_type"
              value={type}
              onChange={(event) => {
                setPage(1);
                setType(event.target.value);
              }}
            >
              <option value="">All types</option>
              <option value="absence">Absence</option>
              <option value="fee_reminder">Fee reminder</option>
              <option value="general">General</option>
            </Select>
          </Field>
          <Field label="Channel" htmlFor="notification_channel">
            <Select
              id="notification_channel"
              value={channel}
              onChange={(event) => {
                setPage(1);
                setChannel(event.target.value);
              }}
            >
              <option value="">All channels</option>
              <option value="email">Email</option>
              <option value="sms">SMS</option>
              <option value="in_app">In-app</option>
            </Select>
          </Field>
          <Field label="From" htmlFor="notification_from">
            <TextInput
              id="notification_from"
              type="date"
              value={from}
              onChange={(event) => {
                setPage(1);
                setFrom(event.target.value);
              }}
            />
          </Field>
          <Field label="To" htmlFor="notification_to">
            <TextInput
              id="notification_to"
              type="date"
              value={to}
              onChange={(event) => {
                setPage(1);
                setTo(event.target.value);
              }}
            />
          </Field>
        </div>
      </Card>

      {can("notification.create") ? (
        <QueueAbsences onQueued={reload} />
      ) : null}

      <Card>
        {error ? (
          <div className="p-5">
            <ErrorNotice message={error} />
          </div>
        ) : loading ? (
          <Spinner />
        ) : items.length === 0 ? (
          <div className="p-6">
            <EmptyState message="No notifications match these filters." />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3 font-medium">Title</th>
                  <th className="px-5 py-3 font-medium">Student</th>
                  <th className="px-5 py-3 font-medium">Recipient</th>
                  <th className="px-5 py-3 font-medium">Type</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Created</th>
                  <th className="px-5 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((notification) => (
                  <tr key={notification.id}>
                    <td className="px-5 py-3">
                      <Link
                        href={`/dashboard/notifications/${notification.id}`}
                        className="font-medium text-slate-900 hover:underline"
                      >
                        {notification.title}
                      </Link>
                      <p className="max-w-md truncate text-xs text-slate-400">
                        {notification.body}
                      </p>
                    </td>
                    <td className="px-5 py-3 text-slate-600">
                      {notification.student ?? "-"}
                    </td>
                    <td className="px-5 py-3 text-slate-600">
                      {notification.recipient_name ?? "-"}
                    </td>
                    <td className="px-5 py-3 text-slate-600">
                      {notification.type_label ?? notification.type ?? "-"}
                    </td>
                    <td className="px-5 py-3">
                      <Badge value={notification.status ?? "unknown"} />
                    </td>
                    <td className="whitespace-nowrap px-5 py-3 text-slate-600">
                      {formatDateTime(notification.created_at)}
                    </td>
                    <td className="px-5 py-3">
                      {can("notification.send") &&
                      notification.status === "pending" ? (
                        <div className="flex justify-end gap-2">
                          <Button
                            type="button"
                            variant="secondary"
                            loading={busyId === notification.id}
                            onClick={() => runAction(notification.id, "send")}
                          >
                            Send
                          </Button>
                          <Button
                            type="button"
                            variant="danger"
                            loading={busyId === notification.id}
                            onClick={() => runAction(notification.id, "cancel")}
                          >
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <div className="text-right">
                          <Link
                            href={`/dashboard/notifications/${notification.id}`}
                            className={buttonClasses("secondary")}
                          >
                            View
                          </Link>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {meta && meta.last_page > 1 ? (
          <div className="border-t border-slate-100 px-5 py-4">
            <Pagination
              page={page}
              lastPage={meta.last_page}
              total={meta.total}
              onPage={setPage}
            />
          </div>
        ) : null}
      </Card>
    </div>
  );
}

function QueueAbsences({ onQueued }: { onQueued: () => void }) {
  const { items: classes } = useClassRooms();
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [classRoomId, setClassRoomId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true);
    setError(null);
    setNotice(null);

    try {
      const response = await apiFetch<{ message: string }>(
        "/v1/notifications/queue-absences",
        {
          method: "POST",
          body: {
            attendance_date: date,
            ...(classRoomId ? { class_room_id: Number(classRoomId) } : {}),
          },
        }
      );
      setNotice(response.message);
      onQueued();
    } catch (err: unknown) {
      setError(
        err instanceof ApiError ? err.message : "Unable to queue absence notices."
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="p-6">
      <h2 className="text-sm font-semibold text-slate-900">Queue absence notices</h2>
      <p className="mt-0.5 text-xs text-slate-500">
        Create a pending notice for every student marked absent on the chosen day.
      </p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <Field label="Attendance date" htmlFor="queue_absences_date" required>
          <TextInput
            id="queue_absences_date"
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
          />
        </Field>
        <Field label="Class" htmlFor="queue_absences_class" hint="Leave blank for all classes.">
          <Select
            id="queue_absences_class"
            value={classRoomId}
            onChange={(event) => setClassRoomId(event.target.value)}
          >
            <option value="">All classes</option>
            {classes.map((classRoom) => (
              <option key={classRoom.id} value={classRoom.id}>
                {classRoom.name}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <div className="mt-4 flex justify-end">
        <Button
          type="button"
          loading={busy}
          disabled={date.trim() === ""}
          onClick={submit}
        >
          Queue notices
        </Button>
      </div>
      {notice ? (
        <div className="mt-4">
          <SuccessNotice message={notice} />
        </div>
      ) : null}
      {error ? (
        <div className="mt-4">
          <ErrorNotice message={error} />
        </div>
      ) : null}
    </Card>
  );
}
