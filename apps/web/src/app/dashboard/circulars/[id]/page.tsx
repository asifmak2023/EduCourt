"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ApiError, apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useResource } from "@/lib/useResource";
import { formatDate, formatDateTime } from "@/lib/format";
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
  SectionCard,
  Spinner,
  SuccessNotice,
} from "@/components/ui";
import type { Circular } from "@/lib/types";

export default function CircularDetailPage() {
  return (
    <PermissionGate permission="circular.view">
      <CircularDetailView />
    </PermissionGate>
  );
}

function CircularDetailView() {
  const params = useParams<{ id: string }>();
  const { can } = useAuth();
  const { data, loading, error, reload } = useResource<Circular>(
    params?.id ? `/v1/circulars/${params.id}` : null
  );

  const [busy, setBusy] = useState<"publish" | "archive" | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  if (loading) return <Spinner />;
  if (error) return <ErrorNotice message={error} />;
  if (!data) return <EmptyState message="Circular not found." />;

  const act = async (action: "publish" | "archive") => {
    setBusy(action);
    setNotice(null);
    setActionError(null);
    try {
      await apiFetch(`/v1/circulars/${data.id}/${action}`, {
        method: "POST",
        body: {},
      });
      setNotice(
        action === "publish" ? "Circular published." : "Circular archived."
      );
      reload();
    } catch (err: unknown) {
      setActionError(
        err instanceof ApiError ? err.message : "Unable to update circular."
      );
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={data.title}
        description={data.audience ?? undefined}
        actions={
          <>
            {can("circular.edit") ? (
              <Link
                href={`/dashboard/circulars/${data.id}/edit`}
                className={buttonClasses("secondary")}
              >
                Edit
              </Link>
            ) : null}
            <Link href="/dashboard/circulars" className={buttonClasses("secondary")}>
              Back
            </Link>
          </>
        }
      />

      {notice ? <SuccessNotice message={notice} /> : null}
      {actionError ? <ErrorNotice message={actionError} /> : null}

      <SectionCard title="Circular details">
        <DataList>
          <DataItem
            label="Audience"
            value={<Badge value={data.audience ?? "all"} />}
          />
          <DataItem label="Class" value={data.class_room?.name ?? "-"} />
          <DataItem label="Section" value={data.section?.name ?? "-"} />
          <DataItem
            label="Status"
            value={<Badge value={data.status ?? "draft"} />}
          />
          <DataItem label="Published at" value={formatDateTime(data.published_at)} />
          <DataItem label="Expires on" value={formatDate(data.expires_on)} />
          <DataItem label="Author" value={data.author?.name ?? "-"} />
          {data.attachment_path ? (
            <DataItem label="Attachment" value={data.attachment_path} />
          ) : null}
        </DataList>
      </SectionCard>

      <Card className="p-6">
        <h2 className="text-sm font-semibold text-foreground">Body</h2>
        <p className="mt-2 whitespace-pre-wrap text-sm text-foreground">
          {data.body}
        </p>
      </Card>

      {can("circular.approve") && data.status !== "archived" ? (
        <Card className="flex flex-wrap items-center justify-between gap-4 p-6">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Lifecycle</h2>
            <p className="mt-0.5 text-xs text-muted">
              Publish to notify the audience, then archive when it is no longer
              relevant.
            </p>
          </div>
          <div className="flex gap-3">
            {data.status !== "published" ? (
              <Button onClick={() => act("publish")} loading={busy === "publish"}>
                Publish
              </Button>
            ) : null}
            {data.published_at ? (
              <Button
                variant="secondary"
                onClick={() => act("archive")}
                loading={busy === "archive"}
              >
                Archive
              </Button>
            ) : null}
          </div>
        </Card>
      ) : null}
    </div>
  );
}
