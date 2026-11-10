"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { ApiError, apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useResource } from "@/lib/useResource";
import { PermissionGate } from "@/components/PermissionGate";
import { Button, Field, Select, TextArea, TextInput, buttonClasses } from "@/components/Form";
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
import { formatDateTime } from "@/lib/format";
import type {
  MessagingAudience,
  MessagingAudiencePreview,
  MessagingBroadcast,
  MessagingMemberType,
  MessagingSegmentType,
} from "@/lib/types";

export default function MessagingAudiencePage() {
  return (
    <PermissionGate permission="integration.view">
      <AudienceDetail />
    </PermissionGate>
  );
}

function AudienceDetail() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const { can } = useAuth();
  const { data, loading, error, reload } = useResource<MessagingAudience>(
    id ? `/v1/messaging/audiences/${id}` : null
  );
  const { data: preview, reload: reloadPreview } =
    useResource<MessagingAudiencePreview>(
      id ? `/v1/messaging/audiences/${id}/preview` : null
    );
  const { data: history, reload: reloadHistory } = useResource<
    MessagingBroadcast[]
  >("/v1/messaging/broadcasts");

  const [notice, setNotice] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [memberType, setMemberType] = useState<MessagingMemberType>("phone");
  const [memberPhone, setMemberPhone] = useState("");
  const [memberName, setMemberName] = useState("");
  const [memberId, setMemberId] = useState("");

  const [segmentType, setSegmentType] =
    useState<MessagingSegmentType>("section");
  const [segmentRef, setSegmentRef] = useState("");
  const [segmentValue, setSegmentValue] = useState("");

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);

  const canEdit = can("integration.view");

  const run = async (fn: () => Promise<unknown>, message: string) => {
    setBusy(true);
    setActionError(null);
    setNotice(null);

    try {
      await fn();
      setNotice(message);
      reload();
      reloadPreview();
      reloadHistory();
    } catch (err: unknown) {
      setActionError(
        err instanceof ApiError ? err.message : "Unable to update the audience."
      );
    } finally {
      setBusy(false);
    }
  };

  const addMember = () =>
    run(
      () =>
        apiFetch(`/v1/messaging/audiences/${id}/members`, {
          method: "POST",
          body: {
            members: [
              {
                type: memberType,
                id: memberId === "" ? null : Number(memberId),
                name: memberName === "" ? null : memberName,
                phone: memberPhone === "" ? null : memberPhone,
              },
            ],
          },
        }),
      "Member added."
    ).then(() => {
      setMemberPhone("");
      setMemberName("");
      setMemberId("");
    });

  const removeMember = (memberIdToRemove: number) =>
    run(
      () =>
        apiFetch(`/v1/messaging/audiences/${id}/members/${memberIdToRemove}`, {
          method: "DELETE",
        }),
      "Member removed."
    );

  const addSegment = () =>
    run(
      () =>
        apiFetch(`/v1/messaging/audiences/${id}/segments`, {
          method: "POST",
          body: {
            segment_type: segmentType,
            segment_ref: segmentRef === "" ? null : Number(segmentRef),
            segment_value: segmentValue === "" ? null : segmentValue,
          },
        }),
      "Segment added."
    ).then(() => {
      setSegmentRef("");
      setSegmentValue("");
    });

  const removeSegment = (segmentId: number) =>
    run(
      () =>
        apiFetch(`/v1/messaging/audiences/${id}/segments/${segmentId}`, {
          method: "DELETE",
        }),
      "Segment removed."
    );

  const send = async () => {
    setSending(true);
    setActionError(null);
    setNotice(null);

    try {
      const result = await apiFetch<{
        data: { total: number; sent: number; failed: number };
      }>(`/v1/messaging/audiences/${id}/broadcast`, {
        method: "POST",
        body: { title: title.trim(), body: body.trim() },
      });

      setNotice(
        `Broadcast sent to ${result.data.sent} of ${result.data.total} recipients (${result.data.failed} failed).`
      );
      setTitle("");
      setBody("");
      reloadPreview();
      reloadHistory();
    } catch (err: unknown) {
      setActionError(
        err instanceof ApiError ? err.message : "Unable to send the broadcast."
      );
    } finally {
      setSending(false);
    }
  };

  if (loading) return <Spinner />;
  if (error) return <ErrorNotice message={error} />;
  if (!data) return <EmptyState message="Audience not found." />;

  return (
    <div className="space-y-6">
      <PageHeader
        title={data.name}
        description={data.description ?? undefined}
        actions={
          <Link href="/dashboard/messaging" className={buttonClasses("secondary")}>
            Back
          </Link>
        }
      />

      {notice ? <SuccessNotice message={notice} /> : null}
      {actionError ? <ErrorNotice message={actionError} /> : null}

      <div className="flex flex-wrap items-center gap-2">
        <Badge value={data.kind} />
        <Badge value={data.is_active ? "active" : "inactive"} />
        <Badge value={`${preview?.total ?? 0} recipients`} />
      </div>

      <Card className="p-6">
        <h2 className="text-base font-semibold text-foreground">
          Recipient preview
        </h2>
        <p className="mt-1 text-sm text-muted">
          Deduplicated recipients this audience resolves to right now.
        </p>

        {!preview || preview.total === 0 ? (
          <div className="mt-4">
            <EmptyState message="No recipients yet. Add members or a segment." />
          </div>
        ) : (
          <div className="mt-4">
            <DataList>
              {preview.sample.map((recipient) => (
                <DataItem
                  key={recipient.phone}
                  label={recipient.name}
                  value={recipient.phone}
                />
              ))}
            </DataList>
            {preview.total > preview.sample.length ? (
              <p className="mt-3 text-xs text-muted">
                Showing {preview.sample.length} of {preview.total}.
              </p>
            ) : null}
          </div>
        )}
      </Card>

      <Card className="p-6">
        <h2 className="text-base font-semibold text-foreground">Members</h2>
        <p className="mt-1 text-sm text-muted">
          Add people explicitly, or paste a phone number.
        </p>

        <div className="mt-4 space-y-3">
          {(data.members ?? []).length === 0 ? (
            <p className="text-sm text-muted">No explicit members.</p>
          ) : (
            (data.members ?? []).map((member) => (
              <div
                key={member.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border p-3"
              >
                <div className="text-sm text-foreground">
                  {member.name ?? member.phone ?? member.type}
                  <span className="ml-2 text-xs text-muted">{member.type}</span>
                </div>
                {canEdit ? (
                  <Button
                    variant="ghost"
                    disabled={busy}
                    onClick={() => removeMember(member.id)}
                  >
                    Remove
                  </Button>
                ) : null}
              </div>
            ))
          )}
        </div>

        {canEdit ? (
          <div className="mt-4 grid gap-3 sm:grid-cols-4">
            <Field label="Type" htmlFor="member_type">
              <Select
                id="member_type"
                value={memberType}
                onChange={(event) =>
                  setMemberType(event.target.value as MessagingMemberType)
                }
              >
                <option value="phone">Phone number</option>
                <option value="guardian">Guardian</option>
                <option value="student">Student</option>
                <option value="staff">Staff</option>
              </Select>
            </Field>

            {memberType === "phone" ? (
              <>
                <Field label="Name" htmlFor="member_name">
                  <TextInput
                    id="member_name"
                    value={memberName}
                    onChange={(event) => setMemberName(event.target.value)}
                  />
                </Field>
                <Field label="Phone" htmlFor="member_phone">
                  <TextInput
                    id="member_phone"
                    value={memberPhone}
                    placeholder="+92 300 1234567"
                    onChange={(event) => setMemberPhone(event.target.value)}
                  />
                </Field>
              </>
            ) : (
              <Field label="Record ID" htmlFor="member_id">
                <TextInput
                  id="member_id"
                  inputMode="numeric"
                  value={memberId}
                  onChange={(event) => setMemberId(event.target.value)}
                />
              </Field>
            )}

            <div className="flex items-end">
              <Button loading={busy} onClick={addMember}>
                Add member
              </Button>
            </div>
          </div>
        ) : null}
      </Card>

      <Card className="p-6">
        <h2 className="text-base font-semibold text-foreground">
          Dynamic segments
        </h2>
        <p className="mt-1 text-sm text-muted">
          Automatically include everyone in a class, section, role or campus at
          send time.
        </p>

        <div className="mt-4 space-y-3">
          {(data.segments ?? []).length === 0 ? (
            <p className="text-sm text-muted">No dynamic segments.</p>
          ) : (
            (data.segments ?? []).map((segment) => (
              <div
                key={segment.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border p-3"
              >
                <div className="text-sm text-foreground">
                  {segment.type}
                  <span className="ml-2 text-xs text-muted">
                    {segment.value ?? segment.ref ?? "-"}
                  </span>
                </div>
                {canEdit ? (
                  <Button
                    variant="ghost"
                    disabled={busy}
                    onClick={() => removeSegment(segment.id)}
                  >
                    Remove
                  </Button>
                ) : null}
              </div>
            ))
          )}
        </div>

        {canEdit ? (
          <div className="mt-4 grid gap-3 sm:grid-cols-4">
            <Field label="Segment" htmlFor="segment_type">
              <Select
                id="segment_type"
                value={segmentType}
                onChange={(event) =>
                  setSegmentType(event.target.value as MessagingSegmentType)
                }
              >
                <option value="section">Section</option>
                <option value="class_room">Class</option>
                <option value="role">Staff role</option>
                <option value="campus">Whole campus</option>
              </Select>
            </Field>

            {segmentType === "role" ? (
              <Field label="Role" htmlFor="segment_value">
                <TextInput
                  id="segment_value"
                  value={segmentValue}
                  placeholder="teacher"
                  onChange={(event) => setSegmentValue(event.target.value)}
                />
              </Field>
            ) : segmentType === "campus" ? null : (
              <Field label="Record ID" htmlFor="segment_ref">
                <TextInput
                  id="segment_ref"
                  inputMode="numeric"
                  value={segmentRef}
                  onChange={(event) => setSegmentRef(event.target.value)}
                />
              </Field>
            )}

            <div className="flex items-end">
              <Button loading={busy} onClick={addSegment}>
                Add segment
              </Button>
            </div>
          </div>
        ) : null}
      </Card>

      {canEdit ? (
        <Card className="p-6">
          <h2 className="text-base font-semibold text-foreground">
            Send a broadcast
          </h2>
          <p className="mt-1 text-sm text-muted">
            Each recipient receives an individual WhatsApp message. Consent and
            quota rules apply per recipient.
          </p>

          <div className="mt-4 space-y-3">
            <Field label="Title" htmlFor="broadcast_title">
              <TextInput
                id="broadcast_title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
              />
            </Field>
            <Field label="Message" htmlFor="broadcast_body">
              <TextArea
                id="broadcast_body"
                rows={4}
                value={body}
                onChange={(event) => setBody(event.target.value)}
              />
            </Field>
            <Button
              loading={sending}
              disabled={
                title.trim() === "" ||
                body.trim() === "" ||
                (preview?.total ?? 0) === 0
              }
              onClick={send}
            >
              Send broadcast
            </Button>
          </div>
        </Card>
      ) : null}

      <Card className="p-6">
        <h2 className="text-base font-semibold text-foreground">
          Recent broadcasts
        </h2>

        {!history || history.length === 0 ? (
          <div className="mt-4">
            <EmptyState message="No broadcasts sent yet." />
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {history
              .filter((broadcast) => broadcast.audience_id === data.id)
              .map((broadcast) => (
                <div
                  key={broadcast.id}
                  className="rounded-xl border border-border p-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="text-sm font-medium text-foreground">
                      {broadcast.title}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge value={broadcast.status} />
                      <Badge
                        value={`${broadcast.recipients_sent}/${broadcast.recipients_total}`}
                      />
                    </div>
                  </div>
                  <div className="mt-1 text-xs text-muted">
                    {formatDateTime(broadcast.created_at)}
                  </div>
                </div>
              ))}
          </div>
        )}
      </Card>
    </div>
  );
}
