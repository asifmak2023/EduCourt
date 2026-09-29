"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Table } from "@heroui/react";
import { useFiscalYears } from "@/lib/useLookups";
import { PermissionGate } from "@/components/PermissionGate";
import { ApiError, apiFetch } from "@/lib/api";
import { Select } from "@/components/Form";
import {
  Card,
  EmptyState,
  ErrorNotice,
  PageHeader,
  Spinner,
} from "@/components/ui";
import { formatCurrency, humanize } from "@/lib/format";
import type { TrialBalanceRow } from "@/lib/types";

interface TrialBalanceResponse {
  data: TrialBalanceRow[];
  totals: { total_debit: string; total_credit: string };
}

export default function TrialBalancePage() {
  return (
    <PermissionGate permission="finance.view">
      <TrialBalanceView />
    </PermissionGate>
  );
}

function TrialBalanceView() {
  const { items: fiscalYears } = useFiscalYears();
  const [fiscalYearId, setFiscalYearId] = useState("");
  const [rows, setRows] = useState<TrialBalanceRow[]>([]);
  const [totals, setTotals] = useState<{
    total_debit: string;
    total_credit: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    const run = async () => {
      setLoading(true);
      setError(null);

      const query = fiscalYearId ? `?fiscal_year_id=${fiscalYearId}` : "";

      try {
        const response = await apiFetch<TrialBalanceResponse>(
          `/v1/finance/reports/trial-balance${query}`,
          { signal: controller.signal }
        );

        if (active) {
          setRows(response.data);
          setTotals(response.totals);
        }
      } catch (err: unknown) {
        if (
          active &&
          !(err instanceof DOMException && err.name === "AbortError")
        ) {
          setError(
            err instanceof ApiError
              ? err.message
              : "Unable to load trial balance."
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
  }, [fiscalYearId]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Trial balance"
        description="Debit and credit totals per account for posted entries."
        actions={
          <div className="w-52">
            <Select
              value={fiscalYearId}
              onChange={(event) => setFiscalYearId(event.target.value)}
            >
              <option value="">All fiscal years</option>
              {fiscalYears.map((year) => (
                <option key={year.id} value={year.id}>
                  {year.name} ({year.code})
                </option>
              ))}
            </Select>
          </div>
        }
      />

      {error ? <ErrorNotice message={error} /> : null}

      <Card>
        {loading ? (
          <Spinner />
        ) : rows.length === 0 ? (
          <EmptyState message="No posted entries for the selected period." />
        ) : (
          <Table variant="secondary">
            <Table.ScrollContainer>
              <Table.Content aria-label="Trial balance">
                <Table.Header>
                  <Table.Column isRowHeader>Code</Table.Column>
                  <Table.Column>Account</Table.Column>
                  <Table.Column>Type</Table.Column>
                  <Table.Column className="text-right">Debit</Table.Column>
                  <Table.Column className="text-right">Credit</Table.Column>
                  <Table.Column className="text-right">Balance</Table.Column>
                </Table.Header>
                <Table.Body>
                  {rows.map((row) => (
                    <Table.Row key={row.chart_of_account_id} id={row.chart_of_account_id}>
                      <Table.Cell className="font-mono text-xs text-muted">
                        <Link
                          href={`/dashboard/finance/accounts/${row.chart_of_account_id}`}
                          className="hover:underline"
                        >
                          {row.code}
                        </Link>
                      </Table.Cell>
                      <Table.Cell className="font-medium text-foreground">
                        {row.name}
                      </Table.Cell>
                      <Table.Cell className="text-muted">
                        {humanize(row.account_type)}
                      </Table.Cell>
                      <Table.Cell className="text-right text-muted">
                        {formatCurrency(row.total_debit)}
                      </Table.Cell>
                      <Table.Cell className="text-right text-muted">
                        {formatCurrency(row.total_credit)}
                      </Table.Cell>
                      <Table.Cell className="text-right font-medium text-foreground">
                        {formatCurrency(row.balance)}
                      </Table.Cell>
                    </Table.Row>
                  ))}
                </Table.Body>
                {totals ? (
                  <Table.Footer>
                    <Table.Row id="totals">
                      <Table.Cell className="font-semibold">Totals</Table.Cell>
                      <Table.Cell />
                      <Table.Cell />
                      <Table.Cell className="text-right font-semibold">
                        {formatCurrency(totals.total_debit)}
                      </Table.Cell>
                      <Table.Cell className="text-right font-semibold">
                        {formatCurrency(totals.total_credit)}
                      </Table.Cell>
                      <Table.Cell />
                    </Table.Row>
                  </Table.Footer>
                ) : null}
              </Table.Content>
            </Table.ScrollContainer>
          </Table>
        )}
      </Card>
    </div>
  );
}
