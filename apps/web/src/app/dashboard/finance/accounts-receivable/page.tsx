"use client";

import Link from "next/link";
import { useJson } from "@/lib/useJson";
import { PermissionGate } from "@/components/PermissionGate";
import { buttonClasses } from "@/components/Form";
import {
  Card,
  ErrorNotice,
  PageHeader,
  SectionCard,
  Spinner,
  StatCard,
} from "@/components/ui";
import { formatCurrency, formatNumber } from "@/lib/format";
import type { ArSummary } from "@/lib/types";

const AGING = [
  { key: "current", label: "Current" },
  { key: "days_1_30", label: "1 - 30 days" },
  { key: "days_31_60", label: "31 - 60 days" },
  { key: "days_61_90", label: "61 - 90 days" },
  { key: "days_over_90", label: "Over 90 days" },
] as const;

export default function AccountsReceivablePage() {
  return (
    <PermissionGate permission="fee.view">
      <AccountsReceivableOverview />
    </PermissionGate>
  );
}

function AccountsReceivableOverview() {
  const { data: summary, loading, error } = useJson<ArSummary>(
    "/v1/fee-reports/ar-summary"
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Accounts receivable"
        description="Fee billing, collection and outstanding balances across the campus."
        actions={
          <div className="flex flex-wrap gap-2">
            <Link
              href="/dashboard/finance/accounts-receivable/fee-structure"
              className={buttonClasses("secondary")}
            >
              Fee structure
            </Link>
            <Link
              href="/dashboard/finance/accounts-receivable/reports"
              className={buttonClasses("secondary")}
            >
              Reports
            </Link>
            <Link
              href="/dashboard/finance/accounts-receivable/generate-voucher"
              className={buttonClasses()}
            >
              Generate voucher
            </Link>
          </div>
        }
      />

      {error ? <ErrorNotice message={error} /> : null}

      {loading ? (
        <Card>
          <Spinner />
        </Card>
      ) : summary ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <StatCard label="Total billed" value={formatCurrency(summary.totals.billed)} />
            <StatCard
              label="Total collected"
              value={formatCurrency(summary.totals.collected)}
              tone="positive"
            />
            <StatCard
              label="Outstanding"
              value={formatCurrency(summary.totals.outstanding)}
              tone="warning"
            />
            <StatCard
              label="Collected today"
              value={formatCurrency(summary.collection.today)}
            />
            <StatCard
              label="Collected this month"
              value={formatCurrency(summary.collection.this_month)}
            />
            <StatCard
              label="Unpaid vouchers"
              value={formatNumber(summary.counts.unpaid)}
              tone="danger"
            />
          </div>

          <SectionCard
            title="Ageing of outstanding"
            description={`As of ${summary.as_of}.`}
          >
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {AGING.map((bucket) => (
                <div
                  key={bucket.key}
                  className="rounded-xl border border-border-secondary px-4 py-3"
                >
                  <p className="text-xs font-medium uppercase tracking-wide text-muted">
                    {bucket.label}
                  </p>
                  <p className="mt-1 text-lg font-semibold text-foreground">
                    {formatCurrency(summary.aging[bucket.key])}
                  </p>
                </div>
              ))}
            </div>
          </SectionCard>
        </>
      ) : null}
    </div>
  );
}
