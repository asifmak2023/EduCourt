"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Table } from "@heroui/react";
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
        <span className="text-xs text-muted">
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
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border-secondary px-6 py-4">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Account ledger</h2>
          <p className="mt-0.5 text-xs text-muted">
            Posted lines with a running balance.
          </p>
        </div>
        {ledger ? (
          <p className="text-sm text-muted">
            Closing balance:{" "}
            <span className="font-semibold text-foreground">
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
        <Table variant="secondary">
          <Table.ScrollContainer>
            <Table.Content aria-label="Account ledger">
              <Table.Header>
                <Table.Column isRowHeader>Date</Table.Column>
                <Table.Column>Entry</Table.Column>
                <Table.Column>Description</Table.Column>
                <Table.Column className="text-right">Debit</Table.Column>
                <Table.Column className="text-right">Credit</Table.Column>
                <Table.Column className="text-right">Balance</Table.Column>
              </Table.Header>
              <Table.Body>
                {ledger.data.map((line, index) => (
                  <Table.Row
                    key={`${line.journal_entry_id}-${index}`}
                    id={`${line.journal_entry_id}-${index}`}
                  >
                    <Table.Cell className="text-muted">
                      {formatDate(line.entry_date)}
                    </Table.Cell>
                    <Table.Cell className="font-mono text-xs text-muted">
                      <Link
                        href={`/dashboard/finance/journal/${line.journal_entry_id}`}
                        className="hover:underline"
                      >
                        {line.reference}
                      </Link>
                    </Table.Cell>
                    <Table.Cell className="text-foreground">
                      {line.description ?? "-"}
                    </Table.Cell>
                    <Table.Cell className="text-right text-foreground">
                      {formatCurrency(line.debit)}
                    </Table.Cell>
                    <Table.Cell className="text-right text-foreground">
                      {formatCurrency(line.credit)}
                    </Table.Cell>
                    <Table.Cell className="text-right font-medium text-foreground">
                      {formatCurrency(line.running_balance)}
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table.Content>
          </Table.ScrollContainer>
        </Table>
      )}
    </Card>
  );
}
