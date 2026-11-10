"use client";

import { useMemo, useState } from "react";
import { Field, Select } from "@/components/Form";
import { ApiError, apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useResource } from "@/lib/useResource";
import {
  Badge,
  Card,
  DataItem,
  DataList,
  EmptyState,
  ErrorNotice,
  SuccessNotice,
} from "@/components/ui";
import type { CampusIntegrationPolicy, WhatsAppSender } from "@/lib/types";

interface CampusNumberRow {
  campus_id: number;
  campus_name: string;
  whatsapp_enabled: boolean;
  whatsapp_self_service: boolean;
  whatsapp_sender_id: number | null;
  monthly_message_limit: number | null;
  uses_own_number: boolean;
  ready: boolean;
  reason: string | null;
  sender: {
    id: number;
    label: string;
    display_phone_number: string | null;
    phone_number_id: string | null;
    is_active: boolean;
  } | null;
}

export function CampusNumbersSection() {
  const { can } = useAuth();
  const { data, loading, error } = useResource<CampusNumberRow[]>(
    "/v1/integrations/whatsapp/campuses"
  );

  if (loading) {
    return (
      <Card className="p-6">
        <EmptyState message="Loading campus numbers." />
      </Card>
    );
  }

  if (error) {
    return <ErrorNotice message={error} />;
  }

  return (
    <Card className="p-6">
      <div className="pb-2">
        <h2 className="text-base font-semibold text-foreground">
          Campus WhatsApp numbers
        </h2>
        <p className="mt-1 text-sm text-muted">
          Each campus can send from its own WhatsApp number. A campus without its
          own number uses the institution number above.
        </p>
      </div>

      {!data || data.length === 0 ? (
        <div className="mt-4">
          <EmptyState message="No campuses are configured for this institution." />
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {data.map((row) => (
            <div
              key={row.campus_id}
              className="rounded-xl border border-border p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-sm font-medium text-foreground">
                  {row.campus_name}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {row.uses_own_number ? (
                    <Badge value="own number" />
                  ) : (
                    <Badge value="institution number" />
                  )}
                  <Badge value={row.ready ? "ready" : "not ready"} />
                  {!row.whatsapp_enabled ? <Badge value="disabled" /> : null}
                </div>
              </div>

              <div className="mt-3">
                {row.sender ? (
                  <DataList>
                    <DataItem label="Label" value={row.sender.label} />
                    <DataItem
                      label="Display number"
                      value={row.sender.display_phone_number ?? "-"}
                    />
                    <DataItem
                      label="Status"
                      value={row.sender.is_active ? "Active" : "Inactive"}
                    />
                  </DataList>
                ) : (
                  <p className="text-xs text-muted">
                    {row.reason?.replace(/_/g, " ") ?? "No sender resolved."}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {can("integration.manage") ? (
        <p className="mt-4 rounded-xl bg-surface-secondary px-4 py-3 text-xs text-muted">
          Campus numbers are assigned by the platform administrator.
        </p>
      ) : null}
    </Card>
  );
}

export function CampusPolicyEditor({
  policy,
  campusName,
  onSaved,
}: {
  policy: CampusIntegrationPolicy;
  campusName: string;
  onSaved: () => void;
}) {
  const { data: senders } = useResource<WhatsAppSender[]>(
    `/v1/platform/whatsapp-senders?institution_id=${policy.institution_id}&per_page=100`
  );

  const [enabled, setEnabled] = useState(policy.whatsapp_enabled);
  const [selfService, setSelfService] = useState(policy.whatsapp_self_service);
  const [senderId, setSenderId] = useState(
    policy.whatsapp_sender_id === null ? "" : String(policy.whatsapp_sender_id)
  );
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const campusSenders = (senders ?? []).filter(
    (sender) =>
      sender.owner_institution_id === policy.institution_id &&
      (sender.owner_campus_id === null || sender.owner_campus_id === policy.campus_id)
  );

  const save = async () => {
    setBusy(true);
    setError(null);
    setNotice(null);

    try {
      await apiFetch(`/v1/platform/campuses/${policy.campus_id}/integration-policy`, {
        method: "PUT",
        body: {
          whatsapp_enabled: enabled,
          whatsapp_self_service: selfService,
          whatsapp_sender_id: senderId === "" ? null : Number(senderId),
        },
      });
      setNotice("Campus policy saved.");
      onSaved();
    } catch (err: unknown) {
      setError(
        err instanceof ApiError ? err.message : "Unable to save campus policy."
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3">
      {notice ? <SuccessNotice message={notice} /> : null}
      {error ? <ErrorNotice message={error} /> : null}

      <Field label={`WhatsApp number for ${campusName}`} htmlFor="campus_sender">
        <Select
          id="campus_sender"
          value={senderId}
          onChange={(event) => setSenderId(event.target.value)}
        >
          <option value="">Use institution number</option>
          {campusSenders.map((sender) => (
            <option key={sender.id} value={String(sender.id)}>
              {sender.label}
              {sender.display_phone_number ? ` (${sender.display_phone_number})` : ""}
              {sender.owner_campus_id === null ? " - institution" : ""}
            </option>
          ))}
        </Select>
      </Field>

      <label className="flex items-center gap-2 text-sm text-foreground">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(event) => setEnabled(event.target.checked)}
        />
        WhatsApp enabled for this campus
      </label>

      <label className="flex items-center gap-2 text-sm text-foreground">
        <input
          type="checkbox"
          checked={selfService}
          onChange={(event) => setSelfService(event.target.checked)}
        />
        Campus admins may manage their own audiences
      </label>

      <button
        type="button"
        className="rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
        disabled={busy}
        onClick={save}
      >
        {busy ? "Saving..." : "Save campus policy"}
      </button>
    </div>
  );
}

export function useCampusNumberSummary(rows: CampusNumberRow[] | null) {
  return useMemo(() => {
    if (!rows) {
      return { total: 0, own: 0, ready: 0 };
    }

    return {
      total: rows.length,
      own: rows.filter((row) => row.uses_own_number).length,
      ready: rows.filter((row) => row.ready).length,
    };
  }, [rows]);
}
