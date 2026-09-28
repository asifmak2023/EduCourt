"use client";

import Link from "next/link";
import { useList } from "@/lib/useList";
import { useResource } from "@/lib/useResource";
import { PermissionGate } from "@/components/PermissionGate";
import { Pagination } from "@/components/Pagination";
import { Button, buttonClasses } from "@/components/Form";
import {
  Badge,
  Card,
  EmptyState,
  ErrorNotice,
  PageHeader,
  Spinner,
  StatCard,
} from "@/components/ui";
import { formatCurrency, formatNumber } from "@/lib/format";
import type { BookIssue, LibrarySummary } from "@/lib/types";

export default function LibraryReportPage() {
  return (
    <PermissionGate permission="library.export">
      <ReportView />
    </PermissionGate>
  );
}

function ReportView() {
  const { data, loading, error, reload } = useResource<LibrarySummary>(
    "/v1/library/reports/summary"
  );
  const overdue = useList<BookIssue>("/v1/library/issues", { overdue: 1 });

  if (loading) return <Spinner />;
  if (error) return <ErrorNotice message={error} />;
  if (!data) return <EmptyState message="No summary available." />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Library summary"
        description="Catalogue size, circulation and fines collected."
        actions={
          <Button
            type="button"
            variant="secondary"
            onClick={() => reload()}
          >
            Refresh
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Titles" value={formatNumber(data.titles)} />
        <StatCard
          label="Copies"
          value={formatNumber(data.copies)}
          hint={`${formatNumber(data.available)} available`}
        />
        <StatCard label="On loan" value={formatNumber(data.issued)} />
        <StatCard
          label="Overdue"
          value={formatNumber(data.overdue)}
          tone={data.overdue > 0 ? "danger" : "positive"}
        />
        <StatCard label="Lost" value={formatNumber(data.lost)} />
        <StatCard
          label="Fines collected"
          value={formatCurrency(data.fines_collected)}
        />
      </div>

      <Card>
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              Overdue loans
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Copies past their due date.
            </p>
          </div>
          <Link
            href="/dashboard/library/issues?overdue=1"
            className={buttonClasses("secondary")}
          >
            Manage
          </Link>
        </div>

        {overdue.loading ? (
          <div className="p-6">
            <Spinner />
          </div>
        ) : overdue.items.length === 0 ? (
          <div className="p-6">
            <EmptyState message="No overdue loans." />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3 font-medium">Book</th>
                  <th className="px-5 py-3 font-medium">Member</th>
                  <th className="px-5 py-3 font-medium">Due</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {overdue.items.map((issue) => (
                  <tr key={issue.id} className="hover:bg-slate-50">
                    <td className="px-5 py-3">
                      <Link
                        href={`/dashboard/library/issues/${issue.id}`}
                        className="text-slate-900 hover:underline"
                      >
                        {issue.book?.title ?? `#${issue.book_id}`}
                      </Link>
                    </td>
                    <td className="px-5 py-3 text-slate-600">
                      {issue.student?.full_name ??
                        (issue.user_id ? `Staff #${issue.user_id}` : "-")}
                    </td>
                    <td className="px-5 py-3 text-slate-600">
                      {issue.due_on ?? "-"}
                    </td>
                    <td className="px-5 py-3">
                      <Badge value={issue.status ?? "unknown"} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {overdue.meta && overdue.meta.last_page > 1 ? (
          <div className="border-t border-slate-100 px-5 py-4">
            <Pagination
              page={overdue.page}
              lastPage={overdue.meta.last_page}
              total={overdue.meta.total}
              onPage={overdue.setPage}
            />
          </div>
        ) : null}
      </Card>
    </div>
  );
}
