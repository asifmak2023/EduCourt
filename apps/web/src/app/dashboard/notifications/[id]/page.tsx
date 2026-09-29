"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ApiError, apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useResource } from "@/lib/useResource";
import { PermissionGate } from "@/components/PermissionGate";
import { Button, buttonClasses } from "@/components/Form";
import {
  Badge,
  Card,
  DataItem,
  DataList,
  EmptyState,
  ErrorNotice,
  PageHeader,
  Spinner,
  SuccessNotice,
} from "@/components/ui";
import { formatDateTime, formatDate } from "@/lib/format";
import type { AppNotification } from "@/lib/types";

export default function NotificationDetailPage() {
  return (
    <PermissionGate permission="notification.view">
      <NotificationDetail />
    </PermissionGate>
  );
}

function NotificationDetail() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const { can } = useAuth();
  const { data, loading, error, reload } = useResource<AppNotification>(
    id ? `/v1/notifications/${id}` : null
  );

  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const runAction = async (action: "send" | "cancel") => {
    if (!data) return;
    setBusy(true);
    setActionError(null);
    setNotice(null);

    try {
      await apiFetch(`/v1/notifications/${data.id}/${action}`, { method: "POST" });
      setNotice(action === "send" ? "Notification sent." : "Notification cancelled.");
      reload();
    } catch (err: unknown) {
      setActionError(
        err instanceof ApiError ? err.message : "Unable to update the notification."
      );
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <Spinner />;
  if (error) return <ErrorNotice message={error} />;
  if (!data) return <EmptyState message="Notification not found." />;

  const canSend = can("notification.send") && data.status === "pending";

  return (
    <div className="space-y-6">
      <PageHeader
        title={data.title}
        description={data.type_label ?? data.type ?? undefined}
        actions={
          <>
            {canSend ? (
              <>
                <Button
                  type="button"
                  loading={busy}
                  onClick={() => runAction("send")}
                >
                  Send
                </Button>
                <Button
                  type="button"
                  variant="danger"
                  loading={busy}
                  onClick={() => runAction("cancel")}
                >
                  Cancel
                </Button>
              </>
            ) : null}
            <Link
              href="/dashboard/notifications"
              className={buttonClasses("secondary")}
            >
              Back
            </Link>
          </>
        }
      />

      {notice ? <SuccessNotice message={notice} /> : null}
      {actionError ? <ErrorNotice message={actionError} /> : null}

      <div className="flex flex-wrap items-center gap-2">
        <Badge value={data.status ?? "unknown"} />
        <Badge value={data.channel_label ?? data.channel ?? "channel"} />
      </div>

      <Card className="p-6">
        <DataList>
          <DataItem label="Student" value={data.student ?? "-"} />
          <DataItem label="Admission no" value={data.admission_no ?? "-"} />
          <DataItem label="Guardian" value={data.guardian ?? "-"} />
          <DataItem label="Recipient" value={data.recipient_name ?? "-"} />
          <DataItem label="Email" value={data.recipient_email ?? "-"} />
          <DataItem label="Phone" value={data.recipient_phone ?? "-"} />
          <DataItem
            label="Occurred on"
            value={data.occurred_on ? formatDate(data.occurred_on) : "-"}
          />
          <DataItem
            label="Sent at"
            value={data.sent_at ? formatDateTime(data.sent_at) : "-"}
          />
          <DataItem
            label="Created"
            value={formatDateTime(data.created_at)}
          />
        </DataList>

        <div className="mt-5 border-t border-slate-100 pt-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
            Message
          </p>
          <p className="mt-1 whitespace-pre-line text-sm text-slate-700">
            {data.body}
          </p>
        </div>

        {data.failure_reason ? (
          <div className="mt-5 border-t border-slate-100 pt-4">
            <p className="text-xs font-medium uppercase tracking-wide text-rose-400">
              Failure reason
            </p>
            <p className="mt-1 text-sm text-rose-600">{data.failure_reason}</p>
          </div>
        ) : null}
      </Card>
    </div>
  );
}
