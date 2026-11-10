"use client";

import { useState } from "react";
import { ApiError, apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useResource } from "@/lib/useResource";
import { PermissionGate } from "@/components/PermissionGate";
import { SettingsTabs } from "@/components/SettingsTabs";
import { Button, Field, TextInput } from "@/components/Form";
import {
  Badge,
  Card,
  DataItem,
  DataList,
  EmptyState,
  ErrorNotice,
  PageHeader,
  Spinner,
  StatCard,
  SuccessNotice,
} from "@/components/ui";
import { CampusNumbersSection } from "@/components/CampusNumbersSection";
import type { WhatsAppIntegration, WhatsAppUsageSummary } from "@/lib/types";

export default function WhatsAppIntegrationPage() {
  return (
    <PermissionGate permission="integration.view">
      <div className="space-y-6">
        <SettingsTabs active="whatsapp" />
        <WhatsAppIntegrationPanel />
      </div>
    </PermissionGate>
  );
}

function WhatsAppIntegrationPanel() {
  const { can } = useAuth();
  const { data, loading, error, reload } = useResource<WhatsAppIntegration>(
    "/v1/integrations/whatsapp"
  );
  const { data: usage } = useResource<WhatsAppUsageSummary>(
    "/v1/integrations/whatsapp/usage"
  );

  const [limitDraft, setLimitDraft] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [testTo, setTestTo] = useState("");
  const [testing, setTesting] = useState(false);

  const limit =
    limitDraft ?? data?.monthly_message_limit?.toString() ?? "";
  const setLimit = setLimitDraft;

  const writable =
    can("integration.edit") && (data?.self_service ?? false);

  const saveLimit = async () => {
    setBusy(true);
    setNotice(null);
    setActionError(null);

    try {
      await apiFetch("/v1/integrations/whatsapp", {
        method: "PUT",
        body: {
          monthly_message_limit: limit.trim() === "" ? null : Number(limit),
        },
      });
      setNotice("WhatsApp settings saved.");
      setLimitDraft(null);
      reload();
    } catch (err: unknown) {
      setActionError(
        err instanceof ApiError ? err.message : "Unable to save settings."
      );
    } finally {
      setBusy(false);
    }
  };

  const verify = async () => {
    setBusy(true);
    setNotice(null);
    setActionError(null);

    try {
      const response = await apiFetch<{ ok: boolean; reason: string | null }>(
        "/v1/integrations/whatsapp/verify",
        { method: "POST" }
      );
      setNotice(
        response.ok
          ? "Credentials verified."
          : `Verification failed: ${response.reason ?? "unknown"}.`
      );
      reload();
    } catch (err: unknown) {
      setActionError(
        err instanceof ApiError ? err.message : "Unable to verify credentials."
      );
    } finally {
      setBusy(false);
    }
  };

  const testSend = async () => {
    setTesting(true);
    setNotice(null);
    setActionError(null);

    try {
      const response = await apiFetch<{ ok: boolean; reason: string | null }>(
        "/v1/integrations/whatsapp/test-send",
        { method: "POST", body: { to: testTo.trim() } }
      );
      setNotice(
        response.ok
          ? "Test message accepted by WhatsApp."
          : `Test send failed: ${response.reason ?? "unknown"}.`
      );
    } catch (err: unknown) {
      setActionError(
        err instanceof ApiError ? err.message : "Unable to send a test message."
      );
    } finally {
      setTesting(false);
    }
  };

  if (loading) return <Spinner />;
  if (error) return <ErrorNotice message={error} />;
  if (!data) return <EmptyState message="WhatsApp integration not configured." />;

  const sender = data.sender;
  const used = (usage?.consumed ?? 0) + (usage?.reserved ?? 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="WhatsApp"
        description="Send fee reminders and notifications through your own WhatsApp business number."
        actions={
          <>
            {can("integration.test") ? (
              <Button variant="secondary" loading={busy} onClick={verify}>
                Verify credentials
              </Button>
            ) : null}
          </>
        }
      />

      {notice ? <SuccessNotice message={notice} /> : null}
      {actionError ? <ErrorNotice message={actionError} /> : null}

      {!data.enabled ? (
        <ErrorNotice message="WhatsApp is disabled for this institution by the platform." />
      ) : null}

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard
          label="Status"
          value={data.resolution.ready ? "Ready" : "Not ready"}
          tone={data.resolution.ready ? "positive" : "warning"}
          hint={
            data.resolution.ready
              ? "Sending is enabled"
              : data.resolution.reason?.replace(/_/g, " ") ?? "Not configured"
          }
        />
        <StatCard
          label="Messages this month"
          value={used}
          hint={
            data.monthly_message_limit !== null
              ? `of ${data.monthly_message_limit} allowed`
              : "No monthly limit"
          }
        />
        <StatCard
          label="Self-service"
          value={data.self_service ? "On" : "Off"}
          tone={data.self_service ? "positive" : "default"}
          hint="Institution-level editing"
        />
      </div>

      <Card className="p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4">
          <div>
            <h2 className="text-base font-semibold text-foreground">
              Sender
            </h2>
            <p className="mt-1 text-sm text-muted">
              The WhatsApp business number assigned to this institution.
            </p>
          </div>
          {sender ? (
            <div className="flex flex-wrap items-center gap-2">
              <Badge value={sender.connection_mode?.replace(/_/g, " ")} />
              <Badge value={sender.is_active ? "active" : "inactive"} />
              {sender.is_platform_owned ? <Badge value="platform owned" /> : null}
              {sender.token_expired ? <Badge value="token expired" /> : null}
            </div>
          ) : null}
        </div>

        {sender ? (
          <DataList>
            <DataItem label="Label" value={sender.label} />
            <DataItem
              label="Display number"
              value={sender.display_phone_number ?? "-"}
            />
            <DataItem label="Phone number ID" value={sender.phone_number_id ?? "-"} />
            <DataItem
              label="Business account"
              value={sender.business_account_id ?? "-"}
            />
            <DataItem
              label="Managed by"
              value={sender.managed_by === "platform" ? "Platform" : "Institution"}
            />
            <DataItem
              label="Token"
              value={sender.has_access_token ? "Configured" : "Missing"}
            />
            <DataItem
              label="Last verified"
              value={sender.last_verified_at ?? "Never"}
            />
          </DataList>
        ) : (
          <EmptyState message="No WhatsApp sender is assigned to this institution. Ask the platform administrator to assign one." />
        )}
      </Card>

      {sender && !sender.is_active ? (
        <ErrorNotice message="The assigned sender is inactive, so messages will not be sent." />
      ) : null}

      <CampusNumbersSection />

      <Card className="p-6">
        <h2 className="text-base font-semibold text-foreground">Messaging quota</h2>
        <p className="mt-1 text-sm text-muted">
          Limit proactive WhatsApp messages per calendar month. Leave blank for
          no limit.
        </p>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Monthly message limit" htmlFor="wa_limit">
            <TextInput
              id="wa_limit"
              inputMode="numeric"
              value={limit}
              placeholder="No limit"
              disabled={!writable}
              onChange={(event) => setLimit(event.target.value)}
            />
          </Field>
          <Field
            label="Quota timezone"
            htmlFor="wa_timezone"
            hint={data.quota_timezone}
          >
            <TextInput id="wa_timezone" value={data.quota_timezone} disabled />
          </Field>
        </div>

        {writable ? (
          <div className="mt-4 flex flex-wrap gap-2">
            <Button loading={busy} onClick={saveLimit}>
              Save settings
            </Button>
          </div>
        ) : (
          <p className="mt-4 rounded-xl bg-surface-secondary px-4 py-3 text-xs text-muted">
            Read-only. WhatsApp self-service is disabled or you do not have edit
            permission.
          </p>
        )}
      </Card>

      {can("integration.test") && sender ? (
        <Card className="p-6">
          <h2 className="text-base font-semibold text-foreground">Send a test message</h2>
          <p className="mt-1 text-sm text-muted">
            Verifies real deliverability. This consumes one message from the
            quota.
          </p>

          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
            <Field label="Recipient" htmlFor="wa_test_to">
              <TextInput
                id="wa_test_to"
                value={testTo}
                placeholder="+92 300 1234567"
                onChange={(event) => setTestTo(event.target.value)}
              />
            </Field>
            <Button
              variant="secondary"
              loading={testing}
              disabled={testTo.trim() === ""}
              onClick={testSend}
            >
              Send test
            </Button>
          </div>
        </Card>
      ) : null}

      <Card className="p-6">
        <h2 className="text-base font-semibold text-foreground">Templates</h2>
        <p className="mt-1 text-sm text-muted">
          Approved templates are required for messages sent outside the 24-hour
          service window.
        </p>

        {data.templates.length === 0 ? (
          <div className="mt-4">
            <EmptyState message="No templates configured. Proactive messages will fail until an approved template is added." />
          </div>
        ) : (
          <DataList>
            {data.templates.map((template) => (
              <DataItem
                key={template.id}
                label={`${template.purpose} (${template.language})`}
                value={`${template.name} - ${template.approval_status}`}
              />
            ))}
          </DataList>
        )}
      </Card>
    </div>
  );
}
