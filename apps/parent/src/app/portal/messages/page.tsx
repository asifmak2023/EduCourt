"use client";

import { useCallback, useEffect, useState } from "react";
import { ApiError } from "@/lib/api";
import {
  fetchWhatsAppConsent,
  fetchWhatsAppMessages,
  updateWhatsAppConsent,
} from "@/lib/portal";
import { Card, EmptyState, ErrorNotice, PageTitle, Pill, SectionHeading } from "@/components/ui";
import { IconChat } from "@/components/Icons";
import type {
  PortalWhatsAppConsentState,
  PortalWhatsAppMessage,
} from "@/lib/types";

type Category = "utility";

const CATEGORY: Category = "utility";

export default function MessagesPage() {
  const [consent, setConsent] = useState<PortalWhatsAppConsentState | null>(null);
  const [messages, setMessages] = useState<PortalWhatsAppMessage[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;

    Promise.all([fetchWhatsAppConsent(), fetchWhatsAppMessages()])
      .then(([consentState, messageList]) => {
        if (!active) return;
        setConsent(consentState);
        setMessages(messageList);
        setError(null);
      })
      .catch((err: unknown) => {
        if (!active) return;
        setError(
          err instanceof ApiError
            ? err.message
            : "Unable to load your WhatsApp messages."
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [reloadKey]);

  const reload = useCallback(() => {
    setLoading(true);
    setReloadKey((value) => value + 1);
  }, []);

  const optedStatus = (): string | null => {
    const rows = (consent?.consents ?? []).filter(
      (row) => (row.category ?? "utility") === CATEGORY
    );

    if (rows.length === 0) {
      return null;
    }

    return rows.every((row) => row.status === "opted_in")
      ? "opted_in"
      : rows.some((row) => row.status === "opted_out")
        ? "opted_out"
        : null;
  };

  const update = async (status: "opted_in" | "opted_out") => {
    setBusy(true);
    setError(null);
    setNotice(null);

    try {
      const next = await updateWhatsAppConsent(status, CATEGORY);
      setConsent(next);
      setMessages(await fetchWhatsAppMessages());
      setNotice(
        status === "opted_in"
          ? "You will now receive WhatsApp messages from the school."
          : "You have opted out of WhatsApp messages."
      );
    } catch (err: unknown) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Unable to update your WhatsApp preferences."
      );
    } finally {
      setBusy(false);
    }
  };

  const status = optedStatus();

  return (
    <div className="space-y-5">
      <PageTitle eyebrow="Messages" title="WhatsApp" />

      {error ? <ErrorNotice message={error} /> : null}
      {notice ? (
        <div className="rounded-lg border border-[color-mix(in_srgb,var(--success)_35%,transparent)] bg-[color-mix(in_srgb,var(--success)_8%,transparent)] px-4 py-3 text-sm text-[var(--success)]">
          {notice}
        </div>
      ) : null}

      <Card>
        <SectionHeading
          title="Message consent"
          subtitle="Choose whether the school may send you reminders and notices on WhatsApp."
        />

        {loading ? (
          <p className="text-sm text-muted">Loading your preferences...</p>
        ) : (
          <>
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <Pill
                tone={
                  status === "opted_in"
                    ? "success"
                    : status === "opted_out"
                      ? "danger"
                      : "muted"
                }
              >
                {status === "opted_in"
                  ? "Opted in"
                  : status === "opted_out"
                    ? "Opted out"
                    : "Not set"}
              </Pill>
              {(consent?.phones ?? []).map((phone) => (
                <Pill key={phone} tone="muted">
                  {phone}
                </Pill>
              ))}
            </div>

            {(consent?.phones ?? []).length === 0 ? (
              <p className="text-sm text-muted">
                No phone number is linked to your account yet. Please contact the
                school office to add one.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => update("opted_in")}
                  className="rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                >
                  Turn on WhatsApp messages
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => update("opted_out")}
                  className="rounded-lg border border-hairline px-4 py-2 text-sm font-semibold text-foreground disabled:opacity-50"
                >
                  Turn off WhatsApp messages
                </button>
              </div>
            )}
          </>
        )}
      </Card>

      <Card>
        <SectionHeading
          title="Recent messages"
          subtitle="Messages the school has sent to your WhatsApp number."
          action={
            <button
              type="button"
              onClick={reload}
              disabled={loading}
              className="text-sm font-semibold text-primary disabled:opacity-50"
            >
              Refresh
            </button>
          }
        />

        {loading ? (
          <p className="text-sm text-muted">Loading messages...</p>
        ) : !messages || messages.length === 0 ? (
          <EmptyState
            icon={<IconChat width={22} height={22} />}
            title="No messages yet"
            message="When the school sends you a WhatsApp message, it will appear here."
          />
        ) : (
          <ul className="divide-y divide-hairline">
            {messages.map((message) => (
              <li
                key={message.id}
                className="flex flex-wrap items-center justify-between gap-2 py-3"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">
                    {message.recipient}
                  </p>
                  <p className="text-xs text-muted">
                    {message.created_at
                      ? new Date(message.created_at).toLocaleString()
                      : "-"}
                  </p>
                </div>
                <Pill
                  tone={
                    message.delivery_status === "delivered" ||
                    message.delivery_status === "read"
                      ? "success"
                      : message.delivery_status === "failed"
                        ? "danger"
                        : "muted"
                  }
                >
                  {(message.delivery_status ?? "queued").replace(/_/g, " ")}
                </Pill>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
