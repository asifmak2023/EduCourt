"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { useResource } from "@/lib/useResource";
import { PermissionGate } from "@/components/PermissionGate";
import { ApiError, apiFetch } from "@/lib/api";
import { Button, buttonClasses } from "@/components/Form";
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
import { formatCurrency, formatDate, humanize } from "@/lib/format";
import type { Budget, BudgetVsActualRow } from "@/lib/types";

interface BudgetVsActual {
  budget: {
    id: number;
    name: string;
    period_type: string | null;
    starts_on: string | null;
    ends_on: string | null;
    status: string | null;
    fiscal_year: string | null;
  };
  data: BudgetVsActualRow[];
  totals: { budget: string; actual: string; variance: string };
}

export default function BudgetDetailPage() {
  return (
    <PermissionGate permission="finance.view">
      <BudgetDetailView />
    </PermissionGate>
  );
}

function BudgetDetailView() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const { can } = useAuth();

  const { data, loading, error, reload } = useResource<Budget>(
    id ? `/v1/budgets/${id}` : null
  );

  if (loading) {
    return <Spinner />;
  }

  if (error) {
    return <ErrorNotice message={error} />;
  }

  if (!data) {
    return <EmptyState message="Budget not found." />;
  }

  const lines = data.lines ?? [];
  const isDraft = data.status === "draft";

  return (
    <div className="space-y-6">
      <PageHeader
        title={data.name}
        description={data.fiscal_year?.name ?? "Budget"}
        actions={
          <>
            <Link
              href="/dashboard/finance/budgets"
              className={buttonClasses("secondary")}
            >
              Back
            </Link>
            {can("finance.edit") && isDraft ? (
              <Link
                href={`/dashboard/finance/budgets/${data.id}/edit`}
                className={buttonClasses("secondary")}
              >
                Edit
              </Link>
            ) : null}
          </>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <Badge value={data.status} />
        <span className="text-xs text-slate-500">
          {humanize(data.period_type)} · {formatDate(data.starts_on)} -{" "}
          {formatDate(data.ends_on)}
        </span>
      </div>

      <SectionCard title="Plan">
        <DataList>
          <DataItem label="Total budget" value={formatCurrency(data.total_budget)} />
          <DataItem label="Fiscal year" value={data.fiscal_year?.name ?? "-"} />
          <DataItem label="Finalised at" value={formatDate(data.approved_at)} />
        </DataList>
        {data.notes ? (
          <p className="mt-5 border-t border-slate-100 pt-4 text-sm text-slate-600">
            {data.notes}
          </p>
        ) : null}

        {lines.length > 0 ? (
          <div className="mt-5 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-2 font-medium">Account</th>
                  <th className="px-4 py-2 font-medium">Notes</th>
                  <th className="px-4 py-2 text-right font-medium">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {lines.map((line) => (
                  <tr key={line.id}>
                    <td className="px-4 py-2 text-slate-700">
                      {line.account
                        ? `${line.account.code} - ${line.account.name}`
                        : `Account #${line.chart_of_account_id}`}
                    </td>
                    <td className="px-4 py-2 text-slate-600">
                      {line.notes ?? "-"}
                    </td>
                    <td className="px-4 py-2 text-right font-medium text-slate-900">
                      {formatCurrency(line.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </SectionCard>

      <ActualsSection budgetId={data.id} />

      {isDraft ? (
        <BudgetActions
          budgetId={data.id}
          canApprove={can("finance.approve")}
          canDelete={can("finance.delete")}
          onChanged={reload}
        />
      ) : null}
    </div>
  );
}

function ActualsSection({ budgetId }: { budgetId: number }) {
  const [data, setData] = useState<BudgetVsActual | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    const controller = new AbortController();

    const run = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await apiFetch<BudgetVsActual>(
          `/v1/finance/reports/budget-vs-actual?budget_id=${budgetId}`,
          { signal: controller.signal }
        );

        setData(response);
      } catch (err: unknown) {
        if (!(err instanceof DOMException && err.name === "AbortError")) {
          setError(
            err instanceof ApiError
              ? err.message
              : "Unable to load budget actuals."
          );
        }
      } finally {
        setLoading(false);
      }
    };

    void run();

    return () => controller.abort();
  }, [budgetId]);

  useEffect(() => {
    const cleanup = load();

    return cleanup;
  }, [load]);

  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-6 py-4">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">
            Budget vs actual
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Posted spend compared with the plan.
          </p>
        </div>
        {data ? (
          <div className="flex flex-wrap gap-5 text-sm">
            <span className="text-slate-600">
              Budget{" "}
              <span className="font-semibold text-slate-900">
                {formatCurrency(data.totals.budget)}
              </span>
            </span>
            <span className="text-slate-600">
              Actual{" "}
              <span className="font-semibold text-slate-900">
                {formatCurrency(data.totals.actual)}
              </span>
            </span>
            <span className="text-slate-600">
              Variance{" "}
              <span className="font-semibold text-slate-900">
                {formatCurrency(data.totals.variance)}
              </span>
            </span>
          </div>
        ) : null}
      </div>

      {error ? (
        <div className="px-6 py-5">
          <ErrorNotice message={error} />
        </div>
      ) : loading ? (
        <Spinner />
      ) : !data || data.data.length === 0 ? (
        <EmptyState message="No budget lines to compare." />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-6 py-3 font-medium">Account</th>
                <th className="px-6 py-3 text-right font-medium">Budget</th>
                <th className="px-6 py-3 text-right font-medium">Actual</th>
                <th className="px-6 py-3 text-right font-medium">Variance</th>
                <th className="px-6 py-3 text-right font-medium">Utilization</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.data.map((row) => (
                <tr key={row.chart_of_account_id} className="hover:bg-slate-50">
                  <td className="px-6 py-3 text-slate-700">
                    <Link
                      href={`/dashboard/finance/accounts/${row.chart_of_account_id}`}
                      className="hover:underline"
                    >
                      {row.code} - {row.name}
                    </Link>
                  </td>
                  <td className="px-6 py-3 text-right text-slate-700">
                    {formatCurrency(row.budget)}
                  </td>
                  <td className="px-6 py-3 text-right text-slate-700">
                    {formatCurrency(row.actual)}
                  </td>
                  <td
                    className={`px-6 py-3 text-right font-medium ${
                      row.favorable ? "text-emerald-600" : "text-rose-600"
                    }`}
                  >
                    {formatCurrency(row.variance)}
                  </td>
                  <td className="px-6 py-3 text-right text-slate-600">
                    {row.utilization === null ? "-" : `${row.utilization}%`}
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

function BudgetActions({
  budgetId,
  canApprove,
  canDelete,
  onChanged,
}: {
  budgetId: number;
  canApprove: boolean;
  canDelete: boolean;
  onChanged: () => void;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const approve = async () => {
    setBusy(true);
    setError(null);

    try {
      await apiFetch(`/v1/budgets/${budgetId}/approve`, { method: "POST" });
      setDone("Budget approved and locked.");
      onChanged();
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
      await apiFetch(`/v1/budgets/${budgetId}`, { method: "DELETE" });
      router.push("/dashboard/finance/budgets");
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
            Approving locks the draft budget from further edits.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {canApprove ? (
            <Button type="button" loading={busy} onClick={approve}>
              Approve budget
            </Button>
          ) : null}
          {canDelete ? (
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
    </Card>
  );
}
