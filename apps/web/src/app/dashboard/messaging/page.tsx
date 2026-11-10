"use client";

import Link from "next/link";
import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { useResource } from "@/lib/useResource";
import { PermissionGate } from "@/components/PermissionGate";
import { buttonClasses } from "@/components/Form";
import {
  Badge,
  Card,
  EmptyState,
  ErrorNotice,
  PageHeader,
  Spinner,
  StatCard,
} from "@/components/ui";
import { formatDateTime } from "@/lib/format";
import type { MessagingAudience, MessagingBroadcast } from "@/lib/types";

export default function MessagingPage() {
  return (
    <PermissionGate permission="integration.view">
      <MessagingView />
    </PermissionGate>
  );
}

function MessagingView() {
  const { can } = useAuth();
  const { data: audiences, loading, error } = useResource<MessagingAudience[]>(
    "/v1/messaging/audiences"
  );
  const { data: broadcasts } = useResource<MessagingBroadcast[]>(
    "/v1/messaging/broadcasts"
  );

  const [tab, setTab] = useState<"audiences" | "history">("audiences");

  if (loading) return <Spinner />;
  if (error) return <ErrorNotice message={error} />;

  const groups = (audiences ?? []).filter((a) => a.kind === "group");
  const lists = (audiences ?? []).filter((a) => a.kind === "broadcast");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Groups & broadcast"
        description="Send WhatsApp messages to a campus group or broadcast list. Every recipient still gets an individual, consent-checked message."
        actions={
          can("integration.view") ? (
            <Link
              href="/dashboard/messaging/new"
              className={buttonClasses("primary")}
            >
              New audience
            </Link>
          ) : undefined
        }
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Groups" value={groups.length} />
        <StatCard label="Broadcast lists" value={lists.length} />
        <StatCard label="Broadcasts sent" value={(broadcasts ?? []).length} />
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setTab("audiences")}
          className={buttonClasses(tab === "audiences" ? "primary" : "secondary")}
        >
          Audiences
        </button>
        <button
          type="button"
          onClick={() => setTab("history")}
          className={buttonClasses(tab === "history" ? "primary" : "secondary")}
        >
          Broadcast history
        </button>
      </div>

      {tab === "audiences" ? (
        <Card className="p-6">
          {!audiences || audiences.length === 0 ? (
            <EmptyState message="No groups or broadcast lists yet. Create one to start messaging." />
          ) : (
            <div className="space-y-3">
              {audiences.map((audience) => (
                <Link
                  key={audience.id}
                  href={`/dashboard/messaging/${audience.id}`}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border p-4 hover:bg-surface-secondary"
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-foreground">
                      {audience.name}
                    </div>
                    <div className="mt-1 text-xs text-muted">
                      {audience.description ?? "No description"}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge value={audience.kind} />
                    <Badge value={`${audience.members_count} members`} />
                    <Badge value={`${audience.segments_count} segments`} />
                    {!audience.is_active ? <Badge value="inactive" /> : null}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </Card>
      ) : (
        <Card className="p-6">
          {!broadcasts || broadcasts.length === 0 ? (
            <EmptyState message="No broadcasts have been sent yet." />
          ) : (
            <div className="space-y-3">
              {broadcasts.map((broadcast) => (
                <div
                  key={broadcast.id}
                  className="rounded-xl border border-border p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="text-sm font-medium text-foreground">
                      {broadcast.title}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge value={broadcast.status} />
                      <Badge
                        value={`${broadcast.recipients_sent}/${broadcast.recipients_total} sent`}
                      />
                    </div>
                  </div>
                  <div className="mt-1 text-xs text-muted">
                    {broadcast.audience?.name ?? "Audience"} ·{" "}
                    {formatDateTime(broadcast.created_at)}
                  </div>
                  <p className="mt-2 line-clamp-2 text-sm text-muted">
                    {broadcast.body}
                  </p>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
