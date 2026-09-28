"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { useResource } from "@/lib/useResource";
import { PermissionGate } from "@/components/PermissionGate";
import { ApiError, apiFetch } from "@/lib/api";
import {
  Button,
  buttonClasses,
  Field,
  TextArea,
} from "@/components/Form";
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
import { formatCurrency, formatDate } from "@/lib/format";
import type { JournalEntry } from "@/lib/types";

export default function JournalEntryDetailPage() {
  return (
    <PermissionGate permission="finance.view">
      <JournalEntryView />
    </PermissionGate>
  );
}

function JournalEntryView() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const { can } = useAuth();

  const { data, loading, error, reload } = useResource<JournalEntry>(
    id ? `/v1/journal-entries/${id}` : null
  );

  if (loading) {
    return <Spinner />;
  }

  if (error) {
    return <ErrorNotice message={error} />;
  }

  if (!data) {
    return <EmptyState message="Journal entry not found." />;
  }

  const lines = data.lines ?? [];
  const isDraft = data.status === "draft";
  const isPosted = data.status === "posted";

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Entry ${data.reference}`}
        description={data.memo ?? "Journal entry"}
        actions={
          <Link
            href="/dashboard/finance/journal"
            className={buttonClasses("secondary")}
          >
            Back
          </Link>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <Badge value={data.status} />
        <span className="text-xs text-slate-500">
          {formatDate(data.entry_date)}
          {data.fiscal_year ? ` · ${data.fiscal_year.name}` : ""}
        </span>
        {data.reversal_of_id ? (
          <Link
            href={`/dashboard/finance/journal/${data.reversal_of_id}`}
            className="text-xs text-slate-600 underline"
          >
            Reversal of #{data.reversal_of_id}
          </Link>
        ) : null}
        {data.status === "reversed" ? (
          <span className="text-xs text-slate-500">
            Corrected by a posted reversal
          </span>
        ) : null}
      </div>

      <SectionCard title="Details">
        <DataList>
          <DataItem label="Reference" value={data.reference} />
          <DataItem label="Entry date" value={formatDate(data.entry_date)} />
          <DataItem label="Fiscal year" value={data.fiscal_year?.name ?? "-"} />
          <DataItem label="Total debit" value={formatCurrency(data.total_debit)} />
          <DataItem
            label="Total credit"
            value={formatCurrency(data.total_credit)}
          />
          <DataItem label="Posted at" value={formatDate(data.posted_at)} />
        </DataList>
      </SectionCard>

      <SectionCard title="Lines">
        {lines.length === 0 ? (
          <EmptyState message="No lines recorded." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-2 font-medium">#</th>
                  <th className="px-4 py-2 font-medium">Account</th>
                  <th className="px-4 py-2 font-medium">Description</th>
                  <th className="px-4 py-2 text-right font-medium">Debit</th>
                  <th className="px-4 py-2 text-right font-medium">Credit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {lines.map((line) => (
                  <tr key={line.id}>
                    <td className="px-4 py-2 text-slate-400">{line.line_no}</td>
                    <td className="px-4 py-2 text-slate-700">
                      {line.account ? (
                        <Link
                          href={`/dashboard/finance/accounts/${line.account.id}`}
                          className="hover:underline"
                        >
                          {line.account.code} - {line.account.name}
                        </Link>
                      ) : (
                        `Account #${line.chart_of_account_id}`
                      )}
                    </td>
                    <td className="px-4 py-2 text-slate-600">
                      {line.description ?? "-"}
                    </td>
                    <td className="px-4 py-2 text-right text-slate-700">
                      {formatCurrency(line.debit)}
                    </td>
                    <td className="px-4 py-2 text-right text-slate-700">
                      {formatCurrency(line.credit)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-50 text-sm font-medium text-slate-900">
                <tr>
                  <td className="px-4 py-2" colSpan={3}>
                    Totals
                  </td>
                  <td className="px-4 py-2 text-right">
                    {formatCurrency(data.total_debit)}
                  </td>
                  <td className="px-4 py-2 text-right">
                    {formatCurrency(data.total_credit)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </SectionCard>

      {(can("finance.approve") && (isDraft || isPosted)) ||
      (can("finance.delete") && isDraft) ? (
        <EntryActions
          entry={data}
          canApprove={can("finance.approve")}
          canDelete={can("finance.delete")}
          onChanged={reload}
        />
      ) : null}
    </div>
  );
}

function EntryActions({
  entry,
  canApprove,
  canDelete,
  onChanged,
}: {
  entry: JournalEntry;
  canApprove: boolean;
  canDelete: boolean;
  onChanged: () => void;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [mode, setMode] = useState<"reverse" | null>(null);
  const [memo, setMemo] = useState("");

  const isDraft = entry.status === "draft";
  const isPosted = entry.status === "posted";

  const run = async (
    path: string,
    body: Record<string, unknown> | undefined,
    message: string,
    then?: () => void
  ) => {
    setBusy(true);
    setError(null);
    setDone(null);

    try {
      await apiFetch(path, { method: "POST", body });
      setMode(null);
      setDone(message);
      onChanged();
      then?.();
    } catch (err: unknown) {
      setError(err instanceof ApiError ? err.message : "Action failed.");
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    setError(null);

    try {
      await apiFetch(`/v1/journal-entries/${entry.id}`, { method: "DELETE" });
      router.push("/dashboard/finance/journal");
    } catch (err: unknown) {
      setError(err instanceof ApiError ? err.message : "Unable to delete.");
      setBusy(false);
    }
  };

  return (
    <Card className="p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Actions</h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Posted entries are corrected by creating a reversal.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {canApprove && isDraft ? (
            <Button
              type="button"
              loading={busy}
              onClick={() =>
                void run(
                  `/v1/journal-entries/${entry.id}/post`,
                  undefined,
                  "Journal entry posted."
                )
              }
            >
              Post entry
            </Button>
          ) : null}
          {canApprove && isPosted ? (
            <Button
              variant="secondary"
              type="button"
              onClick={() => setMode("reverse")}
            >
              Reverse entry
            </Button>
          ) : null}
          {canDelete && isDraft ? (
            <Button variant="danger" type="button" loading={busy} onClick={remove}>
              Delete draft
            </Button>
          ) : null}
        </div>
      </div>

      {done ? (
        <div className="mt-4">
          <SuccessNotice message={done} />
        </div>
      ) : null}

      {error ? (
        <div className="mt-4">
          <ErrorNotice message={error} />
        </div>
      ) : null}

      {mode === "reverse" ? (
        <div className="mt-5 space-y-4 border-t border-slate-100 pt-5">
          <Field label="Reason (optional)" htmlFor="reverse_memo">
            <TextArea
              id="reverse_memo"
              value={memo}
              onChange={(event) => setMemo(event.target.value)}
            />
          </Field>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              loading={busy}
              onClick={() =>
                void run(
                  `/v1/journal-entries/${entry.id}/reverse`,
                  { ...(memo ? { memo } : {}) },
                  "Journal entry reversed."
                )
              }
            >
              Confirm reversal
            </Button>
            <Button variant="ghost" type="button" onClick={() => setMode(null)}>
              Cancel
            </Button>
          </div>
        </div>
      ) : null}
    </Card>
  );
}
