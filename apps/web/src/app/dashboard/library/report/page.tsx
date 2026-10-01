"use client";

import Link from "next/link";
import { Table } from "@heroui/react";
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
import { formatCurrency, formatDate, formatNumber } from "@/lib/format";
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
        <div className="flex items-center justify-between border-b border-border-secondary px-5 py-4">
          <div>
            <h2 className="text-sm font-semibold text-foreground">
              Overdue loans
            </h2>
            <p className="mt-0.5 text-xs text-muted">
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
            <Table variant="secondary">
              <Table.ScrollContainer>
                <Table.Content aria-label="Overdue loans">
                <Table.Header>
                  <Table.Column isRowHeader>Book</Table.Column>
                  <Table.Column>Member</Table.Column>
                  <Table.Column>Due</Table.Column>
                  <Table.Column>Status</Table.Column>
                </Table.Header>
                <Table.Body>
                {overdue.items.map((issue) => (
                  <Table.Row key={issue.id} className="hover:bg-surface-secondary" id={issue.id}>
                    <Table.Cell><Link
                        href={`/dashboard/library/issues/${issue.id}`}
                        className="text-foreground hover:underline"
                      >
                        {issue.book?.title ?? `#${issue.book_id}`}
                      </Link></Table.Cell>
                    <Table.Cell className="text-muted">{issue.student?.full_name ??
                        (issue.user_id ? `Staff #${issue.user_id}` : "-")}</Table.Cell>
                    <Table.Cell className="text-muted">{formatDate(issue.due_on)}</Table.Cell>
                    <Table.Cell><Badge value={issue.status ?? "unknown"} /></Table.Cell>
                  </Table.Row>
                ))}
                </Table.Body>
                </Table.Content>
              </Table.ScrollContainer>
            </Table>
          </div>
        )}

        {overdue.meta && overdue.meta.last_page > 1 ? (
          <Pagination
            page={overdue.page}
            lastPage={overdue.meta.last_page}
            total={overdue.meta.total}
            onPage={overdue.setPage}
          />
        ) : null}
      </Card>
    </div>
  );
}
