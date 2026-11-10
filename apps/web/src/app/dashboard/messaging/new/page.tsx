"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ApiError, apiFetch } from "@/lib/api";
import { useActiveCampusId, useCampus } from "@/lib/campus";
import { PermissionGate } from "@/components/PermissionGate";
import { Button, Field, Select, TextInput } from "@/components/Form";
import { Card, ErrorNotice, PageHeader } from "@/components/ui";
import type { MessagingAudience } from "@/lib/types";

export default function NewMessagingAudiencePage() {
  return (
    <PermissionGate permission="integration.edit">
      <NewMessagingAudience />
    </PermissionGate>
  );
}

function NewMessagingAudience() {
  const router = useRouter();
  const campusId = useActiveCampusId();
  const { campuses } = useCampus();

  const [kind, setKind] = useState("broadcast");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [scope, setScope] = useState<string>(
    campusId !== null ? String(campusId) : ""
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true);
    setError(null);

    try {
      const created = await apiFetch<{ data: MessagingAudience }>(
        "/v1/messaging/audiences",
        {
          method: "POST",
          body: {
            campus_id: scope === "" ? null : Number(scope),
            kind,
            name: name.trim(),
            description: description.trim() === "" ? null : description.trim(),
          },
        }
      );

      router.push(`/dashboard/messaging/${created.data.id}`);
    } catch (err: unknown) {
      setError(
        err instanceof ApiError ? err.message : "Unable to create the audience."
      );
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="New audience"
        description="A group or broadcast list. Members can be added manually or filled dynamically from a class, section, role or campus."
      />

      {error ? <ErrorNotice message={error} /> : null}

      <Card className="p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Type" htmlFor="audience_kind">
            <Select
              id="audience_kind"
              value={kind}
              onChange={(event) => setKind(event.target.value)}
            >
              <option value="broadcast">Broadcast list</option>
              <option value="group">Group</option>
            </Select>
          </Field>

          <Field label="Campus" htmlFor="audience_scope">
            <Select
              id="audience_scope"
              value={scope}
              onChange={(event) => setScope(event.target.value)}
            >
              <option value="">All campuses</option>
              {campuses.map((campus) => (
                <option key={campus.id} value={String(campus.id)}>
                  {campus.name}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Name" htmlFor="audience_name">
            <TextInput
              id="audience_name"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </Field>

          <Field label="Description" htmlFor="audience_description">
            <TextInput
              id="audience_description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </Field>
        </div>

        <div className="mt-4">
          <Button
            loading={busy}
            disabled={name.trim() === ""}
            onClick={submit}
          >
            Create audience
          </Button>
        </div>
      </Card>
    </div>
  );
}
