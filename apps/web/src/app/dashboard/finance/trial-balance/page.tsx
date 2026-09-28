"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
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
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3 font-medium">Code</th>
                  <th className="px-5 py-3 font-medium">Account</th>
                  <th className="px-5 py-3 font-medium">Type</th>
                  <th className="px-5 py-3 text-right font-medium">Debit</th>
                  <th className="px-5 py-3 text-right font-medium">Credit</th>
                  <th className="px-5 py-3 text-right font-medium">Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((row) => (
                  <tr key={row.chart_of_account_id} className="hover:bg-slate-50">
                    <td className="px-5 py-3 font-mono text-xs text-slate-500">
                      <Link
                        href={`/dashboard/finance/accounts/${row.chart_of_account_id}`}
                        className="hover:underline"
                      >
                        {row.code}
                      </Link>
                    </td>
                    <td className="px-5 py-3 font-medium text-slate-900">
                      {row.name}
                    </td>
                    <td className="px-5 py-3 text-slate-600">
                      {humanize(row.account_type)}
                    </td>
                    <td className="px-5 py-3 text-right text-slate-700">
                      {formatCurrency(row.total_debit)}
                    </td>
                    <td className="px-5 py-3 text-right text-slate-700">
                      {formatCurrency(row.total_credit)}
                    </td>
                    <td className="px-5 py-3 text-right font-medium text-slate-900">
                      {formatCurrency(row.balance)}
                    </td>
                  </tr>
                ))}
              </tbody>
              {totals ? (
                <tfoot className="bg-slate-50 text-sm font-semibold text-slate-900">
                  <tr>
                    <td className="px-5 py-3" colSpan={3}>
                      Totals
                    </td>
                    <td className="px-5 py-3 text-right">
                      {formatCurrency(totals.total_debit)}
                    </td>
                    <td className="px-5 py-3 text-right">
                      {formatCurrency(totals.total_credit)}
                    </td>
                    <td className="px-5 py-3" />
                  </tr>
                </tfoot>
              ) : null}
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
