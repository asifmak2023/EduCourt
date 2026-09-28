"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { useResource } from "@/lib/useResource";
import { PermissionGate } from "@/components/PermissionGate";
import { ApiError, apiFetch } from "@/lib/api";
import { buttonClasses } from "@/components/Form";
import {
  Badge,
  Card,
  DataItem,
  DataList,
  EmptyState,
  ErrorNotice,
  PageHeader,
  Spinner,
} from "@/components/ui";
import { formatCurrency, formatDate, humanize } from "@/lib/format";
import type { AccountLedger, ChartOfAccount } from "@/lib/types";

export default function AccountDetailPage() {
  return (
    <PermissionGate permission="finance.view">
      <AccountDetailView />
    </PermissionGate>
  );
}

function AccountDetailView() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const { can } = useAuth();

  const { data, loading, error } = useResource<ChartOfAccount>(
    id ? `/v1/chart-of-accounts/${id}` : null
  );

  if (loading) {
    return <Spinner />;
  }

  if (error) {
    return <ErrorNotice message={error} />;
  }

  if (!data) {
    return <EmptyState message="Account not found." />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${data.code} - ${data.name}`}
        description={humanize(data.account_type)}
        actions={
          <>
            <Link
              href="/dashboard/finance/accounts"
              className={buttonClasses("secondary")}
            >
              Back
            </Link>
            {can("finance.edit") ? (
              <Link
                href={`/dashboard/finance/accounts/${data.id}/edit`}
                className={buttonClasses("secondary")}
              >
                Edit
              </Link>
            ) : null}
          </>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <Badge value={data.is_group ? "group" : "postable"} />
        <Badge value={data.is_active ? "active" : "inactive"} />
        <span className="text-xs text-slate-500">
          Normal balance {humanize(data.normal_balance)}
        </span>
      </div>

      <Card className="p-6">
        <DataList>
          <DataItem label="Code" value={data.code} />
          <DataItem label="Name" value={data.name} />
          <DataItem label="Account type" value={humanize(data.account_type)} />
          <DataItem
            label="Normal balance"
            value={humanize(data.normal_balance)}
          />
          <DataItem label="Description" value={data.description ?? "-"} />
          <DataItem
            label="Child accounts"
            value={data.children?.length ? data.children.length : 0}
          />
        </DataList>
      </Card>

      <LedgerSection accountId={data.id} />
    </div>
  );
}

function LedgerSection({ accountId }: { accountId: number }) {
  const [ledger, setLedger] = useState<AccountLedger | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    const run = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await apiFetch<AccountLedger>(
          `/v1/finance/reports/ledger/${accountId}`,
          { signal: controller.signal }
        );

        if (active) {
          setLedger(response);
        }
      } catch (err: unknown) {
        if (
          active &&
          !(err instanceof DOMException && err.name === "AbortError")
        ) {
          setError(
            err instanceof ApiError ? err.message : "Unable to load ledger."
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void run();

    return () => {
      active = false;
      controller.abort();
    };
  }, [accountId]);

  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-6 py-4">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Account ledger</h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Posted lines with a running balance.
          </p>
        </div>
        {ledger ? (
          <p className="text-sm text-slate-600">
            Closing balance:{" "}
            <span className="font-semibold text-slate-900">
              {formatCurrency(ledger.closing_balance)}
            </span>
          </p>
        ) : null}
      </div>

      {error ? (
        <div className="px-6 py-5">
          <ErrorNotice message={error} />
        </div>
      ) : loading ? (
        <Spinner />
      ) : !ledger || ledger.data.length === 0 ? (
        <EmptyState message="No posted lines for this account." />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-6 py-3 font-medium">Date</th>
                <th className="px-6 py-3 font-medium">Entry</th>
                <th className="px-6 py-3 font-medium">Description</th>
                <th className="px-6 py-3 text-right font-medium">Debit</th>
                <th className="px-6 py-3 text-right font-medium">Credit</th>
                <th className="px-6 py-3 text-right font-medium">Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {ledger.data.map((line, index) => (
                <tr
                  key={`${line.journal_entry_id}-${index}`}
                  className="hover:bg-slate-50"
                >
                  <td className="px-6 py-3 text-slate-600">
                    {formatDate(line.entry_date)}
                  </td>
                  <td className="px-6 py-3 font-mono text-xs text-slate-500">
                    <Link
                      href={`/dashboard/finance/journal/${line.journal_entry_id}`}
                      className="hover:underline"
                    >
                      {line.reference}
                    </Link>
                  </td>
                  <td className="px-6 py-3 text-slate-700">
                    {line.description ?? "-"}
                  </td>
                  <td className="px-6 py-3 text-right text-slate-700">
                    {formatCurrency(line.debit)}
                  </td>
                  <td className="px-6 py-3 text-right text-slate-700">
                    {formatCurrency(line.credit)}
                  </td>
                  <td className="px-6 py-3 text-right font-medium text-slate-900">
                    {formatCurrency(line.running_balance)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
